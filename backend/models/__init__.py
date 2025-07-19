from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

class JobType(str, Enum):
    ONSITE = "OnSite"
    REMOTE = "Remote"
    HYBRID = "Hybrid"

class EmploymentType(str, Enum):
    FULL_TIME = "Full-Time"
    PART_TIME = "Part-Time"
    CONTRACT = "Contract"
    INTERNSHIP = "Internship"

class JobStatus(str, Enum):
    OPEN = "Open"
    CLOSED = "Closed"
    PAUSED = "Paused"

class Job(BaseModel):
    jobId: int
    clientId: int
    title: str
    description: str
    jobType: JobType
    employmentType: EmploymentType
    status: JobStatus
    createdDate: str

class WorkExperience(BaseModel):
    position: Optional[str] = None
    company: Optional[str] = None
    duration: Optional[str] = None
    description: Optional[str] = None

class Education(BaseModel):
    degree: Optional[str] = None
    institution: Optional[str] = None
    year: Optional[str] = None
    field: Optional[str] = None

class Certification(BaseModel):
    title: Optional[str] = None
    issuer: Optional[str] = None
    date: Optional[str] = None

class Resume(BaseModel):
    filename: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    skills: List[str] = []
    work_experience: List[WorkExperience] = []
    education: List[Education] = []
    certifications: List[Certification] = []
    timestamp: Optional[str] = None

class JobMatchResult(BaseModel):
    candidate_name: str
    candidate_email: str
    match_score: float
    matching_skills: List[str]
    relevant_experience: List[str]
    education_match: str
    summary: str
    resume_data: Resume
