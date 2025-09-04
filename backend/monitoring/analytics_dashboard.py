"""
Iranian Legal Archive - Analytics Dashboard
Comprehensive analytics and reporting system
"""

import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict
import logging
from enum import Enum

logger = logging.getLogger(__name__)

class TimeRange(Enum):
    HOUR = "hour"
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    YEAR = "year"

@dataclass
class MetricData:
    timestamp: datetime
    value: float
    label: str
    persian_label: str

@dataclass
class ChartData:
    title: str
    persian_title: str
    type: str  # line, bar, pie, area
    data: List[MetricData]
    x_axis_label: str
    y_axis_label: str
    persian_x_axis_label: str
    persian_y_axis_label: str

class AnalyticsDashboard:
    def __init__(self, db_path: str = "monitoring.db"):
        self.db_path = db_path
        
        # Persian labels
        self.persian_labels = {
            'api_calls': 'درخواست‌های API',
            'error_rate': 'نرخ خطا',
            'response_time': 'زمان پاسخ',
            'database_queries': 'کوئری‌های پایگاه داده',
            'user_activity': 'فعالیت کاربران',
            'document_views': 'مشاهده اسناد',
            'search_queries': 'کوئری‌های جستجو',
            'system_performance': 'عملکرد سیستم',
            'security_events': 'رویدادهای امنیتی',
            'scraping_activity': 'فعالیت جمع‌آوری',
            'memory_usage': 'استفاده از حافظه',
            'cpu_usage': 'استفاده از CPU',
            'disk_usage': 'استفاده از دیسک',
            'network_traffic': 'ترافیک شبکه',
            'active_users': 'کاربران فعال',
            'new_documents': 'اسناد جدید',
            'failed_requests': 'درخواست‌های ناموفق',
            'successful_requests': 'درخواست‌های موفق',
            'average_session_duration': 'میانگین مدت جلسه',
            'bounce_rate': 'نرخ خروج',
            'conversion_rate': 'نرخ تبدیل'
        }

    def get_system_overview(self, time_range: TimeRange = TimeRange.DAY) -> Dict[str, Any]:
        """Get system overview analytics"""
        try:
            end_time = datetime.utcnow()
            start_time = self._get_start_time(end_time, time_range)
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Get API metrics
                api_stats = self._get_api_statistics(cursor, start_time, end_time)
                
                # Get error statistics
                error_stats = self._get_error_statistics(cursor, start_time, end_time)
                
                # Get user activity
                user_stats = self._get_user_statistics(cursor, start_time, end_time)
                
                # Get system performance
                performance_stats = self._get_performance_statistics(cursor, start_time, end_time)
                
                # Get security events
                security_stats = self._get_security_statistics(cursor, start_time, end_time)
                
                return {
                    'time_range': {
                        'start': start_time.isoformat(),
                        'end': end_time.isoformat(),
                        'type': time_range.value
                    },
                    'api_statistics': api_stats,
                    'error_statistics': error_stats,
                    'user_statistics': user_stats,
                    'performance_statistics': performance_stats,
                    'security_statistics': security_stats,
                    'generated_at': datetime.utcnow().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Failed to get system overview: {e}")
            return {}

    def _get_api_statistics(self, cursor, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Get API statistics"""
        try:
            # Total API calls
            cursor.execute("""
                SELECT COUNT(*) FROM api_metrics 
                WHERE timestamp >= ? AND timestamp <= ?
            """, (start_time, end_time))
            total_calls = cursor.fetchone()[0]
            
            # Successful calls
            cursor.execute("""
                SELECT COUNT(*) FROM api_metrics 
                WHERE timestamp >= ? AND timestamp <= ? AND status_code < 400
            """, (start_time, end_time))
            successful_calls = cursor.fetchone()[0]
            
            # Failed calls
            failed_calls = total_calls - successful_calls
            
            # Average response time
            cursor.execute("""
                SELECT AVG(response_time) FROM api_metrics 
                WHERE timestamp >= ? AND timestamp <= ?
            """, (start_time, end_time))
            avg_response_time = cursor.fetchone()[0] or 0
            
            # Max response time
            cursor.execute("""
                SELECT MAX(response_time) FROM api_metrics 
                WHERE timestamp >= ? AND timestamp <= ?
            """, (start_time, end_time))
            max_response_time = cursor.fetchone()[0] or 0
            
            # Top endpoints
            cursor.execute("""
                SELECT endpoint, method, COUNT(*) as calls, AVG(response_time) as avg_time
                FROM api_metrics 
                WHERE timestamp >= ? AND timestamp <= ?
                GROUP BY endpoint, method
                ORDER BY calls DESC
                LIMIT 10
            """, (start_time, end_time))
            
            top_endpoints = []
            for row in cursor.fetchall():
                top_endpoints.append({
                    'endpoint': row[0],
                    'method': row[1],
                    'calls': row[2],
                    'avg_response_time': row[3] or 0
                })
            
            return {
                'total_calls': total_calls,
                'successful_calls': successful_calls,
                'failed_calls': failed_calls,
                'success_rate': (successful_calls / max(total_calls, 1)) * 100,
                'avg_response_time': avg_response_time,
                'max_response_time': max_response_time,
                'top_endpoints': top_endpoints
            }
            
        except Exception as e:
            logger.error(f"Failed to get API statistics: {e}")
            return {}

    def _get_error_statistics(self, cursor, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Get error statistics"""
        try:
            # Total errors
            cursor.execute("""
                SELECT COUNT(*) FROM error_events 
                WHERE timestamp >= ? AND timestamp <= ?
            """, (start_time, end_time))
            total_errors = cursor.fetchone()[0]
            
            # Errors by category
            cursor.execute("""
                SELECT category, COUNT(*) as count
                FROM error_events 
                WHERE timestamp >= ? AND timestamp <= ?
                GROUP BY category
                ORDER BY count DESC
            """, (start_time, end_time))
            
            errors_by_category = {}
            for row in cursor.fetchall():
                errors_by_category[row[0]] = row[1]
            
            # Errors by severity
            cursor.execute("""
                SELECT severity, COUNT(*) as count
                FROM error_events 
                WHERE timestamp >= ? AND timestamp <= ?
                GROUP BY severity
                ORDER BY count DESC
            """, (start_time, end_time))
            
            errors_by_severity = {}
            for row in cursor.fetchall():
                errors_by_severity[row[0]] = row[1]
            
            # Top error patterns
            cursor.execute("""
                SELECT pattern, category, severity, frequency
                FROM error_patterns 
                WHERE last_seen >= ? AND last_seen <= ?
                ORDER BY frequency DESC
                LIMIT 10
            """, (start_time, end_time))
            
            top_patterns = []
            for row in cursor.fetchall():
                top_patterns.append({
                    'pattern': row[0],
                    'category': row[1],
                    'severity': row[2],
                    'frequency': row[3]
                })
            
            return {
                'total_errors': total_errors,
                'errors_by_category': errors_by_category,
                'errors_by_severity': errors_by_severity,
                'top_patterns': top_patterns
            }
            
        except Exception as e:
            logger.error(f"Failed to get error statistics: {e}")
            return {}

    def _get_user_statistics(self, cursor, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Get user activity statistics"""
        try:
            # Active users
            cursor.execute("""
                SELECT COUNT(DISTINCT user_id) FROM audit_events 
                WHERE timestamp >= ? AND timestamp <= ? AND user_id IS NOT NULL
            """, (start_time, end_time))
            active_users = cursor.fetchone()[0]
            
            # User actions
            cursor.execute("""
                SELECT action, COUNT(*) as count
                FROM audit_events 
                WHERE timestamp >= ? AND timestamp <= ? AND user_id IS NOT NULL
                GROUP BY action
                ORDER BY count DESC
            """, (start_time, end_time))
            
            user_actions = {}
            for row in cursor.fetchall():
                user_actions[row[0]] = row[1]
            
            # Top active users
            cursor.execute("""
                SELECT user_id, COUNT(*) as actions
                FROM audit_events 
                WHERE timestamp >= ? AND timestamp <= ? AND user_id IS NOT NULL
                GROUP BY user_id
                ORDER BY actions DESC
                LIMIT 10
            """, (start_time, end_time))
            
            top_users = []
            for row in cursor.fetchall():
                top_users.append({
                    'user_id': row[0],
                    'actions': row[1]
                })
            
            # Login statistics
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_logins,
                    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_logins,
                    SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_logins
                FROM audit_events 
                WHERE timestamp >= ? AND timestamp <= ? AND action = 'login'
            """, (start_time, end_time))
            
            login_result = cursor.fetchone()
            login_stats = {
                'total_logins': login_result[0] or 0,
                'successful_logins': login_result[1] or 0,
                'failed_logins': login_result[2] or 0,
                'success_rate': (login_result[1] or 0) / max(login_result[0] or 1, 1) * 100
            }
            
            return {
                'active_users': active_users,
                'user_actions': user_actions,
                'top_users': top_users,
                'login_statistics': login_stats
            }
            
        except Exception as e:
            logger.error(f"Failed to get user statistics: {e}")
            return {}

    def _get_performance_statistics(self, cursor, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Get system performance statistics"""
        try:
            # System metrics
            cursor.execute("""
                SELECT 
                    AVG(cpu_percent) as avg_cpu,
                    MAX(cpu_percent) as max_cpu,
                    AVG(memory_percent) as avg_memory,
                    MAX(memory_percent) as max_memory,
                    AVG(disk_percent) as avg_disk,
                    MAX(disk_percent) as max_disk
                FROM system_metrics 
                WHERE timestamp >= ? AND timestamp <= ?
            """, (start_time, end_time))
            
            system_result = cursor.fetchone()
            system_metrics = {
                'avg_cpu_percent': system_result[0] or 0,
                'max_cpu_percent': system_result[1] or 0,
                'avg_memory_percent': system_result[2] or 0,
                'max_memory_percent': system_result[3] or 0,
                'avg_disk_percent': system_result[4] or 0,
                'max_disk_percent': system_result[5] or 0
            }
            
            # Database performance
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_queries,
                    AVG(execution_time) as avg_execution_time,
                    MAX(execution_time) as max_execution_time
                FROM database_metrics 
                WHERE timestamp >= ? AND timestamp <= ?
            """, (start_time, end_time))
            
            db_result = cursor.fetchone()
            database_metrics = {
                'total_queries': db_result[0] or 0,
                'avg_execution_time': db_result[1] or 0,
                'max_execution_time': db_result[2] or 0
            }
            
            # Performance trends
            cursor.execute("""
                SELECT 
                    DATE(timestamp) as date,
                    AVG(cpu_percent) as avg_cpu,
                    AVG(memory_percent) as avg_memory
                FROM system_metrics 
                WHERE timestamp >= ? AND timestamp <= ?
                GROUP BY DATE(timestamp)
                ORDER BY date
            """, (start_time, end_time))
            
            performance_trends = []
            for row in cursor.fetchall():
                performance_trends.append({
                    'date': row[0],
                    'avg_cpu': row[1] or 0,
                    'avg_memory': row[2] or 0
                })
            
            return {
                'system_metrics': system_metrics,
                'database_metrics': database_metrics,
                'performance_trends': performance_trends
            }
            
        except Exception as e:
            logger.error(f"Failed to get performance statistics: {e}")
            return {}

    def _get_security_statistics(self, cursor, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Get security statistics"""
        try:
            # Security events
            cursor.execute("""
                SELECT COUNT(*) FROM security_events 
                WHERE timestamp >= ? AND timestamp <= ?
            """, (start_time, end_time))
            total_security_events = cursor.fetchone()[0]
            
            # Security events by type
            cursor.execute("""
                SELECT event_type, COUNT(*) as count
                FROM security_events 
                WHERE timestamp >= ? AND timestamp <= ?
                GROUP BY event_type
                ORDER BY count DESC
            """, (start_time, end_time))
            
            security_by_type = {}
            for row in cursor.fetchall():
                security_by_type[row[0]] = row[1]
            
            # Security events by severity
            cursor.execute("""
                SELECT severity, COUNT(*) as count
                FROM security_events 
                WHERE timestamp >= ? AND timestamp <= ?
                GROUP BY severity
                ORDER BY count DESC
            """, (start_time, end_time))
            
            security_by_severity = {}
            for row in cursor.fetchall():
                security_by_severity[row[0]] = row[1]
            
            # High risk audit events
            cursor.execute("""
                SELECT COUNT(*) FROM audit_events 
                WHERE timestamp >= ? AND timestamp <= ? AND risk_score > 0.7
            """, (start_time, end_time))
            high_risk_events = cursor.fetchone()[0]
            
            return {
                'total_security_events': total_security_events,
                'security_by_type': security_by_type,
                'security_by_severity': security_by_severity,
                'high_risk_audit_events': high_risk_events
            }
            
        except Exception as e:
            logger.error(f"Failed to get security statistics: {e}")
            return {}

    def get_time_series_data(self, metric_name: str, time_range: TimeRange = TimeRange.DAY, 
                           interval: str = "hour") -> ChartData:
        """Get time series data for a specific metric"""
        try:
            end_time = datetime.utcnow()
            start_time = self._get_start_time(end_time, time_range)
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                if metric_name == "api_calls":
                    return self._get_api_calls_chart(cursor, start_time, end_time, interval)
                elif metric_name == "error_rate":
                    return self._get_error_rate_chart(cursor, start_time, end_time, interval)
                elif metric_name == "response_time":
                    return self._get_response_time_chart(cursor, start_time, end_time, interval)
                elif metric_name == "user_activity":
                    return self._get_user_activity_chart(cursor, start_time, end_time, interval)
                elif metric_name == "system_performance":
                    return self._get_system_performance_chart(cursor, start_time, end_time, interval)
                else:
                    return self._get_empty_chart(metric_name)
                    
        except Exception as e:
            logger.error(f"Failed to get time series data for {metric_name}: {e}")
            return self._get_empty_chart(metric_name)

    def _get_api_calls_chart(self, cursor, start_time: datetime, end_time: datetime, interval: str) -> ChartData:
        """Get API calls chart data"""
        try:
            if interval == "hour":
                time_format = "%Y-%m-%d %H:00:00"
            else:
                time_format = "%Y-%m-%d"
            
            cursor.execute(f"""
                SELECT 
                    strftime('{time_format}', timestamp) as time_bucket,
                    COUNT(*) as calls
                FROM api_metrics 
                WHERE timestamp >= ? AND timestamp <= ?
                GROUP BY time_bucket
                ORDER BY time_bucket
            """, (start_time, end_time))
            
            data = []
            for row in cursor.fetchall():
                data.append(MetricData(
                    timestamp=datetime.fromisoformat(row[0]),
                    value=float(row[1]),
                    label=row[0],
                    persian_label=row[0]
                ))
            
            return ChartData(
                title="API Calls Over Time",
                persian_title="درخواست‌های API در طول زمان",
                type="line",
                data=data,
                x_axis_label="Time",
                y_axis_label="Calls",
                persian_x_axis_label="زمان",
                persian_y_axis_label="تعداد درخواست"
            )
            
        except Exception as e:
            logger.error(f"Failed to get API calls chart: {e}")
            return self._get_empty_chart("api_calls")

    def _get_error_rate_chart(self, cursor, start_time: datetime, end_time: datetime, interval: str) -> ChartData:
        """Get error rate chart data"""
        try:
            if interval == "hour":
                time_format = "%Y-%m-%d %H:00:00"
            else:
                time_format = "%Y-%m-%d"
            
            cursor.execute(f"""
                SELECT 
                    strftime('{time_format}', timestamp) as time_bucket,
                    COUNT(*) as errors
                FROM error_events 
                WHERE timestamp >= ? AND timestamp <= ?
                GROUP BY time_bucket
                ORDER BY time_bucket
            """, (start_time, end_time))
            
            data = []
            for row in cursor.fetchall():
                data.append(MetricData(
                    timestamp=datetime.fromisoformat(row[0]),
                    value=float(row[1]),
                    label=row[0],
                    persian_label=row[0]
                ))
            
            return ChartData(
                title="Error Rate Over Time",
                persian_title="نرخ خطا در طول زمان",
                type="line",
                data=data,
                x_axis_label="Time",
                y_axis_label="Errors",
                persian_x_axis_label="زمان",
                persian_y_axis_label="تعداد خطا"
            )
            
        except Exception as e:
            logger.error(f"Failed to get error rate chart: {e}")
            return self._get_empty_chart("error_rate")

    def _get_response_time_chart(self, cursor, start_time: datetime, end_time: datetime, interval: str) -> ChartData:
        """Get response time chart data"""
        try:
            if interval == "hour":
                time_format = "%Y-%m-%d %H:00:00"
            else:
                time_format = "%Y-%m-%d"
            
            cursor.execute(f"""
                SELECT 
                    strftime('{time_format}', timestamp) as time_bucket,
                    AVG(response_time) as avg_response_time
                FROM api_metrics 
                WHERE timestamp >= ? AND timestamp <= ?
                GROUP BY time_bucket
                ORDER BY time_bucket
            """, (start_time, end_time))
            
            data = []
            for row in cursor.fetchall():
                data.append(MetricData(
                    timestamp=datetime.fromisoformat(row[0]),
                    value=float(row[1] or 0),
                    label=row[0],
                    persian_label=row[0]
                ))
            
            return ChartData(
                title="Average Response Time",
                persian_title="میانگین زمان پاسخ",
                type="line",
                data=data,
                x_axis_label="Time",
                y_axis_label="Response Time (ms)",
                persian_x_axis_label="زمان",
                persian_y_axis_label="زمان پاسخ (میلی‌ثانیه)"
            )
            
        except Exception as e:
            logger.error(f"Failed to get response time chart: {e}")
            return self._get_empty_chart("response_time")

    def _get_user_activity_chart(self, cursor, start_time: datetime, end_time: datetime, interval: str) -> ChartData:
        """Get user activity chart data"""
        try:
            if interval == "hour":
                time_format = "%Y-%m-%d %H:00:00"
            else:
                time_format = "%Y-%m-%d"
            
            cursor.execute(f"""
                SELECT 
                    strftime('{time_format}', timestamp) as time_bucket,
                    COUNT(DISTINCT user_id) as unique_users
                FROM audit_events 
                WHERE timestamp >= ? AND timestamp <= ? AND user_id IS NOT NULL
                GROUP BY time_bucket
                ORDER BY time_bucket
            """, (start_time, end_time))
            
            data = []
            for row in cursor.fetchall():
                data.append(MetricData(
                    timestamp=datetime.fromisoformat(row[0]),
                    value=float(row[1]),
                    label=row[0],
                    persian_label=row[0]
                ))
            
            return ChartData(
                title="Active Users Over Time",
                persian_title="کاربران فعال در طول زمان",
                type="line",
                data=data,
                x_axis_label="Time",
                y_axis_label="Active Users",
                persian_x_axis_label="زمان",
                persian_y_axis_label="کاربران فعال"
            )
            
        except Exception as e:
            logger.error(f"Failed to get user activity chart: {e}")
            return self._get_empty_chart("user_activity")

    def _get_system_performance_chart(self, cursor, start_time: datetime, end_time: datetime, interval: str) -> ChartData:
        """Get system performance chart data"""
        try:
            if interval == "hour":
                time_format = "%Y-%m-%d %H:00:00"
            else:
                time_format = "%Y-%m-%d"
            
            cursor.execute(f"""
                SELECT 
                    strftime('{time_format}', timestamp) as time_bucket,
                    AVG(cpu_percent) as avg_cpu,
                    AVG(memory_percent) as avg_memory
                FROM system_metrics 
                WHERE timestamp >= ? AND timestamp <= ?
                GROUP BY time_bucket
                ORDER BY time_bucket
            """, (start_time, end_time))
            
            data = []
            for row in cursor.fetchall():
                data.append(MetricData(
                    timestamp=datetime.fromisoformat(row[0]),
                    value=float(row[1] or 0),  # CPU usage
                    label=row[0],
                    persian_label=row[0]
                ))
            
            return ChartData(
                title="System Performance Over Time",
                persian_title="عملکرد سیستم در طول زمان",
                type="line",
                data=data,
                x_axis_label="Time",
                y_axis_label="CPU Usage (%)",
                persian_x_axis_label="زمان",
                persian_y_axis_label="استفاده از CPU (%)"
            )
            
        except Exception as e:
            logger.error(f"Failed to get system performance chart: {e}")
            return self._get_empty_chart("system_performance")

    def _get_empty_chart(self, metric_name: str) -> ChartData:
        """Get empty chart data"""
        return ChartData(
            title=f"{metric_name.replace('_', ' ').title()}",
            persian_title=self.persian_labels.get(metric_name, metric_name),
            type="line",
            data=[],
            x_axis_label="Time",
            y_axis_label="Value",
            persian_x_axis_label="زمان",
            persian_y_axis_label="مقدار"
        )

    def _get_start_time(self, end_time: datetime, time_range: TimeRange) -> datetime:
        """Get start time based on time range"""
        if time_range == TimeRange.HOUR:
            return end_time - timedelta(hours=1)
        elif time_range == TimeRange.DAY:
            return end_time - timedelta(days=1)
        elif time_range == TimeRange.WEEK:
            return end_time - timedelta(weeks=1)
        elif time_range == TimeRange.MONTH:
            return end_time - timedelta(days=30)
        elif time_range == TimeRange.YEAR:
            return end_time - timedelta(days=365)
        else:
            return end_time - timedelta(days=1)

    def get_top_metrics(self, time_range: TimeRange = TimeRange.DAY) -> Dict[str, Any]:
        """Get top metrics summary"""
        try:
            end_time = datetime.utcnow()
            start_time = self._get_start_time(end_time, time_range)
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Top endpoints by calls
                cursor.execute("""
                    SELECT endpoint, method, COUNT(*) as calls
                    FROM api_metrics 
                    WHERE timestamp >= ? AND timestamp <= ?
                    GROUP BY endpoint, method
                    ORDER BY calls DESC
                    LIMIT 5
                """, (start_time, end_time))
                
                top_endpoints = []
                for row in cursor.fetchall():
                    top_endpoints.append({
                        'endpoint': row[0],
                        'method': row[1],
                        'calls': row[2]
                    })
                
                # Top error categories
                cursor.execute("""
                    SELECT category, COUNT(*) as count
                    FROM error_events 
                    WHERE timestamp >= ? AND timestamp <= ?
                    GROUP BY category
                    ORDER BY count DESC
                    LIMIT 5
                """, (start_time, end_time))
                
                top_errors = []
                for row in cursor.fetchall():
                    top_errors.append({
                        'category': row[0],
                        'count': row[2]
                    })
                
                # Top users by activity
                cursor.execute("""
                    SELECT user_id, COUNT(*) as actions
                    FROM audit_events 
                    WHERE timestamp >= ? AND timestamp <= ? AND user_id IS NOT NULL
                    GROUP BY user_id
                    ORDER BY actions DESC
                    LIMIT 5
                """, (start_time, end_time))
                
                top_users = []
                for row in cursor.fetchall():
                    top_users.append({
                        'user_id': row[0],
                        'actions': row[1]
                    })
                
                return {
                    'top_endpoints': top_endpoints,
                    'top_errors': top_errors,
                    'top_users': top_users,
                    'time_range': {
                        'start': start_time.isoformat(),
                        'end': end_time.isoformat(),
                        'type': time_range.value
                    }
                }
                
        except Exception as e:
            logger.error(f"Failed to get top metrics: {e}")
            return {}

    def export_analytics_data(self, time_range: TimeRange = TimeRange.DAY, 
                            format: str = "json") -> Dict[str, Any]:
        """Export analytics data"""
        try:
            overview = self.get_system_overview(time_range)
            top_metrics = self.get_top_metrics(time_range)
            
            # Get time series data for key metrics
            api_calls_chart = self.get_time_series_data("api_calls", time_range)
            error_rate_chart = self.get_time_series_data("error_rate", time_range)
            response_time_chart = self.get_time_series_data("response_time", time_range)
            user_activity_chart = self.get_time_series_data("user_activity", time_range)
            
            export_data = {
                'export_info': {
                    'generated_at': datetime.utcnow().isoformat(),
                    'time_range': time_range.value,
                    'format': format
                },
                'overview': overview,
                'top_metrics': top_metrics,
                'charts': {
                    'api_calls': asdict(api_calls_chart),
                    'error_rate': asdict(error_rate_chart),
                    'response_time': asdict(response_time_chart),
                    'user_activity': asdict(user_activity_chart)
                }
            }
            
            if format == "json":
                return export_data
            else:
                # For other formats, you would implement conversion logic
                return export_data
                
        except Exception as e:
            logger.error(f"Failed to export analytics data: {e}")
            return {}

# Global analytics dashboard instance
analytics_dashboard = AnalyticsDashboard()

# Convenience functions
def get_system_overview(time_range: TimeRange = TimeRange.DAY):
    """Get system overview"""
    return analytics_dashboard.get_system_overview(time_range)

def get_time_series_data(metric_name: str, time_range: TimeRange = TimeRange.DAY):
    """Get time series data"""
    return analytics_dashboard.get_time_series_data(metric_name, time_range)

def export_analytics(time_range: TimeRange = TimeRange.DAY, format: str = "json"):
    """Export analytics data"""
    return analytics_dashboard.export_analytics_data(time_range, format)