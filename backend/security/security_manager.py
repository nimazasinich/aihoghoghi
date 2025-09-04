"""
Security Manager - Main integration point for all security features
Provides unified security management for the Legal API Platform
"""

from typing import Dict, List, Optional, Any
from fastapi import FastAPI, Request, Response
from fastapi.middleware.base import BaseHTTPMiddleware
import logging
import time
import asyncio

from .rate_limiter import rate_limiter, rate_limit_middleware
from .api_key_manager import api_key_manager, require_api_key, KeyScope
from .request_validator import request_validator, validate_request
from .security_headers import SecurityHeadersMiddleware, SecurityHeadersConfig
from .threat_detector import threat_detector, threat_detection_middleware
from .audit_logger import audit_logger, audit_middleware, AuditEventType, AuditLevel

logger = logging.getLogger(__name__)

class SecurityManager:
    """
    Unified security management system
    """
    
    def __init__(self, app: FastAPI, environment: str = "production"):
        self.app = app
        self.environment = environment
        self.security_config = self._get_security_config()
        
        # Initialize security components
        self._setup_security_middleware()
        self._setup_security_routes()
        
        logger.info("Security Manager initialized successfully")

    def _get_security_config(self) -> Dict[str, Any]:
        """Get security configuration based on environment"""
        if self.environment == "development":
            return {
                'rate_limiting': {
                    'enabled': True,
                    'strict_mode': False
                },
                'api_key_management': {
                    'enabled': True,
                    'require_for_all_endpoints': False
                },
                'request_validation': {
                    'enabled': True,
                    'strict_mode': False
                },
                'security_headers': SecurityHeadersConfig.get_development_config(),
                'threat_detection': {
                    'enabled': True,
                    'auto_block': False
                },
                'audit_logging': {
                    'enabled': True,
                    'log_level': 'INFO'
                }
            }
        else:
            return {
                'rate_limiting': {
                    'enabled': True,
                    'strict_mode': True
                },
                'api_key_management': {
                    'enabled': True,
                    'require_for_all_endpoints': True
                },
                'request_validation': {
                    'enabled': True,
                    'strict_mode': True
                },
                'security_headers': SecurityHeadersConfig.get_legal_api_config(),
                'threat_detection': {
                    'enabled': True,
                    'auto_block': True
                },
                'audit_logging': {
                    'enabled': True,
                    'log_level': 'WARNING'
                }
            }

    def _setup_security_middleware(self):
        """Setup all security middleware in correct order"""
        # 1. Security Headers (first - sets basic security headers)
        self.app.add_middleware(
            SecurityHeadersMiddleware,
            config=self.security_config['security_headers']
        )
        
        # 2. Threat Detection (early detection of malicious requests)
        if self.security_config['threat_detection']['enabled']:
            self.app.middleware('http')(threat_detection_middleware())
        
        # 3. Rate Limiting (prevent abuse)
        if self.security_config['rate_limiting']['enabled']:
            self.app.middleware('http')(rate_limit_middleware())
        
        # 4. Request Validation (validate and sanitize input)
        if self.security_config['request_validation']['enabled']:
            self.app.middleware('http')(self._request_validation_middleware())
        
        # 5. Audit Logging (log all requests)
        if self.security_config['audit_logging']['enabled']:
            self.app.middleware('http')(audit_middleware(AuditEventType.API_ACCESS))

    def _request_validation_middleware(self):
        """Request validation middleware"""
        async def middleware(request: Request, call_next):
            try:
                # Basic request validation
                if request.method in ['POST', 'PUT', 'PATCH']:
                    # Check content type
                    content_type = request.headers.get('content-type', '')
                    if 'application/json' not in content_type and 'multipart/form-data' not in content_type:
                        return Response(
                            content='{"error": "Invalid content type"}',
                            status_code=400,
                            media_type='application/json'
                        )
                
                # Process request
                response = await call_next(request)
                return response
                
            except Exception as e:
                logger.error(f"Request validation error: {e}")
                return Response(
                    content='{"error": "Request validation failed"}',
                    status_code=400,
                    media_type='application/json'
                )
        
        return middleware

    def _setup_security_routes(self):
        """Setup security-related API routes"""
        
        @self.app.get("/security/status")
        async def get_security_status():
            """Get security system status"""
            return {
                "status": "active",
                "environment": self.environment,
                "components": {
                    "rate_limiting": self.security_config['rate_limiting']['enabled'],
                    "api_key_management": self.security_config['api_key_management']['enabled'],
                    "request_validation": self.security_config['request_validation']['enabled'],
                    "threat_detection": self.security_config['threat_detection']['enabled'],
                    "audit_logging": self.security_config['audit_logging']['enabled']
                },
                "threats_blocked": len(threat_detector.get_blocked_ips()),
                "active_api_keys": len(api_key_manager.list_api_keys())
            }
        
        @self.app.get("/security/threats")
        async def get_threat_statistics():
            """Get threat detection statistics"""
            return threat_detector.get_threat_statistics()
        
        @self.app.get("/security/audit/stats")
        async def get_audit_statistics():
            """Get audit logging statistics"""
            return audit_logger.get_audit_statistics()
        
        @self.app.post("/security/ip/unblock/{ip_address}")
        async def unblock_ip(ip_address: str):
            """Manually unblock an IP address"""
            success = threat_detector.unblock_ip(ip_address)
            if success:
                return {"message": f"IP {ip_address} unblocked successfully"}
            else:
                return {"error": f"IP {ip_address} was not blocked"}

    def get_security_metrics(self) -> Dict[str, Any]:
        """Get comprehensive security metrics"""
        return {
            "rate_limiting": {
                "active_limits": len(rate_limiter.memory_store),
                "blocked_requests": "N/A"  # Would need to track this
            },
            "api_keys": {
                "total_keys": len(api_key_manager.list_api_keys()),
                "active_keys": len([k for k in api_key_manager.list_api_keys() if k.status.value == 'active'])
            },
            "threat_detection": threat_detector.get_threat_statistics(),
            "audit_logging": audit_logger.get_audit_statistics(),
            "security_headers": {
                "enabled": True,
                "config": self.security_config['security_headers']
            }
        }

    def update_security_config(self, new_config: Dict[str, Any]):
        """Update security configuration"""
        self.security_config.update(new_config)
        logger.info("Security configuration updated")

    def get_compliance_report(self, standard: str, days: int = 30):
        """Generate compliance report"""
        from .audit_logger import ComplianceStandard
        
        try:
            standard_enum = ComplianceStandard(standard.lower())
            end_date = time.time()
            start_date = end_date - (days * 24 * 3600)
            
            return audit_logger.generate_compliance_report(
                standard_enum,
                start_date,
                end_date
            )
        except ValueError:
            return {"error": f"Invalid compliance standard: {standard}"}

# Security decorators for easy use
def secure_endpoint(
    required_scope: Optional[KeyScope] = None,
    rate_limit_type: str = 'default',
    audit_event_type: AuditEventType = AuditEventType.API_ACCESS
):
    """Decorator to secure an endpoint with multiple security layers"""
    def decorator(func):
        # Apply API key requirement if scope specified
        if required_scope:
            func = require_api_key(required_scope)(func)
        
        # Apply rate limiting
        func = rate_limit_middleware(rate_limit_type)(func)
        
        # Apply audit logging
        func = audit_middleware(audit_event_type)(func)
        
        return func
    return decorator

def admin_only(func):
    """Decorator for admin-only endpoints"""
    return secure_endpoint(
        required_scope=KeyScope.ADMIN,
        rate_limit_type='admin',
        audit_event_type=AuditEventType.ADMIN_ACTION
    )(func)

def authenticated_only(func):
    """Decorator for authenticated endpoints"""
    return secure_endpoint(
        required_scope=KeyScope.READ,
        rate_limit_type='api_key',
        audit_event_type=AuditEventType.API_ACCESS
    )(func)

def public_endpoint(func):
    """Decorator for public endpoints with basic security"""
    return secure_endpoint(
        required_scope=None,
        rate_limit_type='default',
        audit_event_type=AuditEventType.API_ACCESS
    )(func)