import aiohttp
import asyncio
import random
from bs4 import BeautifulSoup
from typing import List, Dict, Optional, AsyncGenerator
from urllib.parse import urljoin, urlparse
import logging
from datetime import datetime
import ssl
import certifi

# Iranian DNS servers for proxy rotation
IRANIAN_DNS_SERVERS = [
    "178.22.122.100",  # Shecan Primary
    "185.51.200.2",    # Begzar Primary  
    "10.202.10.202",   # Pishgaman
    "178.22.122.101",  # Shecan Secondary
    "185.51.200.3",    # Begzar Secondary
    "185.43.135.1",    # Radar Game
    "178.22.122.102"   # Shecan Tertiary
]

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

class ProxyRotator:
    def __init__(self):
        self.dns_servers = IRANIAN_DNS_SERVERS.copy()
        self.current_dns = None
        self.failed_dns = set()
        
    def get_current_dns(self) -> str:
        """Get current DNS server, rotate if needed"""
        if self.current_dns and self.current_dns not in self.failed_dns:
            return self.current_dns
        
        available_dns = [dns for dns in self.dns_servers if dns not in self.failed_dns]
        
        if not available_dns:
            # Reset failed DNS if all have failed
            self.failed_dns.clear()
            available_dns = self.dns_servers
        
        self.current_dns = random.choice(available_dns)
        return self.current_dns
    
    def mark_dns_failed(self, dns: str):
        """Mark DNS server as failed"""
        self.failed_dns.add(dns)
        if dns == self.current_dns:
            self.current_dns = None

class LegalDocumentScraper:
    def __init__(self, database, ai_classifier=None):
        self.database = database
        self.ai_classifier = ai_classifier
        self.proxy_rotator = ProxyRotator()
        self.session = None
        self.is_scraping = False
        self.current_url = ""
        self.documents_processed = 0
        self.total_documents = 0
        self.error_count = 0
        self.last_update = datetime.now().isoformat()
        
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
        """Fetch URL with retry logic and proxy rotation"""
        for attempt in range(max_retries):
            try:
                current_dns = self.proxy_rotator.get_current_dns()
                
                async with self.session.get(url) as response:
                    if response.status == 200:
                        content = await response.text()
                        return content
                    elif response.status in [403, 429, 503]:
                        # Rate limited or blocked, try different DNS
                        self.proxy_rotator.mark_dns_failed(current_dns)
                        await asyncio.sleep(random.uniform(5, 10))
                    else:
                        self.logger.warning(f"HTTP {response.status} for {url}")
                        
            except Exception as e:
                self.logger.error(f"Attempt {attempt + 1} failed for {url}: {str(e)}")
                self.proxy_rotator.mark_dns_failed(self.proxy_rotator.current_dns)
                await asyncio.sleep(random.uniform(2, 5))
        
        self.error_count += 1
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
        """Scrape single document"""
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
            if self.ai_classifier:
                try:
                    classification = await self.ai_classifier.classify_document(
                        doc_data['content']
                    )
                except Exception as e:
                    self.logger.error(f"AI classification failed: {str(e)}")
            
            # Insert into database
            success = await self.database.insert_document(
                url=doc_data['url'],
                title=doc_data['title'],
                content=doc_data['content'],
                source=doc_data['source'],
                category=doc_data['category'],
                classification=classification
            )
            
            if success:
                self.documents_processed += 1
                self.logger.info(f"Successfully scraped: {doc_data['title'][:100]}")
            
            # Add delay between requests
            delay = random.uniform(*site_config['delay'])
            await asyncio.sleep(delay)
            
            return success
            
        except Exception as e:
            self.logger.error(f"Error scraping {url}: {str(e)}")
            self.error_count += 1
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
    
    async def start_scraping(self, target_urls: List[str] = None):
        """Start scraping process"""
        if self.is_scraping:
            return
        
        self.is_scraping = True
        self.documents_processed = 0
        self.total_documents = 0
        self.error_count = 0
        
        try:
            self.session = await self.create_session()
            
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
                    
        except Exception as e:
            self.logger.error(f"Scraping error: {str(e)}")
            self.error_count += 1
        finally:
            if self.session:
                await self.session.close()
            self.is_scraping = False
    
    def stop_scraping(self):
        """Stop scraping process"""
        self.is_scraping = False
        self.current_url = ""
    
    def get_status(self) -> Dict[str, Any]:
        """Get current scraping status"""
        proxy_status = 'active'
        if self.proxy_rotator.current_dns in self.proxy_rotator.failed_dns:
            proxy_status = 'failed'
        elif len(self.proxy_rotator.failed_dns) > 0:
            proxy_status = 'rotating'
        
        return {
            "isActive": self.is_scraping,
            "currentUrl": self.current_url,
            "documentsProcessed": self.documents_processed,
            "totalDocuments": self.total_documents,
            "errorCount": self.error_count,
            "lastUpdate": self.last_update,
            "proxyStatus": proxy_status
        }