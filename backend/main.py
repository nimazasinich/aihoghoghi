from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio
import uvicorn
from datetime import datetime

from database import DocumentDatabase
from scraper import LegalDocumentScraper
from ai_classifier import PersianBERTClassifier

# Initialize components
app = FastAPI(
    title="Iranian Legal Archive API",
    description="API for searching and managing Iranian legal documents",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database and AI classifier
database = DocumentDatabase()
ai_classifier = PersianBERTClassifier()
scraper = LegalDocumentScraper(database, ai_classifier)

# Pydantic models
class SearchRequest(BaseModel):
    query: Optional[str] = ""
    source: Optional[str] = None
    category: Optional[str] = None
    date_start: Optional[str] = None
    date_end: Optional[str] = None
    sort_by: Optional[str] = "relevance"

class ScrapingRequest(BaseModel):
    urls: Optional[List[str]] = None

class ClassificationRequest(BaseModel):
    text: str

# API Routes
@app.get("/")
async def root():
    return {"message": "Iranian Legal Archive API", "version": "1.0.0"}

@app.get("/api/documents/search")
async def search_documents(
    query: Optional[str] = Query(""),
    source: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    date_start: Optional[str] = Query(None),
    date_end: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("relevance"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
):
    """Search documents with filters and pagination"""
    try:
        results = await database.search_documents(
            query=query,
            source=source,
            category=category,
            date_start=date_start,
            date_end=date_end,
            sort_by=sort_by,
            page=page,
            limit=limit
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents/{doc_id}")
async def get_document(doc_id: int):
    """Get single document by ID"""
    try:
        document = await database.get_document(doc_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        return document
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents/categories")
async def get_categories():
    """Get all available document categories"""
    try:
        categories = await database.get_categories()
        return categories
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents/sources")
async def get_sources():
    """Get all available document sources"""
    try:
        sources = await database.get_sources()
        return sources
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scraping/start")
async def start_scraping(request: ScrapingRequest, background_tasks: BackgroundTasks):
    """Start document scraping process"""
    if scraper.is_scraping:
        return {"message": "Scraping already in progress"}
    
    background_tasks.add_task(scraper.start_scraping, request.urls)
    return {"message": "Scraping started successfully"}

@app.post("/api/scraping/stop")
async def stop_scraping():
    """Stop document scraping process"""
    scraper.stop_scraping()
    return {"message": "Scraping stopped"}

@app.get("/api/scraping/status")
async def get_scraping_status():
    """Get current scraping status"""
    return scraper.get_status()

@app.post("/api/ai/classify")
async def classify_text(request: ClassificationRequest):
    """Classify Persian text using AI models"""
    try:
        classification = await ai_classifier.classify_document(request.text)
        return classification
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/system/stats")
async def get_system_stats():
    """Get system statistics"""
    try:
        stats = await database.get_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "database": "connected",
        "ai_models": "loaded"
    }

# Error handlers
@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )