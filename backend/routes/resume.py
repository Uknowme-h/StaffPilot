from fastapi import APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv
from typing import Optional, Type
from pydantic import BaseModel, BaseModel as PydanticBaseModel, Field
from langchain.tools import BaseTool, Tool
from langchain.agents import initialize_agent
from langchain_openai import AzureChatOpenAI

from utils.extract_text import extract_text_from_pdf
from chains.parse_resume import parse_resume_chain
from utils.email_service import EmailService
from services import JobMatchingService
import json
import re
import os
from datetime import datetime
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import Memory
from langchain.memory import ConversationBufferMemory as UpdatedConversationBufferMemory
from langchain.prompts import PromptTemplate
from langchain.schema.runnable import RunnableSequence

load_dotenv()

router = APIRouter()

# Initialize services
email_service = EmailService()
job_service = JobMatchingService()

# Initialize LLM and memory for conversation
# llm_chat = ChatGoogleGenerativeAI(
#     model="gemini-2.0-flash",
#     google_api_key=os.getenv("GOOGLE_API_KEY"),
#     temperature=0.7
# )

llm_chat = AzureChatOpenAI(
    azure_deployment="gpt-4o",
    api_version=os.getenv("AZURE_API_VERSION", "2024-02-15-preview"),
    temperature=0.7
)

# Initialize memory for conversation
conversation_memory = UpdatedConversationBufferMemory(memory_key="history", return_messages=True)

# Pydantic model for chat request
class ChatRequest(BaseModel):
    message: str

# Pydantic model for notification request
class NotificationRequest(BaseModel):
    hr_email: str
    candidate_name: Optional[str] = None


# Pydantic models for email tools
class EmailGenerationInput(PydanticBaseModel):
    """Input for email generation tool"""
    recipient_email: str = Field(description="Email address of the recipient")
    reason: str = Field(description="Reason for sending the email (e.g., selection, rejection, interview scheduling)")
    additional_context: str = Field(description="Additional context or specific details", default="")


# Email Tools
class EmailGenerationTool(BaseTool):
    name: str = "generate_email"
    description: str = "Generate and send a professional email based on the reason and recipient"
    args_schema: Type[PydanticBaseModel] = EmailGenerationInput

    def _run(self, recipient_email: str, reason: str, additional_context: str = "") -> str:
        """Generate and send email using LLMChain and actual email service"""
        try:
            # Load resume data to get candidate information
            resume_data = load_resume_data()
            candidate_info = next((resume for resume in resume_data if resume.get('email') == recipient_email), None)

            # Create context for email generation
            if candidate_info:
                context = f"""
Candidate Information:
- Name: {candidate_info.get('full_name', 'Unknown')}
- Email: {candidate_info.get('email', 'Unknown')}
- Skills: {', '.join(candidate_info.get('skills', []))}
- Experience: {len(candidate_info.get('work_experience', []))} positions
- Education: {len(candidate_info.get('education', []))} qualifications
"""
            else:
                context = f"Recipient: {recipient_email}\nNo additional candidate information available."

            # Generate email using LLMChain
            response = email_chain.invoke({
                "recipient_email": recipient_email,
                "reason": reason,
                "additional_context": additional_context,
                "context": context
            })

            # Parse subject and body from generated content
            response_text = response.content if hasattr(response, 'content') else str(response)
            lines = response_text.split('\n')
            subject = "StaffPilot - Application Update"
            body = response_text

            for line in lines:
                if line.strip().startswith('Subject:'):
                    subject = line.replace('Subject:', '').strip()
                    body = '\n'.join([l for l in lines if not l.strip().startswith('Subject:')])
                    break

            # Send actual email using email service
            success = email_service.send_professional_email(
                recipient_email=recipient_email,
                subject=subject,
                body=body.strip(),
                candidate_name=candidate_info.get('full_name', 'Candidate') if candidate_info else 'Candidate'
            )

            if success:
                self._log_email(recipient_email, reason, response_text)
                return f"✅ Email successfully sent to {recipient_email}. Subject: {subject}"
            else:
                return f"❌ Failed to send email to {recipient_email}. Please check email configuration."

        except Exception as e:
            return f"❌ Error generating/sending email: {str(e)}"
    
    def _log_email(self, recipient: str, reason: str, content: str):
        """Log email to file"""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "recipient": recipient,
            "reason": reason,
            "content": content
        }
        
        log_file = "email_logs.json"
        logs = []
        
        if os.path.exists(log_file):
            try:
                with open(log_file, 'r', encoding='utf-8') as f:
                    logs = json.load(f)
            except:
                logs = []
        
        logs.append(log_entry)
        
        with open(log_file, 'w', encoding='utf-8') as f:
            json.dump(logs, f, indent=2, ensure_ascii=False)


# Update email_chain to use the pipe operator for chaining
email_chain = PromptTemplate(
    input_variables=["recipient_email", "reason", "additional_context", "context"],
    template="""
You are a professional email generator for StaffPilot HR system.

Generate a professional email with the following details:
- Recipient: {recipient_email}
- Reason: {reason}
- Additional Context: {additional_context}

Candidate Context:
{context}

Please generate a professional email with:
1. A clear subject line (start with "Subject: ")
2. A professional greeting using the recipient's name if available
3. Clear purpose of the email
4. Relevant details based on the reason
5. Professional closing

IMPORTANT INSTRUCTIONS:
- Always use "StaffPilot" as the company name
- Sign the email as "StaffPilot HR Team"
- Use "hr@staffpilot.com" as contact email
- Do NOT include placeholder text like [Your Full Name], [Your Job Title], or [Your Contact Information]
- Make the email specific to the reason and context provided
- Keep the tone professional and friendly

Example closing format:
Best regards,
StaffPilot HR Team
hr@staffpilot.com
www.staffpilot.com
"""
) | llm_chat

# Initialize tools
email_tools = [
    EmailGenerationTool()
]


def load_resume_data():
    """Load all parsed resume data from JSON file"""
    json_file_path = "parsed_resumes.json"
    if os.path.exists(json_file_path):
        try:
            with open(json_file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []
    return []


def generate_smart_prompts(context: str, data_info: str, current_action: str) -> list:
    """Generate contextually relevant suggested prompts using LLM"""
    try:
        # Get real data for more relevant suggestions
        jobs_data = ""
        candidates_data = ""
        
        try:
            jobs = job_service.get_available_jobs()
            if jobs:
                job_titles = [job.title for job in jobs[:3]]  # Get top 3 job titles
                jobs_data = f"Available jobs: {', '.join(job_titles)}"
            
            resumes = job_service.load_resumes()
            if resumes:
                candidate_emails = [resume.email for resume in resumes[:2] if hasattr(resume, 'email') and resume.email]
                candidates_data = f"Available candidates: {len(resumes)} total"
        except:
            pass
        
        prompt = f"""
        You are an AI assistant that generates helpful suggested prompts for an HR management system.
        
        Current Context: {context}
        Data Info: {data_info}
        Current Action: {current_action}
        Real Data: {jobs_data} | {candidates_data}
        
        Available Tools and Commands:
        1. Job Matching: "Match candidates for [job title]", "Match all candidates with all jobs"
        2. Email System: "Email [email] about [reason]", "Email all candidates about [reason]"
        3. Data Viewing: "List jobs", "List all candidates", "Job statistics"
        4. Bulk Operations: "Email all candidates for [job] about [reason]"
        
        Generate exactly 5 contextually relevant and actionable suggested prompts that:
        - Are specific and actionable
        - Use REAL job titles from the data when available
        - Use REAL email addresses when suggesting individual emails
        - Encourage the next logical workflow steps
        - Include variety (matching, emailing, viewing data)
        - Are concise (under 60 characters each)
        - Make sense for the current context
        
        Context-specific guidelines:
        - job_listing: Focus on job matching and candidate operations
        - candidates_listing: Focus on candidate-specific actions and job matching
        - no_jobs: Focus on data input and basic operations
        - no_candidates: Focus on resume upload and job management
        
        Return ONLY a JSON array of 5 strings, nothing else.
        Example format: ["Match candidates for Data Scientist", "List all candidates", "Job statistics", "Email all candidates about interview", "Email specific@email.com about offer"]
        """
        
        response = llm_chat.invoke(prompt)
        response_text = response.content if hasattr(response, 'content') else str(response)
        
        # Try to parse JSON from response
        try:
            # Clean the response to extract just the JSON array
            response_text = response_text.strip()
            if response_text.startswith('```'):
                # Remove code blocks
                lines = response_text.split('\n')
                for i, line in enumerate(lines):
                    if line.strip().startswith('['):
                        response_text = '\n'.join(lines[i:])
                        break
                if response_text.endswith('```'):
                    response_text = response_text[:-3]
            
            # Find JSON array in the response
            start_idx = response_text.find('[')
            end_idx = response_text.rfind(']') + 1
            if start_idx != -1 and end_idx != -1:
                json_str = response_text[start_idx:end_idx]
                prompts = json.loads(json_str)
                if isinstance(prompts, list) and len(prompts) >= 3:
                    return prompts[:5]  # Return max 5 prompts
        except:
            pass
        
        # Enhanced fallback prompts based on context
        if context == "job_listing":
            try:
                jobs = job_service.get_available_jobs()
                if jobs and len(jobs) > 0:
                    job_title = jobs[0].title
                    return [
                        f"Match candidates for {job_title}",
                        "Match all candidates with all jobs",
                        "List all candidates",
                        "Email all candidates about interview",
                        "Job statistics"
                    ]
            except:
                pass
            return [
                "Match candidates for Data Scientist",
                "Match all candidates with all jobs", 
                "List all candidates",
                "Email all candidates about interview",
                "Job statistics"
            ]
        elif context == "candidates_listing":
            try:
                resumes = job_service.load_resumes()
                if resumes and len(resumes) > 0:
                    first_email = resumes[0].email if hasattr(resumes[0], 'email') else 'candidate@email.com'
                    return [
                        "Match all candidates with all jobs",
                        "Email all candidates about interview",
                        "List jobs",
                        f"Email {first_email} about interview",
                        "Job statistics"
                    ]
            except:
                pass
            return [
                "Match all candidates with all jobs",
                "Email all candidates about interview", 
                "List jobs",
                "Job statistics",
                "Email candidate about interview"
            ]
        elif context == "no_candidates":
            return [
                "List jobs",
                "Job statistics",
                "Upload resume", 
                "Add job descriptions",
                "View hiring analytics"
            ]
        elif context == "no_jobs":
            return [
                "List all candidates",
                "Upload resume",
                "Add job descriptions",
                "View candidate profiles",
                "Import job data"
            ]
        else:
            return [
                "List jobs",
                "List all candidates",
                "Job statistics",
                "Match candidates for Manager", 
                "Email all candidates about update"
            ]
            
    except Exception as e:
        # Return safe default prompts on any error
        return [
            "List jobs",
            "List all candidates",
            "Job statistics",
            "Match candidates for Manager",
            "Email all candidates about interview"
        ]


def create_context_prompt():
    """Create a context-aware prompt template"""
    resume_data = load_resume_data()
    
    # Convert resume data to a safe string format
    if resume_data:
        context_info = f"Number of resumes: {len(resume_data)}\n\n"
        for i, resume in enumerate(resume_data, 1):
            context_info += f"Resume {i}:\n"
            context_info += f"- Name: {resume.get('full_name', 'Unknown')}\n"
            context_info += f"- Email: {resume.get('email', 'Unknown')}\n"
            context_info += f"- Phone: {resume.get('phone_number', 'Unknown')}\n"
            context_info += f"- Skills: {', '.join(resume.get('skills', []))}\n"
            
            # Work experience
            work_exp = resume.get('work_experience', [])
            if work_exp:
                context_info += f"- Work Experience:\n"
                for exp in work_exp:
                    context_info += f"  * {exp.get('position', 'Unknown')} at {exp.get('company', 'Unknown')}\n"
            
            # Education
            education = resume.get('education', [])
            if education:
                context_info += f"- Education:\n"
                for edu in education:
                    context_info += f"  * {edu.get('degree', 'Unknown')} from {edu.get('institution', 'Unknown')}\n"
            
            # Certifications
            certs = resume.get('certifications', [])
            if certs:
                context_info += f"- Certifications:\n"
                for cert in certs:
                    context_info += f"  * {cert.get('title', 'Unknown')} from {cert.get('issuer', 'Unknown')}\n"
            
            context_info += f"- Uploaded: {resume.get('timestamp', 'Unknown')}\n\n"
    else:
        context_info = "No resume data available."
    
    template = """You are an AI assistant that helps with resume-related questions. You have access to the following parsed resume data:

RESUME DATA:
""" + context_info + """

Based on this data, you can answer questions about:
- Resume information and details
- Skills analysis
- Experience summaries
- Education backgrounds
- Comparisons between resumes
- General resume advice

Previous conversation:
{history}

Current question: {input}

Please provide a helpful response based on the resume data and conversation history.
"""
    
    return PromptTemplate(
        input_variables=["history", "input"],
        template=template
    )


# Define tools for specific tasks
job_listing_tool = Tool(
    name="List Jobs",
    func=lambda _: job_service.get_available_jobs(),
    description="Fetch a list of all available jobs."
)

candidate_matching_tool = Tool(
    name="Match Candidates",
    func=lambda job_title: job_service.match_candidates_to_job(job_title, top_n=3),
    description="Match candidates to a specific job title."
)

def generate_email_wrapper(inputs):
    """Wrapper function to handle email generation and sending with proper input formatting"""
    try:
        # If inputs is a string, try to parse it or create a basic structure
        if isinstance(inputs, str):
            # Try to extract email address from the string using regex
            import re
            email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
            email_matches = re.findall(email_pattern, inputs)
            
            if email_matches:
                recipient_email = email_matches[0]
                reason = inputs.replace(recipient_email, "").strip()
            else:
                recipient_email = "unknown@email.com"
                reason = inputs
            
            inputs_dict = {
                "recipient_email": recipient_email,
                "reason": reason,
                "additional_context": "",
                "context": "No additional context available."
            }
        else:
            inputs_dict = inputs
        
        # Ensure all required keys are present
        required_keys = ["recipient_email", "reason", "additional_context", "context"]
        for key in required_keys:
            if key not in inputs_dict:
                inputs_dict[key] = ""
        
        # Generate email content using LLM
        response = email_chain.invoke(inputs_dict)
        response_text = response.content if hasattr(response, 'content') else str(response)
        
        # Parse subject and body from generated content
        lines = response_text.split('\n')
        subject = "StaffPilot - Application Update"
        body = response_text

        for line in lines:
            if line.strip().startswith('Subject:'):
                subject = line.replace('Subject:', '').strip()
                body = '\n'.join([l for l in lines if not l.strip().startswith('Subject:')])
                break
        
        # Load resume data to get candidate information
        resume_data = load_resume_data()
        candidate_info = None
        recipient_email = inputs_dict.get("recipient_email", "")
        
        if recipient_email and recipient_email != "unknown@email.com":
            candidate_info = next((resume for resume in resume_data if resume.get('email') == recipient_email), None)
        
        # Send actual email using email service
        if recipient_email and recipient_email != "unknown@email.com":
            success = email_service.send_professional_email(
                recipient_email=recipient_email,
                subject=subject,
                body=body.strip(),
                candidate_name=candidate_info.get('full_name', 'Candidate') if candidate_info else 'Candidate'
            )
            
            if success:
                return f"✅ Email successfully sent to {recipient_email}. Subject: {subject}"
            else:
                return f"❌ Failed to send email to {recipient_email}. Please check email configuration."
        else:
            return f"❌ Invalid recipient email address: {recipient_email}"
            
    except Exception as e:
        return f"Error generating/sending email: {str(e)}"

email_generation_tool = Tool(
    name="Generate Email",
    func=generate_email_wrapper,
    description="Generate and send a professional email to a candidate. Input should be a dictionary with recipient_email, reason, additional_context, and context. This tool will actually send the email via SMTP."
)

# Define a candidate filtering tool
candidate_filtering_tool = Tool(
    name="Filter Candidates",
    func=lambda criteria: [
        {
            "full_name": resume.get("full_name", "Unknown"),
            "email": resume.get("email", "Unknown"),
            "skills": resume.get("skills", []),
            "work_experience": resume.get("work_experience", []),
            "education": resume.get("education", [])
        }
        for resume in job_service.load_resumes()
        if isinstance(resume, dict) and all(
            criteria.get(key, '').lower() in str(resume.get(key, '')).lower()
            for key in criteria
        )
    ],
    description="Filter candidates based on specific criteria such as skills, job title, or location."
)

# Define a tool for emailing candidates
email_candidates_tool = Tool(
    name="Email Candidates for Interview",
    func=lambda inputs: [
        {
            "candidate": candidate.get("full_name", "Unknown"),
            "email": candidate.get("email"),
            "status": generate_email_wrapper({
                "recipient_email": candidate.get("email"),
                "reason": f"Interview opportunity at {inputs['job_title']}",
                "additional_context": f"We are excited to invite you for an interview at Herald College for the {inputs['job_title']} position.",
                "context": f"Candidate: {candidate.get('full_name', 'Unknown')}\nSkills: {', '.join(candidate.get('skills', []))}"
            })
        }
        for candidate in candidate_filtering_tool.func(inputs['criteria'])
    ],
    description="Filter candidates based on criteria and email them for an interview opportunity."
)

# Initialize the agent with tools
agent = initialize_agent(
    tools=[
        job_listing_tool,
        candidate_matching_tool,
        email_generation_tool,
        candidate_filtering_tool,
        email_candidates_tool  # Added the new tool here
    ],
    llm=llm_chat,
    agent="zero-shot-react-description",
    memory=conversation_memory
)

@router.post("/chat")
async def chat_with_resumes(request: ChatRequest):
    """Chat endpoint using LangChain agent and tools."""
    try:
        # Use the agent to process the user message
        response = agent.run(request.message)

        # Return the agent's response
        return {
            "response": response,
            "message": request.message,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@router.get("/email-logs")
async def get_email_logs():
    """Get all email logs"""
    try:
        log_file = "email_logs.json"
        if os.path.exists(log_file):
            with open(log_file, 'r', encoding='utf-8') as f:
                logs = json.load(f)
            return {"email_logs": logs}
        else:
            return {"email_logs": [], "message": "No email logs found"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting email logs: {str(e)}")


@router.post("/clear-memory")
async def clear_conversation_memory():
    """Clear the conversation memory"""
    global conversation_memory
    conversation_memory.clear()
    return {"message": "Conversation memory cleared successfully"}


@router.get("/resume-summary")
async def get_resume_summary():
    """Get a summary of all parsed resumes"""
    try:
        resume_data = load_resume_data()
        if not resume_data:
            return {"message": "No resumes found"}
        
        summary = {
            "total_resumes": len(resume_data),
            "resumes": []
        }
        
        for resume in resume_data:
            resume_summary = {
                "filename": resume.get("filename", "Unknown"),
                "full_name": resume.get("full_name", "Unknown"),
                "email": resume.get("email", "Unknown"),
                "skills_count": len(resume.get("skills", [])),
                "experience_count": len(resume.get("work_experience", [])),
                "education_count": len(resume.get("education", [])),
                "timestamp": resume.get("timestamp", "Unknown")
            }
            summary["resumes"].append(resume_summary)
        
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting resume summary: {str(e)}")



@router.post("/upload")
async def upload_resume(file: UploadFile = File(...)):
    contents = await file.read()
    text = extract_text_from_pdf(contents)
    if not text.strip():
        raise HTTPException(status_code=400, detail="No text extracted from PDF")

    result = parse_resume_chain.invoke({"resume_text": text})

    # Extract the JSON string from the result content
    raw_json_text = result.content if hasattr(result, 'content') else str(result)
    if not raw_json_text:
        raise HTTPException(status_code=500, detail="No parsed JSON returned from LLM")

    # Remove markdown fences (```json ... ```)
    cleaned_json_str = re.sub(r"^```json\s*|```$", "", raw_json_text.strip(), flags=re.MULTILINE)

    try:
        parsed_json = json.loads(cleaned_json_str)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse JSON from LLM output: {e}")
    
    # Add timestamp to the parsed JSON
    parsed_json["timestamp"] = datetime.now().isoformat()
    parsed_json["filename"] = file.filename
    
    # Append to JSON file
    json_file_path = "parsed_resumes.json"
    
    # Load existing data or create empty list
    if os.path.exists(json_file_path):
        try:
            with open(json_file_path, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
                if not isinstance(existing_data, list):
                    existing_data = [existing_data]
        except (json.JSONDecodeError, FileNotFoundError):
            existing_data = []
    else:
        existing_data = []
    
    # Append new parsed resume
    existing_data.append(parsed_json)
    
    # Write back to file
    with open(json_file_path, 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, indent=2, ensure_ascii=False)

    return {"parsed_resume": parsed_json}


@router.post("/send-notification")
async def send_resume_notification(request: NotificationRequest):
    """Send notification email about new resume to HR"""
    try:
        # Load the latest resume data
        resume_data = load_resume_data()
        if not resume_data:
            raise HTTPException(status_code=404, detail="No resume data found")
        
        # Get the latest resume (last in the list)
        latest_resume = resume_data[-1]
        candidate_name = request.candidate_name or latest_resume.get('full_name', 'Unknown Candidate')
        
        # Send notification email
        success = email_service.send_resume_notification(
            recipient_email=request.hr_email,
            candidate_name=candidate_name,
            resume_data=latest_resume
        )
        
        if success:
            return {
                "message": f"Notification email sent successfully to {request.hr_email}",
                "candidate": candidate_name,
                "timestamp": datetime.now().isoformat()
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to send notification email")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending notification: {str(e)}")


@router.post("/test-email")
async def test_email_service(recipient_email: str):
    """Test the email service with a simple test email"""
    try:
        success = email_service.send_professional_email(
            recipient_email=recipient_email,
            subject="StaffPilot - Email Service Test",
            body="""Hello!

This is a test email from the StaffPilot system to verify that the email service is working correctly.

If you received this email, the email configuration is working properly.

Best regards,
StaffPilot System""",
            candidate_name="Test User"
        )
        
        if success:
            return {
                "message": f"Test email sent successfully to {recipient_email}",
                "timestamp": datetime.now().isoformat(),
                "status": "success"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to send test email")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending test email: {str(e)}")


@router.post("/email-candidates")
async def email_candidates_for_interview(criteria: dict, job_title: str):
    """Filter candidates based on criteria and email them for an interview opportunity."""
    try:
        # Step 1: Filter candidates using the candidate_filtering_tool
        filtered_candidates = candidate_filtering_tool.func(criteria)

        if not filtered_candidates:
            return {
                "message": "No candidates found matching the criteria.",
                "criteria": criteria,
                "timestamp": datetime.now().isoformat()
            }

        # Step 2: Generate and send emails to the filtered candidates
        email_results = []
        for candidate in filtered_candidates:
            email_input = {
                "recipient_email": candidate.get("email"),
                "reason": f"Interview opportunity at {job_title}",
                "additional_context": f"We are excited to invite you for an interview at Herald College for the {job_title} position.",
                "context": f"Candidate: {candidate.get('full_name', 'Unknown')}\nSkills: {', '.join(candidate.get('skills', []))}"
            }

            email_result = generate_email_wrapper(email_input)
            email_results.append({
                "candidate": candidate.get("full_name", "Unknown"),
                "email": candidate.get("email"),
                "status": email_result
            })

        return {
            "message": "Emails sent to filtered candidates.",
            "results": email_results,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error emailing candidates: {str(e)}")

