# Iranian Legal Archive System

A comprehensive system for scraping, indexing, and searching Iranian legal documents with AI-powered classification.

## Features

### 🔍 Advanced Search
- Full-text search across all legal documents
- Persian language optimized search with FTS5
- Advanced filtering by source, category, and date
- AI-powered relevance ranking

### 🤖 AI-Powered Classification
- Persian BERT models for document categorization
- Named Entity Recognition for legal entities
- Sentiment analysis for legal texts
- Real-time classification during scraping

### 🕸️ Intelligent Web Scraping
- Real-time scraping from Iranian legal websites
- Smart proxy rotation with Iranian DNS servers
- Automatic duplicate detection and content hashing
- Robust error handling and retry mechanisms

### 📊 Real-time Monitoring
- Live scraping progress tracking
- System statistics and database metrics
- Proxy status monitoring
- Document processing status

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **TanStack Query** for data fetching
- **Framer Motion** for animations
- **Lucide React** for icons

### Backend
- **FastAPI** for high-performance API
- **SQLite** with FTS5 for full-text search
- **aiohttp** for async web scraping
- **BeautifulSoup4** for HTML parsing
- **Persian BERT** models for AI classification

### AI Models
- `HooshvareLab/bert-fa-base-uncased` - Classification
- `HooshvareLab/bert-fa-base-uncased-ner-peyma` - Named Entity Recognition
- `HooshvareLab/bert-fa-base-uncased-sentiment-digikala` - Sentiment Analysis

## Quick Start

### Prerequisites
```bash
# Python 3.8+
pip install -r backend/requirements.txt

# Node.js 16+
npm install
```

### Backend Setup
```bash
cd backend

# Initialize database and AI models
python startup.py

# Start API server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup
```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

### Production Deployment

#### Backend (Vercel Serverless)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy backend
cd backend
vercel --prod
```

#### Frontend (GitHub Pages)
```bash
# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

## Architecture

### Database Schema
```sql
-- Main documents table
CREATE TABLE documents (
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
);

-- FTS5 full-text search
CREATE VIRTUAL TABLE documents_fts USING fts5(
    title, content, category, source,
    content='documents',
    content_rowid='id',
    tokenize='porter'
);
```

### API Endpoints

#### Search & Documents
- `GET /api/documents/search` - Search documents with filters
- `GET /api/documents/{id}` - Get single document
- `GET /api/documents/categories` - List all categories
- `GET /api/documents/sources` - List all sources

#### Scraping Control
- `POST /api/scraping/start` - Start scraping process
- `POST /api/scraping/stop` - Stop scraping
- `GET /api/scraping/status` - Get scraping status

#### AI Services
- `POST /api/ai/classify` - Classify Persian text
- `GET /api/system/stats` - System statistics

## Targeted Legal Sites

### Primary Sources
1. **rc.majlis.ir** - مرکز پژوهش‌های مجلس شورای اسلامی
   - Laws and regulations
   - Parliamentary research documents
   - Legislative drafts and amendments

2. **divan-edalat.ir** - دیوان عدالت اداری
   - Administrative court verdicts
   - Judicial decisions
   - Legal precedents

3. **ijudiciary.ir** - قوه قضائیه
   - Judiciary announcements
   - Court procedures
   - Legal interpretations

### Proxy Configuration
The system uses Iranian DNS servers for reliable access:
```python
IRANIAN_DNS_SERVERS = [
    "178.22.122.100",  # Shecan Primary
    "185.51.200.2",    # Begzar Primary  
    "10.202.10.202",   # Pishgaman
    "178.22.122.101",  # Shecan Secondary
    "185.51.200.3",    # Begzar Secondary
]
```

## Development

### Running Tests
```bash
# Backend tests
cd backend
python -m pytest tests/

# Frontend tests  
npm test
```

### Adding New Legal Sites
1. Add site configuration to `scraper.py`
2. Define document selectors for title/content extraction
3. Configure pagination patterns
4. Test scraping with small sample

### Customizing AI Models
1. Update model names in `ai_classifier.py`
2. Adjust classification categories
3. Modify entity extraction patterns
4. Fine-tune confidence thresholds

## Production Considerations

### Security
- Enable HTTPS for all endpoints
- Configure proper CORS origins
- Use environment variables for sensitive data
- Implement rate limiting

### Performance
- Database indexing for common queries
- Caching for frequent searches
- CDN for static assets
- Connection pooling for database

### Monitoring
- Log aggregation for error tracking
- Performance metrics collection
- Uptime monitoring for scraped sites
- Database backup strategies

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

For issues and feature requests, please use the GitHub issue tracker.