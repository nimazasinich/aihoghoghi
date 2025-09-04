/*
  # Iranian Legal Archive Database Schema
  
  Complete database schema for the Iranian Legal Archive System with full-text search,
  document classification, and comprehensive indexing.

  ## Tables
  
  ### 1. Documents Table
  Main storage for legal documents with metadata and content hashing for deduplication.
  
  ### 2. FTS5 Search Table  
  Virtual table for high-performance Persian full-text search using SQLite FTS5 with Porter stemming.
  
  ### 3. Performance Indexes
  Optimized indexes for common query patterns including source, category, date, and content hash lookups.
  
  ## Security
  - Unique constraints prevent duplicate documents
  - Content hashing ensures data integrity
  - Proper indexing for performance at scale
*/

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Main documents table with comprehensive metadata
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT NOT NULL,
    category TEXT,
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    content_hash TEXT UNIQUE NOT NULL,
    classification_data TEXT, -- JSON data from AI classification
    indexed_at TIMESTAMP,
    word_count INTEGER GENERATED ALWAYS AS (
        LENGTH(content) - LENGTH(REPLACE(content, ' ', '')) + 1
    ) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FTS5 virtual table for Persian full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
    title, 
    content, 
    category, 
    source,
    content='documents',
    content_rowid='id',
    tokenize='porter' -- Porter stemmer for better Persian search
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_documents_source 
    ON documents(source);

CREATE INDEX IF NOT EXISTS idx_documents_category 
    ON documents(category) 
    WHERE category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_scraped_at 
    ON documents(scraped_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_content_hash 
    ON documents(content_hash);

CREATE INDEX IF NOT EXISTS idx_documents_word_count 
    ON documents(word_count);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_documents_source_category 
    ON documents(source, category) 
    WHERE category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_category_date 
    ON documents(category, scraped_at DESC) 
    WHERE category IS NOT NULL;

-- FTS5 triggers to keep search table in sync
CREATE TRIGGER IF NOT EXISTS documents_fts_insert 
    AFTER INSERT ON documents 
BEGIN
    INSERT INTO documents_fts (rowid, title, content, category, source)
    VALUES (NEW.id, NEW.title, NEW.content, COALESCE(NEW.category, ''), NEW.source);
END;

CREATE TRIGGER IF NOT EXISTS documents_fts_update 
    AFTER UPDATE ON documents 
BEGIN
    UPDATE documents_fts 
    SET title = NEW.title, 
        content = NEW.content, 
        category = COALESCE(NEW.category, ''),
        source = NEW.source
    WHERE rowid = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS documents_fts_delete 
    AFTER DELETE ON documents 
BEGIN
    DELETE FROM documents_fts WHERE rowid = OLD.id;
END;

-- Update trigger for timestamps
CREATE TRIGGER IF NOT EXISTS documents_updated_at 
    AFTER UPDATE ON documents 
BEGIN
    UPDATE documents 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Views for common queries
CREATE VIEW IF NOT EXISTS document_stats AS
SELECT 
    source,
    category,
    COUNT(*) as document_count,
    AVG(word_count) as avg_word_count,
    MIN(scraped_at) as first_scraped,
    MAX(scraped_at) as last_scraped
FROM documents 
GROUP BY source, category;

CREATE VIEW IF NOT EXISTS recent_documents AS
SELECT 
    id,
    title,
    source,
    category,
    scraped_at,
    SUBSTR(content, 1, 200) || '...' as excerpt
FROM documents 
ORDER BY scraped_at DESC 
LIMIT 50;

-- Sample queries for testing
/*
-- Full-text search example
SELECT d.*, rank 
FROM documents d
JOIN documents_fts ON documents_fts.rowid = d.id
WHERE documents_fts MATCH 'قانون AND اساسی'
ORDER BY rank;

-- Category breakdown
SELECT category, COUNT(*) as count 
FROM documents 
WHERE category IS NOT NULL 
GROUP BY category 
ORDER BY count DESC;

-- Search with filters
SELECT * FROM documents 
WHERE source = 'مرکز پژوهش‌های مجلس'
  AND category = 'قانون اساسی'
  AND scraped_at >= date('now', '-30 days')
ORDER BY scraped_at DESC;
*/