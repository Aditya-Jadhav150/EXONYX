import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api import routes, survey
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="EXONYX AI-assisted Exoplanet Discovery API",
    description="Backend API for light curve processing, transit detection, and validation.",
    version="1.0.0"
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend URL
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for MCMC corner plots
os.makedirs("data_cache/mcmc", exist_ok=True)
app.mount("/mcmc", StaticFiles(directory="data_cache/mcmc"), name="mcmc")

app.include_router(routes.router, prefix="/api/v1")
app.include_router(survey.router, prefix="/api/v1/survey")

@app.get("/")
async def root():
    return {"message": "Welcome to the EXONYX API"}
