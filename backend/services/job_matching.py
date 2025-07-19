from typing import List, Dict, Any
import json
import os

from langchain_openai import AzureChatOpenAI
from models import Job, Resume, JobMatchResult
from langchain_google_genai import ChatGoogleGenerativeAI
import re
from dotenv import load_dotenv
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain

load_dotenv()

class JobMatchingService:
    def __init__(self):
        self.llm = self._initialize_llm()
        self.match_summary_chain = self._initialize_match_summary_chain()

    def _initialize_llm(self):
        """Initialize the LLM with proper configuration."""
        return AzureChatOpenAI(
            azure_deployment="gpt-4o",
            api_version=os.getenv("AZURE_API_VERSION", "2024-02-15-preview"),
            temperature=0.7
        )

    def _initialize_match_summary_chain(self):
        """Create an LLMChain for generating match summaries."""
        prompt = PromptTemplate(
            input_variables=[
                "job_title", "job_description", "job_type", "employment_type",
                "candidate_name", "candidate_skills", "matching_skills",
                "relevant_experience", "education_count", "overall_score"
            ],
            template="""
As an HR expert, provide a concise summary of why this candidate is or isn't a good fit for the job.

JOB: {job_title}
JOB DESCRIPTION: {job_description}
JOB TYPE: {job_type} | {employment_type}

CANDIDATE: {candidate_name}
CANDIDATE SKILLS: {candidate_skills}
MATCHING SKILLS: {matching_skills}
RELEVANT EXPERIENCE: {relevant_experience}
EDUCATION: {education_count} qualification(s)
OVERALL MATCH SCORE: {overall_score:.1%}

Provide a 2-3 sentence summary highlighting:
1. Key strengths that make them suitable
2. Any potential gaps or concerns
3. Overall recommendation (Strong fit/Good fit/Weak fit)

Keep it professional and concise.
"""
        )
        return LLMChain(llm=self.llm, prompt=prompt)

    def load_jobs(self) -> List[Job]:
        """Load job descriptions from JSON file"""
        job_file_path = "job_des.json"
        if os.path.exists(job_file_path):
            try:
                with open(job_file_path, 'r', encoding='utf-8') as f:
                    jobs_data = json.load(f)
                return [Job(**job) for job in jobs_data]
            except (json.JSONDecodeError, FileNotFoundError):
                return []
        return []
    
    def load_resumes(self) -> List[Resume]:
        """Load parsed resumes from JSON file"""
        resume_file_path = "parsed_resumes.json"
        if os.path.exists(resume_file_path):
            try:
                with open(resume_file_path, 'r', encoding='utf-8') as f:
                    resumes_data = json.load(f)
                return [Resume(**resume) for resume in resumes_data]
            except (json.JSONDecodeError, FileNotFoundError):
                return []
        return []
    
    def find_job_by_title(self, job_title: str) -> Job:
        """Find a job by title (case-insensitive partial match)"""
        jobs = self.load_jobs()
        job_title_lower = job_title.lower()
        
        # First try exact match
        for job in jobs:
            if job.title.lower() == job_title_lower:
                return job
        
        # Then try partial match
        for job in jobs:
            if job_title_lower in job.title.lower() or job.title.lower() in job_title_lower:
                return job
        
        return None
    
    def calculate_skill_match_score(self, candidate_skills: List[str], job_requirements: str) -> tuple:
        """Calculate skill match score and return matching skills"""
        if not candidate_skills or not job_requirements:
            return 0.0, []
        
        job_requirements_lower = job_requirements.lower()
        matching_skills = []
        
        for skill in candidate_skills:
            if skill.lower() in job_requirements_lower:
                matching_skills.append(skill)
        
        # Calculate score based on percentage of matching skills
        if len(candidate_skills) > 0:
            score = len(matching_skills) / len(candidate_skills)
        else:
            score = 0.0
        
        return score, matching_skills
    
    def extract_relevant_experience(self, work_experience: List[Dict], job_title: str, job_description: str) -> List[str]:
        """Extract relevant work experience based on job requirements"""
        relevant_exp = []
        job_keywords = job_title.lower().split() + job_description.lower().split()
        
        for exp in work_experience:
            exp_text = f"{exp.get('position', '')} {exp.get('company', '')} {exp.get('description', '')}".lower()
            
            # Check if any job keywords appear in the experience
            for keyword in job_keywords:
                if len(keyword) > 3 and keyword in exp_text:  # Only consider words longer than 3 chars
                    relevant_exp.append(f"{exp.get('position', 'Unknown')} at {exp.get('company', 'Unknown')}")
                    break
        
        return relevant_exp
    
    def match_candidates_to_job(self, job_title: str, top_n: int = 5) -> List[JobMatchResult]:
        """Match candidates to a specific job and return top matches"""
        # Find the job
        job = self.find_job_by_title(job_title)
        if not job:
            return []
        
        # Load all resumes
        resumes = self.load_resumes()
        if not resumes:
            return []
        
        results = []
        
        for resume in resumes:
            # Calculate skill match
            skill_score, matching_skills = self.calculate_skill_match_score(
                resume.skills, 
                f"{job.title} {job.description}"
            )
            
            # Extract relevant experience
            relevant_exp = self.extract_relevant_experience(
                [exp.dict() if hasattr(exp, 'dict') else exp for exp in resume.work_experience],
                job.title,
                job.description
            )
            
            # Calculate experience score
            exp_score = min(len(relevant_exp) * 0.2, 1.0)  # Max 1.0 for 5+ relevant experiences
            
            # Calculate education match (simple heuristic)
            education_score = 0.3 if resume.education else 0.0  # Basic score for having education
            education_match = "Has formal education" if resume.education else "No formal education listed"
            
            # Overall match score (weighted average)
            overall_score = (skill_score * 0.5) + (exp_score * 0.3) + (education_score * 0.2)
            
            # Generate AI summary
            summary = self.generate_match_summary(resume, job, matching_skills, relevant_exp, overall_score)
            
            result = JobMatchResult(
                candidate_name=resume.full_name or "Unknown",
                candidate_email=resume.email or "Unknown",
                match_score=round(overall_score * 100, 1),  # Convert to percentage
                matching_skills=matching_skills,
                relevant_experience=relevant_exp,
                education_match=education_match,
                summary=summary,
                resume_data=resume
            )
            
            results.append(result)
        
        # Sort by match score and return top N
        results.sort(key=lambda x: x.match_score, reverse=True)
        return results[:top_n]
    
    def generate_match_summary(self, resume: Resume, job: Job, matching_skills: List[str], 
                                relevant_exp: List[str], score: float) -> str:
        """Generate an AI-powered summary of the candidate match using LLMChain."""
        try:
            inputs = {
                "job_title": job.title,
                "job_description": job.description,
                "job_type": job.jobType,
                "employment_type": job.employmentType,
                "candidate_name": resume.full_name or "Unknown",
                "candidate_skills": ', '.join(resume.skills) if resume.skills else "None listed",
                "matching_skills": ', '.join(matching_skills) if matching_skills else "None",
                "relevant_experience": '; '.join(relevant_exp) if relevant_exp else "None identified",
                "education_count": len(resume.education),
                "overall_score": score
            }
            return self.match_summary_chain.run(inputs)
        except Exception as e:
            # Fallback summary if AI fails
            if score >= 0.7:
                return f"Strong candidate with {len(matching_skills)} matching skills and relevant experience. Highly recommended."
            elif score >= 0.4:
                return f"Good candidate with some matching skills ({len(matching_skills)}) and experience. Worth considering."
            else:
                return f"Limited match with few relevant skills ({len(matching_skills)}). May require additional training."
    
    def get_available_jobs(self, status_filter: str = None) -> List[Job]:
        """Get list of available jobs, optionally filtered by status"""
        jobs = self.load_jobs()
        
        if status_filter:
            jobs = [job for job in jobs if job.status.value.lower() == status_filter.lower()]
        
        return jobs
    
    def get_job_statistics(self) -> Dict[str, Any]:
        """Get statistics about jobs and candidates"""
        jobs = self.load_jobs()
        resumes = self.load_resumes()
        
        job_stats = {}
        for job in jobs:
            status = job.status.value
            job_stats[status] = job_stats.get(status, 0) + 1
        
        return {
            "total_jobs": len(jobs),
            "total_candidates": len(resumes),
            "jobs_by_status": job_stats,
            "employment_types": [job.employmentType.value for job in jobs],
            "job_types": [job.jobType.value for job in jobs]
        }
