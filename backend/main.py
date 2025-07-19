from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.resume import router as resume_router
from routes.jobs import router as jobs_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001", 
        "http://127.0.0.1:3001",
        "http://localhost:3000", 
        "http://127.0.0.1:3000"
    ],  # Allow both localhost and 127.0.0.1
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume_router, prefix="/api/resume")
app.include_router(jobs_router, prefix="/api/jobs")

@app.get("/")
def read_root():
    return {"message": "StaffPilot API is running - Resume Parser & Job Matching"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
