#!/usr/bin/env python3
"""
System test script for Iranian Legal Archive System
Tests all major components to ensure they're working correctly
"""

import asyncio
import sys
import logging
from pathlib import Path

# Add backend to Python path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_database():
    """Test database functionality"""
    logger.info("Testing database...")
    try:
        from backend.database import DocumentDatabase
        
        # Create test database
        db = DocumentDatabase("test.db")
        
        # Test document insertion
        success = await db.insert_document(
            url="https://test.com/doc1",
            title="Test Document",
            content="This is a test document for system testing",
            source="test_source",
            category="test_category"
        )
        
        assert success, "Document insertion failed"
        
        # Test search
        results = await db.search_documents(query="test")
        assert len(results['data']) > 0, "Search returned no results"
        
        # Test statistics
        stats = await db.get_database_stats()
        assert stats['total_documents'] > 0, "No documents in database"
        
        logger.info("✅ Database tests passed")
        return True
        
    except Exception as e:
        logger.error(f"❌ Database test failed: {str(e)}")
        return False

async def test_ai_classifier():
    """Test AI classifier functionality"""
    logger.info("Testing AI classifier...")
    try:
        from backend.ai_classifier import PersianBERTClassifier
        
        classifier = PersianBERTClassifier()
        
        # Test classification
        test_text = "این یک قانون اساسی است که شامل اصول مهم می‌باشد"
        result = await classifier.classify_document(test_text)
        
        assert 'category' in result, "Classification result missing category"
        assert 'confidence' in result, "Classification result missing confidence"
        assert 'entities' in result, "Classification result missing entities"
        assert 'sentiment' in result, "Classification result missing sentiment"
        
        logger.info("✅ AI classifier tests passed")
        return True
        
    except Exception as e:
        logger.error(f"❌ AI classifier test failed: {str(e)}")
        return False

async def test_proxy_manager():
    """Test proxy manager functionality"""
    logger.info("Testing proxy manager...")
    try:
        from backend.proxy_manager import AdvancedProxyManager
        
        proxy_manager = AdvancedProxyManager()
        
        # Test health check
        health_status = await proxy_manager.health_check()
        assert len(health_status) > 0, "No proxy methods available"
        
        # Test statistics
        stats = proxy_manager.get_proxy_stats()
        assert isinstance(stats, dict), "Proxy stats should be a dictionary"
        
        logger.info("✅ Proxy manager tests passed")
        return True
        
    except Exception as e:
        logger.error(f"❌ Proxy manager test failed: {str(e)}")
        return False

async def test_scraper():
    """Test scraper functionality"""
    logger.info("Testing scraper...")
    try:
        from backend.scraper import LegalDocumentScraper
        from backend.database import DocumentDatabase
        from backend.ai_classifier import PersianBERTClassifier
        
        # Create test components
        db = DocumentDatabase("test_scraper.db")
        classifier = PersianBERTClassifier()
        scraper = LegalDocumentScraper(db, classifier)
        
        # Test status
        status = scraper.get_status()
        assert 'isActive' in status, "Scraper status missing isActive"
        assert 'documentsProcessed' in status, "Scraper status missing documentsProcessed"
        
        # Test document extraction
        test_html = """
        <html>
            <head><title>Test Document</title></head>
            <body>
                <h1>Test Legal Document</h1>
                <div class="content">
                    <p>This is a test legal document with sufficient content.</p>
                </div>
            </body>
        </html>
        """
        
        site_config = {
            'name': 'Test Site',
            'document_selectors': {
                'title': 'h1',
                'content': '.content',
                'category': '.category'
            }
        }
        
        result = scraper.extract_document_data(test_html, "https://test.com/doc", site_config)
        assert result is not None, "Document extraction failed"
        assert result['title'] == "Test Legal Document", "Title extraction failed"
        
        logger.info("✅ Scraper tests passed")
        return True
        
    except Exception as e:
        logger.error(f"❌ Scraper test failed: {str(e)}")
        return False

async def test_api():
    """Test API functionality"""
    logger.info("Testing API...")
    try:
        from fastapi.testclient import TestClient
        from backend.main import app
        
        client = TestClient(app)
        
        # Test root endpoint
        response = client.get("/")
        assert response.status_code == 200, "Root endpoint failed"
        
        # Test health endpoint
        response = client.get("/api/health")
        assert response.status_code == 200, "Health endpoint failed"
        
        # Test search endpoint
        response = client.get("/api/documents/search")
        assert response.status_code == 200, "Search endpoint failed"
        
        logger.info("✅ API tests passed")
        return True
        
    except Exception as e:
        logger.error(f"❌ API test failed: {str(e)}")
        return False

async def main():
    """Run all system tests"""
    logger.info("🧪 Starting Iranian Legal Archive System Tests...")
    
    tests = [
        ("Database", test_database),
        ("AI Classifier", test_ai_classifier),
        ("Proxy Manager", test_proxy_manager),
        ("Scraper", test_scraper),
        ("API", test_api)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        logger.info(f"\n{'='*50}")
        logger.info(f"Testing {test_name}")
        logger.info(f"{'='*50}")
        
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            logger.error(f"❌ {test_name} test crashed: {str(e)}")
            results.append((test_name, False))
    
    # Print summary
    logger.info(f"\n{'='*50}")
    logger.info("TEST SUMMARY")
    logger.info(f"{'='*50}")
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        logger.info(f"{test_name}: {status}")
        if result:
            passed += 1
    
    logger.info(f"\nResults: {passed}/{total} tests passed")
    
    if passed == total:
        logger.info("🎉 All tests passed! System is ready.")
        return True
    else:
        logger.error("❌ Some tests failed. Please check the logs.")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)