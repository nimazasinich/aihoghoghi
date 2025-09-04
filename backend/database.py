import sqlite3
import hashlib
import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime
import asyncio
from contextlib asynccontextmanager
import logging

class DocumentDatabase:
    def __init__(self, db_path: str = "backend/legal_archive.db"):
        self.db_path = db_path
        self.logger = logging.getLogger(__name__)
        self.init_database()
    
    def init_database(self):
        """Initialize database with proper schema and FTS5 support"""
        # Ensure directory exists
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA synchronous = NORMAL")
        conn.execute("PRAGMA cache_size = 10000")
        conn.execute("PRAGMA temp_store = MEMORY")
        
        # Create main documents table with enhanced schema
        conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                source TEXT NOT NULL,
                category TEXT,
                entities TEXT, -- JSON string
                sentiment REAL,
                confidence REAL,
                scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                content_hash TEXT UNIQUE,
                metadata TEXT, -- JSON string
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
        
        # Create cache table for performance
        conn.execute("""
            CREATE TABLE IF NOT EXISTS search_cache (
                query_hash TEXT PRIMARY KEY,
                query TEXT NOT NULL,
                results TEXT NOT NULL, -- JSON string
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP
            )
        """)
        
        # Create indexes for performance
        conn.execute("CREATE INDEX IF NOT EXISTS idx_source ON documents(source)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_category ON documents(category)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_scraped_at ON documents(scraped_at)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_content_hash ON documents(content_hash)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sentiment ON documents(sentiment)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_confidence ON documents(confidence)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_cache_expires ON search_cache(expires_at)")
        
        # Create triggers to keep FTS5 in sync
        conn.execute("""
            CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
                INSERT INTO documents_fts(rowid, title, content, category, source)
                VALUES (new.id, new.title, new.content, new.category, new.source);
            END
        """)
        
        conn.execute("""
            CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
                INSERT INTO documents_fts(documents_fts, rowid, title, content, category, source)
                VALUES('delete', old.id, old.title, old.content, old.category, old.source);
            END
        """)
        
        conn.execute("""
            CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
                INSERT INTO documents_fts(documents_fts, rowid, title, content, category, source)
                VALUES('delete', old.id, old.title, old.content, old.category, old.source);
                INSERT INTO documents_fts(rowid, title, content, category, source)
                VALUES (new.id, new.title, new.content, new.category, new.source);
            END
        """)
        
        conn.commit()
        conn.close()
        self.logger.info(f"Database initialized at {self.db_path}")
    
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
                            classification: Dict = None, entities: List = None,
                            sentiment: float = None, confidence: float = None,
                            metadata: Dict = None) -> bool:
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
                
                # Insert new document with enhanced schema
                classification_json = json.dumps(classification) if classification else None
                entities_json = json.dumps(entities) if entities else None
                metadata_json = json.dumps(metadata) if metadata else None
                
                cursor = conn.execute("""
                    INSERT INTO documents (url, title, content, source, category, 
                                         entities, sentiment, confidence, content_hash, 
                                         metadata, classification_data)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (url, title, content, source, category, entities_json, 
                      sentiment, confidence, content_hash, metadata_json, classification_json))
                
                conn.commit()
                return True
                
            except sqlite3.IntegrityError as e:
                self.logger.warning(f"Duplicate document: {url}")
                return False
            except Exception as e:
                self.logger.error(f"Error inserting document: {str(e)}")
                return False
    
    async def search_documents(self, query: str = "", source: str = None, 
                             category: str = None, date_start: str = None,
                             date_end: str = None, sort_by: str = "relevance",
                             page: int = 1, limit: int = 10) -> Dict[str, Any]:
        """Advanced document search with filtering, pagination, and caching"""
        offset = (page - 1) * limit
        
        # Check cache first
        query_hash = hashlib.md5(f"{query}_{source}_{category}_{date_start}_{date_end}_{sort_by}_{page}_{limit}".encode()).hexdigest()
        
        async with self.get_connection() as conn:
            # Check cache
            cache_result = conn.execute("""
                SELECT results FROM search_cache 
                WHERE query_hash = ? AND expires_at > datetime('now')
            """, (query_hash,)).fetchone()
            
            if cache_result:
                self.logger.info(f"Cache hit for query: {query}")
                return json.loads(cache_result[0])
            
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
                "title": "d.title COLLATE NOCASE ASC",
                "sentiment": "d.sentiment DESC",
                "confidence": "d.confidence DESC"
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
                SELECT d.id, d.url, d.title, d.content, d.source, d.category, 
                       d.entities, d.sentiment, d.confidence, d.scraped_at, d.metadata,
                       {f'rank' if query else '0'} as search_rank
                FROM documents d
                WHERE {where_clause}
                ORDER BY {order_clause}
                LIMIT ? OFFSET ?
            """
            
            results = conn.execute(search_query, params + [limit, offset]).fetchall()
            
            documents = []
            for row in results:
                doc = {
                    "id": row[0],
                    "url": row[1],
                    "title": row[2],
                    "content": row[3][:500] + "..." if len(row[3]) > 500 else row[3],
                    "source": row[4],
                    "category": row[5],
                    "entities": json.loads(row[6]) if row[6] else [],
                    "sentiment": row[7],
                    "confidence": row[8],
                    "scraped_at": row[9],
                    "metadata": json.loads(row[10]) if row[10] else {},
                    "search_rank": row[11]
                }
                documents.append(doc)
            
            result = {
                "data": documents,
                "total": total_count,
                "page": page,
                "limit": limit,
                "has_more": (page * limit) < total_count
            }
            
            # Cache results for 1 hour
            expires_at = datetime.now().timestamp() + 3600
            conn.execute("""
                INSERT OR REPLACE INTO search_cache (query_hash, query, results, expires_at)
                VALUES (?, ?, ?, ?)
            """, (query_hash, f"{query}_{source}_{category}", json.dumps(result), expires_at))
            
            conn.commit()
            return result
    
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
    
    async def clear_cache(self):
        """Clear expired cache entries"""
        async with self.get_connection() as conn:
            conn.execute("DELETE FROM search_cache WHERE expires_at < datetime('now')")
            conn.commit()
            self.logger.info("Cache cleared")
    
    async def get_database_stats(self) -> Dict[str, Any]:
        """Get comprehensive database statistics"""
        async with self.get_connection() as conn:
            stats = {}
            
            # Basic counts
            stats["total_documents"] = conn.execute("SELECT COUNT(*) FROM documents").fetchone()[0]
            stats["total_categories"] = conn.execute("SELECT COUNT(DISTINCT category) FROM documents WHERE category IS NOT NULL").fetchone()[0]
            stats["total_sources"] = conn.execute("SELECT COUNT(DISTINCT source) FROM documents").fetchone()[0]
            
            # Cache stats
            stats["cached_queries"] = conn.execute("SELECT COUNT(*) FROM search_cache WHERE expires_at > datetime('now')").fetchone()[0]
            
            # Recent activity
            stats["documents_last_24h"] = conn.execute("""
                SELECT COUNT(*) FROM documents 
                WHERE scraped_at > datetime('now', '-1 day')
            """).fetchone()[0]
            
            # Top categories
            top_categories = conn.execute("""
                SELECT category, COUNT(*) as count 
                FROM documents 
                WHERE category IS NOT NULL 
                GROUP BY category 
                ORDER BY count DESC 
                LIMIT 5
            """).fetchall()
            stats["top_categories"] = [{"category": row[0], "count": row[1]} for row in top_categories]
            
            # Top sources
            top_sources = conn.execute("""
                SELECT source, COUNT(*) as count 
                FROM documents 
                GROUP BY source 
                ORDER BY count DESC 
                LIMIT 5
            """).fetchall()
            stats["top_sources"] = [{"source": row[0], "count": row[1]} for row in top_sources]
            
            # Database size
            if os.path.exists(self.db_path):
                stats["database_size_mb"] = round(os.path.getsize(self.db_path) / (1024 * 1024), 2)
            
            return stats
    
    async def bulk_insert_documents(self, documents: List[Dict]) -> int:
        """Bulk insert multiple documents efficiently"""
        inserted_count = 0
        
        async with self.get_connection() as conn:
            for doc in documents:
                try:
                    content_hash = self.generate_content_hash(doc['content'])
                    
                    # Check if document already exists
                    existing = conn.execute(
                        "SELECT id FROM documents WHERE content_hash = ?", 
                        (content_hash,)
                    ).fetchone()
                    
                    if existing:
                        continue
                    
                    # Insert document
                    conn.execute("""
                        INSERT INTO documents (url, title, content, source, category, 
                                             entities, sentiment, confidence, content_hash, 
                                             metadata, classification_data)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        doc.get('url'),
                        doc.get('title'),
                        doc.get('content'),
                        doc.get('source'),
                        doc.get('category'),
                        json.dumps(doc.get('entities', [])),
                        doc.get('sentiment'),
                        doc.get('confidence'),
                        content_hash,
                        json.dumps(doc.get('metadata', {})),
                        json.dumps(doc.get('classification'))
                    ))
                    
                    inserted_count += 1
                    
                except Exception as e:
                    self.logger.error(f"Error inserting document: {str(e)}")
                    continue
            
            conn.commit()
        
        self.logger.info(f"Bulk inserted {inserted_count} documents")
        return inserted_count