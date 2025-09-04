"""
Threat Detection System for Legal API Platform
Provides suspicious activity detection, brute force protection, DDoS mitigation, and bot detection
"""

import time
import json
import hashlib
from typing import Dict, List, Optional, Set, Tuple, Any
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from collections import defaultdict, deque
import logging
import redis
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
import asyncio
import re
from enum import Enum

logger = logging.getLogger(__name__)

class ThreatLevel(Enum):
    """Threat level classification"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ThreatType(Enum):
    """Types of threats"""
    BRUTE_FORCE = "brute_force"
    DDoS = "ddos"
    BOT = "bot"
    SQL_INJECTION = "sql_injection"
    XSS = "xss"
    PATH_TRAVERSAL = "path_traversal"
    SUSPICIOUS_PATTERN = "suspicious_pattern"
    RATE_LIMIT_ABUSE = "rate_limit_abuse"
    GEOGRAPHIC_ANOMALY = "geographic_anomaly"
    USER_AGENT_ANOMALY = "user_agent_anomaly"

@dataclass
class ThreatEvent:
    """Threat detection event"""
    event_id: str
    threat_type: ThreatType
    threat_level: ThreatLevel
    source_ip: str
    user_agent: str
    endpoint: str
    method: str
    timestamp: datetime
    details: Dict[str, Any]
    blocked: bool
    confidence: float

@dataclass
class ThreatRule:
    """Threat detection rule"""
    rule_id: str
    name: str
    threat_type: ThreatType
    pattern: str
    threshold: int
    time_window: int  # seconds
    action: str  # block, log, alert
    enabled: bool

class ThreatDetector:
    """
    Comprehensive threat detection system
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis = redis_client
        self.threat_events: List[ThreatEvent] = []
        self.blocked_ips: Set[str] = set()
        self.suspicious_ips: Dict[str, List[datetime]] = defaultdict(list)
        self.failed_attempts: Dict[str, List[datetime]] = defaultdict(list)
        self.user_agent_patterns: Dict[str, int] = defaultdict(int)
        self.geo_anomalies: Dict[str, List[datetime]] = defaultdict(list)
        
        # Threat detection rules
        self.rules = self._initialize_rules()
        
        # Persian error messages
        self.error_messages = {
            'ip_blocked': 'آی‌پی شما مسدود شده است',
            'suspicious_activity': 'فعالیت مشکوک شناسایی شد',
            'too_many_requests': 'تعداد درخواست‌ها بیش از حد مجاز است',
            'bot_detected': 'ربات شناسایی شد',
            'brute_force_detected': 'حمله brute force شناسایی شد',
            'ddos_detected': 'حمله DDoS شناسایی شد'
        }

    def _initialize_rules(self) -> List[ThreatRule]:
        """Initialize threat detection rules"""
        return [
            ThreatRule(
                rule_id="brute_force_login",
                name="Brute Force Login Attempts",
                threat_type=ThreatType.BRUTE_FORCE,
                pattern="POST /api/auth/login",
                threshold=5,
                time_window=300,  # 5 minutes
                action="block",
                enabled=True
            ),
            ThreatRule(
                rule_id="ddos_requests",
                name="DDoS Attack Detection",
                threat_type=ThreatType.DDoS,
                pattern=".*",
                threshold=100,
                time_window=60,  # 1 minute
                action="block",
                enabled=True
            ),
            ThreatRule(
                rule_id="suspicious_user_agent",
                name="Suspicious User Agent",
                threat_type=ThreatType.USER_AGENT_ANOMALY,
                pattern="(bot|crawler|spider|scraper)",
                threshold=1,
                time_window=3600,  # 1 hour
                action="log",
                enabled=True
            ),
            ThreatRule(
                rule_id="sql_injection_pattern",
                name="SQL Injection Attempt",
                threat_type=ThreatType.SQL_INJECTION,
                pattern="(union|select|insert|delete|drop|script)",
                threshold=1,
                time_window=3600,
                action="block",
                enabled=True
            ),
            ThreatRule(
                rule_id="xss_pattern",
                name="XSS Attack Attempt",
                threat_type=ThreatType.XSS,
                pattern="(<script|javascript:|onload=|onerror=)",
                threshold=1,
                time_window=3600,
                action="block",
                enabled=True
            ),
            ThreatRule(
                rule_id="path_traversal",
                name="Path Traversal Attempt",
                threat_type=ThreatType.PATH_TRAVERSAL,
                pattern="(\\.\\./|\\.\\.\\\\|%2e%2e)",
                threshold=1,
                time_window=3600,
                action="block",
                enabled=True
            )
        ]

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address"""
        # Check for forwarded IP
        forwarded_for = request.headers.get('x-forwarded-for')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        # Check for real IP
        real_ip = request.headers.get('x-real-ip')
        if real_ip:
            return real_ip
        
        # Fallback to direct connection
        return request.client.host

    def _generate_event_id(self) -> str:
        """Generate unique event ID"""
        return f"threat_{int(time.time())}_{secrets.token_hex(8)}"

    def _is_ip_blocked(self, ip: str) -> bool:
        """Check if IP is blocked"""
        return ip in self.blocked_ips

    def _block_ip(self, ip: str, duration_minutes: int = 60):
        """Block IP address"""
        self.blocked_ips.add(ip)
        
        # Schedule unblock
        asyncio.create_task(self._unblock_ip_after_delay(ip, duration_minutes))
        
        logger.warning(f"Blocked IP {ip} for {duration_minutes} minutes")

    async def _unblock_ip_after_delay(self, ip: str, delay_minutes: int):
        """Unblock IP after delay"""
        await asyncio.sleep(delay_minutes * 60)
        self.blocked_ips.discard(ip)
        logger.info(f"Unblocked IP {ip}")

    def _detect_brute_force(self, ip: str, endpoint: str, method: str) -> Optional[ThreatEvent]:
        """Detect brute force attacks"""
        current_time = datetime.utcnow()
        key = f"{ip}:{endpoint}:{method}"
        
        # Clean old attempts
        self.failed_attempts[key] = [
            attempt for attempt in self.failed_attempts[key]
            if current_time - attempt < timedelta(minutes=5)
        ]
        
        # Add current attempt
        self.failed_attempts[key].append(current_time)
        
        # Check threshold
        if len(self.failed_attempts[key]) >= 5:  # 5 attempts in 5 minutes
            return ThreatEvent(
                event_id=self._generate_event_id(),
                threat_type=ThreatType.BRUTE_FORCE,
                threat_level=ThreatLevel.HIGH,
                source_ip=ip,
                user_agent="",
                endpoint=endpoint,
                method=method,
                timestamp=current_time,
                details={
                    "attempt_count": len(self.failed_attempts[key]),
                    "time_window": "5 minutes"
                },
                blocked=True,
                confidence=0.9
            )
        
        return None

    def _detect_ddos(self, ip: str, endpoint: str, method: str) -> Optional[ThreatEvent]:
        """Detect DDoS attacks"""
        current_time = datetime.utcnow()
        key = f"{ip}:requests"
        
        # Clean old requests
        self.suspicious_ips[key] = [
            req_time for req_time in self.suspicious_ips[key]
            if current_time - req_time < timedelta(minutes=1)
        ]
        
        # Add current request
        self.suspicious_ips[key].append(current_time)
        
        # Check threshold (100 requests per minute)
        if len(self.suspicious_ips[key]) >= 100:
            return ThreatEvent(
                event_id=self._generate_event_id(),
                threat_type=ThreatType.DDoS,
                threat_level=ThreatLevel.CRITICAL,
                source_ip=ip,
                user_agent="",
                endpoint=endpoint,
                method=method,
                timestamp=current_time,
                details={
                    "request_count": len(self.suspicious_ips[key]),
                    "time_window": "1 minute"
                },
                blocked=True,
                confidence=0.95
            )
        
        return None

    def _detect_bot(self, user_agent: str, ip: str) -> Optional[ThreatEvent]:
        """Detect bot traffic"""
        if not user_agent:
            return None
        
        user_agent_lower = user_agent.lower()
        
        # Bot patterns
        bot_patterns = [
            'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget',
            'python-requests', 'java/', 'go-http', 'okhttp',
            'apache-httpclient', 'libwww-perl', 'lwp-trivial'
        ]
        
        for pattern in bot_patterns:
            if pattern in user_agent_lower:
                return ThreatEvent(
                    event_id=self._generate_event_id(),
                    threat_type=ThreatType.BOT,
                    threat_level=ThreatLevel.MEDIUM,
                    source_ip=ip,
                    user_agent=user_agent,
                    endpoint="",
                    method="",
                    timestamp=datetime.utcnow(),
                    details={
                        "bot_pattern": pattern,
                        "user_agent": user_agent
                    },
                    blocked=False,
                    confidence=0.8
                )
        
        return None

    def _detect_suspicious_patterns(self, request: Request) -> List[ThreatEvent]:
        """Detect suspicious patterns in request"""
        threats = []
        current_time = datetime.utcnow()
        
        # Check URL for suspicious patterns
        url = str(request.url)
        query_params = str(request.query_params)
        
        # SQL injection patterns
        sql_patterns = [
            r'union\s+select', r'insert\s+into', r'delete\s+from',
            r'drop\s+table', r'script\s*>', r'<script'
        ]
        
        for pattern in sql_patterns:
            if re.search(pattern, url + query_params, re.IGNORECASE):
                threats.append(ThreatEvent(
                    event_id=self._generate_event_id(),
                    threat_type=ThreatType.SQL_INJECTION,
                    threat_level=ThreatLevel.HIGH,
                    source_ip=self._get_client_ip(request),
                    user_agent=request.headers.get('user-agent', ''),
                    endpoint=request.url.path,
                    method=request.method,
                    timestamp=current_time,
                    details={
                        "pattern": pattern,
                        "url": url,
                        "query_params": query_params
                    },
                    blocked=True,
                    confidence=0.9
                ))
        
        # XSS patterns
        xss_patterns = [
            r'<script[^>]*>', r'javascript:', r'onload\s*=',
            r'onerror\s*=', r'<iframe[^>]*>', r'<object[^>]*>'
        ]
        
        for pattern in xss_patterns:
            if re.search(pattern, url + query_params, re.IGNORECASE):
                threats.append(ThreatEvent(
                    event_id=self._generate_event_id(),
                    threat_type=ThreatType.XSS,
                    threat_level=ThreatLevel.HIGH,
                    source_ip=self._get_client_ip(request),
                    user_agent=request.headers.get('user-agent', ''),
                    endpoint=request.url.path,
                    method=request.method,
                    timestamp=current_time,
                    details={
                        "pattern": pattern,
                        "url": url,
                        "query_params": query_params
                    },
                    blocked=True,
                    confidence=0.9
                ))
        
        # Path traversal patterns
        path_patterns = [
            r'\.\./', r'\.\.\\', r'%2e%2e%2f', r'%2e%2e%5c'
        ]
        
        for pattern in path_patterns:
            if re.search(pattern, url, re.IGNORECASE):
                threats.append(ThreatEvent(
                    event_id=self._generate_event_id(),
                    threat_type=ThreatType.PATH_TRAVERSAL,
                    threat_level=ThreatLevel.HIGH,
                    source_ip=self._get_client_ip(request),
                    user_agent=request.headers.get('user-agent', ''),
                    endpoint=request.url.path,
                    method=request.method,
                    timestamp=current_time,
                    details={
                        "pattern": pattern,
                        "url": url
                    },
                    blocked=True,
                    confidence=0.9
                ))
        
        return threats

    def _detect_geographic_anomaly(self, ip: str, country: str) -> Optional[ThreatEvent]:
        """Detect geographic anomalies (simplified)"""
        # This would typically use a GeoIP database
        # For now, we'll implement a simple check for known suspicious countries
        suspicious_countries = ['XX', 'ZZ']  # Placeholder for suspicious country codes
        
        if country in suspicious_countries:
            return ThreatEvent(
                event_id=self._generate_event_id(),
                threat_type=ThreatType.GEOGRAPHIC_ANOMALY,
                threat_level=ThreatLevel.MEDIUM,
                source_ip=ip,
                user_agent="",
                endpoint="",
                method="",
                timestamp=datetime.utcnow(),
                details={
                    "country": country,
                    "reason": "Suspicious country"
                },
                blocked=False,
                confidence=0.6
            )
        
        return None

    async def analyze_request(self, request: Request) -> List[ThreatEvent]:
        """Analyze request for threats"""
        threats = []
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get('user-agent', '')
        
        # Check if IP is already blocked
        if self._is_ip_blocked(client_ip):
            threats.append(ThreatEvent(
                event_id=self._generate_event_id(),
                threat_type=ThreatType.RATE_LIMIT_ABUSE,
                threat_level=ThreatLevel.CRITICAL,
                source_ip=client_ip,
                user_agent=user_agent,
                endpoint=request.url.path,
                method=request.method,
                timestamp=datetime.utcnow(),
                details={"reason": "IP already blocked"},
                blocked=True,
                confidence=1.0
            ))
            return threats
        
        # Detect brute force attacks
        brute_force_threat = self._detect_brute_force(
            client_ip, request.url.path, request.method
        )
        if brute_force_threat:
            threats.append(brute_force_threat)
        
        # Detect DDoS attacks
        ddos_threat = self._detect_ddos(
            client_ip, request.url.path, request.method
        )
        if ddos_threat:
            threats.append(ddos_threat)
        
        # Detect bot traffic
        bot_threat = self._detect_bot(user_agent, client_ip)
        if bot_threat:
            threats.append(bot_threat)
        
        # Detect suspicious patterns
        pattern_threats = self._detect_suspicious_patterns(request)
        threats.extend(pattern_threats)
        
        # Store threats
        for threat in threats:
            self.threat_events.append(threat)
            
            # Block IP if threat is critical
            if threat.blocked and threat.threat_level in [ThreatLevel.HIGH, ThreatLevel.CRITICAL]:
                self._block_ip(client_ip, duration_minutes=60)
        
        return threats

    def get_threat_statistics(self, hours: int = 24) -> Dict[str, Any]:
        """Get threat detection statistics"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        recent_threats = [
            threat for threat in self.threat_events
            if threat.timestamp >= cutoff_time
        ]
        
        # Count by threat type
        threat_counts = defaultdict(int)
        for threat in recent_threats:
            threat_counts[threat.threat_type.value] += 1
        
        # Count by threat level
        level_counts = defaultdict(int)
        for threat in recent_threats:
            level_counts[threat.threat_level.value] += 1
        
        # Count blocked requests
        blocked_count = len([t for t in recent_threats if t.blocked])
        
        # Top source IPs
        ip_counts = defaultdict(int)
        for threat in recent_threats:
            ip_counts[threat.source_ip] += 1
        
        top_ips = sorted(ip_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return {
            'total_threats': len(recent_threats),
            'blocked_requests': blocked_count,
            'threat_types': dict(threat_counts),
            'threat_levels': dict(level_counts),
            'top_source_ips': top_ips,
            'time_period_hours': hours,
            'currently_blocked_ips': len(self.blocked_ips)
        }

    def get_blocked_ips(self) -> List[str]:
        """Get list of currently blocked IPs"""
        return list(self.blocked_ips)

    def unblock_ip(self, ip: str) -> bool:
        """Manually unblock an IP"""
        if ip in self.blocked_ips:
            self.blocked_ips.remove(ip)
            logger.info(f"Manually unblocked IP {ip}")
            return True
        return False

    def add_custom_rule(self, rule: ThreatRule):
        """Add custom threat detection rule"""
        self.rules.append(rule)
        logger.info(f"Added custom threat rule: {rule.name}")

    def update_rule(self, rule_id: str, updates: Dict[str, Any]):
        """Update existing threat detection rule"""
        for rule in self.rules:
            if rule.rule_id == rule_id:
                for key, value in updates.items():
                    if hasattr(rule, key):
                        setattr(rule, key, value)
                logger.info(f"Updated threat rule: {rule_id}")
                return True
        return False

    def get_recent_threats(self, limit: int = 100) -> List[ThreatEvent]:
        """Get recent threat events"""
        return sorted(
            self.threat_events,
            key=lambda x: x.timestamp,
            reverse=True
        )[:limit]

# Global threat detector instance
threat_detector = ThreatDetector()

def threat_detection_middleware():
    """FastAPI middleware for threat detection"""
    async def middleware(request: Request, call_next):
        # Analyze request for threats
        threats = await threat_detector.analyze_request(request)
        
        # Check if any threats require blocking
        blocking_threats = [t for t in threats if t.blocked]
        
        if blocking_threats:
            # Log the threat
            for threat in blocking_threats:
                logger.warning(f"Blocked request due to threat: {threat.threat_type.value}")
            
            # Return blocked response
            return JSONResponse(
                status_code=403,
                content={
                    "error": "Request blocked",
                    "message": threat_detector.error_messages.get('suspicious_activity', 'Suspicious activity detected'),
                    "threat_type": blocking_threats[0].threat_type.value,
                    "threat_level": blocking_threats[0].threat_level.value
                }
            )
        
        # Process request normally
        response = await call_next(request)
        
        # Add threat detection headers
        response.headers['X-Threat-Detection'] = 'enabled'
        if threats:
            response.headers['X-Threats-Detected'] = str(len(threats))
        
        return response
    
    return middleware