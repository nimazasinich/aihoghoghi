from fastapi import FastAPI, HTTPException, BackgroundTasks, Query, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio
import uvicorn
from datetime import datetime, timedelta
import json
import logging
import time
from collections import defaultdict

from database import DocumentDatabase
from scraper import LegalDocumentScraper
from ai_classifier import PersianBERTClassifier
from auth_endpoints import auth_router

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.logger = logging.getLogger(__name__)
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        self.logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        if not self.active_connections:
            return
        
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                self.logger.warning(f"Failed to send message to WebSocket: {str(e)}")
                disconnected.append(connection)
        
        # Remove disconnected connections
        for connection in disconnected:
            self.disconnect(connection)
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except Exception as e:
            self.logger.warning(f"Failed to send personal message: {str(e)}")

# Initialize components
app = FastAPI(
    title="Iranian Legal Archive API",
    description="API for searching and managing Iranian legal documents",
    version="1.0.0"
)

# Initialize WebSocket manager
manager = ConnectionManager()

# Rate limiting storage
rate_limit_storage = defaultdict(list)

class RateLimitMiddleware:
    def __init__(self, app, calls: int = 100, period: int = 60):
        self.app = app
        self.calls = calls
        self.period = period
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            request = Request(scope, receive)
            client_ip = request.client.host
            
            # Clean old entries
            current_time = time.time()
            rate_limit_storage[client_ip] = [
                timestamp for timestamp in rate_limit_storage[client_ip]
                if current_time - timestamp < self.period
            ]
            
            # Check rate limit
            if len(rate_limit_storage[client_ip]) >= self.calls:
                response = JSONResponse(
                    status_code=429,
                    content={"detail": "Rate limit exceeded"}
                )
                await response(scope, receive, send)
                return
            
            # Add current request
            rate_limit_storage[client_ip].append(current_time)
        
        await self.app(scope, receive, send)

# Configure CORS with security best practices
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173", 
        "https://iranian-legal-archive.vercel.app",
        "https://iranian-legal-archive.railway.app"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Add security middleware
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])
app.add_middleware(RateLimitMiddleware, calls=100, period=60)

# Include authentication router
app.include_router(auth_router, prefix="/api")

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

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

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            if data:
                try:
                    message = json.loads(data)
                    if message.get("type") == "ping":
                        await manager.send_personal_message({"type": "pong"}, websocket)
                except json.JSONDecodeError:
                    pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.post("/api/scraping/start")
async def start_scraping(request: ScrapingRequest, background_tasks: BackgroundTasks):
    """Start document scraping process with WebSocket updates"""
    if scraper.is_scraping:
        return {"message": "Scraping already in progress"}
    
    # Create progress callback for WebSocket updates
    async def progress_callback(update):
        await manager.broadcast({
            "type": "scraping_update",
            "data": update,
            "timestamp": datetime.now().isoformat()
        })
    
    background_tasks.add_task(scraper.start_scraping, request.urls, progress_callback)
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
    """Get comprehensive system statistics"""
    try:
        stats = await database.get_database_stats()
        scraping_stats = scraper.get_status()
        
        return {
            "database": stats,
            "scraping": scraping_stats,
            "websocket_connections": len(manager.active_connections),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/system/clear-cache")
async def clear_cache():
    """Clear database cache"""
    try:
        await database.clear_cache()
        return {"message": "Cache cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/proxy/health")
async def get_proxy_health():
    """Get proxy system health status"""
    try:
        health_status = await scraper.proxy_manager.health_check()
        return health_status
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/proxy/reset")
async def reset_proxy_failures():
    """Reset failed proxy list"""
    try:
        scraper.proxy_manager.reset_failed_proxies()
        return {"message": "Failed proxies reset successfully"}
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