import pytest
import asyncio
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch, MagicMock
from bs4 import BeautifulSoup

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from scraper import LegalDocumentScraper, LEGAL_SITES

class TestLegalDocumentScraper:
    @pytest.fixture
    def mock_database(self):
        """Create mock database for testing"""
        db = AsyncMock()
        db.insert_document = AsyncMock(return_value=True)
        return db
    
    @pytest.fixture
    def mock_ai_classifier(self):
        """Create mock AI classifier for testing"""
        classifier = AsyncMock()
        classifier.classify_document = AsyncMock(return_value={
            'category': 'test_category',
            'confidence': 0.8,
            'entities': [{'text': 'test entity', 'label': 'PERSON'}],
            'sentiment': {'positive': 0.6, 'negative': 0.2, 'neutral': 0.2}
        })
        return classifier
    
    @pytest.fixture
    def scraper(self, mock_database, mock_ai_classifier):
        """Create scraper instance for testing"""
        return LegalDocumentScraper(mock_database, mock_ai_classifier)
    
    def test_initialization(self, scraper):
        """Test scraper initialization"""
        assert scraper.database is not None
        assert scraper.ai_classifier is not None
        assert scraper.proxy_manager is not None
        assert scraper.is_scraping is False
        assert scraper.documents_processed == 0
    
    def test_extract_document_data(self, scraper):
        """Test document data extraction from HTML"""
        html = """
        <html>
            <head><title>Test Document</title></head>
            <body>
                <h1>Test Legal Document</h1>
                <div class="content">
                    <p>This is the main content of the legal document.</p>
                    <p>It contains important legal information.</p>
                </div>
                <div class="category">قانون اساسی</div>
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
        
        result = scraper.extract_document_data(html, "https://test.com/doc", site_config)
        
        assert result is not None
        assert result['title'] == "Test Legal Document"
        assert "main content" in result['content']
        assert result['category'] == "قانون اساسی"
        assert result['source'] == "Test Site"
        assert result['url'] == "https://test.com/doc"
    
    def test_extract_document_data_invalid(self, scraper):
        """Test document data extraction with invalid HTML"""
        html = "<html><body><p>Too short content</p></body></html>"
        
        site_config = {
            'name': 'Test Site',
            'document_selectors': {
                'title': 'h1',
                'content': 'p',
                'category': '.category'
            }
        }
        
        result = scraper.extract_document_data(html, "https://test.com/doc", site_config)
        
        # Should return None for invalid content
        assert result is None
    
    def test_is_document_url(self, scraper):
        """Test URL filtering for document detection"""
        site_config = {'name': 'Test Site'}
        
        # Valid document URLs
        valid_urls = [
            "https://test.com/law/123",
            "https://test.com/regulation/456",
            "https://test.com/قانون/789",
            "https://test.com/رأی/101"
        ]
        
        for url in valid_urls:
            assert scraper.is_document_url(url, site_config) is True
        
        # Invalid URLs
        invalid_urls = [
            "https://test.com/about",
            "https://test.com/contact",
            "https://test.com/news"
        ]
        
        for url in invalid_urls:
            assert scraper.is_document_url(url, site_config) is False
    
    @pytest.mark.asyncio
    async def test_scrape_document_success(self, scraper):
        """Test successful document scraping"""
        html = """
        <html>
            <head><title>Test Document</title></head>
            <body>
                <h1>Test Legal Document</h1>
                <div class="content">
                    <p>This is a comprehensive legal document with sufficient content to pass validation.</p>
                    <p>It contains detailed legal information and analysis.</p>
                    <p>The document is properly formatted and structured.</p>
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
            },
            'delay': (0.1, 0.2)
        }
        
        with patch.object(scraper, 'fetch_with_retry', return_value=html):
            result = await scraper.scrape_document("https://test.com/doc", site_config)
            
            assert result is True
            assert scraper.documents_processed == 1
            
            # Verify database was called
            scraper.database.insert_document.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_scrape_document_failure(self, scraper):
        """Test document scraping failure"""
        with patch.object(scraper, 'fetch_with_retry', return_value=None):
            result = await scraper.scrape_document("https://test.com/doc", {})
            
            assert result is False
            assert scraper.error_count == 1
    
    @pytest.mark.asyncio
    async def test_scrape_document_with_progress_callback(self, scraper):
        """Test document scraping with progress callback"""
        html = """
        <html>
            <head><title>Test Document</title></head>
            <body>
                <h1>Test Legal Document</h1>
                <div class="content">
                    <p>This is a comprehensive legal document with sufficient content.</p>
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
            },
            'delay': (0.1, 0.2)
        }
        
        progress_calls = []
        
        async def mock_callback(update):
            progress_calls.append(update)
        
        scraper.progress_callback = mock_callback
        
        with patch.object(scraper, 'fetch_with_retry', return_value=html):
            result = await scraper.scrape_document("https://test.com/doc", site_config)
            
            assert result is True
            assert len(progress_calls) == 1
            assert progress_calls[0]['status'] == 'completed'
    
    @pytest.mark.asyncio
    async def test_discover_document_urls(self, scraper):
        """Test document URL discovery"""
        html = """
        <html>
            <body>
                <a href="/law/doc1">Legal Document 1</a>
                <a href="/regulation/doc2">Regulation Document</a>
                <a href="/about">About Page</a>
                <a href="/قانون/doc3">Persian Law Document</a>
            </body>
        </html>
        """
        
        site_config = {
            'name': 'Test Site',
            'base_url': 'https://test.com',
            'document_selectors': {
                'title': 'h1',
                'content': '.content',
                'category': '.category'
            }
        }
        
        with patch.object(scraper, 'fetch_with_retry', return_value=html):
            urls = await scraper.discover_document_urls("https://test.com", site_config)
            
            # Should find document URLs but not about page
            assert len(urls) >= 3
            assert any("/law/doc1" in url for url in urls)
            assert any("/regulation/doc2" in url for url in urls)
            assert any("/قانون/doc3" in url for url in urls)
    
    def test_get_status(self, scraper):
        """Test scraper status retrieval"""
        scraper.is_scraping = True
        scraper.current_url = "https://test.com/doc"
        scraper.documents_processed = 5
        scraper.total_documents = 10
        scraper.error_count = 1
        
        status = scraper.get_status()
        
        assert status['isActive'] is True
        assert status['currentUrl'] == "https://test.com/doc"
        assert status['documentsProcessed'] == 5
        assert status['totalDocuments'] == 10
        assert status['errorCount'] == 1
        assert 'proxyStats' in status
        assert 'successRate' in status
    
    def test_stop_scraping(self, scraper):
        """Test scraper stop functionality"""
        scraper.is_scraping = True
        scraper.current_url = "https://test.com/doc"
        
        scraper.stop_scraping()
        
        assert scraper.is_scraping is False
        assert scraper.current_url == ""
    
    def test_set_progress_callback(self, scraper):
        """Test progress callback setting"""
        async def test_callback(update):
            pass
        
        scraper.set_progress_callback(test_callback)
        
        assert scraper.progress_callback == test_callback