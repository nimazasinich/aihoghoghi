"""
API Key Management System for Legal API Platform
Provides secure API key generation, rotation, analytics, and scope-based permissions
"""

import secrets
import hashlib
import hmac
import json
import time
from typing import Dict, List, Optional, Set, Any
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
import logging
import redis
from fastapi import HTTPException, Request
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

class KeyScope(Enum):
    """API key scopes/permissions"""
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"
    SEARCH = "search"
    UPLOAD = "upload"
    ANALYTICS = "analytics"
    EXPORT = "export"

class KeyStatus(Enum):
    """API key status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    REVOKED = "revoked"
    EXPIRED = "expired"

@dataclass
class APIKey:
    """API Key data structure"""
    key_id: str
    key_hash: str
    name: str
    description: str
    scopes: Set[KeyScope]
    status: KeyStatus
    created_at: datetime
    expires_at: Optional[datetime]
    last_used: Optional[datetime]
    usage_count: int
    rate_limit_multiplier: float
    user_id: Optional[str]
    metadata: Dict[str, Any]

@dataclass
class KeyUsage:
    """API key usage statistics"""
    key_id: str
    timestamp: datetime
    endpoint: str
    method: str
    response_code: int
    response_time: float
    ip_address: str
    user_agent: str

class APIKeyRequest(BaseModel):
    """Request model for creating API keys"""
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., max_length=500)
    scopes: List[KeyScope] = Field(..., min_items=1)
    expires_in_days: Optional[int] = Field(None, ge=1, le=365)
    rate_limit_multiplier: float = Field(1.0, ge=0.1, le=10.0)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class APIKeyManager:
    """
    Comprehensive API key management system
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis = redis_client
        self.keys: Dict[str, APIKey] = {}
        self.usage_stats: Dict[str, List[KeyUsage]] = {}
        
        # Persian error messages
        self.error_messages = {
            'invalid_key': 'کلید API نامعتبر است',
            'key_expired': 'کلید API منقضی شده است',
            'key_revoked': 'کلید API لغو شده است',
            'insufficient_scope': 'دسترسی کافی برای این عملیات ندارید',
            'key_not_found': 'کلید API یافت نشد',
            'key_creation_failed': 'ایجاد کلید API ناموفق بود'
        }

    def _generate_key_id(self) -> str:
        """Generate unique key ID"""
        return f"key_{secrets.token_urlsafe(16)}"

    def _generate_api_key(self) -> str:
        """Generate secure API key"""
        # Generate 32 bytes of random data
        random_bytes = secrets.token_bytes(32)
        # Convert to base64-like string with URL-safe characters
        return secrets.token_urlsafe(32)

    def _hash_key(self, key: str) -> str:
        """Hash API key for secure storage"""
        return hashlib.sha256(key.encode()).hexdigest()

    def _verify_key(self, key: str, key_hash: str) -> bool:
        """Verify API key against stored hash"""
        return hmac.compare_digest(self._hash_key(key), key_hash)

    async def create_api_key(
        self, 
        request: APIKeyRequest, 
        user_id: Optional[str] = None
    ) -> Tuple[str, APIKey]:
        """
        Create new API key
        Returns: (plain_key, api_key_object)
        """
        try:
            # Generate key
            plain_key = self._generate_api_key()
            key_id = self._generate_key_id()
            key_hash = self._hash_key(plain_key)
            
            # Calculate expiration
            expires_at = None
            if request.expires_in_days:
                expires_at = datetime.utcnow() + timedelta(days=request.expires_in_days)
            
            # Create API key object
            api_key = APIKey(
                key_id=key_id,
                key_hash=key_hash,
                name=request.name,
                description=request.description,
                scopes=set(request.scopes),
                status=KeyStatus.ACTIVE,
                created_at=datetime.utcnow(),
                expires_at=expires_at,
                last_used=None,
                usage_count=0,
                rate_limit_multiplier=request.rate_limit_multiplier,
                user_id=user_id,
                metadata=request.metadata
            )
            
            # Store in memory and Redis
            self.keys[key_id] = api_key
            if self.redis:
                await self._store_key_in_redis(api_key)
            
            logger.info(f"Created API key {key_id} for user {user_id}")
            return plain_key, api_key
            
        except Exception as e:
            logger.error(f"Failed to create API key: {e}")
            raise HTTPException(
                status_code=500,
                detail=self.error_messages['key_creation_failed']
            )

    async def _store_key_in_redis(self, api_key: APIKey):
        """Store API key in Redis"""
        if not self.redis:
            return
        
        key_data = {
            'key_id': api_key.key_id,
            'key_hash': api_key.key_hash,
            'name': api_key.name,
            'description': api_key.description,
            'scopes': json.dumps([scope.value for scope in api_key.scopes]),
            'status': api_key.status.value,
            'created_at': api_key.created_at.isoformat(),
            'expires_at': api_key.expires_at.isoformat() if api_key.expires_at else None,
            'last_used': api_key.last_used.isoformat() if api_key.last_used else None,
            'usage_count': str(api_key.usage_count),
            'rate_limit_multiplier': str(api_key.rate_limit_multiplier),
            'user_id': api_key.user_id or '',
            'metadata': json.dumps(api_key.metadata)
        }
        
        # Store with expiration if key has expiration
        if api_key.expires_at:
            ttl = int((api_key.expires_at - datetime.utcnow()).total_seconds())
            await asyncio.get_event_loop().run_in_executor(
                None, 
                lambda: self.redis.hset(f"api_key:{api_key.key_id}", mapping=key_data)
            )
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.redis.expire(f"api_key:{api_key.key_id}", ttl)
            )
        else:
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.redis.hset(f"api_key:{api_key.key_id}", mapping=key_data)
            )

    async def validate_api_key(self, key: str) -> Optional[APIKey]:
        """
        Validate API key and return key object if valid
        """
        try:
            key_hash = self._hash_key(key)
            
            # Search for matching key
            for api_key in self.keys.values():
                if self._verify_key(key, api_key.key_hash):
                    # Check if key is still valid
                    if api_key.status != KeyStatus.ACTIVE:
                        logger.warning(f"API key {api_key.key_id} is not active: {api_key.status}")
                        return None
                    
                    if api_key.expires_at and datetime.utcnow() > api_key.expires_at:
                        logger.warning(f"API key {api_key.key_id} has expired")
                        api_key.status = KeyStatus.EXPIRED
                        return None
                    
                    return api_key
            
            # If not found in memory, check Redis
            if self.redis:
                return await self._validate_key_from_redis(key, key_hash)
            
            return None
            
        except Exception as e:
            logger.error(f"API key validation failed: {e}")
            return None

    async def _validate_key_from_redis(self, key: str, key_hash: str) -> Optional[APIKey]:
        """Validate key from Redis storage"""
        try:
            # Get all key IDs from Redis
            key_ids = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.redis.keys("api_key:*")
            )
            
            for key_id_redis in key_ids:
                key_data = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: self.redis.hgetall(key_id_redis)
                )
                
                if key_data.get('key_hash') == key_hash:
                    # Reconstruct API key object
                    api_key = APIKey(
                        key_id=key_data['key_id'],
                        key_hash=key_data['key_hash'],
                        name=key_data['name'],
                        description=key_data['description'],
                        scopes=set(KeyScope(scope) for scope in json.loads(key_data['scopes'])),
                        status=KeyStatus(key_data['status']),
                        created_at=datetime.fromisoformat(key_data['created_at']),
                        expires_at=datetime.fromisoformat(key_data['expires_at']) if key_data['expires_at'] else None,
                        last_used=datetime.fromisoformat(key_data['last_used']) if key_data['last_used'] else None,
                        usage_count=int(key_data['usage_count']),
                        rate_limit_multiplier=float(key_data['rate_limit_multiplier']),
                        user_id=key_data['user_id'] or None,
                        metadata=json.loads(key_data['metadata'])
                    )
                    
                    # Check validity
                    if api_key.status != KeyStatus.ACTIVE:
                        return None
                    
                    if api_key.expires_at and datetime.utcnow() > api_key.expires_at:
                        api_key.status = KeyStatus.EXPIRED
                        return None
                    
                    return api_key
            
            return None
            
        except Exception as e:
            logger.error(f"Redis key validation failed: {e}")
            return None

    def check_scope_permission(self, api_key: APIKey, required_scope: KeyScope) -> bool:
        """Check if API key has required scope"""
        return required_scope in api_key.scopes or KeyScope.ADMIN in api_key.scopes

    async def record_usage(
        self, 
        api_key: APIKey, 
        request: Request, 
        response_code: int, 
        response_time: float
    ):
        """Record API key usage"""
        try:
            usage = KeyUsage(
                key_id=api_key.key_id,
                timestamp=datetime.utcnow(),
                endpoint=request.url.path,
                method=request.method,
                response_code=response_code,
                response_time=response_time,
                ip_address=request.client.host,
                user_agent=request.headers.get('user-agent', '')
            )
            
            # Update key statistics
            api_key.last_used = usage.timestamp
            api_key.usage_count += 1
            
            # Store usage statistics
            if api_key.key_id not in self.usage_stats:
                self.usage_stats[api_key.key_id] = []
            
            self.usage_stats[api_key.key_id].append(usage)
            
            # Keep only last 1000 usage records per key
            if len(self.usage_stats[api_key.key_id]) > 1000:
                self.usage_stats[api_key.key_id] = self.usage_stats[api_key.key_id][-1000:]
            
            # Store in Redis if available
            if self.redis:
                await self._store_usage_in_redis(usage)
            
        except Exception as e:
            logger.error(f"Failed to record usage: {e}")

    async def _store_usage_in_redis(self, usage: KeyUsage):
        """Store usage statistics in Redis"""
        if not self.redis:
            return
        
        usage_data = {
            'timestamp': usage.timestamp.isoformat(),
            'endpoint': usage.endpoint,
            'method': usage.method,
            'response_code': str(usage.response_code),
            'response_time': str(usage.response_time),
            'ip_address': usage.ip_address,
            'user_agent': usage.user_agent
        }
        
        # Store in sorted set for time-based queries
        score = usage.timestamp.timestamp()
        await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: self.redis.zadd(
                f"usage:{usage.key_id}", 
                {json.dumps(usage_data): score}
            )
        )
        
        # Keep only last 7 days of usage data
        cutoff_time = (datetime.utcnow() - timedelta(days=7)).timestamp()
        await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: self.redis.zremrangebyscore(f"usage:{usage.key_id}", 0, cutoff_time)
        )

    async def revoke_api_key(self, key_id: str) -> bool:
        """Revoke API key"""
        try:
            if key_id in self.keys:
                self.keys[key_id].status = KeyStatus.REVOKED
                
                if self.redis:
                    await asyncio.get_event_loop().run_in_executor(
                        None,
                        lambda: self.redis.hset(f"api_key:{key_id}", "status", KeyStatus.REVOKED.value)
                    )
                
                logger.info(f"Revoked API key {key_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to revoke API key {key_id}: {e}")
            return False

    async def rotate_api_key(self, key_id: str) -> Optional[Tuple[str, APIKey]]:
        """Rotate API key (create new key, revoke old one)"""
        try:
            if key_id not in self.keys:
                return None
            
            old_key = self.keys[key_id]
            
            # Create new key with same configuration
            new_request = APIKeyRequest(
                name=f"{old_key.name} (Rotated)",
                description=old_key.description,
                scopes=list(old_key.scopes),
                expires_in_days=None,  # Keep same expiration
                rate_limit_multiplier=old_key.rate_limit_multiplier,
                metadata=old_key.metadata
            )
            
            new_plain_key, new_api_key = await self.create_api_key(new_request, old_key.user_id)
            
            # Revoke old key
            await self.revoke_api_key(key_id)
            
            logger.info(f"Rotated API key {key_id} to {new_api_key.key_id}")
            return new_plain_key, new_api_key
            
        except Exception as e:
            logger.error(f"Failed to rotate API key {key_id}: {e}")
            return None

    def get_usage_analytics(self, key_id: str, days: int = 7) -> Dict[str, Any]:
        """Get usage analytics for API key"""
        if key_id not in self.usage_stats:
            return {}
        
        usage_list = self.usage_stats[key_id]
        cutoff_time = datetime.utcnow() - timedelta(days=days)
        recent_usage = [u for u in usage_list if u.timestamp >= cutoff_time]
        
        if not recent_usage:
            return {}
        
        # Calculate statistics
        total_requests = len(recent_usage)
        successful_requests = len([u for u in recent_usage if 200 <= u.response_code < 300])
        avg_response_time = sum(u.response_time for u in recent_usage) / total_requests
        
        # Group by endpoint
        endpoint_stats = {}
        for usage in recent_usage:
            if usage.endpoint not in endpoint_stats:
                endpoint_stats[usage.endpoint] = {'count': 0, 'avg_time': 0, 'errors': 0}
            
            endpoint_stats[usage.endpoint]['count'] += 1
            endpoint_stats[usage.endpoint]['avg_time'] += usage.response_time
            
            if usage.response_code >= 400:
                endpoint_stats[usage.endpoint]['errors'] += 1
        
        # Calculate averages
        for endpoint in endpoint_stats:
            count = endpoint_stats[endpoint]['count']
            endpoint_stats[endpoint]['avg_time'] /= count
        
        return {
            'total_requests': total_requests,
            'successful_requests': successful_requests,
            'success_rate': successful_requests / total_requests if total_requests > 0 else 0,
            'avg_response_time': avg_response_time,
            'endpoint_stats': endpoint_stats,
            'period_days': days
        }

    def list_api_keys(self, user_id: Optional[str] = None) -> List[APIKey]:
        """List API keys, optionally filtered by user"""
        keys = list(self.keys.values())
        
        if user_id:
            keys = [k for k in keys if k.user_id == user_id]
        
        return sorted(keys, key=lambda k: k.created_at, reverse=True)

# Global API key manager instance
api_key_manager = APIKeyManager()

def require_api_key(required_scope: KeyScope):
    """Decorator to require API key with specific scope"""
    def decorator(func):
        async def wrapper(request: Request, *args, **kwargs):
            # Extract API key from header
            api_key = request.headers.get('X-API-Key') or request.headers.get('Authorization', '').replace('Bearer ', '')
            
            if not api_key:
                raise HTTPException(
                    status_code=401,
                    detail="API key required"
                )
            
            # Validate API key
            key_obj = await api_key_manager.validate_api_key(api_key)
            if not key_obj:
                raise HTTPException(
                    status_code=401,
                    detail=api_key_manager.error_messages['invalid_key']
                )
            
            # Check scope permission
            if not api_key_manager.check_scope_permission(key_obj, required_scope):
                raise HTTPException(
                    status_code=403,
                    detail=api_key_manager.error_messages['insufficient_scope']
                )
            
            # Add key to request state
            request.state.api_key = key_obj
            
            return await func(request, *args, **kwargs)
        
        return wrapper
    return decorator