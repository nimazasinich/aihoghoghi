"""
Audit & Compliance System for Legal API Platform
Provides comprehensive logging, security event tracking, and regulatory compliance
"""

import json
import hashlib
import time
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
import logging
import redis
from fastapi import Request, Response
import asyncio
import uuid
from pathlib import Path

logger = logging.getLogger(__name__)

class AuditEventType(Enum):
    """Types of audit events"""
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    DATA_ACCESS = "data_access"
    DATA_MODIFICATION = "data_modification"
    SYSTEM_CONFIG = "system_config"
    SECURITY_EVENT = "security_event"
    API_ACCESS = "api_access"
    FILE_UPLOAD = "file_upload"
    FILE_DOWNLOAD = "file_download"
    SEARCH_QUERY = "search_query"
    ADMIN_ACTION = "admin_action"
    ERROR_EVENT = "error_event"

class AuditLevel(Enum):
    """Audit log levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class ComplianceStandard(Enum):
    """Compliance standards"""
    GDPR = "gdpr"
    CCPA = "ccpa"
    SOX = "sox"
    HIPAA = "hipaa"
    PCI_DSS = "pci_dss"
    ISO27001 = "iso27001"

@dataclass
class AuditEvent:
    """Audit event data structure"""
    event_id: str
    event_type: AuditEventType
    level: AuditLevel
    timestamp: datetime
    user_id: Optional[str]
    session_id: Optional[str]
    ip_address: str
    user_agent: str
    endpoint: str
    method: str
    request_id: str
    response_code: int
    response_time: float
    details: Dict[str, Any]
    compliance_tags: List[ComplianceStandard]
    data_classification: str
    retention_period: int  # days

@dataclass
class ComplianceReport:
    """Compliance report structure"""
    report_id: str
    standard: ComplianceStandard
    period_start: datetime
    period_end: datetime
    total_events: int
    compliance_score: float
    violations: List[Dict[str, Any]]
    recommendations: List[str]
    generated_at: datetime

class AuditLogger:
    """
    Comprehensive audit logging system
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None, log_directory: str = "/var/log/audit"):
        self.redis = redis_client
        self.log_directory = Path(log_directory)
        self.log_directory.mkdir(parents=True, exist_ok=True)
        
        # In-memory storage for recent events
        self.recent_events: List[AuditEvent] = []
        self.max_memory_events = 10000
        
        # Compliance configuration
        self.compliance_config = self._initialize_compliance_config()
        
        # Data classification levels
        self.data_classifications = {
            'public': 0,
            'internal': 1,
            'confidential': 2,
            'restricted': 3
        }
        
        # Retention periods by classification
        self.retention_periods = {
            'public': 90,      # 90 days
            'internal': 365,   # 1 year
            'confidential': 2555,  # 7 years
            'restricted': 3650     # 10 years
        }

    def _initialize_compliance_config(self) -> Dict[ComplianceStandard, Dict[str, Any]]:
        """Initialize compliance configuration"""
        return {
            ComplianceStandard.GDPR: {
                'data_retention': 2555,  # 7 years
                'consent_tracking': True,
                'data_portability': True,
                'right_to_erasure': True,
                'required_fields': ['user_id', 'data_type', 'consent_status']
            },
            ComplianceStandard.CCPA: {
                'data_retention': 2555,  # 7 years
                'consumer_rights': True,
                'data_sale_tracking': True,
                'required_fields': ['user_id', 'data_category', 'business_purpose']
            },
            ComplianceStandard.SOX: {
                'data_retention': 2555,  # 7 years
                'financial_data_tracking': True,
                'access_controls': True,
                'required_fields': ['user_id', 'financial_data_type', 'access_reason']
            },
            ComplianceStandard.HIPAA: {
                'data_retention': 2555,  # 7 years
                'phi_tracking': True,
                'access_controls': True,
                'required_fields': ['user_id', 'phi_type', 'access_reason', 'consent']
            },
            ComplianceStandard.PCI_DSS: {
                'data_retention': 365,   # 1 year
                'card_data_tracking': True,
                'encryption_required': True,
                'required_fields': ['user_id', 'card_data_type', 'encryption_status']
            },
            ComplianceStandard.ISO27001: {
                'data_retention': 2555,  # 7 years
                'security_incident_tracking': True,
                'access_controls': True,
                'required_fields': ['user_id', 'security_event_type', 'impact_level']
            }
        }

    def _generate_event_id(self) -> str:
        """Generate unique event ID"""
        return f"audit_{int(time.time())}_{uuid.uuid4().hex[:8]}"

    def _get_data_classification(self, endpoint: str, method: str, details: Dict[str, Any]) -> str:
        """Determine data classification based on endpoint and details"""
        # Admin endpoints are restricted
        if '/admin' in endpoint:
            return 'restricted'
        
        # Authentication endpoints are confidential
        if '/auth' in endpoint or '/login' in endpoint:
            return 'confidential'
        
        # Data modification endpoints are confidential
        if method in ['POST', 'PUT', 'DELETE', 'PATCH']:
            return 'confidential'
        
        # Search endpoints are internal
        if '/search' in endpoint:
            return 'internal'
        
        # Public endpoints
        if '/public' in endpoint or method == 'GET':
            return 'public'
        
        return 'internal'

    def _determine_compliance_tags(self, event_type: AuditEventType, details: Dict[str, Any]) -> List[ComplianceStandard]:
        """Determine applicable compliance standards"""
        tags = []
        
        # GDPR applies to all personal data
        if 'user_id' in details or 'personal_data' in details:
            tags.append(ComplianceStandard.GDPR)
        
        # CCPA applies to California residents
        if 'california_resident' in details:
            tags.append(ComplianceStandard.CCPA)
        
        # SOX applies to financial data
        if 'financial_data' in details or 'accounting' in details:
            tags.append(ComplianceStandard.SOX)
        
        # HIPAA applies to health information
        if 'health_data' in details or 'phi' in details:
            tags.append(ComplianceStandard.HIPAA)
        
        # PCI DSS applies to payment data
        if 'payment_data' in details or 'card_data' in details:
            tags.append(ComplianceStandard.PCI_DSS)
        
        # ISO27001 applies to all security events
        if event_type == AuditEventType.SECURITY_EVENT:
            tags.append(ComplianceStandard.ISO27001)
        
        return tags

    async def log_event(
        self,
        event_type: AuditEventType,
        level: AuditLevel,
        request: Request,
        response: Response,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        response_time: float = 0.0
    ) -> str:
        """Log audit event"""
        try:
            # Generate event ID
            event_id = self._generate_event_id()
            
            # Extract request information
            ip_address = self._get_client_ip(request)
            user_agent = request.headers.get('user-agent', '')
            endpoint = request.url.path
            method = request.method
            request_id = request.headers.get('x-request-id', str(uuid.uuid4()))
            
            # Determine data classification
            data_classification = self._get_data_classification(endpoint, method, details or {})
            
            # Determine compliance tags
            compliance_tags = self._determine_compliance_tags(event_type, details or {})
            
            # Get retention period
            retention_period = self.retention_periods.get(data_classification, 365)
            
            # Create audit event
            audit_event = AuditEvent(
                event_id=event_id,
                event_type=event_type,
                level=level,
                timestamp=datetime.utcnow(),
                user_id=user_id,
                session_id=session_id,
                ip_address=ip_address,
                user_agent=user_agent,
                endpoint=endpoint,
                method=method,
                request_id=request_id,
                response_code=response.status_code,
                response_time=response_time,
                details=details or {},
                compliance_tags=compliance_tags,
                data_classification=data_classification,
                retention_period=retention_period
            )
            
            # Store event
            await self._store_event(audit_event)
            
            # Log to file
            await self._log_to_file(audit_event)
            
            # Store in Redis if available
            if self.redis:
                await self._store_in_redis(audit_event)
            
            logger.info(f"Audit event logged: {event_id}")
            return event_id
            
        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")
            return ""

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address"""
        forwarded_for = request.headers.get('x-forwarded-for')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        real_ip = request.headers.get('x-real-ip')
        if real_ip:
            return real_ip
        
        return request.client.host

    async def _store_event(self, event: AuditEvent):
        """Store event in memory"""
        self.recent_events.append(event)
        
        # Maintain memory limit
        if len(self.recent_events) > self.max_memory_events:
            self.recent_events = self.recent_events[-self.max_memory_events:]

    async def _log_to_file(self, event: AuditEvent):
        """Log event to file"""
        try:
            # Create filename based on date and classification
            date_str = event.timestamp.strftime('%Y-%m-%d')
            filename = f"audit_{date_str}_{event.data_classification}.jsonl"
            filepath = self.log_directory / filename
            
            # Convert event to JSON
            event_dict = asdict(event)
            event_dict['timestamp'] = event.timestamp.isoformat()
            event_dict['event_type'] = event.event_type.value
            event_dict['level'] = event.level.value
            event_dict['compliance_tags'] = [tag.value for tag in event.compliance_tags]
            
            # Write to file
            with open(filepath, 'a', encoding='utf-8') as f:
                f.write(json.dumps(event_dict, ensure_ascii=False) + '\n')
                
        except Exception as e:
            logger.error(f"Failed to write audit log to file: {e}")

    async def _store_in_redis(self, event: AuditEvent):
        """Store event in Redis"""
        try:
            if not self.redis:
                return
            
            # Store event data
            event_dict = asdict(event)
            event_dict['timestamp'] = event.timestamp.isoformat()
            event_dict['event_type'] = event.event_type.value
            event_dict['level'] = event.level.value
            event_dict['compliance_tags'] = [tag.value for tag in event.compliance_tags]
            
            # Store with expiration based on retention period
            ttl = event.retention_period * 24 * 3600  # Convert days to seconds
            
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.redis.setex(
                    f"audit:{event.event_id}",
                    ttl,
                    json.dumps(event_dict, ensure_ascii=False)
                )
            )
            
            # Add to time-based index
            score = event.timestamp.timestamp()
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.redis.zadd(
                    f"audit:by_time:{event.data_classification}",
                    {event.event_id: score}
                )
            )
            
            # Add to user-based index
            if event.user_id:
                await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: self.redis.zadd(
                        f"audit:by_user:{event.user_id}",
                        {event.event_id: score}
                    )
                )
            
        except Exception as e:
            logger.error(f"Failed to store audit event in Redis: {e}")

    async def get_events(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        user_id: Optional[str] = None,
        event_type: Optional[AuditEventType] = None,
        data_classification: Optional[str] = None,
        limit: int = 1000
    ) -> List[AuditEvent]:
        """Retrieve audit events with filters"""
        try:
            events = []
            
            if self.redis:
                # Query from Redis
                events = await self._get_events_from_redis(
                    start_date, end_date, user_id, event_type, data_classification, limit
                )
            else:
                # Query from memory
                events = self._get_events_from_memory(
                    start_date, end_date, user_id, event_type, data_classification, limit
                )
            
            return events
            
        except Exception as e:
            logger.error(f"Failed to retrieve audit events: {e}")
            return []

    def _get_events_from_memory(
        self,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
        user_id: Optional[str],
        event_type: Optional[AuditEventType],
        data_classification: Optional[str],
        limit: int
    ) -> List[AuditEvent]:
        """Get events from memory storage"""
        filtered_events = self.recent_events
        
        # Apply filters
        if start_date:
            filtered_events = [e for e in filtered_events if e.timestamp >= start_date]
        
        if end_date:
            filtered_events = [e for e in filtered_events if e.timestamp <= end_date]
        
        if user_id:
            filtered_events = [e for e in filtered_events if e.user_id == user_id]
        
        if event_type:
            filtered_events = [e for e in filtered_events if e.event_type == event_type]
        
        if data_classification:
            filtered_events = [e for e in filtered_events if e.data_classification == data_classification]
        
        # Sort by timestamp and limit
        filtered_events.sort(key=lambda x: x.timestamp, reverse=True)
        return filtered_events[:limit]

    async def _get_events_from_redis(
        self,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
        user_id: Optional[str],
        event_type: Optional[AuditEventType],
        data_classification: Optional[str],
        limit: int
    ) -> List[AuditEvent]:
        """Get events from Redis storage"""
        try:
            events = []
            
            # Determine which index to use
            if user_id:
                index_key = f"audit:by_user:{user_id}"
            elif data_classification:
                index_key = f"audit:by_time:{data_classification}"
            else:
                index_key = "audit:by_time:all"
            
            # Get event IDs from index
            start_score = start_date.timestamp() if start_date else 0
            end_score = end_date.timestamp() if end_date else float('inf')
            
            event_ids = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.redis.zrevrangebyscore(
                    index_key, end_score, start_score, start=0, num=limit
                )
            )
            
            # Get event data
            for event_id in event_ids:
                event_data = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: self.redis.get(f"audit:{event_id}")
                )
                
                if event_data:
                    event_dict = json.loads(event_data)
                    # Convert back to AuditEvent object
                    event = self._dict_to_audit_event(event_dict)
                    events.append(event)
            
            return events
            
        except Exception as e:
            logger.error(f"Failed to get events from Redis: {e}")
            return []

    def _dict_to_audit_event(self, event_dict: Dict[str, Any]) -> AuditEvent:
        """Convert dictionary to AuditEvent object"""
        return AuditEvent(
            event_id=event_dict['event_id'],
            event_type=AuditEventType(event_dict['event_type']),
            level=AuditLevel(event_dict['level']),
            timestamp=datetime.fromisoformat(event_dict['timestamp']),
            user_id=event_dict.get('user_id'),
            session_id=event_dict.get('session_id'),
            ip_address=event_dict['ip_address'],
            user_agent=event_dict['user_agent'],
            endpoint=event_dict['endpoint'],
            method=event_dict['method'],
            request_id=event_dict['request_id'],
            response_code=event_dict['response_code'],
            response_time=event_dict['response_time'],
            details=event_dict['details'],
            compliance_tags=[ComplianceStandard(tag) for tag in event_dict['compliance_tags']],
            data_classification=event_dict['data_classification'],
            retention_period=event_dict['retention_period']
        )

    async def generate_compliance_report(
        self,
        standard: ComplianceStandard,
        start_date: datetime,
        end_date: datetime
    ) -> ComplianceReport:
        """Generate compliance report for specific standard"""
        try:
            # Get events for the period
            events = await self.get_events(start_date, end_date)
            
            # Filter events by compliance standard
            relevant_events = [
                e for e in events if standard in e.compliance_tags
            ]
            
            # Calculate compliance score
            total_events = len(relevant_events)
            violations = []
            score = 100.0
            
            # Check compliance requirements
            config = self.compliance_config[standard]
            
            for event in relevant_events:
                # Check required fields
                for required_field in config.get('required_fields', []):
                    if required_field not in event.details:
                        violations.append({
                            'event_id': event.event_id,
                            'violation_type': 'missing_required_field',
                            'field': required_field,
                            'timestamp': event.timestamp
                        })
                        score -= 1.0
            
            # Generate recommendations
            recommendations = []
            if violations:
                recommendations.append("Ensure all required fields are present in audit events")
            
            if score < 95:
                recommendations.append("Review audit logging configuration for compliance")
            
            # Create report
            report = ComplianceReport(
                report_id=f"compliance_{standard.value}_{int(time.time())}",
                standard=standard,
                period_start=start_date,
                period_end=end_date,
                total_events=total_events,
                compliance_score=max(0, score),
                violations=violations,
                recommendations=recommendations,
                generated_at=datetime.utcnow()
            )
            
            return report
            
        except Exception as e:
            logger.error(f"Failed to generate compliance report: {e}")
            return None

    def get_audit_statistics(self, days: int = 30) -> Dict[str, Any]:
        """Get audit logging statistics"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        recent_events = [e for e in self.recent_events if e.timestamp >= cutoff_date]
        
        # Count by event type
        event_type_counts = {}
        for event in recent_events:
            event_type = event.event_type.value
            event_type_counts[event_type] = event_type_counts.get(event_type, 0) + 1
        
        # Count by level
        level_counts = {}
        for event in recent_events:
            level = event.level.value
            level_counts[level] = level_counts.get(level, 0) + 1
        
        # Count by data classification
        classification_counts = {}
        for event in recent_events:
            classification = event.data_classification
            classification_counts[classification] = classification_counts.get(classification, 0) + 1
        
        # Count by compliance standard
        compliance_counts = {}
        for event in recent_events:
            for tag in event.compliance_tags:
                standard = tag.value
                compliance_counts[standard] = compliance_counts.get(standard, 0) + 1
        
        return {
            'total_events': len(recent_events),
            'period_days': days,
            'event_types': event_type_counts,
            'levels': level_counts,
            'data_classifications': classification_counts,
            'compliance_standards': compliance_counts,
            'average_response_time': sum(e.response_time for e in recent_events) / len(recent_events) if recent_events else 0
        }

# Global audit logger instance
audit_logger = AuditLogger()

def audit_middleware(event_type: AuditEventType, level: AuditLevel = AuditLevel.INFO):
    """FastAPI middleware for audit logging"""
    async def middleware(request: Request, call_next):
        start_time = time.time()
        
        # Process request
        response = await call_next(request)
        
        # Calculate response time
        response_time = time.time() - start_time
        
        # Extract user information from request state
        user_id = getattr(request.state, 'user_id', None)
        session_id = getattr(request.state, 'session_id', None)
        
        # Log audit event
        await audit_logger.log_event(
            event_type=event_type,
            level=level,
            request=request,
            response=response,
            user_id=user_id,
            session_id=session_id,
            response_time=response_time
        )
        
        return response
    
    return middleware