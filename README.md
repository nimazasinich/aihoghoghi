# Iranian Legal Archive System

A comprehensive, production-ready system for archiving, searching, and analyzing Iranian legal documents using advanced AI and proxy technologies.

## 🚀 Features

### Core Functionality
- **Advanced Document Scraping**: Intelligent scraping with 22 Iranian DNS servers and CORS proxy rotation
- **Real Persian BERT AI**: Actual transformers models for document classification, NER, and sentiment analysis
- **Full-Text Search**: FTS5-powered search with caching and advanced filtering
- **Real-time Updates**: WebSocket support for live scraping progress
- **Production Ready**: Complete deployment configurations for Vercel, Railway, and Docker

### AI-Powered Analysis
- **Document Classification**: Automatic categorization using Persian BERT models
- **Named Entity Recognition**: Extract persons, organizations, laws, dates, and monetary values
- **Sentiment Analysis**: Analyze document sentiment with confidence scores
- **Fallback System**: Rule-based classification when AI models are unavailable

### Advanced Proxy System
- **22 Iranian DNS Servers**: Comprehensive proxy rotation for reliable access
- **CORS Proxy Support**: Multiple CORS proxy services for cross-origin requests
- **Archive Integration**: Web archive services as backup sources
- **Health Monitoring**: Real-time proxy health checks and statistics

### Database & Search
- **SQLite with FTS5**: Full-text search with Persian language support
- **Intelligent Caching**: Query result caching with expiration
- **Advanced Filtering**: Search by source, category, date range, sentiment
- **Performance Optimized**: Indexed queries and bulk operations

## 🛠️ Installation

### Prerequisites
- Python 3.9+
- Node.js 16+ (for frontend)
- Git

### Backend Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd iranian-legal-archive
```

2. **Install Python dependencies**
```bash
cd backend
pip install -r requirements.txt
```

3. **Initialize the database**
```bash
python startup.py
```

4. **Run the development server**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

1. **Install Node.js dependencies**
```bash
npm install
```

2. **Start the development server**
```bash
npm run dev
```

## 🐳 Docker Deployment

### Using Docker Compose
```bash
docker-compose up -d
```

### Using Docker directly
```bash
docker build -t iranian-legal-archive .
docker run -p 8000:8000 iranian-legal-archive
```

## ☁️ Cloud Deployment

### Vercel
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Railway
1. Connect your GitHub repository to Railway
2. Railway will automatically detect the `railway.toml` configuration
3. Set environment variables in Railway dashboard

## 📊 API Documentation

### Core Endpoints

#### Search Documents
```http
GET /api/documents/search?query=قانون&category=قانون اساسی&page=1&limit=10
```

#### Get Document
```http
GET /api/documents/{doc_id}
```

#### Start Scraping
```http
POST /api/scraping/start
Content-Type: application/json

{
  "urls": ["https://rc.majlis.ir/law/123"]
}
```

#### AI Classification
```http
POST /api/ai/classify
Content-Type: application/json

{
  "text": "متن فارسی برای تحلیل"
}
```

#### WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:8000/ws');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Scraping update:', data);
};
```

### System Endpoints

#### Health Check
```http
GET /api/health
```

#### System Statistics
```http
GET /api/system/stats
```

#### Proxy Health
```http
GET /api/proxy/health
```

## 🧪 Testing

### Run All Tests
```bash
cd backend
python tests/run_tests.py
```

### Run Specific Test Suites
```bash
# Database tests
pytest tests/test_database.py -v

# AI classifier tests
pytest tests/test_ai_classifier.py -v

# Proxy manager tests
pytest tests/test_proxy_manager.py -v

# Scraper tests
pytest tests/test_scraper.py -v

# API tests
pytest tests/test_main.py -v
```

### Test Coverage
```bash
pytest --cov=backend --cov-report=html
```

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=sqlite:///data/legal_archive.db

# AI Models
HUGGINGFACE_API_KEY=your_huggingface_key

# Security
SECRET_KEY=your_secret_key
ALLOWED_HOSTS=localhost,127.0.0.1

# Rate Limiting
RATE_LIMIT_CALLS=100
RATE_LIMIT_PERIOD=60
```

### Legal Sites Configuration

The system is pre-configured to scrape from major Iranian legal websites:

- **rc.majlis.ir**: مرکز پژوهش‌های مجلس (Parliamentary Research Center)
- **divan-edalat.ir**: دیوان عدالت اداری (Administrative Justice Court)
- **ijudiciary.ir**: قوه قضائیه (Judiciary)

## 📈 Performance

### Database Optimization
- FTS5 full-text search with Persian tokenization
- Intelligent query caching with 1-hour expiration
- Optimized indexes for common queries
- Bulk insert operations for efficiency

### Proxy Performance
- 22 Iranian DNS servers for redundancy
- Automatic failover and rotation
- Health monitoring and statistics
- Request rate limiting and retry logic

### AI Model Performance
- GPU acceleration when available
- Fallback to CPU processing
- Batch processing for multiple documents
- Model loading optimization

## 🔒 Security

### Implemented Security Measures
- **CORS Configuration**: Restricted to trusted origins
- **Rate Limiting**: 100 requests per minute per IP
- **Security Headers**: XSS protection, content type validation
- **Input Validation**: Pydantic models for all endpoints
- **SQL Injection Protection**: Parameterized queries
- **HTTPS Enforcement**: Strict transport security headers

### Authentication (Future Enhancement)
```python
# JWT-based authentication (to be implemented)
@app.post("/api/auth/login")
async def login(credentials: LoginRequest):
    # Implementation pending
    pass
```

## 📊 Monitoring

### System Statistics
- Document count and categories
- Scraping progress and success rates
- Proxy health and performance
- Database size and query performance
- WebSocket connection count

### Logging
- Structured logging with different levels
- Request/response logging
- Error tracking and reporting
- Performance metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow PEP 8 for Python code
- Write comprehensive tests for new features
- Update documentation for API changes
- Use type hints for better code clarity

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **HooshvareLab**: Persian BERT models for NLP tasks
- **FastAPI**: Modern, fast web framework for building APIs
- **SQLite**: Lightweight, serverless database engine
- **BeautifulSoup**: HTML parsing and data extraction

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the API documentation at `/docs` when running the server
- Review the test files for usage examples

## 🗺️ Roadmap

### Phase 1 (Completed)
- ✅ Real Persian BERT AI implementation
- ✅ Advanced proxy system with 22 DNS servers
- ✅ Enhanced database with FTS5 and caching
- ✅ WebSocket real-time updates
- ✅ Production deployment configurations
- ✅ Comprehensive test suite

### Phase 2 (In Progress)
- 🔄 Authentication and authorization
- 🔄 Advanced analytics dashboard
- 🔄 Document similarity and clustering
- 🔄 Export functionality (PDF, Excel)

### Phase 3 (Planned)
- 📋 Machine learning model training
- 📋 Multi-language support
- 📋 Mobile application
- 📋 Advanced search filters and faceting

---

**Built with ❤️ for the Iranian legal community**