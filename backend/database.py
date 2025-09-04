import sqlite3
import hashlib
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
import asyncio
from contextlib asynccontextmanager

class DocumentDatabase:
    def __init__(self, db_path: str = "legal_archive.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize database with proper schema and FTS5 support"""
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA foreign_keys = ON")
        
        # Create main documents table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                source TEXT NOT NULL,
                category TEXT,
                scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                content_hash TEXT UNIQUE NOT NULL,
                classification_data TEXT,
                indexed_at TIMESTAMP
            )
        """)
        
        # Create FTS5 virtual table for full-text search
        conn.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
                title, content, category, source,
                content='documents',
                content_rowid='id',
                tokenize='porter'
            )
        """)
        
        # Create indexes for performance
        conn.execute("CREATE INDEX IF NOT EXISTS idx_source ON documents(source)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_category ON documents(category)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_scraped_at ON documents(scraped_at)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_content_hash ON documents(content_hash)")
        
        conn.commit()
        conn.close()
    
    @asynccontextmanager
    async def get_connection(self):
        """Async context manager for database connections"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
    
    def generate_content_hash(self, content: str) -> str:
        """Generate unique hash for document content"""
        return hashlib.sha256(content.encode('utf-8')).hexdigest()
    
    async def insert_document(self, url: str, title: str, content: str, 
                            source: str, category: str = None, 
                            classification: Dict = None) -> bool:
        """Insert new document if it doesn't exist"""
        content_hash = self.generate_content_hash(content)
        
        async with self.get_connection() as conn:
            try:
                # Check if document already exists
                existing = conn.execute(
                    "SELECT id FROM documents WHERE content_hash = ?", 
                    (content_hash,)
                ).fetchone()
                
                if existing:
                    return False  # Document already exists
                
                # Insert new document
                classification_json = json.dumps(classification) if classification else None
                cursor = conn.execute("""
                    INSERT INTO documents (url, title, content, source, category, 
                                         content_hash, classification_data)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (url, title, content, source, category, content_hash, classification_json))
                
                doc_id = cursor.lastrowid
                
                # Insert into FTS table
                conn.execute("""
                    INSERT INTO documents_fts (rowid, title, content, category, source)
                    VALUES (?, ?, ?, ?, ?)
                """, (doc_id, title, content, category or '', source))
                
                conn.commit()
                return True
                
            except sqlite3.IntegrityError:
                return False  # Duplicate document
    
    async def search_documents(self, query: str = "", source: str = None, 
                             category: str = None, date_start: str = None,
                             date_end: str = None, sort_by: str = "relevance",
                             page: int = 1, limit: int = 10) -> Dict[str, Any]:
        """Advanced document search with filtering and pagination"""
        offset = (page - 1) * limit
        
        async with self.get_connection() as conn:
            # Build search conditions
            where_conditions = []
            params = []
            
            if query:
                # Use FTS5 for full-text search
                fts_query = f"documents_fts MATCH ?"
                where_conditions.append(f"d.id IN (SELECT rowid FROM documents_fts WHERE {fts_query})")
                params.append(query)
            
            if source:
                where_conditions.append("d.source = ?")
                params.append(source)
            
            if category:
                where_conditions.append("d.category = ?")
                params.append(category)
            
            if date_start:
                where_conditions.append("d.scraped_at >= ?")
                params.append(date_start)
            
            if date_end:
                where_conditions.append("d.scraped_at <= ?")
                params.append(date_end)
            
            where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
            
            # Build ORDER BY clause
            order_clause = {
                "relevance": "d.scraped_at DESC" if not query else "rank",
                "date": "d.scraped_at DESC",
                "title": "d.title COLLATE NOCASE ASC"
            }.get(sort_by, "d.scraped_at DESC")
            
            # Count total results
            count_query = f"""
                SELECT COUNT(*) 
                FROM documents d 
                WHERE {where_clause}
            """
            total_count = conn.execute(count_query, params).fetchone()[0]
            
            # Fetch paginated results
            search_query = f"""
                SELECT d.*, 
                       {f'rank' if query else '0'} as search_rank
                FROM documents d
                WHERE {where_clause}
                ORDER BY {order_clause}
                LIMIT ? OFFSET ?
            """
            
            results = conn.execute(search_query, params + [limit, offset]).fetchall()
            
            documents = []
            for row in results:
                doc = dict(row)
                if doc['classification_data']:
                    doc['classification'] = json.loads(doc['classification_data'])
                del doc['classification_data']
                documents.append(doc)
            
            return {
                "data": documents,
                "total": total_count,
                "page": page,
                "limit": limit
            }
    
    async def get_document(self, doc_id: int) -> Optional[Dict]:
        """Get single document by ID"""
        async with self.get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM documents WHERE id = ?", 
                (doc_id,)
            ).fetchone()
            
            if row:
                doc = dict(row)
                if doc['classification_data']:
                    doc['classification'] = json.loads(doc['classification_data'])
                del doc['classification_data']
                return doc
            return None
    
    async def get_categories(self) -> List[str]:
        """Get all unique categories"""
        async with self.get_connection() as conn:
            rows = conn.execute(
                "SELECT DISTINCT category FROM documents WHERE category IS NOT NULL ORDER BY category"
            ).fetchall()
            return [row[0] for row in rows]
    
    async def get_sources(self) -> List[str]:
        """Get all unique sources"""
        async with self.get_connection() as conn:
            rows = conn.execute(
                "SELECT DISTINCT source FROM documents ORDER BY source"
            ).fetchall()
            return [row[0] for row in rows]
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get database statistics"""
        async with self.get_connection() as conn:
            total_docs = conn.execute("SELECT COUNT(*) FROM documents").fetchone()[0]
            total_categories = conn.execute(
                "SELECT COUNT(DISTINCT category) FROM documents WHERE category IS NOT NULL"
            ).fetchone()[0]
            
            last_scraped = conn.execute(
                "SELECT MAX(scraped_at) FROM documents"
            ).fetchone()[0]
            
            # Get database file size
            import os
            db_size = os.path.getsize(self.db_path) if os.path.exists(self.db_path) else 0
            
            return {
                "totalDocuments": total_docs,
                "totalCategories": total_categories,
                "lastScraped": last_scraped or datetime.now().isoformat(),
                "databaseSize": db_size
            }
    
    async def update_classification(self, doc_id: int, classification: Dict):
        """Update document with AI classification results"""
        async with self.get_connection() as conn:
            conn.execute("""
                UPDATE documents 
                SET classification_data = ?, indexed_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (json.dumps(classification), doc_id))
            conn.commit()