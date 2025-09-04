import pytest
import asyncio
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch, MagicMock
import aiohttp

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from proxy_manager import AdvancedProxyManager

class TestAdvancedProxyManager:
    @pytest.fixture
    def proxy_manager(self):
        """Create proxy manager instance for testing"""
        return AdvancedProxyManager()
    
    def test_initialization(self, proxy_manager):
        """Test proxy manager initialization"""
        assert len(proxy_manager.iranian_dns) == 22
        assert len(proxy_manager.cors_proxies) == 7
        assert len(proxy_manager.archive_proxies) == 3
        assert isinstance(proxy_manager.proxy_stats, dict)
        assert isinstance(proxy_manager.failed_proxies, set)
    
    @pytest.mark.asyncio
    async def test_fetch_with_rotation_success(self, proxy_manager):
        """Test successful fetch with proxy rotation"""
        test_url = "https://httpbin.org/ip"
        
        with patch.object(proxy_manager, '_fetch_direct') as mock_direct:
            mock_direct.return_value = {
                "content": "test content",
                "status_code": 200
            }
            
            result = await proxy_manager.fetch_with_rotation(test_url)
            
            assert result["success"] is True
            assert result["content"] == "test content"
            assert result["method"] == "direct"
    
    @pytest.mark.asyncio
    async def test_fetch_with_rotation_failure(self, proxy_manager):
        """Test fetch failure with all methods"""
        test_url = "https://invalid-url.com"
        
        with patch.object(proxy_manager, '_fetch_direct') as mock_direct, \
             patch.object(proxy_manager, '_fetch_with_iranian_dns') as mock_dns, \
             patch.object(proxy_manager, '_fetch_with_cors_proxy') as mock_cors, \
             patch.object(proxy_manager, '_fetch_from_archive') as mock_archive:
            
            # All methods fail
            mock_direct.side_effect = Exception("Direct failed")
            mock_dns.side_effect = Exception("DNS failed")
            mock_cors.side_effect = Exception("CORS failed")
            mock_archive.side_effect = Exception("Archive failed")
            
            result = await proxy_manager.fetch_with_rotation(test_url)
            
            assert result["success"] is False
            assert "error" in result
    
    @pytest.mark.asyncio
    async def test_fetch_direct(self, proxy_manager):
        """Test direct fetch method"""
        test_url = "https://httpbin.org/ip"
        
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.text = AsyncMock(return_value="test content")
            
            mock_session.return_value.__aenter__.return_value.get.return_value.__aenter__.return_value = mock_response
            
            result = await proxy_manager._fetch_direct(test_url)
            
            assert result["content"] == "test content"
            assert result["status_code"] == 200
    
    @pytest.mark.asyncio
    async def test_fetch_with_iranian_dns(self, proxy_manager):
        """Test Iranian DNS fetch method"""
        test_url = "https://httpbin.org/ip"
        
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.text = AsyncMock(return_value="test content")
            
            mock_session.return_value.__aenter__.return_value.get.return_value.__aenter__.return_value = mock_response
            
            result = await proxy_manager._fetch_with_iranian_dns(test_url)
            
            assert result["content"] == "test content"
            assert result["status_code"] == 200
    
    @pytest.mark.asyncio
    async def test_fetch_with_cors_proxy(self, proxy_manager):
        """Test CORS proxy fetch method"""
        test_url = "https://httpbin.org/ip"
        
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.headers = {'content-type': 'application/json'}
            mock_response.json = AsyncMock(return_value={'contents': 'test content'})
            
            mock_session.return_value.__aenter__.return_value.get.return_value.__aenter__.return_value = mock_response
            
            result = await proxy_manager._fetch_with_cors_proxy(test_url)
            
            assert result["content"] == "test content"
            assert result["status_code"] == 200
    
    def test_update_proxy_stats(self, proxy_manager):
        """Test proxy statistics update"""
        # Test successful request
        proxy_manager._update_proxy_stats("direct", True)
        assert proxy_manager.proxy_stats["direct"]["success"] == 1
        assert proxy_manager.proxy_stats["direct"]["failed"] == 0
        
        # Test failed request
        proxy_manager._update_proxy_stats("direct", False)
        assert proxy_manager.proxy_stats["direct"]["success"] == 1
        assert proxy_manager.proxy_stats["direct"]["failed"] == 1
    
    def test_get_proxy_stats(self, proxy_manager):
        """Test proxy statistics retrieval"""
        # Add some test stats
        proxy_manager._update_proxy_stats("direct", True)
        proxy_manager._update_proxy_stats("direct", False)
        proxy_manager._update_proxy_stats("cors_proxy", True)
        
        stats = proxy_manager.get_proxy_stats()
        
        assert "direct" in stats
        assert "cors_proxy" in stats
        assert stats["direct"]["success_rate"] == 0.5
        assert stats["direct"]["total_requests"] == 2
        assert stats["cors_proxy"]["success_rate"] == 1.0
    
    def test_reset_failed_proxies(self, proxy_manager):
        """Test failed proxy list reset"""
        # Add some failed proxies
        proxy_manager.failed_proxies.add("test_proxy")
        proxy_manager.failed_proxies.add("another_proxy")
        
        assert len(proxy_manager.failed_proxies) == 2
        
        # Reset
        proxy_manager.reset_failed_proxies()
        
        assert len(proxy_manager.failed_proxies) == 0
    
    @pytest.mark.asyncio
    async def test_health_check(self, proxy_manager):
        """Test proxy health check"""
        test_url = "https://httpbin.org/ip"
        
        with patch.object(proxy_manager, '_fetch_direct') as mock_direct, \
             patch.object(proxy_manager, '_fetch_with_iranian_dns') as mock_dns, \
             patch.object(proxy_manager, '_fetch_with_cors_proxy') as mock_cors:
            
            # Mock successful responses
            mock_direct.return_value = {"content": "test", "status_code": 200}
            mock_dns.return_value = {"content": "test", "status_code": 200}
            mock_cors.return_value = {"content": "test", "status_code": 200}
            
            health_status = await proxy_manager.health_check()
            
            assert "direct" in health_status
            assert "iranian_dns" in health_status
            assert "cors_proxy" in health_status
            
            # All should be healthy
            for method, status in health_status.items():
                assert status["status"] == "healthy"
    
    @pytest.mark.asyncio
    async def test_health_check_with_failures(self, proxy_manager):
        """Test proxy health check with some failures"""
        with patch.object(proxy_manager, '_fetch_direct') as mock_direct, \
             patch.object(proxy_manager, '_fetch_with_iranian_dns') as mock_dns, \
             patch.object(proxy_manager, '_fetch_with_cors_proxy') as mock_cors:
            
            # Mock mixed responses
            mock_direct.return_value = {"content": "test", "status_code": 200}
            mock_dns.side_effect = Exception("DNS failed")
            mock_cors.return_value = {"content": "test", "status_code": 200}
            
            health_status = await proxy_manager.health_check()
            
            assert health_status["direct"]["status"] == "healthy"
            assert health_status["iranian_dns"]["status"] == "unhealthy"
            assert health_status["cors_proxy"]["status"] == "healthy"