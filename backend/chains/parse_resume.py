import os
from dotenv import load_dotenv
from langchain.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import AzureChatOpenAI

load_dotenv()

# llm = AzureChatOpenAI (
#     azure_deployment="gpt-4o",
#     api_version=os.getenv("AZURE_API_VERSION", "2024-02-15-preview"),
#     temperature=0.7
# )

llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.7
)

template = """
You are a resume parsing assistant. Extract the following fields from the resume and return them in JSON format:

- full_name
- email
- phone_number
- skills (list)
- education (list with degree, institution, start_date, end_date)
- work_experience (list with position, company, start_date, end_date)
- certifications (list with title, issuer, date)

Only return valid JSON. Resume:
{resume_text}
"""

prompt = PromptTemplate.from_template(template)
parse_resume_chain = prompt | llm
