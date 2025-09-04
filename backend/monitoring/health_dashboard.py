"""
Iranian Legal Archive - System Health Dashboard
Real-time system health monitoring and dashboard
"""

import asyncio
import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
import logging
from enum import Enum

logger = logging.getLogger(__name__)

class HealthStatus(Enum):
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    ERROR = "error"

@dataclass
class HealthCheck:
    name: str
    status: HealthStatus
    message: str
    persian_message: str
    last_check: datetime
    response_time: float
    details: Optional[Dict[str, Any]] = None

@dataclass
class SystemHealth:
    overall_status: HealthStatus
    checks: List[HealthCheck]
    timestamp: datetime
    uptime: str
    version: str
    environment: str

class HealthDashboard:
    def __init__(self, db_path: str = "monitoring.db"):
        self.db_path = db_path
        self.health_checks = {}
        self._register_default_checks()
        
        # Persian messages
        self.persian_messages = {
            'database': {
                'healthy': 'پایگاه داده در وضعیت مطلوب',
                'warning': 'مشکل جزئی در پایگاه داده',
                'critical': 'مشکل جدی در پایگاه داده',
                'error': 'خطا در اتصال به پایگاه داده'
            },
            'api': {
                'healthy': 'API در وضعیت مطلوب',
                'warning': 'مشکل جزئی در API',
                'critical': 'مشکل جدی در API',
                'error': 'خطا در API'
            },
            'scraping': {
                'healthy': 'سیستم جمع‌آوری در وضعیت مطلوب',
                'warning': 'مشکل جزئی در جمع‌آوری',
                'critical': 'مشکل جدی در جمع‌آوری',
                'error': 'خطا در سیستم جمع‌آوری'
            },
            'ai_service': {
                'healthy': 'سرویس هوش مصنوعی در وضعیت مطلوب',
                'warning': 'مشکل جزئی در سرویس هوش مصنوعی',
                'critical': 'مشکل جدی در سرویس هوش مصنوعی',
                'error': 'خطا در سرویس هوش مصنوعی'
            },
            'proxy': {
                'healthy': 'پروکسی‌ها در وضعیت مطلوب',
                'warning': 'مشکل جزئی در پروکسی‌ها',
                'critical': 'مشکل جدی در پروکسی‌ها',
                'error': 'خطا در پروکسی‌ها'
            },
            'storage': {
                'healthy': 'ذخیره‌سازی در وضعیت مطلوب',
                'warning': 'مشکل جزئی در ذخیره‌سازی',
                'critical': 'مشکل جدی در ذخیره‌سازی',
                'error': 'خطا در ذخیره‌سازی'
            },
            'network': {
                'healthy': 'شبکه در وضعیت مطلوب',
                'warning': 'مشکل جزئی در شبکه',
                'critical': 'مشکل جدی در شبکه',
                'error': 'خطا در شبکه'
            }
        }

    def _register_default_checks(self):
        """Register default health checks"""
        self.health_checks = {
            'database': self._check_database,
            'api': self._check_api,
            'scraping': self._check_scraping,
            'ai_service': self._check_ai_service,
            'proxy': self._check_proxy,
            'storage': self._check_storage,
            'network': self._check_network
        }

    async def run_health_checks(self) -> SystemHealth:
        """Run all health checks and return system health"""
        start_time = datetime.utcnow()
        checks = []
        
        # Run all health checks concurrently
        tasks = []
        for name, check_func in self.health_checks.items():
            task = asyncio.create_task(self._run_single_check(name, check_func))
            tasks.append(task)
        
        # Wait for all checks to complete
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for i, result in enumerate(results):
            check_name = list(self.health_checks.keys())[i]
            if isinstance(result, Exception):
                checks.append(HealthCheck(
                    name=check_name,
                    status=HealthStatus.ERROR,
                    message=f"Health check failed: {str(result)}",
                    persian_message=f"بررسی سلامت {check_name} ناموفق بود",
                    last_check=datetime.utcnow(),
                    response_time=0.0,
                    details={'error': str(result)}
                ))
            else:
                checks.append(result)
        
        # Determine overall status
        overall_status = self._determine_overall_status(checks)
        
        # Get system info
        uptime = self._get_system_uptime()
        version = self._get_system_version()
        environment = self._get_environment()
        
        return SystemHealth(
            overall_status=overall_status,
            checks=checks,
            timestamp=datetime.utcnow(),
            uptime=uptime,
            version=version,
            environment=environment
        )

    async def _run_single_check(self, name: str, check_func) -> HealthCheck:
        """Run a single health check"""
        start_time = datetime.utcnow()
        
        try:
            result = await check_func()
            response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            return HealthCheck(
                name=name,
                status=result.get('status', HealthStatus.HEALTHY),
                message=result.get('message', 'OK'),
                persian_message=result.get('persian_message', 'درست'),
                last_check=datetime.utcnow(),
                response_time=response_time,
                details=result.get('details', {})
            )
        except Exception as e:
            response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            return HealthCheck(
                name=name,
                status=HealthStatus.ERROR,
                message=f"Check failed: {str(e)}",
                persian_message=f"بررسی ناموفق: {str(e)}",
                last_check=datetime.utcnow(),
                response_time=response_time,
                details={'error': str(e)}
            )

    def _determine_overall_status(self, checks: List[HealthCheck]) -> HealthStatus:
        """Determine overall system status based on individual checks"""
        if not checks:
            return HealthStatus.ERROR
        
        # Check for critical issues
        if any(check.status == HealthStatus.CRITICAL for check in checks):
            return HealthStatus.CRITICAL
        
        # Check for errors
        if any(check.status == HealthStatus.ERROR for check in checks):
            return HealthStatus.ERROR
        
        # Check for warnings
        if any(check.status == HealthStatus.WARNING for check in checks):
            return HealthStatus.WARNING
        
        return HealthStatus.HEALTHY

    async def _check_database(self) -> Dict[str, Any]:
        """Check database health"""
        try:
            import time
            start_time = time.time()
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                
                # Check database size
                cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
                table_count = cursor.fetchone()[0]
                
                # Check for recent errors
                cursor.execute("""
                    SELECT COUNT(*) FROM error_events 
                    WHERE timestamp >= ? AND category = 'database'
                """, (datetime.utcnow() - timedelta(hours=1),))
                recent_errors = cursor.fetchone()[0]
                
                response_time = (time.time() - start_time) * 1000
                
                if recent_errors > 10:
                    return {
                        'status': HealthStatus.CRITICAL,
                        'message': f'High database error rate: {recent_errors} errors in last hour',
                        'persian_message': f'نرخ خطای بالا در پایگاه داده: {recent_errors} خطا در ساعت گذشته',
                        'details': {
                            'table_count': table_count,
                            'recent_errors': recent_errors,
                            'response_time': response_time
                        }
                    }
                elif recent_errors > 5:
                    return {
                        'status': HealthStatus.WARNING,
                        'message': f'Moderate database error rate: {recent_errors} errors in last hour',
                        'persian_message': f'نرخ خطای متوسط در پایگاه داده: {recent_errors} خطا در ساعت گذشته',
                        'details': {
                            'table_count': table_count,
                            'recent_errors': recent_errors,
                            'response_time': response_time
                        }
                    }
                else:
                    return {
                        'status': HealthStatus.HEALTHY,
                        'message': f'Database healthy with {table_count} tables',
                        'persian_message': f'پایگاه داده سالم با {table_count} جدول',
                        'details': {
                            'table_count': table_count,
                            'recent_errors': recent_errors,
                            'response_time': response_time
                        }
                    }
                    
        except Exception as e:
            return {
                'status': HealthStatus.ERROR,
                'message': f'Database connection failed: {str(e)}',
                'persian_message': f'اتصال به پایگاه داده ناموفق: {str(e)}',
                'details': {'error': str(e)}
            }

    async def _check_api(self) -> Dict[str, Any]:
        """Check API health"""
        try:
            # Check recent API performance
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Get API metrics from last hour
                cursor.execute("""
                    SELECT 
                        COUNT(*) as total_calls,
                        AVG(response_time) as avg_response_time,
                        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
                    FROM api_metrics 
                    WHERE timestamp >= ?
                """, (datetime.utcnow() - timedelta(hours=1),))
                
                result = cursor.fetchone()
                total_calls, avg_response_time, error_count = result
                
                if not total_calls:
                    return {
                        'status': HealthStatus.WARNING,
                        'message': 'No API calls in the last hour',
                        'persian_message': 'هیچ درخواست API در ساعت گذشته',
                        'details': {'total_calls': 0}
                    }
                
                error_rate = (error_count / total_calls) * 100 if total_calls > 0 else 0
                
                if error_rate > 10 or avg_response_time > 5000:
                    return {
                        'status': HealthStatus.CRITICAL,
                        'message': f'High API error rate: {error_rate:.1f}% or slow response: {avg_response_time:.1f}ms',
                        'persian_message': f'نرخ خطای بالا در API: {error_rate:.1f}% یا پاسخ کند: {avg_response_time:.1f}ms',
                        'details': {
                            'total_calls': total_calls,
                            'error_rate': error_rate,
                            'avg_response_time': avg_response_time
                        }
                    }
                elif error_rate > 5 or avg_response_time > 2000:
                    return {
                        'status': HealthStatus.WARNING,
                        'message': f'Moderate API issues: {error_rate:.1f}% error rate, {avg_response_time:.1f}ms response time',
                        'persian_message': f'مشکلات متوسط در API: {error_rate:.1f}% نرخ خطا، {avg_response_time:.1f}ms زمان پاسخ',
                        'details': {
                            'total_calls': total_calls,
                            'error_rate': error_rate,
                            'avg_response_time': avg_response_time
                        }
                    }
                else:
                    return {
                        'status': HealthStatus.HEALTHY,
                        'message': f'API healthy: {total_calls} calls, {error_rate:.1f}% error rate',
                        'persian_message': f'API سالم: {total_calls} درخواست، {error_rate:.1f}% نرخ خطا',
                        'details': {
                            'total_calls': total_calls,
                            'error_rate': error_rate,
                            'avg_response_time': avg_response_time
                        }
                    }
                    
        except Exception as e:
            return {
                'status': HealthStatus.ERROR,
                'message': f'API health check failed: {str(e)}',
                'persian_message': f'بررسی سلامت API ناموفق: {str(e)}',
                'details': {'error': str(e)}
            }

    async def _check_scraping(self) -> Dict[str, Any]:
        """Check scraping system health"""
        try:
            # Check recent scraping activity
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Get scraping errors from last hour
                cursor.execute("""
                    SELECT COUNT(*) FROM error_events 
                    WHERE timestamp >= ? AND category = 'scraping'
                """, (datetime.utcnow() - timedelta(hours=1),))
                
                scraping_errors = cursor.fetchone()[0]
                
                # Check proxy health
                cursor.execute("""
                    SELECT COUNT(*) FROM error_events 
                    WHERE timestamp >= ? AND category = 'proxy'
                """, (datetime.utcnow() - timedelta(hours=1),))
                
                proxy_errors = cursor.fetchone()[0]
                
                total_errors = scraping_errors + proxy_errors
                
                if total_errors > 20:
                    return {
                        'status': HealthStatus.CRITICAL,
                        'message': f'High scraping error rate: {total_errors} errors in last hour',
                        'persian_message': f'نرخ خطای بالا در جمع‌آوری: {total_errors} خطا در ساعت گذشته',
                        'details': {
                            'scraping_errors': scraping_errors,
                            'proxy_errors': proxy_errors,
                            'total_errors': total_errors
                        }
                    }
                elif total_errors > 10:
                    return {
                        'status': HealthStatus.WARNING,
                        'message': f'Moderate scraping issues: {total_errors} errors in last hour',
                        'persian_message': f'مشکلات متوسط در جمع‌آوری: {total_errors} خطا در ساعت گذشته',
                        'details': {
                            'scraping_errors': scraping_errors,
                            'proxy_errors': proxy_errors,
                            'total_errors': total_errors
                        }
                    }
                else:
                    return {
                        'status': HealthStatus.HEALTHY,
                        'message': f'Scraping system healthy: {total_errors} errors in last hour',
                        'persian_message': f'سیستم جمع‌آوری سالم: {total_errors} خطا در ساعت گذشته',
                        'details': {
                            'scraping_errors': scraping_errors,
                            'proxy_errors': proxy_errors,
                            'total_errors': total_errors
                        }
                    }
                    
        except Exception as e:
            return {
                'status': HealthStatus.ERROR,
                'message': f'Scraping health check failed: {str(e)}',
                'persian_message': f'بررسی سلامت جمع‌آوری ناموفق: {str(e)}',
                'details': {'error': str(e)}
            }

    async def _check_ai_service(self) -> Dict[str, Any]:
        """Check AI service health"""
        try:
            # Check recent AI service errors
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT COUNT(*) FROM error_events 
                    WHERE timestamp >= ? AND category = 'ai_service'
                """, (datetime.utcnow() - timedelta(hours=1),))
                
                ai_errors = cursor.fetchone()[0]
                
                if ai_errors > 15:
                    return {
                        'status': HealthStatus.CRITICAL,
                        'message': f'High AI service error rate: {ai_errors} errors in last hour',
                        'persian_message': f'نرخ خطای بالا در سرویس هوش مصنوعی: {ai_errors} خطا در ساعت گذشته',
                        'details': {'ai_errors': ai_errors}
                    }
                elif ai_errors > 8:
                    return {
                        'status': HealthStatus.WARNING,
                        'message': f'Moderate AI service issues: {ai_errors} errors in last hour',
                        'persian_message': f'مشکلات متوسط در سرویس هوش مصنوعی: {ai_errors} خطا در ساعت گذشته',
                        'details': {'ai_errors': ai_errors}
                    }
                else:
                    return {
                        'status': HealthStatus.HEALTHY,
                        'message': f'AI service healthy: {ai_errors} errors in last hour',
                        'persian_message': f'سرویس هوش مصنوعی سالم: {ai_errors} خطا در ساعت گذشته',
                        'details': {'ai_errors': ai_errors}
                    }
                    
        except Exception as e:
            return {
                'status': HealthStatus.ERROR,
                'message': f'AI service health check failed: {str(e)}',
                'persian_message': f'بررسی سلامت سرویس هوش مصنوعی ناموفق: {str(e)}',
                'details': {'error': str(e)}
            }

    async def _check_proxy(self) -> Dict[str, Any]:
        """Check proxy health"""
        try:
            # Check recent proxy errors
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT COUNT(*) FROM error_events 
                    WHERE timestamp >= ? AND category = 'proxy'
                """, (datetime.utcnow() - timedelta(hours=1),))
                
                proxy_errors = cursor.fetchone()[0]
                
                if proxy_errors > 25:
                    return {
                        'status': HealthStatus.CRITICAL,
                        'message': f'High proxy error rate: {proxy_errors} errors in last hour',
                        'persian_message': f'نرخ خطای بالا در پروکسی‌ها: {proxy_errors} خطا در ساعت گذشته',
                        'details': {'proxy_errors': proxy_errors}
                    }
                elif proxy_errors > 15:
                    return {
                        'status': HealthStatus.WARNING,
                        'message': f'Moderate proxy issues: {proxy_errors} errors in last hour',
                        'persian_message': f'مشکلات متوسط در پروکسی‌ها: {proxy_errors} خطا در ساعت گذشته',
                        'details': {'proxy_errors': proxy_errors}
                    }
                else:
                    return {
                        'status': HealthStatus.HEALTHY,
                        'message': f'Proxy system healthy: {proxy_errors} errors in last hour',
                        'persian_message': f'سیستم پروکسی سالم: {proxy_errors} خطا در ساعت گذشته',
                        'details': {'proxy_errors': proxy_errors}
                    }
                    
        except Exception as e:
            return {
                'status': HealthStatus.ERROR,
                'message': f'Proxy health check failed: {str(e)}',
                'persian_message': f'بررسی سلامت پروکسی ناموفق: {str(e)}',
                'details': {'error': str(e)}
            }

    async def _check_storage(self) -> Dict[str, Any]:
        """Check storage health"""
        try:
            import os
            import shutil
            
            # Check disk space
            total, used, free = shutil.disk_usage("/")
            disk_percent = (used / total) * 100
            
            # Check if logs directory exists and is writable
            logs_dir = "logs"
            if not os.path.exists(logs_dir):
                os.makedirs(logs_dir, exist_ok=True)
            
            # Test write access
            test_file = os.path.join(logs_dir, "health_test.tmp")
            try:
                with open(test_file, "w") as f:
                    f.write("test")
                os.remove(test_file)
                write_access = True
            except:
                write_access = False
            
            if disk_percent > 95:
                return {
                    'status': HealthStatus.CRITICAL,
                    'message': f'Critical disk space: {disk_percent:.1f}% used',
                    'persian_message': f'فضای دیسک بحرانی: {disk_percent:.1f}% استفاده شده',
                    'details': {
                        'disk_percent': disk_percent,
                        'free_gb': free // (1024**3),
                        'write_access': write_access
                    }
                }
            elif disk_percent > 85:
                return {
                    'status': HealthStatus.WARNING,
                    'message': f'Low disk space: {disk_percent:.1f}% used',
                    'persian_message': f'فضای دیسک کم: {disk_percent:.1f}% استفاده شده',
                    'details': {
                        'disk_percent': disk_percent,
                        'free_gb': free // (1024**3),
                        'write_access': write_access
                    }
                }
            elif not write_access:
                return {
                    'status': HealthStatus.WARNING,
                    'message': 'Storage write access issues',
                    'persian_message': 'مشکل در دسترسی نوشتن به ذخیره‌سازی',
                    'details': {
                        'disk_percent': disk_percent,
                        'free_gb': free // (1024**3),
                        'write_access': write_access
                    }
                }
            else:
                return {
                    'status': HealthStatus.HEALTHY,
                    'message': f'Storage healthy: {disk_percent:.1f}% used, {free // (1024**3)}GB free',
                    'persian_message': f'ذخیره‌سازی سالم: {disk_percent:.1f}% استفاده شده، {free // (1024**3)}GB آزاد',
                    'details': {
                        'disk_percent': disk_percent,
                        'free_gb': free // (1024**3),
                        'write_access': write_access
                    }
                }
                
        except Exception as e:
            return {
                'status': HealthStatus.ERROR,
                'message': f'Storage health check failed: {str(e)}',
                'persian_message': f'بررسی سلامت ذخیره‌سازی ناموفق: {str(e)}',
                'details': {'error': str(e)}
            }

    async def _check_network(self) -> Dict[str, Any]:
        """Check network health"""
        try:
            import socket
            import time
            
            # Test DNS resolution
            start_time = time.time()
            try:
                socket.gethostbyname("google.com")
                dns_time = (time.time() - start_time) * 1000
                dns_working = True
            except:
                dns_time = 0
                dns_working = False
            
            # Test local connectivity
            start_time = time.time()
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(5)
                result = sock.connect_ex(("127.0.0.1", 80))
                sock.close()
                local_connectivity = result == 0
                local_time = (time.time() - start_time) * 1000
            except:
                local_connectivity = False
                local_time = 0
            
            if not dns_working:
                return {
                    'status': HealthStatus.CRITICAL,
                    'message': 'DNS resolution failed',
                    'persian_message': 'حل DNS ناموفق',
                    'details': {
                        'dns_working': dns_working,
                        'local_connectivity': local_connectivity,
                        'dns_time': dns_time,
                        'local_time': local_time
                    }
                }
            elif not local_connectivity:
                return {
                    'status': HealthStatus.WARNING,
                    'message': 'Local connectivity issues',
                    'persian_message': 'مشکل در اتصال محلی',
                    'details': {
                        'dns_working': dns_working,
                        'local_connectivity': local_connectivity,
                        'dns_time': dns_time,
                        'local_time': local_time
                    }
                }
            else:
                return {
                    'status': HealthStatus.HEALTHY,
                    'message': f'Network healthy: DNS {dns_time:.1f}ms, Local {local_time:.1f}ms',
                    'persian_message': f'شبکه سالم: DNS {dns_time:.1f}ms، محلی {local_time:.1f}ms',
                    'details': {
                        'dns_working': dns_working,
                        'local_connectivity': local_connectivity,
                        'dns_time': dns_time,
                        'local_time': local_time
                    }
                }
                
        except Exception as e:
            return {
                'status': HealthStatus.ERROR,
                'message': f'Network health check failed: {str(e)}',
                'persian_message': f'بررسی سلامت شبکه ناموفق: {str(e)}',
                'details': {'error': str(e)}
            }

    def _get_system_uptime(self) -> str:
        """Get system uptime"""
        try:
            import psutil
            uptime = time.time() - psutil.boot_time()
            days = int(uptime // 86400)
            hours = int((uptime % 86400) // 3600)
            minutes = int((uptime % 3600) // 60)
            
            if days > 0:
                return f"{days} روز, {hours} ساعت, {minutes} دقیقه"
            elif hours > 0:
                return f"{hours} ساعت, {minutes} دقیقه"
            else:
                return f"{minutes} دقیقه"
        except:
            return "نامشخص"

    def _get_system_version(self) -> str:
        """Get system version"""
        try:
            import sys
            return f"Python {sys.version.split()[0]}"
        except:
            return "نامشخص"

    def _get_environment(self) -> str:
        """Get environment"""
        import os
        return os.getenv("ENVIRONMENT", "development")

    def get_health_history(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get health check history"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # This would require a health_history table
                # For now, return empty list
                return []
                
        except Exception as e:
            logger.error(f"Failed to get health history: {e}")
            return []

    def get_health_summary(self) -> Dict[str, Any]:
        """Get health summary statistics"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Get error counts by category in last 24 hours
                cursor.execute("""
                    SELECT category, COUNT(*) as count
                    FROM error_events 
                    WHERE timestamp >= ?
                    GROUP BY category
                    ORDER BY count DESC
                """, (datetime.utcnow() - timedelta(hours=24),))
                
                error_summary = {}
                for row in cursor.fetchall():
                    error_summary[row[0]] = row[1]
                
                # Get performance metrics
                cursor.execute("""
                    SELECT 
                        AVG(CASE WHEN metric_name = 'api_response_time' THEN value END) as avg_api_time,
                        AVG(CASE WHEN metric_name = 'database_query_time' THEN value END) as avg_db_time
                    FROM performance_metrics 
                    WHERE timestamp >= ?
                """, (datetime.utcnow() - timedelta(hours=24),))
                
                perf_result = cursor.fetchone()
                avg_api_time = perf_result[0] or 0
                avg_db_time = perf_result[1] or 0
                
                return {
                    'error_summary': error_summary,
                    'performance_summary': {
                        'avg_api_response_time': avg_api_time,
                        'avg_database_query_time': avg_db_time
                    },
                    'last_updated': datetime.utcnow().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Failed to get health summary: {e}")
            return {}

# Global health dashboard instance
health_dashboard = HealthDashboard()

# Convenience function
async def get_system_health() -> SystemHealth:
    """Get current system health"""
    return await health_dashboard.run_health_checks()