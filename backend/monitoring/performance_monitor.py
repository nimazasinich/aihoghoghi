"""
Iranian Legal Archive - Performance Monitoring
Comprehensive performance monitoring system
"""

import time
import psutil
import sqlite3
import asyncio
import threading
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass
from contextlib import contextmanager
import logging
import json
import uuid

logger = logging.getLogger(__name__)

@dataclass
class PerformanceMetric:
    id: str
    timestamp: datetime
    metric_name: str
    value: float
    unit: str
    context: Optional[str]
    user_id: Optional[str]
    session_id: Optional[str]
    metadata: Optional[Dict[str, Any]]

class PerformanceMonitor:
    def __init__(self, db_path: str = "monitoring.db"):
        self.db_path = db_path
        self.metrics_buffer = []
        self.buffer_size = 100
        self.flush_interval = 30  # seconds
        self.monitoring_active = False
        self.monitor_thread = None
        
        # Performance thresholds
        self.thresholds = {
            'api_response_time': 1000,  # ms
            'database_query_time': 100,  # ms
            'memory_usage': 80,  # percentage
            'cpu_usage': 80,  # percentage
            'disk_usage': 90,  # percentage
            'error_rate': 5,  # percentage
        }
        
        # System metrics
        self.system_metrics = {
            'cpu_percent': 0,
            'memory_percent': 0,
            'disk_percent': 0,
            'network_io': {'bytes_sent': 0, 'bytes_recv': 0},
            'process_count': 0,
            'load_average': [0, 0, 0]
        }
        
        self._init_database()
        self._start_monitoring()

    def _init_database(self):
        """Initialize performance monitoring database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
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
                        session_id TEXT,
                        metadata TEXT
                    )
                """)
                
                # Create system_metrics table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS system_metrics (
                        id TEXT PRIMARY KEY,
                        timestamp TIMESTAMP NOT NULL,
                        cpu_percent REAL NOT NULL,
                        memory_percent REAL NOT NULL,
                        disk_percent REAL NOT NULL,
                        network_bytes_sent INTEGER NOT NULL,
                        network_bytes_recv INTEGER NOT NULL,
                        process_count INTEGER NOT NULL,
                        load_average_1m REAL NOT NULL,
                        load_average_5m REAL NOT NULL,
                        load_average_15m REAL NOT NULL
                    )
                """)
                
                # Create api_metrics table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS api_metrics (
                        id TEXT PRIMARY KEY,
                        timestamp TIMESTAMP NOT NULL,
                        endpoint TEXT NOT NULL,
                        method TEXT NOT NULL,
                        response_time REAL NOT NULL,
                        status_code INTEGER NOT NULL,
                        user_id TEXT,
                        ip_address TEXT,
                        user_agent TEXT,
                        request_size INTEGER,
                        response_size INTEGER
                    )
                """)
                
                # Create database_metrics table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS database_metrics (
                        id TEXT PRIMARY KEY,
                        timestamp TIMESTAMP NOT NULL,
                        query_type TEXT NOT NULL,
                        table_name TEXT,
                        execution_time REAL NOT NULL,
                        rows_affected INTEGER,
                        user_id TEXT,
                        context TEXT
                    )
                """)
                
                # Create indexes
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_api_metrics_timestamp ON api_metrics(timestamp)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_api_metrics_endpoint ON api_metrics(endpoint)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_database_metrics_timestamp ON database_metrics(timestamp)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_database_metrics_query_type ON database_metrics(query_type)")
                
                conn.commit()
                logger.info("Performance monitoring database initialized")
                
        except Exception as e:
            logger.error(f"Failed to initialize performance monitoring database: {e}")
            raise

    def _start_monitoring(self):
        """Start background monitoring thread"""
        if not self.monitoring_active:
            self.monitoring_active = True
            self.monitor_thread = threading.Thread(target=self._monitor_system, daemon=True)
            self.monitor_thread.start()
            logger.info("Performance monitoring started")

    def _monitor_system(self):
        """Background system monitoring"""
        while self.monitoring_active:
            try:
                # Collect system metrics
                self._collect_system_metrics()
                
                # Flush metrics buffer
                if len(self.metrics_buffer) >= self.buffer_size:
                    self._flush_metrics()
                
                # Sleep for monitoring interval
                time.sleep(10)  # Monitor every 10 seconds
                
            except Exception as e:
                logger.error(f"Error in system monitoring: {e}")
                time.sleep(30)  # Wait longer on error

    def _collect_system_metrics(self):
        """Collect system performance metrics"""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            
            # Disk usage
            disk = psutil.disk_usage('/')
            disk_percent = (disk.used / disk.total) * 100
            
            # Network I/O
            network = psutil.net_io_counters()
            
            # Process count
            process_count = len(psutil.pids())
            
            # Load average (Unix only)
            try:
                load_avg = psutil.getloadavg()
            except AttributeError:
                load_avg = [0, 0, 0]
            
            # Update system metrics
            self.system_metrics.update({
                'cpu_percent': cpu_percent,
                'memory_percent': memory_percent,
                'disk_percent': disk_percent,
                'network_io': {
                    'bytes_sent': network.bytes_sent,
                    'bytes_recv': network.bytes_recv
                },
                'process_count': process_count,
                'load_average': load_avg
            })
            
            # Store in database
            self._store_system_metrics()
            
            # Check thresholds
            self._check_thresholds()
            
        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")

    def _store_system_metrics(self):
        """Store system metrics in database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO system_metrics (
                        id, timestamp, cpu_percent, memory_percent, disk_percent,
                        network_bytes_sent, network_bytes_recv, process_count,
                        load_average_1m, load_average_5m, load_average_15m
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    str(uuid.uuid4()),
                    datetime.utcnow(),
                    self.system_metrics['cpu_percent'],
                    self.system_metrics['memory_percent'],
                    self.system_metrics['disk_percent'],
                    self.system_metrics['network_io']['bytes_sent'],
                    self.system_metrics['network_io']['bytes_recv'],
                    self.system_metrics['process_count'],
                    self.system_metrics['load_average'][0],
                    self.system_metrics['load_average'][1],
                    self.system_metrics['load_average'][2]
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to store system metrics: {e}")

    def _check_thresholds(self):
        """Check performance thresholds and alert if exceeded"""
        try:
            from .error_tracking import error_tracker, ErrorSeverity, ErrorCategory
            
            # Check CPU usage
            if self.system_metrics['cpu_percent'] > self.thresholds['cpu_usage']:
                error_tracker.track_error(
                    severity=ErrorSeverity.HIGH,
                    category=ErrorCategory.SYSTEM,
                    message=f"High CPU usage: {self.system_metrics['cpu_percent']:.1f}%",
                    persian_message=f"استفاده زیاد از CPU: {self.system_metrics['cpu_percent']:.1f}%",
                    performance_impact=self.system_metrics['cpu_percent']
                )
            
            # Check memory usage
            if self.system_metrics['memory_percent'] > self.thresholds['memory_usage']:
                error_tracker.track_error(
                    severity=ErrorSeverity.HIGH,
                    category=ErrorCategory.SYSTEM,
                    message=f"High memory usage: {self.system_metrics['memory_percent']:.1f}%",
                    persian_message=f"استفاده زیاد از حافظه: {self.system_metrics['memory_percent']:.1f}%",
                    performance_impact=self.system_metrics['memory_percent']
                )
            
            # Check disk usage
            if self.system_metrics['disk_percent'] > self.thresholds['disk_usage']:
                error_tracker.track_error(
                    severity=ErrorSeverity.CRITICAL,
                    category=ErrorCategory.SYSTEM,
                    message=f"High disk usage: {self.system_metrics['disk_percent']:.1f}%",
                    persian_message=f"استفاده زیاد از دیسک: {self.system_metrics['disk_percent']:.1f}%",
                    performance_impact=self.system_metrics['disk_percent']
                )
                
        except Exception as e:
            logger.error(f"Failed to check thresholds: {e}")

    def track_metric(self, 
                    metric_name: str, 
                    value: float, 
                    unit: str = None,
                    context: str = None,
                    user_id: str = None,
                    session_id: str = None,
                    metadata: Dict[str, Any] = None):
        """Track a performance metric"""
        metric = PerformanceMetric(
            id=str(uuid.uuid4()),
            timestamp=datetime.utcnow(),
            metric_name=metric_name,
            value=value,
            unit=unit,
            context=context,
            user_id=user_id,
            session_id=session_id,
            metadata=metadata
        )
        
        self.metrics_buffer.append(metric)
        
        # Flush if buffer is full
        if len(self.metrics_buffer) >= self.buffer_size:
            self._flush_metrics()

    def _flush_metrics(self):
        """Flush metrics buffer to database"""
        if not self.metrics_buffer:
            return
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                for metric in self.metrics_buffer:
                    cursor.execute("""
                        INSERT INTO performance_metrics (
                            id, timestamp, metric_name, value, unit, context, user_id, session_id, metadata
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        metric.id,
                        metric.timestamp,
                        metric.metric_name,
                        metric.value,
                        metric.unit,
                        metric.context,
                        metric.user_id,
                        metric.session_id,
                        json.dumps(metric.metadata) if metric.metadata else None
                    ))
                
                conn.commit()
                self.metrics_buffer.clear()
                
        except Exception as e:
            logger.error(f"Failed to flush metrics: {e}")

    @contextmanager
    def measure_time(self, metric_name: str, **kwargs):
        """Context manager to measure execution time"""
        start_time = time.time()
        try:
            yield
        finally:
            execution_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            self.track_metric(metric_name, execution_time, unit='ms', **kwargs)

    def track_api_call(self, 
                      endpoint: str, 
                      method: str, 
                      response_time: float,
                      status_code: int,
                      user_id: str = None,
                      ip_address: str = None,
                      user_agent: str = None,
                      request_size: int = None,
                      response_size: int = None):
        """Track API call performance"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO api_metrics (
                        id, timestamp, endpoint, method, response_time, status_code,
                        user_id, ip_address, user_agent, request_size, response_size
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    str(uuid.uuid4()),
                    datetime.utcnow(),
                    endpoint,
                    method,
                    response_time,
                    status_code,
                    user_id,
                    ip_address,
                    user_agent,
                    request_size,
                    response_size
                ))
                conn.commit()
                
                # Track as performance metric
                self.track_metric(
                    'api_response_time',
                    response_time,
                    unit='ms',
                    context=f"{method} {endpoint}",
                    user_id=user_id,
                    metadata={
                        'endpoint': endpoint,
                        'method': method,
                        'status_code': status_code
                    }
                )
                
        except Exception as e:
            logger.error(f"Failed to track API call: {e}")

    def track_database_query(self, 
                           query_type: str, 
                           execution_time: float,
                           table_name: str = None,
                           rows_affected: int = None,
                           user_id: str = None,
                           context: str = None):
        """Track database query performance"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO database_metrics (
                        id, timestamp, query_type, table_name, execution_time,
                        rows_affected, user_id, context
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    str(uuid.uuid4()),
                    datetime.utcnow(),
                    query_type,
                    table_name,
                    execution_time,
                    rows_affected,
                    user_id,
                    context
                ))
                conn.commit()
                
                # Track as performance metric
                self.track_metric(
                    'database_query_time',
                    execution_time,
                    unit='ms',
                    context=f"{query_type} {table_name or ''}",
                    user_id=user_id,
                    metadata={
                        'query_type': query_type,
                        'table_name': table_name,
                        'rows_affected': rows_affected
                    }
                )
                
        except Exception as e:
            logger.error(f"Failed to track database query: {e}")

    def get_performance_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get performance summary for the last N hours"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Get API metrics
                cursor.execute("""
                    SELECT 
                        COUNT(*) as total_calls,
                        AVG(response_time) as avg_response_time,
                        MAX(response_time) as max_response_time,
                        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
                    FROM api_metrics 
                    WHERE timestamp >= ?
                """, (datetime.utcnow() - timedelta(hours=hours),))
                
                api_stats = cursor.fetchone()
                
                # Get database metrics
                cursor.execute("""
                    SELECT 
                        COUNT(*) as total_queries,
                        AVG(execution_time) as avg_execution_time,
                        MAX(execution_time) as max_execution_time
                    FROM database_metrics 
                    WHERE timestamp >= ?
                """, (datetime.utcnow() - timedelta(hours=hours),))
                
                db_stats = cursor.fetchone()
                
                # Get system metrics (latest)
                cursor.execute("""
                    SELECT cpu_percent, memory_percent, disk_percent, process_count
                    FROM system_metrics 
                    ORDER BY timestamp DESC 
                    LIMIT 1
                """)
                
                system_stats = cursor.fetchone()
                
                # Get top slow endpoints
                cursor.execute("""
                    SELECT endpoint, method, AVG(response_time) as avg_time, COUNT(*) as calls
                    FROM api_metrics 
                    WHERE timestamp >= ?
                    GROUP BY endpoint, method
                    ORDER BY avg_time DESC
                    LIMIT 10
                """, (datetime.utcnow() - timedelta(hours=hours),))
                
                slow_endpoints = []
                for row in cursor.fetchall():
                    slow_endpoints.append({
                        'endpoint': row[0],
                        'method': row[1],
                        'avg_time': row[2],
                        'calls': row[3]
                    })
                
                # Get top slow queries
                cursor.execute("""
                    SELECT query_type, table_name, AVG(execution_time) as avg_time, COUNT(*) as calls
                    FROM database_metrics 
                    WHERE timestamp >= ?
                    GROUP BY query_type, table_name
                    ORDER BY avg_time DESC
                    LIMIT 10
                """, (datetime.utcnow() - timedelta(hours=hours),))
                
                slow_queries = []
                for row in cursor.fetchall():
                    slow_queries.append({
                        'query_type': row[0],
                        'table_name': row[1],
                        'avg_time': row[2],
                        'calls': row[3]
                    })
                
                return {
                    'api_stats': {
                        'total_calls': api_stats[0] or 0,
                        'avg_response_time': api_stats[1] or 0,
                        'max_response_time': api_stats[2] or 0,
                        'error_count': api_stats[3] or 0,
                        'error_rate': (api_stats[3] or 0) / max(api_stats[0] or 1, 1) * 100
                    },
                    'database_stats': {
                        'total_queries': db_stats[0] or 0,
                        'avg_execution_time': db_stats[1] or 0,
                        'max_execution_time': db_stats[2] or 0
                    },
                    'system_stats': {
                        'cpu_percent': system_stats[0] if system_stats else 0,
                        'memory_percent': system_stats[1] if system_stats else 0,
                        'disk_percent': system_stats[2] if system_stats else 0,
                        'process_count': system_stats[3] if system_stats else 0
                    },
                    'slow_endpoints': slow_endpoints,
                    'slow_queries': slow_queries,
                    'time_range': {
                        'hours': hours,
                        'start': (datetime.utcnow() - timedelta(hours=hours)).isoformat(),
                        'end': datetime.utcnow().isoformat()
                    }
                }
                
        except Exception as e:
            logger.error(f"Failed to get performance summary: {e}")
            return {}

    def get_system_health(self) -> Dict[str, Any]:
        """Get current system health status"""
        try:
            # Get latest system metrics
            latest_metrics = self.system_metrics.copy()
            
            # Determine health status
            health_status = "healthy"
            issues = []
            
            if latest_metrics['cpu_percent'] > self.thresholds['cpu_usage']:
                health_status = "warning"
                issues.append(f"High CPU usage: {latest_metrics['cpu_percent']:.1f}%")
            
            if latest_metrics['memory_percent'] > self.thresholds['memory_usage']:
                health_status = "warning"
                issues.append(f"High memory usage: {latest_metrics['memory_percent']:.1f}%")
            
            if latest_metrics['disk_percent'] > self.thresholds['disk_usage']:
                health_status = "critical"
                issues.append(f"High disk usage: {latest_metrics['disk_percent']:.1f}%")
            
            # Get uptime
            uptime = time.time() - psutil.boot_time()
            
            return {
                'status': health_status,
                'issues': issues,
                'metrics': latest_metrics,
                'uptime_seconds': uptime,
                'uptime_formatted': self._format_uptime(uptime),
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get system health: {e}")
            return {
                'status': 'error',
                'issues': [f"Failed to get system health: {str(e)}"],
                'timestamp': datetime.utcnow().isoformat()
            }

    def _format_uptime(self, seconds: float) -> str:
        """Format uptime in human readable format"""
        days = int(seconds // 86400)
        hours = int((seconds % 86400) // 3600)
        minutes = int((seconds % 3600) // 60)
        
        if days > 0:
            return f"{days} روز, {hours} ساعت, {minutes} دقیقه"
        elif hours > 0:
            return f"{hours} ساعت, {minutes} دقیقه"
        else:
            return f"{minutes} دقیقه"

    def stop_monitoring(self):
        """Stop performance monitoring"""
        self.monitoring_active = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        self._flush_metrics()
        logger.info("Performance monitoring stopped")

    def cleanup_old_data(self, days: int = 30):
        """Clean up old performance data"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Clean up old performance metrics
                cursor.execute("""
                    DELETE FROM performance_metrics 
                    WHERE timestamp < ?
                """, (cutoff_date,))
                
                # Clean up old system metrics
                cursor.execute("""
                    DELETE FROM system_metrics 
                    WHERE timestamp < ?
                """, (cutoff_date,))
                
                # Clean up old API metrics
                cursor.execute("""
                    DELETE FROM api_metrics 
                    WHERE timestamp < ?
                """, (cutoff_date,))
                
                # Clean up old database metrics
                cursor.execute("""
                    DELETE FROM database_metrics 
                    WHERE timestamp < ?
                """, (cutoff_date,))
                
                conn.commit()
                logger.info(f"Cleaned up performance data older than {days} days")
                
        except Exception as e:
            logger.error(f"Failed to cleanup old performance data: {e}")

# Global performance monitor instance
performance_monitor = PerformanceMonitor()

# Convenience functions
def track_metric(metric_name: str, value: float, **kwargs):
    """Convenience function to track metric"""
    return performance_monitor.track_metric(metric_name, value, **kwargs)

def measure_time(metric_name: str, **kwargs):
    """Convenience function for time measurement"""
    return performance_monitor.measure_time(metric_name, **kwargs)

def track_api_call(endpoint: str, method: str, response_time: float, **kwargs):
    """Convenience function to track API call"""
    return performance_monitor.track_api_call(endpoint, method, response_time, **kwargs)

def track_database_query(query_type: str, execution_time: float, **kwargs):
    """Convenience function to track database query"""
    return performance_monitor.track_database_query(query_type, execution_time, **kwargs)