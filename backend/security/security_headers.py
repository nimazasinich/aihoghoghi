"""
Security Headers Middleware for Legal API Platform
Provides CORS policy enforcement, CSP, X-Frame-Options, HSTS, and other security headers
"""

from typing import Dict, List, Optional, Set
from fastapi import Request, Response
from fastapi.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive security headers middleware
    """
    
    def __init__(self, app, config: Optional[Dict] = None):
        super().__init__(app)
        self.config = config or self._get_default_config()
    
    def _get_default_config(self) -> Dict:
        """Get default security configuration"""
        return {
            'cors': {
                'allowed_origins': ['https://yourdomain.com', 'https://www.yourdomain.com'],
                'allowed_methods': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                'allowed_headers': ['Content-Type', 'Authorization', 'X-API-Key', 'X-CSRF-Token'],
                'exposed_headers': ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
                'allow_credentials': True,
                'max_age': 3600
            },
            'csp': {
                'default_src': ["'self'"],
                'script_src': ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
                'style_src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                'font_src': ["'self'", "https://fonts.gstatic.com"],
                'img_src': ["'self'", "data:", "https:"],
                'connect_src': ["'self'"],
                'frame_src': ["'none'"],
                'object_src': ["'none'"],
                'base_uri': ["'self'"],
                'form_action': ["'self'"],
                'frame_ancestors': ["'none'"],
                'upgrade_insecure_requests': True
            },
            'hsts': {
                'max_age': 31536000,  # 1 year
                'include_subdomains': True,
                'preload': True
            },
            'other_headers': {
                'x_frame_options': 'DENY',
                'x_content_type_options': 'nosniff',
                'x_xss_protection': '1; mode=block',
                'referrer_policy': 'strict-origin-when-cross-origin',
                'permissions_policy': 'geolocation=(), microphone=(), camera=()',
                'cross_origin_embedder_policy': 'require-corp',
                'cross_origin_opener_policy': 'same-origin',
                'cross_origin_resource_policy': 'same-origin'
            }
        }
    
    async def dispatch(self, request: Request, call_next):
        """Process request and add security headers"""
        try:
            # Handle CORS preflight requests
            if request.method == 'OPTIONS':
                response = await self._handle_cors_preflight(request)
                if response:
                    return response
            
            # Process the request
            response = await call_next(request)
            
            # Add security headers
            self._add_security_headers(request, response)
            
            return response
            
        except Exception as e:
            logger.error(f"Security headers middleware error: {e}")
            return JSONResponse(
                status_code=500,
                content={"error": "Internal server error"}
            )
    
    def _handle_cors_preflight(self, request: Request) -> Optional[Response]:
        """Handle CORS preflight requests"""
        origin = request.headers.get('origin')
        method = request.headers.get('access-control-request-method')
        headers = request.headers.get('access-control-request-headers')
        
        cors_config = self.config['cors']
        
        # Check origin
        if origin and origin not in cors_config['allowed_origins']:
            return JSONResponse(
                status_code=403,
                content={"error": "Origin not allowed"}
            )
        
        # Check method
        if method and method not in cors_config['allowed_methods']:
            return JSONResponse(
                status_code=403,
                content={"error": "Method not allowed"}
            )
        
        # Check headers
        if headers:
            requested_headers = [h.strip() for h in headers.split(',')]
            allowed_headers = cors_config['allowed_headers']
            if not all(h.lower() in [ah.lower() for ah in allowed_headers] for h in requested_headers):
                return JSONResponse(
                    status_code=403,
                    content={"error": "Headers not allowed"}
                )
        
        # Return CORS preflight response
        response = JSONResponse(content={})
        self._add_cors_headers(request, response)
        return response
    
    def _add_security_headers(self, request: Request, response: Response):
        """Add all security headers to response"""
        # CORS headers
        self._add_cors_headers(request, response)
        
        # Content Security Policy
        self._add_csp_header(response)
        
        # HSTS header
        self._add_hsts_header(response)
        
        # Other security headers
        self._add_other_security_headers(response)
    
    def _add_cors_headers(self, request: Request, response: Response):
        """Add CORS headers"""
        origin = request.headers.get('origin')
        cors_config = self.config['cors']
        
        # Check if origin is allowed
        if origin and origin in cors_config['allowed_origins']:
            response.headers['Access-Control-Allow-Origin'] = origin
        elif '*' in cors_config['allowed_origins']:
            response.headers['Access-Control-Allow-Origin'] = '*'
        
        # Add other CORS headers
        response.headers['Access-Control-Allow-Methods'] = ', '.join(cors_config['allowed_methods'])
        response.headers['Access-Control-Allow-Headers'] = ', '.join(cors_config['allowed_headers'])
        response.headers['Access-Control-Expose-Headers'] = ', '.join(cors_config['exposed_headers'])
        response.headers['Access-Control-Max-Age'] = str(cors_config['max_age'])
        
        if cors_config['allow_credentials']:
            response.headers['Access-Control-Allow-Credentials'] = 'true'
    
    def _add_csp_header(self, response: Response):
        """Add Content Security Policy header"""
        csp_config = self.config['csp']
        csp_directives = []
        
        # Build CSP directives
        for directive, values in csp_config.items():
            if directive == 'upgrade_insecure_requests' and values:
                csp_directives.append('upgrade-insecure-requests')
            elif isinstance(values, list):
                csp_directives.append(f"{directive.replace('_', '-')} {' '.join(values)}")
        
        if csp_directives:
            response.headers['Content-Security-Policy'] = '; '.join(csp_directives)
    
    def _add_hsts_header(self, response: Response):
        """Add HTTP Strict Transport Security header"""
        hsts_config = self.config['hsts']
        hsts_value = f"max-age={hsts_config['max_age']}"
        
        if hsts_config['include_subdomains']:
            hsts_value += "; includeSubDomains"
        
        if hsts_config['preload']:
            hsts_value += "; preload"
        
        response.headers['Strict-Transport-Security'] = hsts_value
    
    def _add_other_security_headers(self, response: Response):
        """Add other security headers"""
        headers_config = self.config['other_headers']
        
        for header_name, header_value in headers_config.items():
            # Convert snake_case to kebab-case
            header_name = header_name.replace('_', '-').title()
            response.headers[header_name] = header_value

class SecurityHeadersConfig:
    """Configuration class for security headers"""
    
    @staticmethod
    def get_development_config() -> Dict:
        """Get configuration for development environment"""
        return {
            'cors': {
                'allowed_origins': ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'],
                'allowed_methods': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
                'allowed_headers': ['*'],
                'exposed_headers': ['*'],
                'allow_credentials': True,
                'max_age': 3600
            },
            'csp': {
                'default_src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                'script_src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                'style_src': ["'self'", "'unsafe-inline'"],
                'font_src': ["'self'", "data:", "https:"],
                'img_src': ["'self'", "data:", "https:", "blob:"],
                'connect_src': ["'self'", "ws:", "wss:"],
                'frame_src': ["'self'"],
                'object_src': ["'self'"],
                'base_uri': ["'self'"],
                'form_action': ["'self'"],
                'frame_ancestors': ["'self'"],
                'upgrade_insecure_requests': False
            },
            'hsts': {
                'max_age': 0,  # Disable HSTS in development
                'include_subdomains': False,
                'preload': False
            },
            'other_headers': {
                'x_frame_options': 'SAMEORIGIN',
                'x_content_type_options': 'nosniff',
                'x_xss_protection': '1; mode=block',
                'referrer_policy': 'strict-origin-when-cross-origin',
                'permissions_policy': 'geolocation=(), microphone=(), camera=()',
                'cross_origin_embedder_policy': 'unsafe-none',
                'cross_origin_opener_policy': 'unsafe-none',
                'cross_origin_resource_policy': 'cross-origin'
            }
        }
    
    @staticmethod
    def get_production_config() -> Dict:
        """Get configuration for production environment"""
        return {
            'cors': {
                'allowed_origins': ['https://yourdomain.com', 'https://www.yourdomain.com'],
                'allowed_methods': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                'allowed_headers': ['Content-Type', 'Authorization', 'X-API-Key', 'X-CSRF-Token'],
                'exposed_headers': ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
                'allow_credentials': True,
                'max_age': 3600
            },
            'csp': {
                'default_src': ["'self'"],
                'script_src': ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
                'style_src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                'font_src': ["'self'", "https://fonts.gstatic.com"],
                'img_src': ["'self'", "data:", "https:"],
                'connect_src': ["'self'"],
                'frame_src': ["'none'"],
                'object_src': ["'none'"],
                'base_uri': ["'self'"],
                'form_action': ["'self'"],
                'frame_ancestors': ["'none'"],
                'upgrade_insecure_requests': True
            },
            'hsts': {
                'max_age': 31536000,  # 1 year
                'include_subdomains': True,
                'preload': True
            },
            'other_headers': {
                'x_frame_options': 'DENY',
                'x_content_type_options': 'nosniff',
                'x_xss_protection': '1; mode=block',
                'referrer_policy': 'strict-origin-when-cross-origin',
                'permissions_policy': 'geolocation=(), microphone=(), camera=()',
                'cross_origin_embedder_policy': 'require-corp',
                'cross_origin_opener_policy': 'same-origin',
                'cross_origin_resource_policy': 'same-origin'
            }
        }
    
    @staticmethod
    def get_legal_api_config() -> Dict:
        """Get configuration specifically for legal API platform"""
        return {
            'cors': {
                'allowed_origins': [
                    'https://legal-api.ir',
                    'https://www.legal-api.ir',
                    'https://admin.legal-api.ir',
                    'https://api.legal-api.ir'
                ],
                'allowed_methods': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                'allowed_headers': [
                    'Content-Type', 
                    'Authorization', 
                    'X-API-Key', 
                    'X-CSRF-Token',
                    'X-Requested-With',
                    'Accept',
                    'Accept-Language',
                    'Content-Language'
                ],
                'exposed_headers': [
                    'X-RateLimit-Limit', 
                    'X-RateLimit-Remaining', 
                    'X-RateLimit-Reset',
                    'X-Request-ID',
                    'X-Response-Time'
                ],
                'allow_credentials': True,
                'max_age': 7200  # 2 hours
            },
            'csp': {
                'default_src': ["'self'"],
                'script_src': [
                    "'self'", 
                    "'unsafe-inline'", 
                    "https://cdn.jsdelivr.net",
                    "https://unpkg.com"
                ],
                'style_src': [
                    "'self'", 
                    "'unsafe-inline'", 
                    "https://fonts.googleapis.com",
                    "https://cdn.jsdelivr.net"
                ],
                'font_src': [
                    "'self'", 
                    "https://fonts.gstatic.com",
                    "https://cdn.jsdelivr.net"
                ],
                'img_src': [
                    "'self'", 
                    "data:", 
                    "https:",
                    "blob:"
                ],
                'connect_src': [
                    "'self'",
                    "https://api.legal-api.ir",
                    "wss://api.legal-api.ir"
                ],
                'frame_src': ["'none'"],
                'object_src': ["'none'"],
                'base_uri': ["'self'"],
                'form_action': ["'self'"],
                'frame_ancestors': ["'none'"],
                'upgrade_insecure_requests': True,
                'block_all_mixed_content': True
            },
            'hsts': {
                'max_age': 31536000,  # 1 year
                'include_subdomains': True,
                'preload': True
            },
            'other_headers': {
                'x_frame_options': 'DENY',
                'x_content_type_options': 'nosniff',
                'x_xss_protection': '1; mode=block',
                'referrer_policy': 'strict-origin-when-cross-origin',
                'permissions_policy': 'geolocation=(), microphone=(), camera=(), payment=()',
                'cross_origin_embedder_policy': 'require-corp',
                'cross_origin_opener_policy': 'same-origin',
                'cross_origin_resource_policy': 'same-origin',
                'x_dns_prefetch_control': 'off',
                'x_download_options': 'noopen',
                'x_permitted_cross_domain_policies': 'none'
            }
        }

# Utility functions for specific security scenarios
def add_csrf_protection_headers(response: Response, csrf_token: str):
    """Add CSRF protection headers"""
    response.headers['X-CSRF-Token'] = csrf_token
    response.headers['X-CSRF-Required'] = 'true'

def add_api_security_headers(response: Response, request_id: str, response_time: float):
    """Add API-specific security headers"""
    response.headers['X-Request-ID'] = request_id
    response.headers['X-Response-Time'] = f"{response_time:.3f}s"
    response.headers['X-API-Version'] = '1.0'
    response.headers['X-Content-Type-Options'] = 'nosniff'

def add_cache_control_headers(response: Response, cache_directive: str = 'no-cache, no-store, must-revalidate'):
    """Add cache control headers for sensitive data"""
    response.headers['Cache-Control'] = cache_directive
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'