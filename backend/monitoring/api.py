"""
Iranian Legal Archive - Monitoring API
FastAPI endpoints for monitoring and analytics
"""

from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from enum import Enum
import logging

from .error_tracking import error_tracker, ErrorSeverity, ErrorCategory
from .performance_monitor import performance_monitor
from .health_dashboard import health_dashboard, HealthStatus
from .audit_logger import audit_logger, AuditAction, AuditSeverity
from .alerting_system import alerting_system, AlertSeverity, AlertStatus
from .analytics_dashboard import analytics_dashboard, TimeRange

logger = logging.getLogger(__name__)

# Create router
monitoring_router = APIRouter(prefix="/monitoring", tags=["monitoring"])

# Dependency for authentication (simplified)
async def get_current_user():
    """Get current user for audit logging"""
    # In a real system, this would validate JWT token
    return {"user_id": "system", "role": "admin"}

# Health Check Endpoints
@monitoring_router.get("/health")
async def get_health_status():
    """Get system health status"""
    try:
        health = await health_dashboard.run_health_checks()
        return {
            "status": health.overall_status.value,
            "checks": [
                {
                    "name": check.name,
                    "status": check.status.value,
                    "message": check.message,
                    "persian_message": check.persian_message,
                    "last_check": check.last_check.isoformat(),
                    "response_time": check.response_time
                }
                for check in health.checks
            ],
            "uptime": health.uptime,
            "version": health.version,
            "environment": health.environment,
            "timestamp": health.timestamp.isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get health status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get health status")

@monitoring_router.get("/health/summary")
async def get_health_summary():
    """Get health summary statistics"""
    try:
        summary = health_dashboard.get_health_summary()
        return summary
    except Exception as e:
        logger.error(f"Failed to get health summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to get health summary")

# Error Tracking Endpoints
@monitoring_router.get("/errors")
async def get_errors(
    limit: int = Query(50, ge=1, le=1000),
    severity: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    resolved: Optional[bool] = Query(None)
):
    """Get error events"""
    try:
        errors = error_tracker.get_recent_errors(limit)
        
        # Apply filters
        if severity:
            errors = [e for e in errors if e['severity'] == severity]
        if category:
            errors = [e for e in errors if e['category'] == category]
        if resolved is not None:
            errors = [e for e in errors if e['resolved'] == resolved]
        
        return {
            "errors": errors,
            "count": len(errors),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get errors: {e}")
        raise HTTPException(status_code=500, detail="Failed to get errors")

@monitoring_router.get("/errors/statistics")
async def get_error_statistics(days: int = Query(7, ge=1, le=365)):
    """Get error statistics"""
    try:
        stats = error_tracker.get_error_statistics(days)
        return stats
    except Exception as e:
        logger.error(f"Failed to get error statistics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get error statistics")

@monitoring_router.post("/errors/{error_id}/resolve")
async def resolve_error(
    error_id: str,
    resolved_by: str = Query(...),
    resolution_notes: str = Query("")
):
    """Resolve an error"""
    try:
        success = error_tracker.resolve_error(error_id, resolved_by, resolution_notes)
        if success:
            return {"message": "Error resolved successfully", "error_id": error_id}
        else:
            raise HTTPException(status_code=404, detail="Error not found")
    except Exception as e:
        logger.error(f"Failed to resolve error: {e}")
        raise HTTPException(status_code=500, detail="Failed to resolve error")

# Performance Monitoring Endpoints
@monitoring_router.get("/performance")
async def get_performance_summary(hours: int = Query(24, ge=1, le=168)):
    """Get performance summary"""
    try:
        summary = performance_monitor.get_performance_summary(hours)
        return summary
    except Exception as e:
        logger.error(f"Failed to get performance summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to get performance summary")

@monitoring_router.get("/performance/system-health")
async def get_system_health():
    """Get current system health"""
    try:
        health = performance_monitor.get_system_health()
        return health
    except Exception as e:
        logger.error(f"Failed to get system health: {e}")
        raise HTTPException(status_code=500, detail="Failed to get system health")

@monitoring_router.get("/performance/metrics/{metric_name}")
async def get_performance_metrics(
    metric_name: str,
    hours: int = Query(24, ge=1, le=168)
):
    """Get performance metrics for a specific metric"""
    try:
        metrics = performance_monitor.get_performance_metrics(metric_name, hours)
        return {
            "metric_name": metric_name,
            "metrics": metrics,
            "hours": hours,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get performance metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get performance metrics")

# Audit Logging Endpoints
@monitoring_router.get("/audit/logs")
async def get_audit_logs(
    user_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000)
):
    """Get audit logs"""
    try:
        audit_action = None
        if action:
            try:
                audit_action = AuditAction(action)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid action")
        
        logs = audit_logger.get_audit_logs(
            user_id=user_id,
            action=audit_action,
            limit=limit
        )
        
        return {
            "logs": logs,
            "count": len(logs),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get audit logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to get audit logs")

@monitoring_router.get("/audit/statistics")
async def get_audit_statistics(days: int = Query(7, ge=1, le=365)):
    """Get audit statistics"""
    try:
        stats = audit_logger.get_audit_statistics(days)
        return stats
    except Exception as e:
        logger.error(f"Failed to get audit statistics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get audit statistics")

@monitoring_router.get("/audit/security-events")
async def get_security_events(limit: int = Query(50, ge=1, le=1000)):
    """Get security events"""
    try:
        events = audit_logger.get_security_events(limit)
        return {
            "events": events,
            "count": len(events),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get security events: {e}")
        raise HTTPException(status_code=500, detail="Failed to get security events")

# Alerting Endpoints
@monitoring_router.get("/alerts")
async def get_alerts(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=1000)
):
    """Get alerts"""
    try:
        alert_status = None
        if status:
            try:
                alert_status = AlertStatus(status)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid status")
        
        alert_severity = None
        if severity:
            try:
                alert_severity = AlertSeverity(severity)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid severity")
        
        alerts = alerting_system.get_alerts(
            status=alert_status,
            severity=alert_severity,
            limit=limit
        )
        
        return {
            "alerts": alerts,
            "count": len(alerts),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get alerts: {e}")
        raise HTTPException(status_code=500, detail="Failed to get alerts")

@monitoring_router.get("/alerts/statistics")
async def get_alert_statistics(days: int = Query(7, ge=1, le=365)):
    """Get alert statistics"""
    try:
        stats = alerting_system.get_alert_statistics(days)
        return stats
    except Exception as e:
        logger.error(f"Failed to get alert statistics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get alert statistics")

@monitoring_router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    user: dict = Depends(get_current_user)
):
    """Acknowledge an alert"""
    try:
        success = alerting_system.acknowledge_alert(alert_id, user["user_id"])
        if success:
            return {"message": "Alert acknowledged successfully", "alert_id": alert_id}
        else:
            raise HTTPException(status_code=404, detail="Alert not found")
    except Exception as e:
        logger.error(f"Failed to acknowledge alert: {e}")
        raise HTTPException(status_code=500, detail="Failed to acknowledge alert")

@monitoring_router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    user: dict = Depends(get_current_user)
):
    """Resolve an alert"""
    try:
        success = alerting_system.resolve_alert(alert_id, user["user_id"])
        if success:
            return {"message": "Alert resolved successfully", "alert_id": alert_id}
        else:
            raise HTTPException(status_code=404, detail="Alert not found")
    except Exception as e:
        logger.error(f"Failed to resolve alert: {e}")
        raise HTTPException(status_code=500, detail="Failed to resolve alert")

@monitoring_router.post("/alerts/check")
async def check_alerts(background_tasks: BackgroundTasks):
    """Manually trigger alert checks"""
    try:
        background_tasks.add_task(alerting_system.check_alerts)
        return {"message": "Alert check triggered"}
    except Exception as e:
        logger.error(f"Failed to trigger alert check: {e}")
        raise HTTPException(status_code=500, detail="Failed to trigger alert check")

# Analytics Endpoints
@monitoring_router.get("/analytics/overview")
async def get_analytics_overview(
    time_range: str = Query("day", regex="^(hour|day|week|month|year)$")
):
    """Get analytics overview"""
    try:
        time_range_enum = TimeRange(time_range)
        overview = analytics_dashboard.get_system_overview(time_range_enum)
        return overview
    except Exception as e:
        logger.error(f"Failed to get analytics overview: {e}")
        raise HTTPException(status_code=500, detail="Failed to get analytics overview")

@monitoring_router.get("/analytics/charts/{metric_name}")
async def get_analytics_chart(
    metric_name: str,
    time_range: str = Query("day", regex="^(hour|day|week|month|year)$"),
    interval: str = Query("hour", regex="^(hour|day)$")
):
    """Get analytics chart data"""
    try:
        time_range_enum = TimeRange(time_range)
        chart_data = analytics_dashboard.get_time_series_data(metric_name, time_range_enum, interval)
        return chart_data
    except Exception as e:
        logger.error(f"Failed to get analytics chart: {e}")
        raise HTTPException(status_code=500, detail="Failed to get analytics chart")

@monitoring_router.get("/analytics/top-metrics")
async def get_top_metrics(
    time_range: str = Query("day", regex="^(hour|day|week|month|year)$")
):
    """Get top metrics"""
    try:
        time_range_enum = TimeRange(time_range)
        top_metrics = analytics_dashboard.get_top_metrics(time_range_enum)
        return top_metrics
    except Exception as e:
        logger.error(f"Failed to get top metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get top metrics")

@monitoring_router.get("/analytics/export")
async def export_analytics(
    time_range: str = Query("day", regex="^(hour|day|week|month|year)$"),
    format: str = Query("json", regex="^(json|csv|pdf)$")
):
    """Export analytics data"""
    try:
        time_range_enum = TimeRange(time_range)
        export_data = analytics_dashboard.export_analytics_data(time_range_enum, format)
        return export_data
    except Exception as e:
        logger.error(f"Failed to export analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to export analytics")

# System Management Endpoints
@monitoring_router.post("/system/cleanup")
async def cleanup_monitoring_data(
    days: int = Query(30, ge=1, le=365),
    user: dict = Depends(get_current_user)
):
    """Clean up old monitoring data"""
    try:
        # Log the cleanup action
        audit_logger.log_event(
            AuditAction.SYSTEM_MAINTENANCE,
            "monitoring",
            user_id=user["user_id"],
            message=f"Cleanup monitoring data older than {days} days",
            details={"days": days}
        )
        
        # Perform cleanup
        error_tracker.cleanup_old_data(days)
        performance_monitor.cleanup_old_data(days)
        audit_logger.cleanup_old_data(days)
        alerting_system.cleanup_old_alerts(days)
        
        return {
            "message": f"Cleaned up monitoring data older than {days} days",
            "days": days,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to cleanup monitoring data: {e}")
        raise HTTPException(status_code=500, detail="Failed to cleanup monitoring data")

@monitoring_router.get("/system/status")
async def get_system_status():
    """Get overall system status"""
    try:
        # Get health status
        health = await health_dashboard.run_health_checks()
        
        # Get performance summary
        performance = performance_monitor.get_performance_summary(1)
        
        # Get recent errors
        recent_errors = error_tracker.get_recent_errors(10)
        
        # Get active alerts
        active_alerts = alerting_system.get_alerts(status=AlertStatus.PENDING, limit=10)
        
        return {
            "overall_status": health.overall_status.value,
            "health_checks": len([c for c in health.checks if c.status.value == "healthy"]),
            "total_checks": len(health.checks),
            "recent_errors": len(recent_errors),
            "active_alerts": len(active_alerts),
            "performance": {
                "api_calls": performance.get("api_stats", {}).get("total_calls", 0),
                "avg_response_time": performance.get("api_stats", {}).get("avg_response_time", 0),
                "error_rate": performance.get("api_stats", {}).get("error_rate", 0)
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get system status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get system status")

# Dashboard Data Endpoint
@monitoring_router.get("/dashboard")
async def get_dashboard_data():
    """Get comprehensive dashboard data"""
    try:
        # Get all monitoring data
        health = await health_dashboard.run_health_checks()
        performance = performance_monitor.get_performance_summary(24)
        recent_errors = error_tracker.get_recent_errors(20)
        active_alerts = alerting_system.get_alerts(status=AlertStatus.PENDING, limit=10)
        analytics = analytics_dashboard.get_system_overview(TimeRange.DAY)
        
        return {
            "health": {
                "overall_status": health.overall_status.value,
                "checks": [
                    {
                        "name": check.name,
                        "status": check.status.value,
                        "message": check.message,
                        "persian_message": check.persian_message
                    }
                    for check in health.checks
                ]
            },
            "performance": performance,
            "recent_errors": recent_errors,
            "active_alerts": active_alerts,
            "analytics": analytics,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get dashboard data: {e}")
        raise HTTPException(status_code=500, detail="Failed to get dashboard data")

# Error Tracking Endpoint for External Services
@monitoring_router.post("/errors/track")
async def track_error(
    severity: str,
    category: str,
    message: str,
    persian_message: Optional[str] = None,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
):
    """Track an error event"""
    try:
        # Validate severity and category
        try:
            error_severity = ErrorSeverity(severity)
            error_category = ErrorCategory(category)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid severity or category: {e}")
        
        error_id = error_tracker.track_error(
            severity=error_severity,
            category=error_category,
            message=message,
            persian_message=persian_message,
            user_id=user_id,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details
        )
        
        return {
            "error_id": error_id,
            "message": "Error tracked successfully",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to track error: {e}")
        raise HTTPException(status_code=500, detail="Failed to track error")

# Performance Tracking Endpoint
@monitoring_router.post("/performance/track")
async def track_performance_metric(
    metric_name: str,
    value: float,
    unit: Optional[str] = None,
    context: Optional[str] = None,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None
):
    """Track a performance metric"""
    try:
        performance_monitor.track_metric(
            metric_name=metric_name,
            value=value,
            unit=unit,
            context=context,
            user_id=user_id,
            session_id=session_id
        )
        
        return {
            "message": "Performance metric tracked successfully",
            "metric_name": metric_name,
            "value": value,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to track performance metric: {e}")
        raise HTTPException(status_code=500, detail="Failed to track performance metric")

# Audit Logging Endpoint
@monitoring_router.post("/audit/log")
async def log_audit_event(
    action: str,
    resource_type: str,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    resource_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    success: bool = True,
    message: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
):
    """Log an audit event"""
    try:
        # Validate action
        try:
            audit_action = AuditAction(action)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid action: {action}")
        
        event_id = audit_logger.log_event(
            action=audit_action,
            resource_type=resource_type,
            user_id=user_id,
            session_id=session_id,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            message=message,
            details=details
        )
        
        return {
            "event_id": event_id,
            "message": "Audit event logged successfully",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to log audit event: {e}")
        raise HTTPException(status_code=500, detail="Failed to log audit event")