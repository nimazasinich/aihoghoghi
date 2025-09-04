import pytest
import asyncio
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
import json

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app

class TestMainAPI:
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    def test_root_endpoint(self, client):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Iranian Legal Archive API"
        assert data["version"] == "1.0.0"
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
    
    @patch('main.database.search_documents')
    def test_search_documents(self, mock_search, client):
        """Test document search endpoint"""
        mock_search.return_value = {
            "data": [
                {
                    "id": 1,
                    "title": "Test Document",
                    "content": "Test content",
                    "source": "test_source",
                    "category": "test_category"
                }
            ],
            "total": 1,
            "page": 1,
            "limit": 10
        }
        
        response = client.get("/api/documents/search?query=test")
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 1
        assert data["data"][0]["title"] == "Test Document"
    
    @patch('main.database.get_document')
    def test_get_document(self, mock_get_doc, client):
        """Test get single document endpoint"""
        mock_get_doc.return_value = {
            "id": 1,
            "title": "Test Document",
            "content": "Test content",
            "source": "test_source"
        }
        
        response = client.get("/api/documents/1")
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Test Document"
    
    @patch('main.database.get_document')
    def test_get_document_not_found(self, mock_get_doc, client):
        """Test get document not found"""
        mock_get_doc.return_value = None
        
        response = client.get("/api/documents/999")
        assert response.status_code == 404
    
    @patch('main.database.get_categories')
    def test_get_categories(self, mock_get_cats, client):
        """Test get categories endpoint"""
        mock_get_cats.return_value = ["قانون اساسی", "قوانین عادی", "آیین‌نامه"]
        
        response = client.get("/api/documents/categories")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        assert "قانون اساسی" in data
    
    @patch('main.database.get_sources')
    def test_get_sources(self, mock_get_sources, client):
        """Test get sources endpoint"""
        mock_get_sources.return_value = ["rc.majlis.ir", "divan-edalat.ir"]
        
        response = client.get("/api/documents/sources")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert "rc.majlis.ir" in data
    
    @patch('main.scraper.is_scraping', False)
    @patch('main.scraper.start_scraping')
    def test_start_scraping(self, mock_start, client):
        """Test start scraping endpoint"""
        mock_start.return_value = None
        
        response = client.post("/api/scraping/start", json={"urls": ["https://test.com"]})
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Scraping started successfully"
    
    @patch('main.scraper.is_scraping', True)
    def test_start_scraping_already_running(self, client):
        """Test start scraping when already running"""
        response = client.post("/api/scraping/start", json={"urls": ["https://test.com"]})
        assert response.status_code == 200
        data = response.json()
        assert "already in progress" in data["message"]
    
    @patch('main.scraper.stop_scraping')
    def test_stop_scraping(self, mock_stop, client):
        """Test stop scraping endpoint"""
        mock_stop.return_value = None
        
        response = client.post("/api/scraping/stop")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Scraping stopped"
    
    @patch('main.scraper.get_status')
    def test_get_scraping_status(self, mock_status, client):
        """Test get scraping status endpoint"""
        mock_status.return_value = {
            "isActive": True,
            "currentUrl": "https://test.com/doc",
            "documentsProcessed": 5,
            "totalDocuments": 10,
            "errorCount": 0
        }
        
        response = client.get("/api/scraping/status")
        assert response.status_code == 200
        data = response.json()
        assert data["isActive"] is True
        assert data["documentsProcessed"] == 5
    
    @patch('main.ai_classifier.classify_document')
    def test_classify_text(self, mock_classify, client):
        """Test text classification endpoint"""
        mock_classify.return_value = {
            "category": "قانون اساسی",
            "confidence": 0.8,
            "entities": [{"text": "test", "label": "PERSON"}],
            "sentiment": {"positive": 0.6, "negative": 0.2, "neutral": 0.2}
        }
        
        response = client.post("/api/ai/classify", json={"text": "test text"})
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "قانون اساسی"
        assert data["confidence"] == 0.8
    
    @patch('main.database.get_database_stats')
    @patch('main.scraper.get_status')
    def test_get_system_stats(self, mock_scraper_status, mock_db_stats, client):
        """Test system statistics endpoint"""
        mock_db_stats.return_value = {
            "total_documents": 100,
            "total_categories": 5,
            "total_sources": 3
        }
        mock_scraper_status.return_value = {
            "isActive": False,
            "documentsProcessed": 0
        }
        
        response = client.get("/api/system/stats")
        assert response.status_code == 200
        data = response.json()
        assert "database" in data
        assert "scraping" in data
        assert "websocket_connections" in data
        assert data["database"]["total_documents"] == 100
    
    @patch('main.database.clear_cache')
    def test_clear_cache(self, mock_clear, client):
        """Test clear cache endpoint"""
        mock_clear.return_value = None
        
        response = client.post("/api/system/clear-cache")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Cache cleared successfully"
    
    @patch('main.scraper.proxy_manager.health_check')
    def test_get_proxy_health(self, mock_health, client):
        """Test proxy health endpoint"""
        mock_health.return_value = {
            "direct": {"status": "healthy"},
            "iranian_dns": {"status": "healthy"},
            "cors_proxy": {"status": "unhealthy"}
        }
        
        response = client.get("/api/proxy/health")
        assert response.status_code == 200
        data = response.json()
        assert data["direct"]["status"] == "healthy"
        assert data["cors_proxy"]["status"] == "unhealthy"
    
    @patch('main.scraper.proxy_manager.reset_failed_proxies')
    def test_reset_proxy_failures(self, mock_reset, client):
        """Test reset proxy failures endpoint"""
        mock_reset.return_value = None
        
        response = client.post("/api/proxy/reset")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Failed proxies reset successfully"
    
    def test_websocket_connection(self, client):
        """Test WebSocket connection"""
        with client.websocket_connect("/ws") as websocket:
            # Send ping message
            websocket.send_text(json.dumps({"type": "ping"}))
            
            # Receive pong response
            data = websocket.receive_json()
            assert data["type"] == "pong"
    
    def test_invalid_endpoint(self, client):
        """Test invalid endpoint returns 404"""
        response = client.get("/api/invalid/endpoint")
        assert response.status_code == 404