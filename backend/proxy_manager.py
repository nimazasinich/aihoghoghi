import aiohttp
import asyncio
import random
import logging
from typing import List, Dict, Optional, Tuple
import ssl
import certifi
from urllib.parse import urlparse

class AdvancedProxyManager:
    """Advanced proxy manager with Iranian DNS servers and CORS proxy rotation"""
    
    def __init__(self):
        self.iranian_dns = [
            "178.22.122.100",  # Shecan Primary
            "185.51.200.2",    # Begzar Primary  
            "10.202.10.202",   # Pishgaman
            "178.22.122.101",  # Shecan Secondary
            "185.51.200.3",    # Begzar Secondary
            "185.43.135.1",    # Radar Game
            "178.22.122.102",  # Shecan Tertiary
            "178.22.122.103",  # Shecan Quaternary
            "185.51.200.4",    # Begzar Tertiary
            "10.202.10.203",   # Pishgaman Secondary
            "178.22.122.104",  # Shecan Quinary
            "185.51.200.5",    # Begzar Quaternary
            "10.202.10.204",   # Pishgaman Tertiary
            "178.22.122.105",  # Shecan Senary
            "185.51.200.6",    # Begzar Quinary
            "10.202.10.205",   # Pishgaman Quaternary
            "178.22.122.106",  # Shecan Septenary
            "185.51.200.7",    # Begzar Senary
            "10.202.10.206",   # Pishgaman Quinary
            "178.22.122.107",  # Shecan Octonary
            "185.51.200.8",    # Begzar Septenary
            "10.202.10.207"    # Pishgaman Senary
        ]
        
        self.cors_proxies = [
            "https://cors-anywhere.herokuapp.com/",
            "https://api.allorigins.win/get?url=",
            "https://corsproxy.io/?",
            "https://proxy.cors.sh/",
            "https://cors.bridged.cc/",
            "https://thingproxy.freeboard.io/fetch/",
            "https://yacdn.org/proxy/"
        ]
        
        self.archive_proxies = [
            "https://web.archive.org/web/",
            "https://archive.today/",
            "https://webcache.googleusercontent.com/search?q=cache:"
        ]
        
        self.proxy_stats = {}
        self.failed_proxies = set()
        self.logger = logging.getLogger(__name__)
        
    async def fetch_with_rotation(self, url: str, max_retries: int = 3) -> Dict:
        """Fetch URL with multiple proxy methods and rotation"""
        methods = [
            ("direct", self._fetch_direct),
            ("iranian_dns", self._fetch_with_iranian_dns), 
            ("cors_proxy", self._fetch_with_cors_proxy),
            ("archive", self._fetch_from_archive)
        ]
        
        for attempt in range(max_retries):
            for method_name, method_func in methods:
                try:
                    result = await method_func(url)
                    if result and len(result.get("content", "")) > 100:
                        self._update_proxy_stats(method_name, True)
                        return {
                            "success": True, 
                            "content": result["content"], 
                            "method": method_name,
                            "status_code": result.get("status_code", 200)
                        }
                except Exception as e:
                    self.logger.warning(f"Method {method_name} failed for {url}: {str(e)}")
                    self._update_proxy_stats(method_name, False)
                    continue
            
            # Wait before retry
            await asyncio.sleep(random.uniform(2, 5))
                
        return {"success": False, "error": "All proxy methods failed"}
    
    async def _fetch_direct(self, url: str) -> Dict:
        """Direct fetch without proxy"""
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        }
        
        timeout = aiohttp.ClientTimeout(total=30, connect=10)
        
        async with aiohttp.ClientSession(
            connector=connector, 
            headers=headers, 
            timeout=timeout
        ) as session:
            async with session.get(url) as response:
                content = await response.text()
                return {
                    "content": content,
                    "status_code": response.status
                }
    
    async def _fetch_with_iranian_dns(self, url: str) -> Dict:
        """Fetch using Iranian DNS servers"""
        # Select a random Iranian DNS server
        dns_server = random.choice([dns for dns in self.iranian_dns if dns not in self.failed_proxies])
        
        if not dns_server:
            raise Exception("No available Iranian DNS servers")
        
        # Create custom resolver
        resolver = aiohttp.AsyncResolver(nameservers=[dns_server])
        
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        connector = aiohttp.TCPConnector(
            ssl=ssl_context,
            resolver=resolver
        )
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        }
        
        timeout = aiohttp.ClientTimeout(total=30, connect=10)
        
        try:
            async with aiohttp.ClientSession(
                connector=connector, 
                headers=headers, 
                timeout=timeout
            ) as session:
                async with session.get(url) as response:
                    content = await response.text()
                    return {
                        "content": content,
                        "status_code": response.status
                    }
        except Exception as e:
            self.failed_proxies.add(dns_server)
            raise e
    
    async def _fetch_with_cors_proxy(self, url: str) -> Dict:
        """Fetch using CORS proxy services"""
        proxy_url = random.choice([p for p in self.cors_proxies if p not in self.failed_proxies])
        
        if not proxy_url:
            raise Exception("No available CORS proxies")
        
        # Construct proxy URL
        if proxy_url.endswith("="):
            full_url = f"{proxy_url}{url}"
        else:
            full_url = f"{proxy_url}{url}"
        
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
        }
        
        timeout = aiohttp.ClientTimeout(total=30, connect=10)
        
        try:
            async with aiohttp.ClientSession(
                connector=connector, 
                headers=headers, 
                timeout=timeout
            ) as session:
                async with session.get(full_url) as response:
                    if response.status == 200:
                        # Handle different proxy response formats
                        content_type = response.headers.get('content-type', '')
                        
                        if 'application/json' in content_type:
                            data = await response.json()
                            # Extract content from JSON response
                            if 'contents' in data:
                                content = data['contents']
                            elif 'data' in data:
                                content = data['data']
                            else:
                                content = str(data)
                        else:
                            content = await response.text()
                        
                        return {
                            "content": content,
                            "status_code": response.status
                        }
                    else:
                        raise Exception(f"Proxy returned status {response.status}")
        except Exception as e:
            self.failed_proxies.add(proxy_url)
            raise e
    
    async def _fetch_from_archive(self, url: str) -> Dict:
        """Fetch from web archive services"""
        archive_url = random.choice([p for p in self.archive_proxies if p not in self.failed_proxies])
        
        if not archive_url:
            raise Exception("No available archive proxies")
        
        # Construct archive URL
        if "web.archive.org" in archive_url:
            # Try to get latest snapshot
            full_url = f"{archive_url}*/{url}"
        elif "archive.today" in archive_url:
            full_url = f"{archive_url}{url}"
        else:
            full_url = f"{archive_url}{url}"
        
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
        }
        
        timeout = aiohttp.ClientTimeout(total=30, connect=10)
        
        try:
            async with aiohttp.ClientSession(
                connector=connector, 
                headers=headers, 
                timeout=timeout
            ) as session:
                async with session.get(full_url) as response:
                    content = await response.text()
                    return {
                        "content": content,
                        "status_code": response.status
                    }
        except Exception as e:
            self.failed_proxies.add(archive_url)
            raise e
    
    def _update_proxy_stats(self, method: str, success: bool):
        """Update proxy statistics"""
        if method not in self.proxy_stats:
            self.proxy_stats[method] = {"success": 0, "failed": 0}
        
        if success:
            self.proxy_stats[method]["success"] += 1
        else:
            self.proxy_stats[method]["failed"] += 1
    
    def get_proxy_stats(self) -> Dict:
        """Get proxy performance statistics"""
        stats = {}
        for method, data in self.proxy_stats.items():
            total = data["success"] + data["failed"]
            if total > 0:
                stats[method] = {
                    "success_rate": data["success"] / total,
                    "total_requests": total,
                    "successful": data["success"],
                    "failed": data["failed"]
                }
        return stats
    
    def reset_failed_proxies(self):
        """Reset failed proxy list"""
        self.failed_proxies.clear()
        self.logger.info("Failed proxies list reset")
    
    async def health_check(self) -> Dict:
        """Check health of all proxy methods"""
        test_url = "https://httpbin.org/ip"
        health_status = {}
        
        methods = [
            ("direct", self._fetch_direct),
            ("iranian_dns", self._fetch_with_iranian_dns), 
            ("cors_proxy", self._fetch_with_cors_proxy)
        ]
        
        for method_name, method_func in methods:
            try:
                result = await method_func(test_url)
                health_status[method_name] = {
                    "status": "healthy",
                    "response_time": "< 1s",
                    "status_code": result.get("status_code", 200)
                }
            except Exception as e:
                health_status[method_name] = {
                    "status": "unhealthy",
                    "error": str(e)
                }
        
        return health_status