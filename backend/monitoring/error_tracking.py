"""
Iranian Legal Archive - Error Tracking and Monitoring
Comprehensive error tracking system with Persian support
"""

import logging
import traceback
import json
import sqlite3
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass, asdict
from enum import Enum
import uuid
import os
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/error_tracking.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class ErrorSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ErrorCategory(Enum):
    AUTHENTICATION = "authentication"
    DATABASE = "database"
    API = "api"
    SCRAPING = "scraping"
    AI_SERVICE = "ai_service"
    PROXY = "proxy"
    FRONTEND = "frontend"
    SYSTEM = "system"
    NETWORK = "network"
    VALIDATION = "validation"

@dataclass
class ErrorEvent:
    id: str
    timestamp: datetime
    severity: ErrorSeverity
    category: ErrorCategory
    message: str
    persian_message: str
    stack_trace: str
    user_id: Optional[str]
    session_id: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    request_data: Optional[Dict[str, Any]]
    response_data: Optional[Dict[str, Any]]
    performance_impact: Optional[float]
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolution_notes: Optional[str] = None

class ErrorTracker:
    def __init__(self, db_path: str = "monitoring.db"):
        self.db_path = db_path
        self._init_database()
        self._setup_logging()
        
        # Error statistics
        self.error_counts = {}
        self.performance_impact = 0.0
        
        # Persian error messages
        self.persian_messages = {
            ErrorCategory.AUTHENTICATION: {
                "login_failed": "خطا در ورود کاربر",
                "token_expired": "توکن منقضی شده است",
                "permission_denied": "دسترسی رد شد",
                "account_locked": "حساب کاربری قفل شده است"
            },
            ErrorCategory.DATABASE: {
                "connection_failed": "خطا در اتصال به پایگاه داده",
                "query_failed": "خطا در اجرای کوئری",
                "transaction_failed": "خطا در تراکنش",
                "constraint_violation": "نقض محدودیت پایگاه داده"
            },
            ErrorCategory.API: {
                "endpoint_not_found": "اندپوینت یافت نشد",
                "invalid_request": "درخواست نامعتبر",
                "rate_limit_exceeded": "محدودیت نرخ درخواست",
                "server_error": "خطای سرور"
            },
            ErrorCategory.SCRAPING: {
                "proxy_failed": "خطا در پروکسی",
                "parsing_failed": "خطا در تجزیه صفحه",
                "timeout": "زمان اتصال به پایان رسید",
                "blocked": "دسترسی مسدود شد"
            },
            ErrorCategory.AI_SERVICE: {
                "model_failed": "خطا در مدل هوش مصنوعی",
                "classification_failed": "خطا در طبقه‌بندی",
                "processing_failed": "خطا در پردازش",
                "api_quota_exceeded": "سهمیه API تمام شد"
            },
            ErrorCategory.PROXY: {
                "connection_failed": "خطا در اتصال پروکسی",
                "authentication_failed": "خطا در احراز هویت پروکسی",
                "rotation_failed": "خطا در چرخش پروکسی",
                "health_check_failed": "خطا در بررسی سلامت پروکسی"
            },
            ErrorCategory.FRONTEND: {
                "render_failed": "خطا در رندر کامپوننت",
                "state_error": "خطا در وضعیت برنامه",
                "network_error": "خطا در شبکه",
                "validation_error": "خطا در اعتبارسنجی"
            },
            ErrorCategory.SYSTEM: {
                "memory_error": "خطا در حافظه",
                "disk_space": "فضای دیسک تمام شد",
                "cpu_overload": "بار CPU بیش از حد",
                "service_down": "سرویس متوقف شد"
            },
            ErrorCategory.NETWORK: {
                "connection_timeout": "زمان اتصال به پایان رسید",
                "dns_failed": "خطا در DNS",
                "ssl_error": "خطا در SSL",
                "firewall_blocked": "فایروال مسدود کرد"
            },
            ErrorCategory.VALIDATION: {
                "invalid_input": "ورودی نامعتبر",
                "missing_field": "فیلد الزامی موجود نیست",
                "format_error": "خطا در فرمت",
                "constraint_violation": "نقض محدودیت"
            }
        }

    def _init_database(self):
        """Initialize error tracking database"""
        try:
            # Create logs directory
            os.makedirs('logs', exist_ok=True)
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Create error_events table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS error_events (
                        id TEXT PRIMARY KEY,
                        timestamp TIMESTAMP NOT NULL,
                        severity TEXT NOT NULL,
                        category TEXT NOT NULL,
                        message TEXT NOT NULL,
                        persian_message TEXT NOT NULL,
                        stack_trace TEXT,
                        user_id TEXT,
                        session_id TEXT,
                        ip_address TEXT,
                        user_agent TEXT,
                        request_data TEXT,
                        response_data TEXT,
                        performance_impact REAL,
                        resolved BOOLEAN DEFAULT 0,
                        resolved_at TIMESTAMP,
                        resolved_by TEXT,
                        resolution_notes TEXT
                    )
                """)
                
                # Create error_statistics table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS error_statistics (
                        id TEXT PRIMARY KEY,
                        date DATE NOT NULL,
                        category TEXT NOT NULL,
                        severity TEXT NOT NULL,
                        count INTEGER DEFAULT 0,
                        total_impact REAL DEFAULT 0.0,
                        avg_impact REAL DEFAULT 0.0,
                        first_occurrence TIMESTAMP,
                        last_occurrence TIMESTAMP
                    )
                """)
                
                # Create error_patterns table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS error_patterns (
                        id TEXT PRIMARY KEY,
                        pattern TEXT NOT NULL,
                        category TEXT NOT NULL,
                        severity TEXT NOT NULL,
                        frequency INTEGER DEFAULT 1,
                        first_seen TIMESTAMP NOT NULL,
                        last_seen TIMESTAMP NOT NULL,
                        is_resolved BOOLEAN DEFAULT 0
                    )
                """)
                
                # Create performance_metrics table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS performance_metrics (
                        id TEXT PRIMARY KEY,
                        timestamp TIMESTAMP NOT NULL,
                        metric_name TEXT NOT NULL,
                        value REAL NOT NULL,
                        unit TEXT,
                        context TEXT,
                        user_id TEXT,
                        session_id TEXT
                    )
                """)
                
                # Create indexes
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_error_events_timestamp ON error_events(timestamp)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_error_events_severity ON error_events(severity)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_error_events_category ON error_events(category)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_error_events_user_id ON error_events(user_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_error_events_resolved ON error_events(resolved)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_error_statistics_date ON error_statistics(date)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name)")
                
                conn.commit()
                logger.info("Error tracking database initialized successfully")
                
        except Exception as e:
            logger.error(f"Failed to initialize error tracking database: {e}")
            raise

    def _setup_logging(self):
        """Setup structured logging"""
        # Create custom formatter for Persian text
        class PersianFormatter(logging.Formatter):
            def format(self, record):
                # Add Persian context if available
                if hasattr(record, 'persian_message'):
                    record.message = f"{record.getMessage()} | {record.persian_message}"
                return super().format(record)
        
        # Setup file handler with Persian support
        file_handler = logging.FileHandler('logs/application.log', encoding='utf-8')
        file_handler.setFormatter(PersianFormatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        
        # Add handler to root logger
        logging.getLogger().addHandler(file_handler)

    def track_error(self, 
                   severity: ErrorSeverity,
                   category: ErrorCategory,
                   message: str,
                   persian_message: Optional[str] = None,
                   user_id: Optional[str] = None,
                   session_id: Optional[str] = None,
                   ip_address: Optional[str] = None,
                   user_agent: Optional[str] = None,
                   request_data: Optional[Dict[str, Any]] = None,
                   response_data: Optional[Dict[str, Any]] = None,
                   performance_impact: Optional[float] = None,
                   exception: Optional[Exception] = None) -> str:
        """Track an error event"""
        
        error_id = str(uuid.uuid4())
        
        # Get Persian message
        if not persian_message:
            persian_message = self._get_persian_message(category, message)
        
        # Get stack trace
        stack_trace = ""
        if exception:
            stack_trace = traceback.format_exc()
        
        # Create error event
        error_event = ErrorEvent(
            id=error_id,
            timestamp=datetime.utcnow(),
            severity=severity,
            category=category,
            message=message,
            persian_message=persian_message,
            stack_trace=stack_trace,
            user_id=user_id,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            request_data=request_data,
            response_data=response_data,
            performance_impact=performance_impact
        )
        
        # Store in database
        self._store_error_event(error_event)
        
        # Update statistics
        self._update_error_statistics(error_event)
        
        # Check for patterns
        self._analyze_error_pattern(error_event)
        
        # Log the error
        self._log_error(error_event)
        
        # Send alerts if critical
        if severity == ErrorSeverity.CRITICAL:
            self._send_critical_alert(error_event)
        
        return error_id

    def _get_persian_message(self, category: ErrorCategory, message: str) -> str:
        """Get Persian message for error"""
        category_messages = self.persian_messages.get(category, {})
        
        # Try to find exact match
        for key, persian_msg in category_messages.items():
            if key in message.lower():
                return persian_msg
        
        # Return generic message
        return f"خطا در {category.value}"

    def _store_error_event(self, error_event: ErrorEvent):
        """Store error event in database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO error_events (
                        id, timestamp, severity, category, message, persian_message,
                        stack_trace, user_id, session_id, ip_address, user_agent,
                        request_data, response_data, performance_impact, resolved
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    error_event.id,
                    error_event.timestamp,
                    error_event.severity.value,
                    error_event.category.value,
                    error_event.message,
                    error_event.persian_message,
                    error_event.stack_trace,
                    error_event.user_id,
                    error_event.session_id,
                    error_event.ip_address,
                    error_event.user_agent,
                    json.dumps(error_event.request_data) if error_event.request_data else None,
                    json.dumps(error_event.response_data) if error_event.response_data else None,
                    error_event.performance_impact,
                    error_event.resolved
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to store error event: {e}")

    def _update_error_statistics(self, error_event: ErrorEvent):
        """Update error statistics"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Get today's date
                today = error_event.timestamp.date()
                
                # Check if statistics exist for today
                cursor.execute("""
                    SELECT id, count, total_impact, first_occurrence, last_occurrence
                    FROM error_statistics 
                    WHERE date = ? AND category = ? AND severity = ?
                """, (today, error_event.category.value, error_event.severity.value))
                
                result = cursor.fetchone()
                
                if result:
                    # Update existing statistics
                    stats_id, count, total_impact, first_occurrence, last_occurrence = result
                    new_count = count + 1
                    new_total_impact = total_impact + (error_event.performance_impact or 0)
                    new_avg_impact = new_total_impact / new_count
                    
                    cursor.execute("""
                        UPDATE error_statistics 
                        SET count = ?, total_impact = ?, avg_impact = ?, last_occurrence = ?
                        WHERE id = ?
                    """, (new_count, new_total_impact, new_avg_impact, error_event.timestamp, stats_id))
                else:
                    # Create new statistics
                    stats_id = str(uuid.uuid4())
                    cursor.execute("""
                        INSERT INTO error_statistics (
                            id, date, category, severity, count, total_impact, 
                            avg_impact, first_occurrence, last_occurrence
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        stats_id,
                        today,
                        error_event.category.value,
                        error_event.severity.value,
                        1,
                        error_event.performance_impact or 0,
                        error_event.performance_impact or 0,
                        error_event.timestamp,
                        error_event.timestamp
                    ))
                
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to update error statistics: {e}")

    def _analyze_error_pattern(self, error_event: ErrorEvent):
        """Analyze error patterns"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Create pattern from message
                pattern = self._create_pattern(error_event.message)
                
                # Check if pattern exists
                cursor.execute("""
                    SELECT id, frequency, last_seen
                    FROM error_patterns 
                    WHERE pattern = ? AND category = ? AND severity = ?
                """, (pattern, error_event.category.value, error_event.severity.value))
                
                result = cursor.fetchone()
                
                if result:
                    # Update existing pattern
                    pattern_id, frequency, last_seen = result
                    cursor.execute("""
                        UPDATE error_patterns 
                        SET frequency = ?, last_seen = ?
                        WHERE id = ?
                    """, (frequency + 1, error_event.timestamp, pattern_id))
                else:
                    # Create new pattern
                    pattern_id = str(uuid.uuid4())
                    cursor.execute("""
                        INSERT INTO error_patterns (
                            id, pattern, category, severity, frequency, 
                            first_seen, last_seen
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        pattern_id,
                        pattern,
                        error_event.category.value,
                        error_event.severity.value,
                        1,
                        error_event.timestamp,
                        error_event.timestamp
                    ))
                
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to analyze error pattern: {e}")

    def _create_pattern(self, message: str) -> str:
        """Create error pattern from message"""
        # Remove specific values and create pattern
        import re
        
        # Replace numbers with placeholder
        pattern = re.sub(r'\d+', 'N', message)
        
        # Replace UUIDs with placeholder
        pattern = re.sub(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'UUID', pattern)
        
        # Replace email addresses with placeholder
        pattern = re.sub(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', 'EMAIL', pattern)
        
        # Replace URLs with placeholder
        pattern = re.sub(r'https?://[^\s]+', 'URL', pattern)
        
        return pattern

    def _log_error(self, error_event: ErrorEvent):
        """Log error with appropriate level"""
        log_message = f"{error_event.message} | {error_event.persian_message}"
        
        if error_event.severity == ErrorSeverity.CRITICAL:
            logger.critical(log_message, extra={
                'error_id': error_event.id,
                'category': error_event.category.value,
                'user_id': error_event.user_id,
                'persian_message': error_event.persian_message
            })
        elif error_event.severity == ErrorSeverity.HIGH:
            logger.error(log_message, extra={
                'error_id': error_event.id,
                'category': error_event.category.value,
                'user_id': error_event.user_id,
                'persian_message': error_event.persian_message
            })
        elif error_event.severity == ErrorSeverity.MEDIUM:
            logger.warning(log_message, extra={
                'error_id': error_event.id,
                'category': error_event.category.value,
                'user_id': error_event.user_id,
                'persian_message': error_event.persian_message
            })
        else:
            logger.info(log_message, extra={
                'error_id': error_event.id,
                'category': error_event.category.value,
                'user_id': error_event.user_id,
                'persian_message': error_event.persian_message
            })

    def _send_critical_alert(self, error_event: ErrorEvent):
        """Send critical error alert"""
        try:
            # This would integrate with email/SMS/Slack services
            alert_message = f"""
🚨 CRITICAL ERROR ALERT 🚨

Error ID: {error_event.id}
Time: {error_event.timestamp}
Category: {error_event.category.value}
Severity: {error_event.severity.value}
Message: {error_event.message}
Persian Message: {error_event.persian_message}
User ID: {error_event.user_id or 'N/A'}
IP Address: {error_event.ip_address or 'N/A'}

Please investigate immediately!
            """
            
            logger.critical(f"CRITICAL ALERT: {alert_message}")
            
            # Here you would send to external services
            # send_email_alert(alert_message)
            # send_slack_alert(alert_message)
            # send_sms_alert(alert_message)
            
        except Exception as e:
            logger.error(f"Failed to send critical alert: {e}")

    def get_error_statistics(self, days: int = 7) -> Dict[str, Any]:
        """Get error statistics for the last N days"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Get date range
                end_date = datetime.utcnow().date()
                start_date = end_date - timedelta(days=days)
                
                # Get error counts by category
                cursor.execute("""
                    SELECT category, severity, SUM(count) as total_count, AVG(avg_impact) as avg_impact
                    FROM error_statistics 
                    WHERE date >= ? AND date <= ?
                    GROUP BY category, severity
                    ORDER BY total_count DESC
                """, (start_date, end_date))
                
                category_stats = {}
                for row in cursor.fetchall():
                    category, severity, count, avg_impact = row
                    if category not in category_stats:
                        category_stats[category] = {}
                    category_stats[category][severity] = {
                        'count': count,
                        'avg_impact': avg_impact or 0
                    }
                
                # Get total errors
                cursor.execute("""
                    SELECT COUNT(*) as total_errors
                    FROM error_events 
                    WHERE timestamp >= ? AND timestamp <= ?
                """, (start_date, end_date))
                
                total_errors = cursor.fetchone()[0]
                
                # Get unresolved errors
                cursor.execute("""
                    SELECT COUNT(*) as unresolved_errors
                    FROM error_events 
                    WHERE resolved = 0 AND timestamp >= ? AND timestamp <= ?
                """, (start_date, end_date))
                
                unresolved_errors = cursor.fetchone()[0]
                
                # Get top error patterns
                cursor.execute("""
                    SELECT pattern, category, severity, frequency, last_seen
                    FROM error_patterns 
                    WHERE last_seen >= ? AND last_seen <= ?
                    ORDER BY frequency DESC
                    LIMIT 10
                """, (start_date, end_date))
                
                top_patterns = []
                for row in cursor.fetchall():
                    pattern, category, severity, frequency, last_seen = row
                    top_patterns.append({
                        'pattern': pattern,
                        'category': category,
                        'severity': severity,
                        'frequency': frequency,
                        'last_seen': last_seen
                    })
                
                return {
                    'total_errors': total_errors,
                    'unresolved_errors': unresolved_errors,
                    'category_stats': category_stats,
                    'top_patterns': top_patterns,
                    'date_range': {
                        'start': start_date.isoformat(),
                        'end': end_date.isoformat()
                    }
                }
                
        except Exception as e:
            logger.error(f"Failed to get error statistics: {e}")
            return {}

    def get_recent_errors(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent error events"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, timestamp, severity, category, message, persian_message,
                           user_id, ip_address, performance_impact, resolved
                    FROM error_events 
                    ORDER BY timestamp DESC
                    LIMIT ?
                """, (limit,))
                
                errors = []
                for row in cursor.fetchall():
                    errors.append({
                        'id': row[0],
                        'timestamp': row[1],
                        'severity': row[2],
                        'category': row[3],
                        'message': row[4],
                        'persian_message': row[5],
                        'user_id': row[6],
                        'ip_address': row[7],
                        'performance_impact': row[8],
                        'resolved': bool(row[9])
                    })
                
                return errors
                
        except Exception as e:
            logger.error(f"Failed to get recent errors: {e}")
            return []

    def resolve_error(self, error_id: str, resolved_by: str, resolution_notes: str) -> bool:
        """Mark error as resolved"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE error_events 
                    SET resolved = 1, resolved_at = ?, resolved_by = ?, resolution_notes = ?
                    WHERE id = ?
                """, (datetime.utcnow(), resolved_by, resolution_notes, error_id))
                
                if cursor.rowcount > 0:
                    conn.commit()
                    logger.info(f"Error {error_id} resolved by {resolved_by}")
                    return True
                else:
                    return False
                    
        except Exception as e:
            logger.error(f"Failed to resolve error: {e}")
            return False

    def track_performance_metric(self, 
                               metric_name: str, 
                               value: float, 
                               unit: str = None,
                               context: str = None,
                               user_id: str = None,
                               session_id: str = None):
        """Track performance metric"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO performance_metrics (
                        id, timestamp, metric_name, value, unit, context, user_id, session_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    str(uuid.uuid4()),
                    datetime.utcnow(),
                    metric_name,
                    value,
                    unit,
                    context,
                    user_id,
                    session_id
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to track performance metric: {e}")

    def get_performance_metrics(self, metric_name: str, hours: int = 24) -> List[Dict[str, Any]]:
        """Get performance metrics for a specific metric"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT timestamp, value, unit, context, user_id
                    FROM performance_metrics 
                    WHERE metric_name = ? AND timestamp >= ?
                    ORDER BY timestamp DESC
                """, (metric_name, datetime.utcnow() - timedelta(hours=hours)))
                
                metrics = []
                for row in cursor.fetchall():
                    metrics.append({
                        'timestamp': row[0],
                        'value': row[1],
                        'unit': row[2],
                        'context': row[3],
                        'user_id': row[4]
                    })
                
                return metrics
                
        except Exception as e:
            logger.error(f"Failed to get performance metrics: {e}")
            return []

    def cleanup_old_data(self, days: int = 30):
        """Clean up old error data"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Clean up old error events (keep resolved ones longer)
                cursor.execute("""
                    DELETE FROM error_events 
                    WHERE timestamp < ? AND resolved = 1
                """, (cutoff_date,))
                
                # Clean up old performance metrics
                cursor.execute("""
                    DELETE FROM performance_metrics 
                    WHERE timestamp < ?
                """, (cutoff_date,))
                
                # Clean up old statistics
                cursor.execute("""
                    DELETE FROM error_statistics 
                    WHERE date < ?
                """, (cutoff_date.date(),))
                
                conn.commit()
                logger.info(f"Cleaned up monitoring data older than {days} days")
                
        except Exception as e:
            logger.error(f"Failed to cleanup old monitoring data: {e}")

# Global error tracker instance
error_tracker = ErrorTracker()

# Convenience functions
def track_error(severity: ErrorSeverity, category: ErrorCategory, message: str, **kwargs):
    """Convenience function to track error"""
    return error_tracker.track_error(severity, category, message, **kwargs)

def track_performance(metric_name: str, value: float, **kwargs):
    """Convenience function to track performance"""
    return error_tracker.track_performance_metric(metric_name, value, **kwargs)