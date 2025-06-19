# backend/main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

# Import your dependencies initialization/cleanup functions and router
from app.dependencies import initialize_supabase_client, close_supabase_client
from app.routes import router as mashup_router # Rename your router variable if needed

# Setup basic logging configuration
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logging.getLogger('hpack.hpack').setLevel(logging.INFO)
logging.getLogger('httpx').setLevel(logging.WARNING)  
logging.getLogger('httpcore.http2').setLevel(logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Code to run on startup ---
    logger.info("Application starting up...")
    await initialize_supabase_client() # Initialize Supabase client
    # Initialize other resources here if needed
    yield # The application runs while in the 'yield' block
    # --- Code to run on shutdown ---
    logger.info("Application shutting down...")
    await close_supabase_client() # Cleanup Supabase client
    # Cleanup other resources here

# Create the FastAPI app instance with the lifespan manager
app = FastAPI(
    title="Mashup API",
    description="Backend for BeatBox mashup generation.",
    lifespan=lifespan # Use the lifespan context manager
)

# Allow frontend to call backend
# IMPORTANT: Restrict allow_origins in production!
# Example: allow_origins=["http://localhost:3000", "https://your-frontend-domain.com"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # CHANGE THIS IN PRODUCTION
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include your API router - assuming your routes file defines 'router'
# Prefix with /api so endpoints are like /api/process-tracks
app.include_router(mashup_router, prefix="/api", tags=["Mashup"])

@app.get("/")
def root():
    # Simple root endpoint for health check or basic info
    return {"message": "Mashup API is running"}

# Note: No need for Request parameter in root() unless you specifically need it.
# Note: Renamed your imported router to mashup_router for clarity. Ensure app.routes defines 'router'.