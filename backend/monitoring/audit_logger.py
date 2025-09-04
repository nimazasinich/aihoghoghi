"""
Iranian Legal Archive - Audit Logging System
Comprehensive audit logging for all user actions and system events
"""

import json
import sqlite3
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass, asdict
from enum import Enum
import logging
import hashlib
import ipaddress

logger = logging.getLogger(__name__)

class AuditAction(Enum):
    # Authentication actions
    LOGIN = "login"
    LOGOUT = "logout"
    REGISTER = "register"
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET = "password_reset"
    ACCOUNT_LOCKED = "account_locked"
    ACCOUNT_UNLOCKED = "account_unlocked"
    
    # Document actions
    DOCUMENT_VIEW = "document_view"
    DOCUMENT_SEARCH = "document_search"
    DOCUMENT_DOWNLOAD = "document_download"
    DOCUMENT_CLASSIFY = "document_classify"
    DOCUMENT_ANNOTATE = "document_annotate"
    
    # Admin actions
    USER_CREATE = "user_create"
    USER_UPDATE = "user_update"
    USER_DELETE = "user_delete"
    ROLE_ASSIGN = "role_assign"
    ROLE_REVOKE = "role_revoke"
    SYSTEM_CONFIG_UPDATE = "system_config_update"
    
    # Scraping actions
    SCRAPING_START = "scraping_start"
    SCRAPING_STOP = "scraping_stop"
    SCRAPING_PAUSE = "scraping_pause"
    SCRAPING_RESUME = "scraping_resume"
    PROXY_ADD = "proxy_add"
    PROXY_REMOVE = "proxy_remove"
    
    # System actions
    SYSTEM_BACKUP = "system_backup"
    SYSTEM_RESTORE = "system_restore"
    SYSTEM_MAINTENANCE = "system_maintenance"
    ERROR_OCCURRED = "error_occurred"
    SECURITY_VIOLATION = "security_violation"

class AuditSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class AuditEvent:
    id: str
    timestamp: datetime
    user_id: Optional[str]
    session_id: Optional[str]
    action: AuditAction
    resource_type: str
    resource_id: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    severity: AuditSeverity
    success: bool
    message: str
    persian_message: str
    details: Optional[Dict[str, Any]]
    risk_score: float
    geolocation: Optional[Dict[str, str]]
    device_info: Optional[Dict[str, str]]

class AuditLogger:
    def __init__(self, db_path: str = "monitoring.db"):
        self.db_path = db_path
        self._init_database()
        
        # Persian messages for audit actions
        self.persian_messages = {
            AuditAction.LOGIN: "ورود کاربر",
            AuditAction.LOGOUT: "خروج کاربر",
            AuditAction.REGISTER: "ثبت نام کاربر",
            AuditAction.PASSWORD_CHANGE: "تغییر رمز عبور",
            AuditAction.PASSWORD_RESET: "بازیابی رمز عبور",
            AuditAction.ACCOUNT_LOCKED: "قفل شدن حساب",
            AuditAction.ACCOUNT_UNLOCKED: "باز شدن قفل حساب",
            AuditAction.DOCUMENT_VIEW: "مشاهده سند",
            AuditAction.DOCUMENT_SEARCH: "جستجوی سند",
            AuditAction.DOCUMENT_DOWNLOAD: "دانلود سند",
            AuditAction.DOCUMENT_CLASSIFY: "طبقه‌بندی سند",
            AuditAction.DOCUMENT_ANNOTATE: "حاشیه‌نویسی سند",
            AuditAction.USER_CREATE: "ایجاد کاربر",
            AuditAction.USER_UPDATE: "ویرایش کاربر",
            AuditAction.USER_DELETE: "حذف کاربر",
            AuditAction.ROLE_ASSIGN: "اختصاص نقش",
            AuditAction.ROLE_REVOKE: "لغو نقش",
            AuditAction.SYSTEM_CONFIG_UPDATE: "بروزرسانی تنظیمات سیستم",
            AuditAction.SCRAPING_START: "شروع جمع‌آوری",
            AuditAction.SCRAPING_STOP: "توقف جمع‌آوری",
            AuditAction.SCRAPING_PAUSE: "توقف موقت جمع‌آوری",
            AuditAction.SCRAPING_RESUME: "ادامه جمع‌آوری",
            AuditAction.PROXY_ADD: "افزودن پروکسی",
            AuditAction.PROXY_REMOVE: "حذف پروکسی",
            AuditAction.SYSTEM_BACKUP: "پشتیبان‌گیری سیستم",
            AuditAction.SYSTEM_RESTORE: "بازیابی سیستم",
            AuditAction.SYSTEM_MAINTENANCE: "نگهداری سیستم",
            AuditAction.ERROR_OCCURRED: "رخداد خطا",
            AuditAction.SECURITY_VIOLATION: "نقض امنیت"
        }
        
        # Risk scoring weights
        self.risk_weights = {
            'admin_actions': 0.8,
            'security_actions': 0.9,
            'failed_attempts': 0.7,
            'unusual_times': 0.3,
            'multiple_ips': 0.4,
            'high_volume': 0.5
        }

    def _init_database(self):
        """Initialize audit logging database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Create audit_events table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS audit_events (
                        id TEXT PRIMARY KEY,
                        timestamp TIMESTAMP NOT NULL,
                        user_id TEXT,
                        session_id TEXT,
                        action TEXT NOT NULL,
                        resource_type TEXT NOT NULL,
                        resource_id TEXT,
                        ip_address TEXT,
                        user_agent TEXT,
                        severity TEXT NOT NULL,
                        success BOOLEAN NOT NULL,
                        message TEXT NOT NULL,
                        persian_message TEXT NOT NULL,
                        details TEXT,
                        risk_score REAL NOT NULL,
                        geolocation TEXT,
                        device_info TEXT
                    )
                """)
                
                # Create audit_statistics table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS audit_statistics (
                        id TEXT PRIMARY KEY,
                        date DATE NOT NULL,
                        user_id TEXT,
                        action TEXT NOT NULL,
                        count INTEGER DEFAULT 0,
                        success_count INTEGER DEFAULT 0,
                        failure_count INTEGER DEFAULT 0,
                        avg_risk_score REAL DEFAULT 0.0,
                        unique_ips INTEGER DEFAULT 0
                    )
                """)
                
                # Create security_events table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS security_events (
                        id TEXT PRIMARY KEY,
                        timestamp TIMESTAMP NOT NULL,
                        event_type TEXT NOT NULL,
                        user_id TEXT,
                        ip_address TEXT,
                        severity TEXT NOT NULL,
                        description TEXT NOT NULL,
                        persian_description TEXT NOT NULL,
                        risk_score REAL NOT NULL,
                        resolved BOOLEAN DEFAULT 0,
                        resolved_at TIMESTAMP,
                        resolved_by TEXT,
                        resolution_notes TEXT
                    )
                """)
                
                # Create indexes
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON audit_events(timestamp)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON audit_events(user_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events(action)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_events_ip_address ON audit_events(ip_address)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_events_severity ON audit_events(severity)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_events_risk_score ON audit_events(risk_score)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_statistics_date ON audit_statistics(date)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity)")
                
                conn.commit()
                logger.info("Audit logging database initialized")
                
        except Exception as e:
            logger.error(f"Failed to initialize audit logging database: {e}")
            raise

    def log_event(self,
                  action: AuditAction,
                  resource_type: str,
                  user_id: Optional[str] = None,
                  session_id: Optional[str] = None,
                  resource_id: Optional[str] = None,
                  ip_address: Optional[str] = None,
                  user_agent: Optional[str] = None,
                  success: bool = True,
                  message: Optional[str] = None,
                  details: Optional[Dict[str, Any]] = None,
                  severity: Optional[AuditSeverity] = None) -> str:
        """Log an audit event"""
        
        event_id = str(uuid.uuid4())
        
        # Determine severity if not provided
        if not severity:
            severity = self._determine_severity(action, success, details)
        
        # Get Persian message
        persian_message = self.persian_messages.get(action, action.value)
        if message:
            persian_message = f"{persian_message}: {message}"
        
        # Calculate risk score
        risk_score = self._calculate_risk_score(action, user_id, ip_address, success, details)
        
        # Get geolocation info
        geolocation = self._get_geolocation(ip_address)
        
        # Get device info
        device_info = self._parse_user_agent(user_agent)
        
        # Create audit event
        audit_event = AuditEvent(
            id=event_id,
            timestamp=datetime.utcnow(),
            user_id=user_id,
            session_id=session_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent,
            severity=severity,
            success=success,
            message=message or f"{action.value} on {resource_type}",
            persian_message=persian_message,
            details=details,
            risk_score=risk_score,
            geolocation=geolocation,
            device_info=device_info
        )
        
        # Store in database
        self._store_audit_event(audit_event)
        
        # Update statistics
        self._update_audit_statistics(audit_event)
        
        # Check for security violations
        self._check_security_violations(audit_event)
        
        # Log the event
        self._log_audit_event(audit_event)
        
        return event_id

    def _determine_severity(self, action: AuditAction, success: bool, details: Optional[Dict[str, Any]]) -> AuditSeverity:
        """Determine audit event severity"""
        
        # Critical actions
        if action in [AuditAction.USER_DELETE, AuditAction.SYSTEM_CONFIG_UPDATE, 
                     AuditAction.SECURITY_VIOLATION, AuditAction.ACCOUNT_LOCKED]:
            return AuditSeverity.CRITICAL
        
        # High severity actions
        if action in [AuditAction.USER_CREATE, AuditAction.USER_UPDATE, AuditAction.ROLE_ASSIGN,
                     AuditAction.ROLE_REVOKE, AuditAction.SYSTEM_BACKUP, AuditAction.SYSTEM_RESTORE]:
            return AuditSeverity.HIGH
        
        # Medium severity actions
        if action in [AuditAction.LOGIN, AuditAction.PASSWORD_CHANGE, AuditAction.PASSWORD_RESET,
                     AuditAction.DOCUMENT_DOWNLOAD, AuditAction.SCRAPING_START, AuditAction.SCRAPING_STOP]:
            return AuditSeverity.MEDIUM
        
        # Failed actions increase severity
        if not success:
            if action in [AuditAction.LOGIN, AuditAction.PASSWORD_CHANGE]:
                return AuditSeverity.HIGH
            else:
                return AuditSeverity.MEDIUM
        
        return AuditSeverity.LOW

    def _calculate_risk_score(self, action: AuditAction, user_id: Optional[str], 
                            ip_address: Optional[str], success: bool, 
                            details: Optional[Dict[str, Any]]) -> float:
        """Calculate risk score for audit event"""
        risk_score = 0.0
        
        # Base risk by action type
        if action in [AuditAction.USER_DELETE, AuditAction.SYSTEM_CONFIG_UPDATE]:
            risk_score += 0.8
        elif action in [AuditAction.USER_CREATE, AuditAction.USER_UPDATE, AuditAction.ROLE_ASSIGN]:
            risk_score += 0.6
        elif action in [AuditAction.LOGIN, AuditAction.PASSWORD_CHANGE]:
            risk_score += 0.4
        else:
            risk_score += 0.2
        
        # Failed actions increase risk
        if not success:
            risk_score += 0.3
        
        # Check for unusual patterns
        if user_id:
            risk_score += self._check_user_patterns(user_id, action, ip_address)
        
        # Check for suspicious IP patterns
        if ip_address:
            risk_score += self._check_ip_patterns(ip_address, action)
        
        # Check for high volume actions
        risk_score += self._check_volume_patterns(user_id, action)
        
        # Normalize to 0-1 range
        return min(risk_score, 1.0)

    def _check_user_patterns(self, user_id: str, action: AuditAction, ip_address: Optional[str]) -> float:
        """Check for unusual user patterns"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Check for multiple IPs in short time
                cursor.execute("""
                    SELECT COUNT(DISTINCT ip_address) as unique_ips
                    FROM audit_events 
                    WHERE user_id = ? AND timestamp >= ? AND ip_address IS NOT NULL
                """, (user_id, datetime.utcnow() - timedelta(hours=1)))
                
                unique_ips = cursor.fetchone()[0]
                if unique_ips > 3:
                    return 0.3
                
                # Check for unusual time patterns
                current_hour = datetime.utcnow().hour
                if current_hour < 6 or current_hour > 22:  # Unusual hours
                    return 0.2
                
                return 0.0
                
        except Exception as e:
            logger.error(f"Failed to check user patterns: {e}")
            return 0.0

    def _check_ip_patterns(self, ip_address: str, action: AuditAction) -> float:
        """Check for suspicious IP patterns"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Check for multiple users from same IP
                cursor.execute("""
                    SELECT COUNT(DISTINCT user_id) as unique_users
                    FROM audit_events 
                    WHERE ip_address = ? AND timestamp >= ? AND user_id IS NOT NULL
                """, (ip_address, datetime.utcnow() - timedelta(hours=1)))
                
                unique_users = cursor.fetchone()[0]
                if unique_users > 5:
                    return 0.4
                
                # Check for high volume from IP
                cursor.execute("""
                    SELECT COUNT(*) as event_count
                    FROM audit_events 
                    WHERE ip_address = ? AND timestamp >= ?
                """, (ip_address, datetime.utcnow() - timedelta(hours=1)))
                
                event_count = cursor.fetchone()[0]
                if event_count > 100:
                    return 0.3
                
                return 0.0
                
        except Exception as e:
            logger.error(f"Failed to check IP patterns: {e}")
            return 0.0

    def _check_volume_patterns(self, user_id: Optional[str], action: AuditAction) -> float:
        """Check for high volume patterns"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                if not user_id:
                    return 0.0
                
                # Check for high volume of same action
                cursor.execute("""
                    SELECT COUNT(*) as action_count
                    FROM audit_events 
                    WHERE user_id = ? AND action = ? AND timestamp >= ?
                """, (user_id, action.value, datetime.utcnow() - timedelta(minutes=10)))
                
                action_count = cursor.fetchone()[0]
                if action_count > 20:
                    return 0.2
                
                return 0.0
                
        except Exception as e:
            logger.error(f"Failed to check volume patterns: {e}")
            return 0.0

    def _get_geolocation(self, ip_address: Optional[str]) -> Optional[Dict[str, str]]:
        """Get geolocation info for IP address"""
        if not ip_address:
            return None
        
        try:
            # This would integrate with a geolocation service
            # For now, return basic info
            return {
                'country': 'Unknown',
                'city': 'Unknown',
                'timezone': 'UTC'
            }
        except:
            return None

    def _parse_user_agent(self, user_agent: Optional[str]) -> Optional[Dict[str, str]]:
        """Parse user agent string"""
        if not user_agent:
            return None
        
        try:
            # Basic user agent parsing
            device_info = {
                'browser': 'Unknown',
                'os': 'Unknown',
                'device': 'Unknown'
            }
            
            user_agent_lower = user_agent.lower()
            
            # Browser detection
            if 'chrome' in user_agent_lower:
                device_info['browser'] = 'Chrome'
            elif 'firefox' in user_agent_lower:
                device_info['browser'] = 'Firefox'
            elif 'safari' in user_agent_lower:
                device_info['browser'] = 'Safari'
            elif 'edge' in user_agent_lower:
                device_info['browser'] = 'Edge'
            
            # OS detection
            if 'windows' in user_agent_lower:
                device_info['os'] = 'Windows'
            elif 'mac' in user_agent_lower:
                device_info['os'] = 'macOS'
            elif 'linux' in user_agent_lower:
                device_info['os'] = 'Linux'
            elif 'android' in user_agent_lower:
                device_info['os'] = 'Android'
            elif 'ios' in user_agent_lower:
                device_info['os'] = 'iOS'
            
            # Device detection
            if 'mobile' in user_agent_lower or 'android' in user_agent_lower or 'iphone' in user_agent_lower:
                device_info['device'] = 'Mobile'
            elif 'tablet' in user_agent_lower or 'ipad' in user_agent_lower:
                device_info['device'] = 'Tablet'
            else:
                device_info['device'] = 'Desktop'
            
            return device_info
            
        except:
            return None

    def _store_audit_event(self, audit_event: AuditEvent):
        """Store audit event in database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO audit_events (
                        id, timestamp, user_id, session_id, action, resource_type, resource_id,
                        ip_address, user_agent, severity, success, message, persian_message,
                        details, risk_score, geolocation, device_info
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    audit_event.id,
                    audit_event.timestamp,
                    audit_event.user_id,
                    audit_event.session_id,
                    audit_event.action.value,
                    audit_event.resource_type,
                    audit_event.resource_id,
                    audit_event.ip_address,
                    audit_event.user_agent,
                    audit_event.severity.value,
                    audit_event.success,
                    audit_event.message,
                    audit_event.persian_message,
                    json.dumps(audit_event.details) if audit_event.details else None,
                    audit_event.risk_score,
                    json.dumps(audit_event.geolocation) if audit_event.geolocation else None,
                    json.dumps(audit_event.device_info) if audit_event.device_info else None
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to store audit event: {e}")

    def _update_audit_statistics(self, audit_event: AuditEvent):
        """Update audit statistics"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                today = audit_event.timestamp.date()
                
                # Check if statistics exist for today
                cursor.execute("""
                    SELECT id, count, success_count, failure_count, avg_risk_score, unique_ips
                    FROM audit_statistics 
                    WHERE date = ? AND user_id = ? AND action = ?
                """, (today, audit_event.user_id, audit_event.action.value))
                
                result = cursor.fetchone()
                
                if result:
                    # Update existing statistics
                    stats_id, count, success_count, failure_count, avg_risk_score, unique_ips = result
                    new_count = count + 1
                    new_success_count = success_count + (1 if audit_event.success else 0)
                    new_failure_count = failure_count + (0 if audit_event.success else 1)
                    new_avg_risk_score = ((avg_risk_score * count) + audit_event.risk_score) / new_count
                    
                    # Update unique IPs
                    if audit_event.ip_address:
                        cursor.execute("""
                            SELECT COUNT(DISTINCT ip_address) FROM audit_events 
                            WHERE user_id = ? AND action = ? AND date(timestamp) = ?
                        """, (audit_event.user_id, audit_event.action.value, today))
                        new_unique_ips = cursor.fetchone()[0]
                    else:
                        new_unique_ips = unique_ips
                    
                    cursor.execute("""
                        UPDATE audit_statistics 
                        SET count = ?, success_count = ?, failure_count = ?, 
                            avg_risk_score = ?, unique_ips = ?
                        WHERE id = ?
                    """, (new_count, new_success_count, new_failure_count, 
                          new_avg_risk_score, new_unique_ips, stats_id))
                else:
                    # Create new statistics
                    stats_id = str(uuid.uuid4())
                    unique_ips = 1 if audit_event.ip_address else 0
                    
                    cursor.execute("""
                        INSERT INTO audit_statistics (
                            id, date, user_id, action, count, success_count, 
                            failure_count, avg_risk_score, unique_ips
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        stats_id,
                        today,
                        audit_event.user_id,
                        audit_event.action.value,
                        1,
                        1 if audit_event.success else 0,
                        0 if audit_event.success else 1,
                        audit_event.risk_score,
                        unique_ips
                    ))
                
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to update audit statistics: {e}")

    def _check_security_violations(self, audit_event: AuditEvent):
        """Check for security violations"""
        try:
            # High risk events
            if audit_event.risk_score > 0.8:
                self._create_security_event(
                    event_type="high_risk_action",
                    user_id=audit_event.user_id,
                    ip_address=audit_event.ip_address,
                    severity=AuditSeverity.HIGH,
                    description=f"High risk action detected: {audit_event.action.value}",
                    persian_description=f"عمل پرخطر شناسایی شد: {audit_event.persian_message}",
                    risk_score=audit_event.risk_score
                )
            
            # Failed login attempts
            if audit_event.action == AuditAction.LOGIN and not audit_event.success:
                self._check_failed_login_patterns(audit_event)
            
            # Multiple IPs for same user
            if audit_event.user_id and audit_event.ip_address:
                self._check_multiple_ip_violation(audit_event)
                
        except Exception as e:
            logger.error(f"Failed to check security violations: {e}")

    def _check_failed_login_patterns(self, audit_event: AuditEvent):
        """Check for failed login patterns"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Count failed logins in last hour
                cursor.execute("""
                    SELECT COUNT(*) FROM audit_events 
                    WHERE action = 'login' AND success = 0 AND timestamp >= ?
                    AND (user_id = ? OR ip_address = ?)
                """, (datetime.utcnow() - timedelta(hours=1), 
                     audit_event.user_id, audit_event.ip_address))
                
                failed_count = cursor.fetchone()[0]
                
                if failed_count > 5:
                    self._create_security_event(
                        event_type="brute_force_attempt",
                        user_id=audit_event.user_id,
                        ip_address=audit_event.ip_address,
                        severity=AuditSeverity.CRITICAL,
                        description=f"Potential brute force attack: {failed_count} failed logins",
                        persian_description=f"حمله احتمالی brute force: {failed_count} تلاش ناموفق ورود",
                        risk_score=0.9
                    )
                    
        except Exception as e:
            logger.error(f"Failed to check failed login patterns: {e}")

    def _check_multiple_ip_violation(self, audit_event: AuditEvent):
        """Check for multiple IP violation"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Count unique IPs for user in last hour
                cursor.execute("""
                    SELECT COUNT(DISTINCT ip_address) FROM audit_events 
                    WHERE user_id = ? AND timestamp >= ? AND ip_address IS NOT NULL
                """, (audit_event.user_id, datetime.utcnow() - timedelta(hours=1)))
                
                unique_ips = cursor.fetchone()[0]
                
                if unique_ips > 3:
                    self._create_security_event(
                        event_type="multiple_ip_usage",
                        user_id=audit_event.user_id,
                        ip_address=audit_event.ip_address,
                        severity=AuditSeverity.MEDIUM,
                        description=f"User accessing from multiple IPs: {unique_ips} IPs",
                        persian_description=f"کاربر از چندین IP دسترسی دارد: {unique_ips} IP",
                        risk_score=0.6
                    )
                    
        except Exception as e:
            logger.error(f"Failed to check multiple IP violation: {e}")

    def _create_security_event(self, event_type: str, user_id: Optional[str], 
                             ip_address: Optional[str], severity: AuditSeverity,
                             description: str, persian_description: str, risk_score: float):
        """Create security event"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO security_events (
                        id, timestamp, event_type, user_id, ip_address, severity,
                        description, persian_description, risk_score
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    str(uuid.uuid4()),
                    datetime.utcnow(),
                    event_type,
                    user_id,
                    ip_address,
                    severity.value,
                    description,
                    persian_description,
                    risk_score
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to create security event: {e}")

    def _log_audit_event(self, audit_event: AuditEvent):
        """Log audit event"""
        log_level = {
            AuditSeverity.CRITICAL: logging.CRITICAL,
            AuditSeverity.HIGH: logging.ERROR,
            AuditSeverity.MEDIUM: logging.WARNING,
            AuditSeverity.LOW: logging.INFO
        }.get(audit_event.severity, logging.INFO)
        
        logger.log(log_level, f"AUDIT: {audit_event.message} | {audit_event.persian_message}", extra={
            'audit_id': audit_event.id,
            'user_id': audit_event.user_id,
            'action': audit_event.action.value,
            'risk_score': audit_event.risk_score,
            'ip_address': audit_event.ip_address
        })

    def get_audit_logs(self, 
                      user_id: Optional[str] = None,
                      action: Optional[AuditAction] = None,
                      start_date: Optional[datetime] = None,
                      end_date: Optional[datetime] = None,
                      limit: int = 100) -> List[Dict[str, Any]]:
        """Get audit logs with filters"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Build query
                query = "SELECT * FROM audit_events WHERE 1=1"
                params = []
                
                if user_id:
                    query += " AND user_id = ?"
                    params.append(user_id)
                
                if action:
                    query += " AND action = ?"
                    params.append(action.value)
                
                if start_date:
                    query += " AND timestamp >= ?"
                    params.append(start_date)
                
                if end_date:
                    query += " AND timestamp <= ?"
                    params.append(end_date)
                
                query += " ORDER BY timestamp DESC LIMIT ?"
                params.append(limit)
                
                cursor.execute(query, params)
                
                logs = []
                for row in cursor.fetchall():
                    logs.append({
                        'id': row[0],
                        'timestamp': row[1],
                        'user_id': row[2],
                        'session_id': row[3],
                        'action': row[4],
                        'resource_type': row[5],
                        'resource_id': row[6],
                        'ip_address': row[7],
                        'user_agent': row[8],
                        'severity': row[9],
                        'success': bool(row[10]),
                        'message': row[11],
                        'persian_message': row[12],
                        'details': json.loads(row[13]) if row[13] else None,
                        'risk_score': row[14],
                        'geolocation': json.loads(row[15]) if row[15] else None,
                        'device_info': json.loads(row[16]) if row[16] else None
                    })
                
                return logs
                
        except Exception as e:
            logger.error(f"Failed to get audit logs: {e}")
            return []

    def get_security_events(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get security events"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM security_events 
                    ORDER BY timestamp DESC 
                    LIMIT ?
                """, (limit,))
                
                events = []
                for row in cursor.fetchall():
                    events.append({
                        'id': row[0],
                        'timestamp': row[1],
                        'event_type': row[2],
                        'user_id': row[3],
                        'ip_address': row[4],
                        'severity': row[5],
                        'description': row[6],
                        'persian_description': row[7],
                        'risk_score': row[8],
                        'resolved': bool(row[9]),
                        'resolved_at': row[10],
                        'resolved_by': row[11],
                        'resolution_notes': row[12]
                    })
                
                return events
                
        except Exception as e:
            logger.error(f"Failed to get security events: {e}")
            return []

    def get_audit_statistics(self, days: int = 7) -> Dict[str, Any]:
        """Get audit statistics"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                start_date = datetime.utcnow() - timedelta(days=days)
                
                # Get action statistics
                cursor.execute("""
                    SELECT action, COUNT(*) as count, 
                           SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count,
                           AVG(risk_score) as avg_risk_score
                    FROM audit_events 
                    WHERE timestamp >= ?
                    GROUP BY action
                    ORDER BY count DESC
                """, (start_date,))
                
                action_stats = {}
                for row in cursor.fetchall():
                    action_stats[row[0]] = {
                        'count': row[1],
                        'success_count': row[2],
                        'success_rate': (row[2] / row[1]) * 100 if row[1] > 0 else 0,
                        'avg_risk_score': row[3] or 0
                    }
                
                # Get user statistics
                cursor.execute("""
                    SELECT user_id, COUNT(*) as count, 
                           COUNT(DISTINCT ip_address) as unique_ips,
                           AVG(risk_score) as avg_risk_score
                    FROM audit_events 
                    WHERE timestamp >= ? AND user_id IS NOT NULL
                    GROUP BY user_id
                    ORDER BY count DESC
                    LIMIT 10
                """, (start_date,))
                
                user_stats = []
                for row in cursor.fetchall():
                    user_stats.append({
                        'user_id': row[0],
                        'count': row[1],
                        'unique_ips': row[2],
                        'avg_risk_score': row[3] or 0
                    })
                
                # Get security events count
                cursor.execute("""
                    SELECT COUNT(*) FROM security_events 
                    WHERE timestamp >= ?
                """, (start_date,))
                
                security_events_count = cursor.fetchone()[0]
                
                return {
                    'action_statistics': action_stats,
                    'top_users': user_stats,
                    'security_events_count': security_events_count,
                    'date_range': {
                        'start': start_date.isoformat(),
                        'end': datetime.utcnow().isoformat(),
                        'days': days
                    }
                }
                
        except Exception as e:
            logger.error(f"Failed to get audit statistics: {e}")
            return {}

    def cleanup_old_data(self, days: int = 90):
        """Clean up old audit data"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Clean up old audit events
                cursor.execute("""
                    DELETE FROM audit_events 
                    WHERE timestamp < ?
                """, (cutoff_date,))
                
                # Clean up old security events
                cursor.execute("""
                    DELETE FROM security_events 
                    WHERE timestamp < ? AND resolved = 1
                """, (cutoff_date,))
                
                # Clean up old statistics
                cursor.execute("""
                    DELETE FROM audit_statistics 
                    WHERE date < ?
                """, (cutoff_date.date(),))
                
                conn.commit()
                logger.info(f"Cleaned up audit data older than {days} days")
                
        except Exception as e:
            logger.error(f"Failed to cleanup old audit data: {e}")

# Global audit logger instance
audit_logger = AuditLogger()

# Convenience functions
def log_audit_event(action: AuditAction, resource_type: str, **kwargs):
    """Convenience function to log audit event"""
    return audit_logger.log_event(action, resource_type, **kwargs)

def log_login(user_id: str, success: bool, ip_address: str, **kwargs):
    """Log login attempt"""
    return audit_logger.log_event(
        AuditAction.LOGIN, 
        "user", 
        user_id=user_id, 
        success=success, 
        ip_address=ip_address,
        **kwargs
    )

def log_document_access(user_id: str, document_id: str, action: str, **kwargs):
    """Log document access"""
    audit_action = {
        'view': AuditAction.DOCUMENT_VIEW,
        'download': AuditAction.DOCUMENT_DOWNLOAD,
        'search': AuditAction.DOCUMENT_SEARCH
    }.get(action, AuditAction.DOCUMENT_VIEW)
    
    return audit_logger.log_event(
        audit_action,
        "document",
        user_id=user_id,
        resource_id=document_id,
        **kwargs
    )

def log_admin_action(user_id: str, action: AuditAction, resource_type: str, **kwargs):
    """Log admin action"""
    return audit_logger.log_event(
        action,
        resource_type,
        user_id=user_id,
        **kwargs
    )