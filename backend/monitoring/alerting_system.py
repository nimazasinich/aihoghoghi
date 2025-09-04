"""
Iranian Legal Archive - Alerting System
Comprehensive alerting system for monitoring and notifications
"""

import asyncio
import smtplib
import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass, asdict
from enum import Enum
import logging
import uuid
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders

logger = logging.getLogger(__name__)

class AlertSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class AlertChannel(Enum):
    EMAIL = "email"
    SLACK = "slack"
    TELEGRAM = "telegram"
    WEBHOOK = "webhook"
    SMS = "sms"

class AlertStatus(Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"

@dataclass
class AlertRule:
    id: str
    name: str
    description: str
    persian_description: str
    condition: str
    severity: AlertSeverity
    channels: List[AlertChannel]
    enabled: bool
    cooldown_minutes: int
    last_triggered: Optional[datetime]
    created_at: datetime
    updated_at: datetime

@dataclass
class Alert:
    id: str
    rule_id: str
    title: str
    persian_title: str
    message: str
    persian_message: str
    severity: AlertSeverity
    status: AlertStatus
    created_at: datetime
    sent_at: Optional[datetime]
    acknowledged_at: Optional[datetime]
    resolved_at: Optional[datetime]
    acknowledged_by: Optional[str]
    resolved_by: Optional[str]
    metadata: Optional[Dict[str, Any]]

class AlertingSystem:
    def __init__(self, db_path: str = "monitoring.db"):
        self.db_path = db_path
        self._init_database()
        self._register_default_rules()
        
        # Configuration
        self.config = {
            'email': {
                'smtp_server': 'smtp.gmail.com',
                'smtp_port': 587,
                'username': None,
                'password': None,
                'from_email': None
            },
            'slack': {
                'webhook_url': None,
                'channel': '#alerts'
            },
            'telegram': {
                'bot_token': None,
                'chat_id': None
            },
            'sms': {
                'provider': 'twilio',
                'account_sid': None,
                'auth_token': None,
                'from_number': None
            }
        }
        
        # Persian messages
        self.persian_messages = {
            'system_down': 'سیستم متوقف شده است',
            'high_error_rate': 'نرخ خطای بالا',
            'disk_space_low': 'فضای دیسک کم',
            'memory_usage_high': 'استفاده زیاد از حافظه',
            'cpu_usage_high': 'استفاده زیاد از CPU',
            'database_connection_failed': 'اتصال به پایگاه داده ناموفق',
            'api_response_slow': 'پاسخ کند API',
            'security_violation': 'نقض امنیت',
            'scraping_failed': 'جمع‌آوری ناموفق',
            'proxy_failed': 'پروکسی ناموفق'
        }

    def _init_database(self):
        """Initialize alerting database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Create alert_rules table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS alert_rules (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        description TEXT NOT NULL,
                        persian_description TEXT NOT NULL,
                        condition TEXT NOT NULL,
                        severity TEXT NOT NULL,
                        channels TEXT NOT NULL,
                        enabled BOOLEAN DEFAULT 1,
                        cooldown_minutes INTEGER DEFAULT 15,
                        last_triggered TIMESTAMP,
                        created_at TIMESTAMP NOT NULL,
                        updated_at TIMESTAMP NOT NULL
                    )
                """)
                
                # Create alerts table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS alerts (
                        id TEXT PRIMARY KEY,
                        rule_id TEXT NOT NULL,
                        title TEXT NOT NULL,
                        persian_title TEXT NOT NULL,
                        message TEXT NOT NULL,
                        persian_message TEXT NOT NULL,
                        severity TEXT NOT NULL,
                        status TEXT NOT NULL,
                        created_at TIMESTAMP NOT NULL,
                        sent_at TIMESTAMP,
                        acknowledged_at TIMESTAMP,
                        resolved_at TIMESTAMP,
                        acknowledged_by TEXT,
                        resolved_by TEXT,
                        metadata TEXT,
                        FOREIGN KEY (rule_id) REFERENCES alert_rules (id)
                    )
                """)
                
                # Create alert_channels table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS alert_channels (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        config TEXT NOT NULL,
                        enabled BOOLEAN DEFAULT 1,
                        created_at TIMESTAMP NOT NULL,
                        updated_at TIMESTAMP NOT NULL
                    )
                """)
                
                # Create alert_subscriptions table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS alert_subscriptions (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        rule_id TEXT NOT NULL,
                        channels TEXT NOT NULL,
                        enabled BOOLEAN DEFAULT 1,
                        created_at TIMESTAMP NOT NULL,
                        FOREIGN KEY (rule_id) REFERENCES alert_rules (id)
                    )
                """)
                
                # Create indexes
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(enabled)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_rule_id ON alerts(rule_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_alert_subscriptions_user_id ON alert_subscriptions(user_id)")
                
                conn.commit()
                logger.info("Alerting system database initialized")
                
        except Exception as e:
            logger.error(f"Failed to initialize alerting database: {e}")
            raise

    def _register_default_rules(self):
        """Register default alert rules"""
        default_rules = [
            {
                'name': 'System Down',
                'description': 'System is not responding',
                'persian_description': 'سیستم پاسخ نمی‌دهد',
                'condition': 'system_health == "critical"',
                'severity': AlertSeverity.CRITICAL,
                'channels': [AlertChannel.EMAIL, AlertChannel.SLACK],
                'cooldown_minutes': 5
            },
            {
                'name': 'High Error Rate',
                'description': 'Error rate exceeds threshold',
                'persian_description': 'نرخ خطا از حد مجاز تجاوز کرده',
                'condition': 'error_rate > 10',
                'severity': AlertSeverity.HIGH,
                'channels': [AlertChannel.EMAIL, AlertChannel.SLACK],
                'cooldown_minutes': 15
            },
            {
                'name': 'Disk Space Low',
                'description': 'Disk space is running low',
                'persian_description': 'فضای دیسک در حال تمام شدن',
                'condition': 'disk_usage > 85',
                'severity': AlertSeverity.WARNING,
                'channels': [AlertChannel.EMAIL],
                'cooldown_minutes': 60
            },
            {
                'name': 'Memory Usage High',
                'description': 'Memory usage is high',
                'persian_description': 'استفاده از حافظه بالا است',
                'condition': 'memory_usage > 80',
                'severity': AlertSeverity.WARNING,
                'channels': [AlertChannel.EMAIL],
                'cooldown_minutes': 30
            },
            {
                'name': 'CPU Usage High',
                'description': 'CPU usage is high',
                'persian_description': 'استفاده از CPU بالا است',
                'condition': 'cpu_usage > 80',
                'severity': AlertSeverity.WARNING,
                'channels': [AlertChannel.EMAIL],
                'cooldown_minutes': 30
            },
            {
                'name': 'Database Connection Failed',
                'description': 'Database connection failed',
                'persian_description': 'اتصال به پایگاه داده ناموفق',
                'condition': 'database_errors > 5',
                'severity': AlertSeverity.CRITICAL,
                'channels': [AlertChannel.EMAIL, AlertChannel.SLACK, AlertChannel.TELEGRAM],
                'cooldown_minutes': 10
            },
            {
                'name': 'API Response Slow',
                'description': 'API response time is slow',
                'persian_description': 'زمان پاسخ API کند است',
                'condition': 'api_response_time > 5000',
                'severity': AlertSeverity.WARNING,
                'channels': [AlertChannel.EMAIL],
                'cooldown_minutes': 45
            },
            {
                'name': 'Security Violation',
                'description': 'Security violation detected',
                'persian_description': 'نقض امنیت شناسایی شد',
                'condition': 'security_events > 0',
                'severity': AlertSeverity.CRITICAL,
                'channels': [AlertChannel.EMAIL, AlertChannel.SLACK, AlertChannel.TELEGRAM],
                'cooldown_minutes': 0
            },
            {
                'name': 'Scraping Failed',
                'description': 'Scraping system failed',
                'persian_description': 'سیستم جمع‌آوری ناموفق',
                'condition': 'scraping_errors > 20',
                'severity': AlertSeverity.HIGH,
                'channels': [AlertChannel.EMAIL, AlertChannel.SLACK],
                'cooldown_minutes': 20
            },
            {
                'name': 'Proxy Failed',
                'description': 'Proxy system failed',
                'persian_description': 'سیستم پروکسی ناموفق',
                'condition': 'proxy_errors > 25',
                'severity': AlertSeverity.HIGH,
                'channels': [AlertChannel.EMAIL],
                'cooldown_minutes': 30
            }
        ]
        
        for rule_data in default_rules:
            self._create_alert_rule(**rule_data)

    def _create_alert_rule(self, name: str, description: str, persian_description: str,
                          condition: str, severity: AlertSeverity, channels: List[AlertChannel],
                          cooldown_minutes: int = 15):
        """Create alert rule"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Check if rule already exists
                cursor.execute("SELECT id FROM alert_rules WHERE name = ?", (name,))
                if cursor.fetchone():
                    return
                
                rule_id = str(uuid.uuid4())
                channels_json = json.dumps([channel.value for channel in channels])
                
                cursor.execute("""
                    INSERT INTO alert_rules (
                        id, name, description, persian_description, condition, severity,
                        channels, cooldown_minutes, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    rule_id,
                    name,
                    description,
                    persian_description,
                    condition,
                    severity.value,
                    channels_json,
                    cooldown_minutes,
                    datetime.utcnow(),
                    datetime.utcnow()
                ))
                
                conn.commit()
                logger.info(f"Created alert rule: {name}")
                
        except Exception as e:
            logger.error(f"Failed to create alert rule: {e}")

    def check_alerts(self):
        """Check all alert rules and trigger alerts if conditions are met"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Get enabled alert rules
                cursor.execute("""
                    SELECT id, name, condition, severity, channels, cooldown_minutes, last_triggered
                    FROM alert_rules 
                    WHERE enabled = 1
                """)
                
                rules = cursor.fetchall()
                
                for rule in rules:
                    rule_id, name, condition, severity, channels_json, cooldown_minutes, last_triggered = rule
                    
                    # Check cooldown
                    if last_triggered:
                        last_triggered_dt = datetime.fromisoformat(last_triggered)
                        if datetime.utcnow() - last_triggered_dt < timedelta(minutes=cooldown_minutes):
                            continue
                    
                    # Evaluate condition
                    if self._evaluate_condition(condition):
                        channels = [AlertChannel(ch) for ch in json.loads(channels_json)]
                        self._trigger_alert(rule_id, name, condition, AlertSeverity(severity), channels)
                        
                        # Update last triggered
                        cursor.execute("""
                            UPDATE alert_rules 
                            SET last_triggered = ? 
                            WHERE id = ?
                        """, (datetime.utcnow(), rule_id))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Failed to check alerts: {e}")

    def _evaluate_condition(self, condition: str) -> bool:
        """Evaluate alert condition"""
        try:
            # Get current system metrics
            metrics = self._get_system_metrics()
            
            # Simple condition evaluation
            # In a real system, you'd use a proper expression evaluator
            if 'system_health' in condition:
                from .health_dashboard import health_dashboard
                health = asyncio.run(health_dashboard.run_health_checks())
                return health.overall_status.value == "critical"
            
            elif 'error_rate' in condition:
                # Get error rate from monitoring
                error_rate = metrics.get('error_rate', 0)
                threshold = float(condition.split('>')[1].strip())
                return error_rate > threshold
            
            elif 'disk_usage' in condition:
                disk_usage = metrics.get('disk_usage', 0)
                threshold = float(condition.split('>')[1].strip())
                return disk_usage > threshold
            
            elif 'memory_usage' in condition:
                memory_usage = metrics.get('memory_usage', 0)
                threshold = float(condition.split('>')[1].strip())
                return memory_usage > threshold
            
            elif 'cpu_usage' in condition:
                cpu_usage = metrics.get('cpu_usage', 0)
                threshold = float(condition.split('>')[1].strip())
                return cpu_usage > threshold
            
            elif 'database_errors' in condition:
                database_errors = metrics.get('database_errors', 0)
                threshold = float(condition.split('>')[1].strip())
                return database_errors > threshold
            
            elif 'api_response_time' in condition:
                api_response_time = metrics.get('api_response_time', 0)
                threshold = float(condition.split('>')[1].strip())
                return api_response_time > threshold
            
            elif 'security_events' in condition:
                security_events = metrics.get('security_events', 0)
                threshold = float(condition.split('>')[1].strip())
                return security_events > threshold
            
            elif 'scraping_errors' in condition:
                scraping_errors = metrics.get('scraping_errors', 0)
                threshold = float(condition.split('>')[1].strip())
                return scraping_errors > threshold
            
            elif 'proxy_errors' in condition:
                proxy_errors = metrics.get('proxy_errors', 0)
                threshold = float(condition.split('>')[1].strip())
                return proxy_errors > threshold
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to evaluate condition '{condition}': {e}")
            return False

    def _get_system_metrics(self) -> Dict[str, Any]:
        """Get current system metrics"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Get error rate from last hour
                cursor.execute("""
                    SELECT COUNT(*) FROM error_events 
                    WHERE timestamp >= ?
                """, (datetime.utcnow() - timedelta(hours=1),))
                error_count = cursor.fetchone()[0]
                
                # Get API calls from last hour
                cursor.execute("""
                    SELECT COUNT(*) FROM api_metrics 
                    WHERE timestamp >= ?
                """, (datetime.utcnow() - timedelta(hours=1),))
                api_calls = cursor.fetchone()[0]
                
                # Calculate error rate
                error_rate = (error_count / max(api_calls, 1)) * 100
                
                # Get system metrics
                cursor.execute("""
                    SELECT cpu_percent, memory_percent, disk_percent
                    FROM system_metrics 
                    ORDER BY timestamp DESC 
                    LIMIT 1
                """)
                system_result = cursor.fetchone()
                
                # Get database errors
                cursor.execute("""
                    SELECT COUNT(*) FROM error_events 
                    WHERE timestamp >= ? AND category = 'database'
                """, (datetime.utcnow() - timedelta(hours=1),))
                database_errors = cursor.fetchone()[0]
                
                # Get API response time
                cursor.execute("""
                    SELECT AVG(response_time) FROM api_metrics 
                    WHERE timestamp >= ?
                """, (datetime.utcnow() - timedelta(hours=1),))
                api_response_time = cursor.fetchone()[0] or 0
                
                # Get security events
                cursor.execute("""
                    SELECT COUNT(*) FROM security_events 
                    WHERE timestamp >= ?
                """, (datetime.utcnow() - timedelta(hours=1),))
                security_events = cursor.fetchone()[0]
                
                # Get scraping errors
                cursor.execute("""
                    SELECT COUNT(*) FROM error_events 
                    WHERE timestamp >= ? AND category = 'scraping'
                """, (datetime.utcnow() - timedelta(hours=1),))
                scraping_errors = cursor.fetchone()[0]
                
                # Get proxy errors
                cursor.execute("""
                    SELECT COUNT(*) FROM error_events 
                    WHERE timestamp >= ? AND category = 'proxy'
                """, (datetime.utcnow() - timedelta(hours=1),))
                proxy_errors = cursor.fetchone()[0]
                
                return {
                    'error_rate': error_rate,
                    'disk_usage': system_result[2] if system_result else 0,
                    'memory_usage': system_result[1] if system_result else 0,
                    'cpu_usage': system_result[0] if system_result else 0,
                    'database_errors': database_errors,
                    'api_response_time': api_response_time,
                    'security_events': security_events,
                    'scraping_errors': scraping_errors,
                    'proxy_errors': proxy_errors
                }
                
        except Exception as e:
            logger.error(f"Failed to get system metrics: {e}")
            return {}

    def _trigger_alert(self, rule_id: str, rule_name: str, condition: str, 
                      severity: AlertSeverity, channels: List[AlertChannel]):
        """Trigger an alert"""
        try:
            alert_id = str(uuid.uuid4())
            
            # Create alert
            alert = Alert(
                id=alert_id,
                rule_id=rule_id,
                title=f"Alert: {rule_name}",
                persian_title=f"هشدار: {self.persian_messages.get(rule_name.lower().replace(' ', '_'), rule_name)}",
                message=f"Alert condition met: {condition}",
                persian_message=f"شرط هشدار برآورده شد: {condition}",
                severity=severity,
                status=AlertStatus.PENDING,
                created_at=datetime.utcnow(),
                sent_at=None,
                acknowledged_at=None,
                resolved_at=None,
                acknowledged_by=None,
                resolved_by=None,
                metadata={'condition': condition, 'rule_name': rule_name}
            )
            
            # Store alert
            self._store_alert(alert)
            
            # Send to channels
            for channel in channels:
                self._send_alert(alert, channel)
            
            # Update alert status
            self._update_alert_status(alert_id, AlertStatus.SENT, sent_at=datetime.utcnow())
            
            logger.warning(f"Alert triggered: {rule_name} - {condition}")
            
        except Exception as e:
            logger.error(f"Failed to trigger alert: {e}")

    def _store_alert(self, alert: Alert):
        """Store alert in database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO alerts (
                        id, rule_id, title, persian_title, message, persian_message,
                        severity, status, created_at, sent_at, acknowledged_at, resolved_at,
                        acknowledged_by, resolved_by, metadata
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    alert.id,
                    alert.rule_id,
                    alert.title,
                    alert.persian_title,
                    alert.message,
                    alert.persian_message,
                    alert.severity.value,
                    alert.status.value,
                    alert.created_at,
                    alert.sent_at,
                    alert.acknowledged_at,
                    alert.resolved_at,
                    alert.acknowledged_by,
                    alert.resolved_by,
                    json.dumps(alert.metadata) if alert.metadata else None
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to store alert: {e}")

    def _send_alert(self, alert: Alert, channel: AlertChannel):
        """Send alert to specific channel"""
        try:
            if channel == AlertChannel.EMAIL:
                self._send_email_alert(alert)
            elif channel == AlertChannel.SLACK:
                self._send_slack_alert(alert)
            elif channel == AlertChannel.TELEGRAM:
                self._send_telegram_alert(alert)
            elif channel == AlertChannel.WEBHOOK:
                self._send_webhook_alert(alert)
            elif channel == AlertChannel.SMS:
                self._send_sms_alert(alert)
                
        except Exception as e:
            logger.error(f"Failed to send alert via {channel.value}: {e}")

    def _send_email_alert(self, alert: Alert):
        """Send email alert"""
        try:
            if not self.config['email']['username']:
                logger.warning("Email configuration not set")
                return
            
            msg = MIMEMultipart()
            msg['From'] = self.config['email']['from_email']
            msg['To'] = self.config['email']['from_email']  # In real system, get from subscriptions
            msg['Subject'] = f"[{alert.severity.value.upper()}] {alert.title}"
            
            body = f"""
            Alert Details:
            Title: {alert.title}
            Persian Title: {alert.persian_title}
            Message: {alert.message}
            Persian Message: {alert.persian_message}
            Severity: {alert.severity.value}
            Time: {alert.created_at}
            
            System Information:
            {json.dumps(alert.metadata, indent=2) if alert.metadata else 'No additional information'}
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            server = smtplib.SMTP(self.config['email']['smtp_server'], self.config['email']['smtp_port'])
            server.starttls()
            server.login(self.config['email']['username'], self.config['email']['password'])
            text = msg.as_string()
            server.sendmail(self.config['email']['from_email'], self.config['email']['from_email'], text)
            server.quit()
            
            logger.info(f"Email alert sent: {alert.title}")
            
        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")

    def _send_slack_alert(self, alert: Alert):
        """Send Slack alert"""
        try:
            if not self.config['slack']['webhook_url']:
                logger.warning("Slack configuration not set")
                return
            
            color = {
                AlertSeverity.INFO: "good",
                AlertSeverity.WARNING: "warning",
                AlertSeverity.ERROR: "danger",
                AlertSeverity.CRITICAL: "danger"
            }.get(alert.severity, "good")
            
            payload = {
                "channel": self.config['slack']['channel'],
                "username": "Iranian Legal Archive Monitor",
                "icon_emoji": ":warning:",
                "attachments": [
                    {
                        "color": color,
                        "title": alert.title,
                        "text": alert.message,
                        "fields": [
                            {
                                "title": "Persian Message",
                                "value": alert.persian_message,
                                "short": False
                            },
                            {
                                "title": "Severity",
                                "value": alert.severity.value.upper(),
                                "short": True
                            },
                            {
                                "title": "Time",
                                "value": alert.created_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
                                "short": True
                            }
                        ],
                        "footer": "Iranian Legal Archive System",
                        "ts": int(alert.created_at.timestamp())
                    }
                ]
            }
            
            response = requests.post(self.config['slack']['webhook_url'], json=payload)
            response.raise_for_status()
            
            logger.info(f"Slack alert sent: {alert.title}")
            
        except Exception as e:
            logger.error(f"Failed to send Slack alert: {e}")

    def _send_telegram_alert(self, alert: Alert):
        """Send Telegram alert"""
        try:
            if not self.config['telegram']['bot_token'] or not self.config['telegram']['chat_id']:
                logger.warning("Telegram configuration not set")
                return
            
            emoji = {
                AlertSeverity.INFO: "ℹ️",
                AlertSeverity.WARNING: "⚠️",
                AlertSeverity.ERROR: "❌",
                AlertSeverity.CRITICAL: "🚨"
            }.get(alert.severity, "ℹ️")
            
            message = f"""
            {emoji} *{alert.title}*
            
            {alert.message}
            
            *Persian:* {alert.persian_message}
            
            *Severity:* {alert.severity.value.upper()}
            *Time:* {alert.created_at.strftime("%Y-%m-%d %H:%M:%S UTC")}
            """
            
            url = f"https://api.telegram.org/bot{self.config['telegram']['bot_token']}/sendMessage"
            payload = {
                'chat_id': self.config['telegram']['chat_id'],
                'text': message,
                'parse_mode': 'Markdown'
            }
            
            response = requests.post(url, json=payload)
            response.raise_for_status()
            
            logger.info(f"Telegram alert sent: {alert.title}")
            
        except Exception as e:
            logger.error(f"Failed to send Telegram alert: {e}")

    def _send_webhook_alert(self, alert: Alert):
        """Send webhook alert"""
        try:
            # This would send to configured webhook URLs
            logger.info(f"Webhook alert: {alert.title}")
            
        except Exception as e:
            logger.error(f"Failed to send webhook alert: {e}")

    def _send_sms_alert(self, alert: Alert):
        """Send SMS alert"""
        try:
            if not self.config['sms']['account_sid']:
                logger.warning("SMS configuration not set")
                return
            
            # This would integrate with SMS providers like Twilio
            logger.info(f"SMS alert: {alert.title}")
            
        except Exception as e:
            logger.error(f"Failed to send SMS alert: {e}")

    def _update_alert_status(self, alert_id: str, status: AlertStatus, **kwargs):
        """Update alert status"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                update_fields = ['status = ?']
                params = [status.value]
                
                if 'sent_at' in kwargs:
                    update_fields.append('sent_at = ?')
                    params.append(kwargs['sent_at'])
                
                if 'acknowledged_at' in kwargs:
                    update_fields.append('acknowledged_at = ?')
                    params.append(kwargs['acknowledged_at'])
                
                if 'acknowledged_by' in kwargs:
                    update_fields.append('acknowledged_by = ?')
                    params.append(kwargs['acknowledged_by'])
                
                if 'resolved_at' in kwargs:
                    update_fields.append('resolved_at = ?')
                    params.append(kwargs['resolved_at'])
                
                if 'resolved_by' in kwargs:
                    update_fields.append('resolved_by = ?')
                    params.append(kwargs['resolved_by'])
                
                params.append(alert_id)
                
                cursor.execute(f"""
                    UPDATE alerts 
                    SET {', '.join(update_fields)}
                    WHERE id = ?
                """, params)
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Failed to update alert status: {e}")

    def acknowledge_alert(self, alert_id: str, acknowledged_by: str) -> bool:
        """Acknowledge an alert"""
        try:
            self._update_alert_status(
                alert_id, 
                AlertStatus.ACKNOWLEDGED,
                acknowledged_at=datetime.utcnow(),
                acknowledged_by=acknowledged_by
            )
            logger.info(f"Alert {alert_id} acknowledged by {acknowledged_by}")
            return True
        except Exception as e:
            logger.error(f"Failed to acknowledge alert: {e}")
            return False

    def resolve_alert(self, alert_id: str, resolved_by: str, resolution_notes: str = None) -> bool:
        """Resolve an alert"""
        try:
            self._update_alert_status(
                alert_id,
                AlertStatus.RESOLVED,
                resolved_at=datetime.utcnow(),
                resolved_by=resolved_by
            )
            logger.info(f"Alert {alert_id} resolved by {resolved_by}")
            return True
        except Exception as e:
            logger.error(f"Failed to resolve alert: {e}")
            return False

    def get_alerts(self, status: Optional[AlertStatus] = None, 
                  severity: Optional[AlertSeverity] = None,
                  limit: int = 50) -> List[Dict[str, Any]]:
        """Get alerts with filters"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                query = "SELECT * FROM alerts WHERE 1=1"
                params = []
                
                if status:
                    query += " AND status = ?"
                    params.append(status.value)
                
                if severity:
                    query += " AND severity = ?"
                    params.append(severity.value)
                
                query += " ORDER BY created_at DESC LIMIT ?"
                params.append(limit)
                
                cursor.execute(query, params)
                
                alerts = []
                for row in cursor.fetchall():
                    alerts.append({
                        'id': row[0],
                        'rule_id': row[1],
                        'title': row[2],
                        'persian_title': row[3],
                        'message': row[4],
                        'persian_message': row[5],
                        'severity': row[6],
                        'status': row[7],
                        'created_at': row[8],
                        'sent_at': row[9],
                        'acknowledged_at': row[10],
                        'resolved_at': row[11],
                        'acknowledged_by': row[12],
                        'resolved_by': row[13],
                        'metadata': json.loads(row[14]) if row[14] else None
                    })
                
                return alerts
                
        except Exception as e:
            logger.error(f"Failed to get alerts: {e}")
            return []

    def get_alert_statistics(self, days: int = 7) -> Dict[str, Any]:
        """Get alert statistics"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                start_date = datetime.utcnow() - timedelta(days=days)
                
                # Get alert counts by severity
                cursor.execute("""
                    SELECT severity, COUNT(*) as count
                    FROM alerts 
                    WHERE created_at >= ?
                    GROUP BY severity
                """, (start_date,))
                
                severity_stats = {}
                for row in cursor.fetchall():
                    severity_stats[row[0]] = row[1]
                
                # Get alert counts by status
                cursor.execute("""
                    SELECT status, COUNT(*) as count
                    FROM alerts 
                    WHERE created_at >= ?
                    GROUP BY status
                """, (start_date,))
                
                status_stats = {}
                for row in cursor.fetchall():
                    status_stats[row[0]] = row[1]
                
                # Get top alert rules
                cursor.execute("""
                    SELECT ar.name, COUNT(a.id) as count
                    FROM alert_rules ar
                    LEFT JOIN alerts a ON ar.id = a.rule_id AND a.created_at >= ?
                    GROUP BY ar.id, ar.name
                    ORDER BY count DESC
                    LIMIT 10
                """, (start_date,))
                
                top_rules = []
                for row in cursor.fetchall():
                    top_rules.append({
                        'rule_name': row[0],
                        'alert_count': row[1]
                    })
                
                return {
                    'severity_statistics': severity_stats,
                    'status_statistics': status_stats,
                    'top_rules': top_rules,
                    'date_range': {
                        'start': start_date.isoformat(),
                        'end': datetime.utcnow().isoformat(),
                        'days': days
                    }
                }
                
        except Exception as e:
            logger.error(f"Failed to get alert statistics: {e}")
            return {}

    def configure_channel(self, channel_type: str, config: Dict[str, Any]):
        """Configure alert channel"""
        try:
            if channel_type in self.config:
                self.config[channel_type].update(config)
                logger.info(f"Configured {channel_type} channel")
            else:
                logger.error(f"Unknown channel type: {channel_type}")
                
        except Exception as e:
            logger.error(f"Failed to configure channel: {e}")

    def cleanup_old_alerts(self, days: int = 30):
        """Clean up old alerts"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Clean up old resolved alerts
                cursor.execute("""
                    DELETE FROM alerts 
                    WHERE created_at < ? AND status = 'resolved'
                """, (cutoff_date,))
                
                conn.commit()
                logger.info(f"Cleaned up alerts older than {days} days")
                
        except Exception as e:
            logger.error(f"Failed to cleanup old alerts: {e}")

# Global alerting system instance
alerting_system = AlertingSystem()

# Convenience functions
def check_alerts():
    """Check all alerts"""
    return alerting_system.check_alerts()

def acknowledge_alert(alert_id: str, user_id: str):
    """Acknowledge alert"""
    return alerting_system.acknowledge_alert(alert_id, user_id)

def resolve_alert(alert_id: str, user_id: str, notes: str = None):
    """Resolve alert"""
    return alerting_system.resolve_alert(alert_id, user_id, notes)