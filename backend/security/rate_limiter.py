"""
Advanced Rate Limiting System for Legal API Platform
Provides per-user, per-IP, and endpoint-specific rate limiting with burst handling
"""

import time
import json
import hashlib
from typing import Dict, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
import asyncio
import logging
from datetime import datetime, timedelta
import redis
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

@dataclass
class RateLimitConfig:
    """Configuration for rate limiting"""
    requests_per_minute: int = 60
    requests_per_hour: int = 1000
    requests_per_day: int = 10000
    burst_limit: int = 10
    burst_window: int = 5  # seconds
    endpoint_multiplier: float = 1.0
    user_multiplier: float = 1.0
    ip_multiplier: float = 1.0

@dataclass
class RateLimitResult:
    """Result of rate limit check"""
    allowed: bool
    remaining: int
    reset_time: int
    retry_after: Optional[int] = None
    limit_type: str = "default"
    message: str = ""

class RateLimiter:
    """
    Advanced rate limiter with multiple strategies and dynamic adjustment
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis = redis_client
        self.memory_store = defaultdict(lambda: defaultdict(lambda: deque()))
        self.configs = {
            'default': RateLimitConfig(),
            'api_key': RateLimitConfig(requests_per_minute=120, requests_per_hour=2000),
            'premium': RateLimitConfig(requests_per_minute=300, requests_per_hour=5000),
            'admin': RateLimitConfig(requests_per_minute=600, requests_per_hour=10000),
        }
        
        # Endpoint-specific configurations
        self.endpoint_configs = {
            '/api/search': RateLimitConfig(requests_per_minute=30, burst_limit=5),
            '/api/documents': RateLimitConfig(requests_per_minute=20, burst_limit=3),
            '/api/upload': RateLimitConfig(requests_per_minute=10, burst_limit=2),
            '/api/admin': RateLimitConfig(requests_per_minute=100, burst_limit=20),
        }
        
        # Persian error messages
        self.error_messages = {
            'rate_limit_exceeded': 'محدودیت درخواست تجاوز شده است',
            'burst_limit_exceeded': 'حد مجاز درخواست‌های سریع تجاوز شده است',
            'ip_blocked': 'آی‌پی شما موقتاً مسدود شده است',
            'user_blocked': 'حساب کاربری شما موقتاً مسدود شده است',
            'endpoint_limit': 'حد مجاز این endpoint تجاوز شده است'
        }

    def _get_identifier(self, request: Request, user_id: Optional[str] = None) -> str:
        """Generate unique identifier for rate limiting"""
        # Get client IP
        client_ip = request.client.host
        if hasattr(request, 'headers') and 'x-forwarded-for' in request.headers:
            client_ip = request.headers['x-forwarded-for'].split(',')[0].strip()
        
        # Create composite key
        if user_id:
            return f"user:{user_id}:{client_ip}"
        return f"ip:{client_ip}"

    def _get_config(self, endpoint: str, user_type: str = 'default') -> RateLimitConfig:
        """Get rate limit configuration for endpoint and user type"""
        base_config = self.configs.get(user_type, self.configs['default'])
        endpoint_config = self.endpoint_configs.get(endpoint)
        
        if endpoint_config:
            # Merge configurations
            return RateLimitConfig(
                requests_per_minute=int(base_config.requests_per_minute * endpoint_config.endpoint_multiplier),
                requests_per_hour=int(base_config.requests_per_hour * endpoint_config.endpoint_multiplier),
                requests_per_day=int(base_config.requests_per_day * endpoint_config.endpoint_multiplier),
                burst_limit=endpoint_config.burst_limit,
                burst_window=endpoint_config.burst_window,
                endpoint_multiplier=endpoint_config.endpoint_multiplier,
                user_multiplier=base_config.user_multiplier,
                ip_multiplier=base_config.ip_multiplier
            )
        
        return base_config

    async def _check_redis_rate_limit(self, key: str, config: RateLimitConfig) -> RateLimitResult:
        """Check rate limit using Redis"""
        if not self.redis:
            return await self._check_memory_rate_limit(key, config)
        
        current_time = int(time.time())
        window_start = current_time - 60  # 1 minute window
        
        # Use Redis pipeline for atomic operations
        pipe = self.redis.pipeline()
        
        # Clean old entries
        pipe.zremrangebyscore(key, 0, window_start)
        
        # Count current requests
        pipe.zcard(key)
        
        # Add current request
        pipe.zadd(key, {str(current_time): current_time})
        
        # Set expiration
        pipe.expire(key, 3600)  # 1 hour
        
        results = await asyncio.get_event_loop().run_in_executor(None, pipe.execute)
        current_count = results[1]
        
        if current_count >= config.requests_per_minute:
            return RateLimitResult(
                allowed=False,
                remaining=0,
                reset_time=current_time + 60,
                retry_after=60,
                limit_type="minute",
                message=self.error_messages['rate_limit_exceeded']
            )
        
        return RateLimitResult(
            allowed=True,
            remaining=config.requests_per_minute - current_count - 1,
            reset_time=current_time + 60,
            limit_type="minute"
        )

    async def _check_memory_rate_limit(self, key: str, config: RateLimitConfig) -> RateLimitResult:
        """Check rate limit using in-memory storage"""
        current_time = time.time()
        window_start = current_time - 60  # 1 minute window
        
        # Get or create request history
        request_history = self.memory_store[key]['requests']
        
        # Clean old entries
        while request_history and request_history[0] < window_start:
            request_history.popleft()
        
        # Check if limit exceeded
        if len(request_history) >= config.requests_per_minute:
            return RateLimitResult(
                allowed=False,
                remaining=0,
                reset_time=int(current_time + 60),
                retry_after=60,
                limit_type="minute",
                message=self.error_messages['rate_limit_exceeded']
            )
        
        # Add current request
        request_history.append(current_time)
        
        return RateLimitResult(
            allowed=True,
            remaining=config.requests_per_minute - len(request_history),
            reset_time=int(current_time + 60),
            limit_type="minute"
        )

    async def _check_burst_limit(self, key: str, config: RateLimitConfig) -> RateLimitResult:
        """Check burst rate limit"""
        current_time = time.time()
        burst_window_start = current_time - config.burst_window
        
        if self.redis:
            # Redis burst check
            burst_key = f"{key}:burst"
            pipe = self.redis.pipeline()
            pipe.zremrangebyscore(burst_key, 0, burst_window_start)
            pipe.zcard(burst_key)
            pipe.zadd(burst_key, {str(current_time): current_time})
            pipe.expire(burst_key, config.burst_window * 2)
            
            results = await asyncio.get_event_loop().run_in_executor(None, pipe.execute)
            burst_count = results[1]
        else:
            # Memory burst check
            burst_history = self.memory_store[key]['burst']
            while burst_history and burst_history[0] < burst_window_start:
                burst_history.popleft()
            
            burst_count = len(burst_history)
            burst_history.append(current_time)
        
        if burst_count >= config.burst_limit:
            return RateLimitResult(
                allowed=False,
                remaining=0,
                reset_time=int(current_time + config.burst_window),
                retry_after=config.burst_window,
                limit_type="burst",
                message=self.error_messages['burst_limit_exceeded']
            )
        
        return RateLimitResult(
            allowed=True,
            remaining=config.burst_limit - burst_count - 1,
            reset_time=int(current_time + config.burst_window),
            limit_type="burst"
        )

    async def check_rate_limit(
        self, 
        request: Request, 
        user_id: Optional[str] = None,
        user_type: str = 'default'
    ) -> RateLimitResult:
        """
        Check rate limit for request
        """
        try:
            identifier = self._get_identifier(request, user_id)
            endpoint = request.url.path
            config = self._get_config(endpoint, user_type)
            
            # Check burst limit first (more restrictive)
            burst_result = await self._check_burst_limit(identifier, config)
            if not burst_result.allowed:
                return burst_result
            
            # Check regular rate limit
            rate_result = await self._check_redis_rate_limit(identifier, config)
            if not rate_result.allowed:
                return rate_result
            
            # Both checks passed
            return RateLimitResult(
                allowed=True,
                remaining=min(burst_result.remaining, rate_result.remaining),
                reset_time=min(burst_result.reset_time, rate_result.reset_time),
                limit_type="combined"
            )
            
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            # Fail open - allow request if rate limiting fails
            return RateLimitResult(
                allowed=True,
                remaining=999,
                reset_time=int(time.time() + 60),
                limit_type="error"
            )

    def adjust_limits(self, user_id: str, adjustment_factor: float):
        """Dynamically adjust rate limits for a user"""
        if user_id in self.configs:
            config = self.configs[user_id]
            config.requests_per_minute = int(config.requests_per_minute * adjustment_factor)
            config.requests_per_hour = int(config.requests_per_hour * adjustment_factor)
            config.requests_per_day = int(config.requests_per_day * adjustment_factor)

    def get_rate_limit_headers(self, result: RateLimitResult) -> Dict[str, str]:
        """Generate rate limit headers for response"""
        headers = {
            'X-RateLimit-Limit': str(result.remaining + (1 if result.allowed else 0)),
            'X-RateLimit-Remaining': str(result.remaining),
            'X-RateLimit-Reset': str(result.reset_time),
            'X-RateLimit-Type': result.limit_type
        }
        
        if result.retry_after:
            headers['Retry-After'] = str(result.retry_after)
        
        return headers

    async def cleanup_expired_entries(self):
        """Clean up expired rate limit entries"""
        if not self.redis:
            current_time = time.time()
            for key in list(self.memory_store.keys()):
                for limit_type in ['requests', 'burst']:
                    history = self.memory_store[key][limit_type]
                    while history and history[0] < current_time - 3600:  # 1 hour
                        history.popleft()
                
                # Remove empty entries
                if not any(self.memory_store[key].values()):
                    del self.memory_store[key]

# Global rate limiter instance
rate_limiter = RateLimiter()

def rate_limit_middleware(user_type: str = 'default'):
    """FastAPI middleware for rate limiting"""
    async def middleware(request: Request, call_next):
        # Extract user ID from request (implement based on your auth system)
        user_id = getattr(request.state, 'user_id', None)
        
        # Check rate limit
        result = await rate_limiter.check_rate_limit(request, user_id, user_type)
        
        if not result.allowed:
            headers = rate_limiter.get_rate_limit_headers(result)
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "message": result.message,
                    "retry_after": result.retry_after,
                    "limit_type": result.limit_type
                },
                headers=headers
            )
        
        # Add rate limit headers to response
        response = await call_next(request)
        headers = rate_limiter.get_rate_limit_headers(result)
        for key, value in headers.items():
            response.headers[key] = value
        
        return response
    
    return middleware