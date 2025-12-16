"""
FastAPI backend for DocChat
"""
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import routers
from backend.routers import chat, sources, upload

# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting DocChat API...")
    yield
    logger.info("👋 Shutting down DocChat API...")

# Create FastAPI app
app = FastAPI(
    title="DocChat API",
    description="RAG-based document chat",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(sources.router, prefix="/api", tags=["sources"])
app.include_router(upload.router, prefix="/api", tags=["upload"])

# Health check endpoint
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
        "firecrawl_configured": bool(os.getenv("FIRECRAWL_API_KEY")),
        "zep_configured": bool(os.getenv("ZEP_API_KEY"))
    }

# Serve static frontend in production
# In development, frontend runs separately on port 3000
if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Catch-all route to serve Next.js app"""
        file_path = f"frontend/dist/{full_path}"
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse("frontend/dist/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
