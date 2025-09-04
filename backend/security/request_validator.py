"""
Request Validation System for Legal API Platform
Provides input sanitization, SQL injection prevention, XSS protection, and CSRF validation
"""

import re
import html
import json
import hashlib
import secrets
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
from datetime import datetime, timedelta
import logging
from fastapi import Request, HTTPException
from pydantic import BaseModel, ValidationError
import bleach
from jsonschema import validate, ValidationError as SchemaValidationError

logger = logging.getLogger(__name__)

@dataclass
class ValidationResult:
    """Result of request validation"""
    is_valid: bool
    sanitized_data: Any
    errors: List[str]
    warnings: List[str]

class SecurityConfig:
    """Security configuration for validation"""
    
    # SQL injection patterns
    SQL_INJECTION_PATTERNS = [
        r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)",
        r"(\b(OR|AND)\s+\d+\s*=\s*\d+)",
        r"(\b(OR|AND)\s+'.*'\s*=\s*'.*')",
        r"(--|\#|\/\*|\*\/)",
        r"(\b(WAITFOR|DELAY)\b)",
        r"(\b(CHAR|ASCII|SUBSTRING|LEN)\s*\()",
    ]
    
    # XSS patterns
    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"on\w+\s*=",
        r"<iframe[^>]*>",
        r"<object[^>]*>",
        r"<embed[^>]*>",
        r"<link[^>]*>",
        r"<meta[^>]*>",
        r"<style[^>]*>",
        r"expression\s*\(",
        r"url\s*\(",
        r"@import",
    ]
    
    # Path traversal patterns
    PATH_TRAVERSAL_PATTERNS = [
        r"\.\./",
        r"\.\.\\",
        r"%2e%2e%2f",
        r"%2e%2e%5c",
        r"\.\.%2f",
        r"\.\.%5c",
    ]
    
    # Command injection patterns
    COMMAND_INJECTION_PATTERNS = [
        r"[;&|`$]",
        r"\b(cat|ls|pwd|whoami|id|uname|ps|netstat)\b",
        r"\b(rm|del|mkdir|rmdir|copy|move)\b",
        r"\b(ping|nslookup|traceroute|telnet)\b",
        r"\b(wget|curl|nc|netcat)\b",
    ]

class RequestValidator:
    """
    Comprehensive request validation system
    """
    
    def __init__(self):
        self.csrf_tokens: Dict[str, datetime] = {}
        self.schema_cache: Dict[str, Dict] = {}
        
        # Persian error messages
        self.error_messages = {
            'sql_injection': 'تلاش برای تزریق SQL شناسایی شد',
            'xss_attack': 'تلاش برای حمله XSS شناسایی شد',
            'path_traversal': 'تلاش برای دسترسی غیرمجاز به فایل‌ها شناسایی شد',
            'command_injection': 'تلاش برای تزریق دستور شناسایی شد',
            'invalid_json': 'فرمت JSON نامعتبر است',
            'csrf_token_missing': 'توکن CSRF موجود نیست',
            'csrf_token_invalid': 'توکن CSRF نامعتبر است',
            'input_too_large': 'ورودی بیش از حد مجاز است',
            'invalid_encoding': 'کدگذاری نامعتبر است',
            'suspicious_content': 'محتوای مشکوک شناسایی شد'
        }

    def sanitize_string(self, value: str, max_length: int = 1000) -> str:
        """Sanitize string input"""
        if not isinstance(value, str):
            return str(value)
        
        # Check length
        if len(value) > max_length:
            raise ValueError(self.error_messages['input_too_large'])
        
        # HTML escape
        sanitized = html.escape(value)
        
        # Remove null bytes
        sanitized = sanitized.replace('\x00', '')
        
        # Normalize whitespace
        sanitized = re.sub(r'\s+', ' ', sanitized).strip()
        
        return sanitized

    def detect_sql_injection(self, value: str) -> bool:
        """Detect SQL injection attempts"""
        if not isinstance(value, str):
            return False
        
        value_lower = value.lower()
        
        for pattern in SecurityConfig.SQL_INJECTION_PATTERNS:
            if re.search(pattern, value_lower, re.IGNORECASE):
                logger.warning(f"SQL injection attempt detected: {pattern}")
                return True
        
        return False

    def detect_xss(self, value: str) -> bool:
        """Detect XSS attempts"""
        if not isinstance(value, str):
            return False
        
        for pattern in SecurityConfig.XSS_PATTERNS:
            if re.search(pattern, value, re.IGNORECASE):
                logger.warning(f"XSS attempt detected: {pattern}")
                return True
        
        return False

    def detect_path_traversal(self, value: str) -> bool:
        """Detect path traversal attempts"""
        if not isinstance(value, str):
            return False
        
        for pattern in SecurityConfig.PATH_TRAVERSAL_PATTERNS:
            if re.search(pattern, value, re.IGNORECASE):
                logger.warning(f"Path traversal attempt detected: {pattern}")
                return True
        
        return False

    def detect_command_injection(self, value: str) -> bool:
        """Detect command injection attempts"""
        if not isinstance(value, str):
            return False
        
        for pattern in SecurityConfig.COMMAND_INJECTION_PATTERNS:
            if re.search(pattern, value, re.IGNORECASE):
                logger.warning(f"Command injection attempt detected: {pattern}")
                return True
        
        return False

    def validate_json_schema(self, data: Any, schema: Dict) -> ValidationResult:
        """Validate data against JSON schema"""
        try:
            validate(instance=data, schema=schema)
            return ValidationResult(
                is_valid=True,
                sanitized_data=data,
                errors=[],
                warnings=[]
            )
        except SchemaValidationError as e:
            return ValidationResult(
                is_valid=False,
                sanitized_data=None,
                errors=[f"Schema validation error: {e.message}"],
                warnings=[]
            )

    def sanitize_html(self, html_content: str, allowed_tags: List[str] = None) -> str:
        """Sanitize HTML content"""
        if allowed_tags is None:
            allowed_tags = ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li']
        
        return bleach.clean(
            html_content,
            tags=allowed_tags,
            attributes={},
            strip=True
        )

    def generate_csrf_token(self, session_id: str) -> str:
        """Generate CSRF token for session"""
        token = secrets.token_urlsafe(32)
        self.csrf_tokens[token] = datetime.utcnow()
        return token

    def validate_csrf_token(self, token: str, max_age_minutes: int = 30) -> bool:
        """Validate CSRF token"""
        if not token or token not in self.csrf_tokens:
            return False
        
        token_time = self.csrf_tokens[token]
        if datetime.utcnow() - token_time > timedelta(minutes=max_age_minutes):
            del self.csrf_tokens[token]
            return False
        
        return True

    def validate_request_data(self, data: Any, validation_rules: Dict) -> ValidationResult:
        """Comprehensive request data validation"""
        errors = []
        warnings = []
        sanitized_data = data
        
        try:
            # Type validation
            if 'type' in validation_rules:
                expected_type = validation_rules['type']
                if not isinstance(data, expected_type):
                    errors.append(f"Expected {expected_type.__name__}, got {type(data).__name__}")
                    return ValidationResult(False, None, errors, warnings)
            
            # String validation
            if isinstance(data, str):
                # Length validation
                if 'max_length' in validation_rules:
                    max_len = validation_rules['max_length']
                    if len(data) > max_len:
                        errors.append(self.error_messages['input_too_large'])
                        return ValidationResult(False, None, errors, warnings)
                
                # Pattern validation
                if 'pattern' in validation_rules:
                    pattern = validation_rules['pattern']
                    if not re.match(pattern, data):
                        errors.append("Input does not match required pattern")
                        return ValidationResult(False, None, errors, warnings)
                
                # Security checks
                if self.detect_sql_injection(data):
                    errors.append(self.error_messages['sql_injection'])
                    return ValidationResult(False, None, errors, warnings)
                
                if self.detect_xss(data):
                    errors.append(self.error_messages['xss_attack'])
                    return ValidationResult(False, None, errors, warnings)
                
                if self.detect_path_traversal(data):
                    errors.append(self.error_messages['path_traversal'])
                    return ValidationResult(False, None, errors, warnings)
                
                if self.detect_command_injection(data):
                    errors.append(self.error_messages['command_injection'])
                    return ValidationResult(False, None, errors, warnings)
                
                # Sanitize string
                sanitized_data = self.sanitize_string(data, validation_rules.get('max_length', 1000))
            
            # List validation
            elif isinstance(data, list):
                if 'max_items' in validation_rules:
                    max_items = validation_rules['max_items']
                    if len(data) > max_items:
                        errors.append(f"List too long, maximum {max_items} items allowed")
                        return ValidationResult(False, None, errors, warnings)
                
                # Validate each item
                sanitized_items = []
                for item in data:
                    item_result = self.validate_request_data(item, validation_rules.get('item_rules', {}))
                    if not item_result.is_valid:
                        errors.extend(item_result.errors)
                        return ValidationResult(False, None, errors, warnings)
                    sanitized_items.append(item_result.sanitized_data)
                
                sanitized_data = sanitized_items
            
            # Dict validation
            elif isinstance(data, dict):
                sanitized_dict = {}
                
                # Required fields
                if 'required_fields' in validation_rules:
                    required = validation_rules['required_fields']
                    for field in required:
                        if field not in data:
                            errors.append(f"Required field '{field}' is missing")
                            return ValidationResult(False, None, errors, warnings)
                
                # Field validation
                if 'field_rules' in validation_rules:
                    field_rules = validation_rules['field_rules']
                    for field, rules in field_rules.items():
                        if field in data:
                            field_result = self.validate_request_data(data[field], rules)
                            if not field_result.is_valid:
                                errors.extend([f"Field '{field}': {err}" for err in field_result.errors])
                                return ValidationResult(False, None, errors, warnings)
                            sanitized_dict[field] = field_result.sanitized_data
                        else:
                            sanitized_dict[field] = data.get(field)
                
                sanitized_data = sanitized_dict
            
            return ValidationResult(True, sanitized_data, errors, warnings)
            
        except Exception as e:
            logger.error(f"Validation error: {e}")
            return ValidationResult(False, None, [str(e)], warnings)

    def validate_file_upload(self, filename: str, content_type: str, size: int) -> ValidationResult:
        """Validate file upload"""
        errors = []
        warnings = []
        
        # Allowed file extensions
        allowed_extensions = {'.pdf', '.doc', '.docx', '.txt', '.rtf'}
        file_ext = '.' + filename.split('.')[-1].lower() if '.' in filename else ''
        
        if file_ext not in allowed_extensions:
            errors.append(f"File type {file_ext} not allowed")
        
        # Allowed MIME types
        allowed_types = {
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'application/rtf'
        }
        
        if content_type not in allowed_types:
            errors.append(f"Content type {content_type} not allowed")
        
        # File size limit (10MB)
        max_size = 10 * 1024 * 1024
        if size > max_size:
            errors.append("File too large, maximum 10MB allowed")
        
        # Filename security
        if self.detect_path_traversal(filename):
            errors.append(self.error_messages['path_traversal'])
        
        # Sanitize filename
        sanitized_filename = re.sub(r'[^\w\-_\.]', '_', filename)
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            sanitized_data=sanitized_filename,
            errors=errors,
            warnings=warnings
        )

    def validate_search_query(self, query: str) -> ValidationResult:
        """Validate search query for security"""
        errors = []
        warnings = []
        
        if not query or not query.strip():
            errors.append("Search query cannot be empty")
            return ValidationResult(False, None, errors, warnings)
        
        # Length check
        if len(query) > 500:
            errors.append("Search query too long")
            return ValidationResult(False, None, errors, warnings)
        
        # Security checks
        if self.detect_sql_injection(query):
            errors.append(self.error_messages['sql_injection'])
            return ValidationResult(False, None, errors, warnings)
        
        if self.detect_xss(query):
            errors.append(self.error_messages['xss_attack'])
            return ValidationResult(False, None, errors, warnings)
        
        # Sanitize query
        sanitized_query = self.sanitize_string(query, 500)
        
        return ValidationResult(True, sanitized_query, errors, warnings)

    def cleanup_expired_tokens(self):
        """Clean up expired CSRF tokens"""
        current_time = datetime.utcnow()
        expired_tokens = [
            token for token, timestamp in self.csrf_tokens.items()
            if current_time - timestamp > timedelta(hours=1)
        ]
        
        for token in expired_tokens:
            del self.csrf_tokens[token]

# Global request validator instance
request_validator = RequestValidator()

def validate_request(validation_rules: Dict):
    """Decorator for request validation"""
    def decorator(func):
        async def wrapper(request: Request, *args, **kwargs):
            try:
                # Get request data
                if request.method in ['POST', 'PUT', 'PATCH']:
                    try:
                        data = await request.json()
                    except:
                        data = {}
                else:
                    data = dict(request.query_params)
                
                # Validate data
                result = request_validator.validate_request_data(data, validation_rules)
                
                if not result.is_valid:
                    raise HTTPException(
                        status_code=400,
                        detail={
                            "error": "Validation failed",
                            "errors": result.errors,
                            "warnings": result.warnings
                        }
                    )
                
                # Add sanitized data to request state
                request.state.validated_data = result.sanitized_data
                
                return await func(request, *args, **kwargs)
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Request validation error: {e}")
                raise HTTPException(status_code=500, detail="Internal validation error")
        
        return wrapper
    return decorator