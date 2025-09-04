import pytest
import asyncio
import tempfile
import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def temp_db_path():
    """Create a temporary database file for testing"""
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp:
        db_path = tmp.name
    
    yield db_path
    
    # Cleanup
    if os.path.exists(db_path):
        os.unlink(db_path)

@pytest.fixture
def sample_document():
    """Sample document data for testing"""
    return {
        'url': 'https://test.com/sample-doc',
        'title': 'Sample Legal Document',
        'content': 'This is a sample legal document with sufficient content for testing purposes. It contains legal terminology and Persian text.',
        'source': 'test_source',
        'category': 'قانون اساسی',
        'entities': [
            {'text': 'آقای احمدی', 'label': 'PERSON', 'start': 0, 'end': 10, 'confidence': 0.9},
            {'text': 'وزارت دادگستری', 'label': 'ORG', 'start': 15, 'end': 30, 'confidence': 0.8}
        ],
        'sentiment': 0.2,
        'confidence': 0.85,
        'metadata': {
            'scraping_method': 'test',
            'content_length': 150,
            'processing_time': '2024-01-01T00:00:00'
        }
    }

@pytest.fixture
def sample_html():
    """Sample HTML content for testing"""
    return """
    <html>
        <head>
            <title>Test Legal Document</title>
        </head>
        <body>
            <h1>قانون اساسی جمهوری اسلامی ایران</h1>
            <div class="content">
                <p>ماده 1: نظام جمهوری اسلامی ایران</p>
                <p>این قانون در تاریخ 1358/11/12 به تصویب رسید.</p>
                <p>آقای خمینی رهبر انقلاب اسلامی بود.</p>
            </div>
            <div class="category">قانون اساسی</div>
        </body>
    </html>
    """

@pytest.fixture
def sample_site_config():
    """Sample site configuration for testing"""
    return {
        'name': 'Test Legal Site',
        'base_url': 'https://test.com',
        'document_selectors': {
            'title': 'h1',
            'content': '.content',
            'category': '.category'
        },
        'pagination': '.pagination a',
        'delay': (1, 2)
    }