import aiohttp
import asyncio
import random
from bs4 import BeautifulSoup
from typing import List, Dict, Optional, AsyncGenerator, Callable
from urllib.parse import urljoin, urlparse
import logging
from datetime import datetime
import ssl
import certifi
from .proxy_manager import AdvancedProxyManager

# Target legal websites with their specific configurations
LEGAL_SITES = {
    "rc.majlis.ir": {
        "name": "مرکز پژوهش‌های مجلس",
        "base_url": "https://rc.majlis.ir",
        "document_selectors": {
            "title": "h1, .title, .document-title",
            "content": ".content, .document-content, .main-content, article",
            "category": ".category, .doc-type, .classification"
        },
        "pagination": ".pagination a, .next-page",
        "delay": (2, 5)  # Random delay between requests
    },
    "divan-edalat.ir": {
        "name": "دیوان عدالت اداری",
        "base_url": "https://divan-edalat.ir",
        "document_selectors": {
            "title": ".verdict-title, h1, .title",
            "content": ".verdict-content, .content, .main-text",
            "category": ".verdict-type, .category"
        },
        "pagination": ".page-numbers a",
        "delay": (3, 7)
    },
    "ijudiciary.ir": {
        "name": "قوه قضائیه",
        "base_url": "https://ijudiciary.ir",
        "document_selectors": {
            "title": "h1, .news-title, .article-title",
            "content": ".news-content, .article-content, .main-content",
            "category": ".news-category, .article-category"
        },
        "pagination": ".pagination a",
        "delay": (1, 4)
    }
}

# Removed ProxyRotator class - now using AdvancedProxyManager

class LegalDocumentScraper:
    def __init__(self, database, ai_classifier=None):
        self.database = database
        self.ai_classifier = ai_classifier
        self.proxy_manager = AdvancedProxyManager()
        self.session = None
        self.is_scraping = False
        self.current_url = ""
        self.documents_processed = 0
        self.total_documents = 0
        self.error_count = 0
        self.last_update = datetime.now().isoformat()
        self.progress_callback = None
        
        # Configure logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    async def create_session(self) -> aiohttp.ClientSession:
        """Create aiohttp session with proper SSL context and DNS"""
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        
        connector = aiohttp.TCPConnector(
            ssl=ssl_context,
            limit=10,
            limit_per_host=5,
            keepalive_timeout=30
        )
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        return aiohttp.ClientSession(
            connector=connector,
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=30, connect=10)
        )
    
    async def fetch_with_retry(self, url: str, max_retries: int = 3) -> Optional[str]:
        """Fetch URL with retry logic and advanced proxy rotation"""
        result = await self.proxy_manager.fetch_with_rotation(url, max_retries)
        
        if result["success"]:
            return result["content"]
        else:
            self.error_count += 1
            self.logger.error(f"Failed to fetch {url}: {result.get('error', 'Unknown error')}")
            return None
    
    def extract_document_data(self, html: str, url: str, site_config: Dict) -> Optional[Dict[str, str]]:
        """Extract document data from HTML using site-specific selectors"""
        soup = BeautifulSoup(html, 'html.parser')
        
        # Extract title
        title_element = soup.select_one(site_config['document_selectors']['title'])
        title = title_element.get_text(strip=True) if title_element else "بدون عنوان"
        
        # Extract content
        content_elements = soup.select(site_config['document_selectors']['content'])
        content_parts = []
        for elem in content_elements:
            text = elem.get_text(strip=True)
            if text and len(text) > 50:  # Only meaningful content
                content_parts.append(text)
        
        content = "\n\n".join(content_parts) if content_parts else ""
        
        # Extract category
        category_element = soup.select_one(site_config['document_selectors']['category'])
        category = category_element.get_text(strip=True) if category_element else None
        
        # Validate extracted data
        if not title or not content or len(content) < 100:
            return None
        
        return {
            "title": title,
            "content": content,
            "category": category,
            "source": site_config['name'],
            "url": url
        }
    
    async def discover_document_urls(self, base_url: str, site_config: Dict) -> List[str]:
        """Discover document URLs from a website"""
        urls = set()
        
        try:
            html = await self.fetch_with_retry(base_url)
            if not html:
                return []
            
            soup = BeautifulSoup(html, 'html.parser')
            
            # Find all links that could be documents
            links = soup.find_all('a', href=True)
            
            for link in links:
                href = link['href']
                full_url = urljoin(base_url, href)
                
                # Filter for likely document URLs
                if self.is_document_url(full_url, site_config):
                    urls.add(full_url)
            
            # Also check pagination links
            pagination_links = soup.select(site_config.get('pagination', ''))
            for link in pagination_links:
                if link.get('href'):
                    page_url = urljoin(base_url, link['href'])
                    page_html = await self.fetch_with_retry(page_url)
                    if page_html:
                        page_soup = BeautifulSoup(page_html, 'html.parser')
                        page_links = page_soup.find_all('a', href=True)
                        for page_link in page_links:
                            href = page_link['href']
                            full_url = urljoin(base_url, href)
                            if self.is_document_url(full_url, site_config):
                                urls.add(full_url)
        
        except Exception as e:
            self.logger.error(f"Error discovering URLs from {base_url}: {str(e)}")
        
        return list(urls)
    
    def is_document_url(self, url: str, site_config: Dict) -> bool:
        """Check if URL likely points to a legal document"""
        document_indicators = [
            'law', 'rule', 'regulation', 'verdict', 'decision',
            'قانون', 'مقرره', 'آیین‌نامه', 'رأی', 'حکم', 'مصوبه'
        ]
        
        url_lower = url.lower()
        return any(indicator in url_lower for indicator in document_indicators)
    
    async def scrape_document(self, url: str, site_config: Dict) -> bool:
        """Scrape single document with enhanced processing"""
        self.current_url = url
        
        try:
            html = await self.fetch_with_retry(url)
            if not html:
                return False
            
            doc_data = self.extract_document_data(html, url, site_config)
            if not doc_data:
                return False
            
            # Classify document using AI if available
            classification = None
            entities = []
            sentiment = None
            confidence = None
            
            if self.ai_classifier:
                try:
                    classification = await self.ai_classifier.classify_document(
                        doc_data['content']
                    )
                    
                    # Extract individual components
                    entities = classification.get('entities', [])
                    sentiment_data = classification.get('sentiment', {})
                    sentiment = sentiment_data.get('positive', 0) - sentiment_data.get('negative', 0)
                    confidence = classification.get('confidence', 0.5)
                    
                except Exception as e:
                    self.logger.error(f"AI classification failed: {str(e)}")
            
            # Prepare metadata
            metadata = {
                "scraping_method": "advanced_proxy",
                "content_length": len(doc_data['content']),
                "processing_time": datetime.now().isoformat(),
                "site_config": site_config['name']
            }
            
            # Insert into database with enhanced schema
            success = await self.database.insert_document(
                url=doc_data['url'],
                title=doc_data['title'],
                content=doc_data['content'],
                source=doc_data['source'],
                category=doc_data['category'],
                classification=classification,
                entities=entities,
                sentiment=sentiment,
                confidence=confidence,
                metadata=metadata
            )
            
            if success:
                self.documents_processed += 1
                self.logger.info(f"Successfully scraped: {doc_data['title'][:100]}")
                
                # Call progress callback if available
                if self.progress_callback:
                    await self.progress_callback({
                        "status": "completed",
                        "url": url,
                        "title": doc_data['title'],
                        "processed": self.documents_processed,
                        "total": self.total_documents
                    })
            
            # Add delay between requests
            delay = random.uniform(*site_config['delay'])
            await asyncio.sleep(delay)
            
            return success
            
        except Exception as e:
            self.logger.error(f"Error scraping {url}: {str(e)}")
            self.error_count += 1
            
            # Call progress callback for errors
            if self.progress_callback:
                await self.progress_callback({
                    "status": "error",
                    "url": url,
                    "error": str(e)
                })
            
            return False
        finally:
            self.last_update = datetime.now().isoformat()
    
    async def scrape_site(self, site_domain: str) -> int:
        """Scrape all documents from a specific site"""
        if site_domain not in LEGAL_SITES:
            self.logger.error(f"Unknown site: {site_domain}")
            return 0
        
        site_config = LEGAL_SITES[site_domain]
        base_url = site_config['base_url']
        
        self.logger.info(f"Starting scrape of {site_config['name']}")
        
        # Discover document URLs
        document_urls = await self.discover_document_urls(base_url, site_config)
        self.total_documents = len(document_urls)
        
        if not document_urls:
            self.logger.warning(f"No document URLs found for {site_domain}")
            return 0
        
        self.logger.info(f"Found {len(document_urls)} potential documents")
        
        # Scrape documents concurrently (with rate limiting)
        semaphore = asyncio.Semaphore(2)  # Limit concurrent requests
        
        async def scrape_with_semaphore(url):
            async with semaphore:
                return await self.scrape_document(url, site_config)
        
        tasks = [scrape_with_semaphore(url) for url in document_urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        successful_scrapes = sum(1 for result in results if result is True)
        self.logger.info(f"Successfully scraped {successful_scrapes}/{len(document_urls)} documents")
        
        return successful_scrapes
    
    def set_progress_callback(self, callback: Callable):
        """Set callback function for progress updates"""
        self.progress_callback = callback
    
    async def start_scraping(self, target_urls: List[str] = None, progress_callback: Callable = None):
        """Start scraping process with progress updates"""
        if self.is_scraping:
            return
        
        self.is_scraping = True
        self.documents_processed = 0
        self.total_documents = 0
        self.error_count = 0
        self.progress_callback = progress_callback
        
        try:
            # Notify start
            if self.progress_callback:
                await self.progress_callback({
                    "status": "started",
                    "message": "Scraping process started"
                })
            
            if target_urls:
                # Scrape specific URLs
                for url in target_urls:
                    domain = urlparse(url).netloc
                    if domain in LEGAL_SITES:
                        await self.scrape_site(domain)
            else:
                # Scrape all configured sites
                for domain in LEGAL_SITES:
                    await self.scrape_site(domain)
            
            # Notify completion
            if self.progress_callback:
                await self.progress_callback({
                    "status": "completed",
                    "message": f"Scraping completed. Processed {self.documents_processed} documents.",
                    "processed": self.documents_processed,
                    "total": self.total_documents,
                    "errors": self.error_count
                })
                    
        except Exception as e:
            self.logger.error(f"Scraping error: {str(e)}")
            self.error_count += 1
            
            # Notify error
            if self.progress_callback:
                await self.progress_callback({
                    "status": "error",
                    "message": f"Scraping failed: {str(e)}",
                    "error": str(e)
                })
        finally:
            self.is_scraping = False
    
    def stop_scraping(self):
        """Stop scraping process"""
        self.is_scraping = False
        self.current_url = ""
    
    def get_status(self) -> Dict[str, Any]:
        """Get current scraping status with enhanced information"""
        proxy_stats = self.proxy_manager.get_proxy_stats()
        
        return {
            "isActive": self.is_scraping,
            "currentUrl": self.current_url,
            "documentsProcessed": self.documents_processed,
            "totalDocuments": self.total_documents,
            "errorCount": self.error_count,
            "lastUpdate": self.last_update,
            "proxyStats": proxy_stats,
            "successRate": (self.documents_processed / max(self.total_documents, 1)) * 100
        }