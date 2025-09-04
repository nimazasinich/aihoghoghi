import pytest
import asyncio
import tempfile
import os
from unittest.mock import AsyncMock, patch
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import DocumentDatabase

class TestDocumentDatabase:
    @pytest.fixture
    async def db(self):
        """Create a temporary database for testing"""
        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp:
            db_path = tmp.name
        
        database = DocumentDatabase(db_path)
        yield database
        
        # Cleanup
        os.unlink(db_path)
    
    @pytest.mark.asyncio
    async def test_database_initialization(self, db):
        """Test database initialization"""
        assert os.path.exists(db.db_path)
        
        # Test that tables are created
        async with db.get_connection() as conn:
            cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            
            assert 'documents' in tables
            assert 'documents_fts' in tables
            assert 'search_cache' in tables
    
    @pytest.mark.asyncio
    async def test_insert_document(self, db):
        """Test document insertion"""
        test_doc = {
            'url': 'https://test.com/doc1',
            'title': 'Test Document',
            'content': 'This is a test document content',
            'source': 'test_source',
            'category': 'test_category'
        }
        
        result = await db.insert_document(**test_doc)
        assert result is True
        
        # Verify document was inserted
        async with db.get_connection() as conn:
            cursor = conn.execute("SELECT * FROM documents WHERE url = ?", (test_doc['url'],))
            row = cursor.fetchone()
            assert row is not None
            assert row[1] == test_doc['url']
            assert row[2] == test_doc['title']
    
    @pytest.mark.asyncio
    async def test_duplicate_document_prevention(self, db):
        """Test that duplicate documents are not inserted"""
        test_doc = {
            'url': 'https://test.com/doc1',
            'title': 'Test Document',
            'content': 'This is a test document content',
            'source': 'test_source'
        }
        
        # Insert first time
        result1 = await db.insert_document(**test_doc)
        assert result1 is True
        
        # Try to insert duplicate
        result2 = await db.insert_document(**test_doc)
        assert result2 is False
    
    @pytest.mark.asyncio
    async def test_search_documents(self, db):
        """Test document search functionality"""
        # Insert test documents
        docs = [
            {
                'url': 'https://test.com/doc1',
                'title': 'Legal Document 1',
                'content': 'This is about constitutional law',
                'source': 'test_source',
                'category': 'constitutional'
            },
            {
                'url': 'https://test.com/doc2',
                'title': 'Legal Document 2',
                'content': 'This is about criminal law',
                'source': 'test_source',
                'category': 'criminal'
            }
        ]
        
        for doc in docs:
            await db.insert_document(**doc)
        
        # Test search by query
        results = await db.search_documents(query="constitutional")
        assert len(results['data']) == 1
        assert results['data'][0]['title'] == 'Legal Document 1'
        
        # Test search by category
        results = await db.search_documents(category="criminal")
        assert len(results['data']) == 1
        assert results['data'][0]['title'] == 'Legal Document 2'
    
    @pytest.mark.asyncio
    async def test_search_caching(self, db):
        """Test search result caching"""
        # Insert test document
        await db.insert_document(
            url='https://test.com/doc1',
            title='Test Document',
            content='Test content',
            source='test_source'
        )
        
        # First search (should not be cached)
        results1 = await db.search_documents(query="test")
        
        # Second search (should be cached)
        results2 = await db.search_documents(query="test")
        
        assert results1 == results2
        
        # Verify cache entry exists
        async with db.get_connection() as conn:
            cursor = conn.execute("SELECT COUNT(*) FROM search_cache")
            cache_count = cursor.fetchone()[0]
            assert cache_count > 0
    
    @pytest.mark.asyncio
    async def test_get_database_stats(self, db):
        """Test database statistics"""
        # Insert test documents
        for i in range(3):
            await db.insert_document(
                url=f'https://test.com/doc{i}',
                title=f'Document {i}',
                content=f'Content {i}',
                source='test_source',
                category='test_category'
            )
        
        stats = await db.get_database_stats()
        
        assert stats['total_documents'] == 3
        assert stats['total_categories'] == 1
        assert stats['total_sources'] == 1
        assert 'database_size_mb' in stats
    
    @pytest.mark.asyncio
    async def test_bulk_insert(self, db):
        """Test bulk document insertion"""
        docs = [
            {
                'url': f'https://test.com/doc{i}',
                'title': f'Document {i}',
                'content': f'Content {i}',
                'source': 'test_source'
            }
            for i in range(5)
        ]
        
        inserted_count = await db.bulk_insert_documents(docs)
        assert inserted_count == 5
        
        # Verify all documents were inserted
        stats = await db.get_database_stats()
        assert stats['total_documents'] == 5