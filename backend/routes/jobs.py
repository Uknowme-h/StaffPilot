from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from services import JobMatchingService
from models import JobMatchResult, Job
from typing import List, Optional
from datetime import datetime

router = APIRouter()

# Initialize Job Matching Service
job_service = JobMatchingService()

class JobMatchRequest(BaseModel):
    job_title: str
    top_candidates: Optional[int] = 5

class JobListRequest(BaseModel):
    status_filter: Optional[str] = None

@router.post("/match-candidates", response_model=List[JobMatchResult])
async def match_candidates_to_job(request: JobMatchRequest):
    """Match candidates to a specific job position"""
    try:
        if not request.job_title.strip():
            raise HTTPException(status_code=400, detail="Job title cannot be empty")
        
        results = job_service.match_candidates_to_job(
            job_title=request.job_title.strip(),
            top_n=request.top_candidates
        )
        
        if not results:
            # Check if job exists
            job = job_service.find_job_by_title(request.job_title)
            if not job:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Job with title '{request.job_title}' not found"
                )
            else:
                return []  # Job exists but no matching candidates
        
        return results
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error matching candidates: {str(e)}")

@router.get("/jobs", response_model=List[Job])
async def get_available_jobs(status: Optional[str] = Query(None, description="Filter by job status (Open/Closed/Paused)")):
    """Get list of available jobs, optionally filtered by status"""
    try:
        jobs = job_service.get_available_jobs(status_filter=status)
        return jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching jobs: {str(e)}")

@router.get("/jobs/search")
async def search_jobs(
    title: Optional[str] = Query(None, description="Search by job title"),
    job_type: Optional[str] = Query(None, description="Filter by job type (OnSite/Remote/Hybrid)"),
    employment_type: Optional[str] = Query(None, description="Filter by employment type (Full-Time/Part-Time/Contract)")
):
    """Search jobs by various criteria"""
    try:
        jobs = job_service.get_available_jobs()
        
        # Apply filters
        if title:
            jobs = [job for job in jobs if title.lower() in job.title.lower()]
        
        if job_type:
            jobs = [job for job in jobs if job.jobType.value.lower() == job_type.lower()]
        
        if employment_type:
            jobs = [job for job in jobs if job.employmentType.value.lower() == employment_type.lower()]
        
        return jobs
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching jobs: {str(e)}")

@router.get("/jobs/{job_id}")
async def get_job_by_id(job_id: int):
    """Get specific job by ID"""
    try:
        jobs = job_service.load_jobs()
        job = next((job for job in jobs if job.jobId == job_id), None)
        
        if not job:
            raise HTTPException(status_code=404, detail=f"Job with ID {job_id} not found")
        
        return job
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching job: {str(e)}")

@router.get("/statistics")
async def get_job_statistics():
    """Get statistics about jobs and candidates"""
    try:
        stats = job_service.get_job_statistics()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching statistics: {str(e)}")

@router.post("/quick-match")
async def quick_match_candidate(candidate_email: str, job_title: str):
    """Quick match a specific candidate to a job"""
    try:
        # Load specific candidate
        resumes = job_service.load_resumes()
        candidate = next((resume for resume in resumes if resume.email == candidate_email), None)
        
        if not candidate:
            raise HTTPException(status_code=404, detail=f"Candidate with email {candidate_email} not found")
        
        # Find job
        job = job_service.find_job_by_title(job_title)
        if not job:
            raise HTTPException(status_code=404, detail=f"Job '{job_title}' not found")
        
        # Calculate match for this specific candidate
        skill_score, matching_skills = job_service.calculate_skill_match_score(
            candidate.skills, 
            f"{job.title} {job.description}"
        )
        
        relevant_exp = job_service.extract_relevant_experience(
            [exp.dict() if hasattr(exp, 'dict') else exp for exp in candidate.work_experience],
            job.title,
            job.description
        )
        
        exp_score = min(len(relevant_exp) * 0.2, 1.0)
        education_score = 0.3 if candidate.education else 0.0
        overall_score = (skill_score * 0.5) + (exp_score * 0.3) + (education_score * 0.2)
        
        summary = job_service.generate_match_summary(candidate, job, matching_skills, relevant_exp, overall_score)
        
        result = JobMatchResult(
            candidate_name=candidate.full_name or "Unknown",
            candidate_email=candidate.email or "Unknown",
            match_score=round(overall_score * 100, 1),
            matching_skills=matching_skills,
            relevant_experience=relevant_exp,
            education_match="Has formal education" if candidate.education else "No formal education listed",
            summary=summary,
            resume_data=candidate
        )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in quick match: {str(e)}")
