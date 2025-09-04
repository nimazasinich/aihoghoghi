/**
 * Admin Dashboard - Command Center for Legal API Platform
 * Provides comprehensive system monitoring, user management, and analytics
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  Shield, 
  Activity, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Server,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react';

interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  totalDocuments: number;
  processedToday: number;
  systemUptime: string;
  responseTime: number;
  errorRate: number;
  securityThreats: number;
}

interface SecurityStatus {
  rateLimiting: boolean;
  threatDetection: boolean;
  auditLogging: boolean;
  apiKeyManagement: boolean;
  blockedIPs: number;
  activeAPIKeys: number;
}

interface RecentActivity {
  id: string;
  type: 'user_login' | 'document_upload' | 'search_query' | 'security_alert' | 'system_error';
  user: string;
  description: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalUsers: 0,
    activeUsers: 0,
    totalDocuments: 0,
    processedToday: 0,
    systemUptime: '0d 0h 0m',
    responseTime: 0,
    errorRate: 0,
    securityThreats: 0
  });

  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>({
    rateLimiting: false,
    threatDetection: false,
    auditLogging: false,
    apiKeyManagement: false,
    blockedIPs: 0,
    activeAPIKeys: 0
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch system metrics
      const metricsResponse = await fetch('/api/admin/metrics');
      const metricsData = await metricsResponse.json();
      setMetrics(metricsData);

      // Fetch security status
      const securityResponse = await fetch('/api/security/status');
      const securityData = await securityResponse.json();
      setSecurityStatus(securityData);

      // Fetch recent activity
      const activityResponse = await fetch('/api/admin/activity');
      const activityData = await activityResponse.json();
      setRecentActivity(activityData);

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_login': return <Users className="w-4 h-4" />;
      case 'document_upload': return <Database className="w-4 h-4" />;
      case 'search_query': return <BarChart3 className="w-4 h-4" />;
      case 'security_alert': return <Shield className="w-4 h-4" />;
      case 'system_error': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">در حال بارگذاری داشبورد...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">داشبورد مدیریت</h1>
              <p className="text-gray-600 mt-1">مرکز کنترل سیستم حقوقی</p>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse">
              <button
                onClick={fetchDashboardData}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4 ml-2" />
                بروزرسانی
              </button>
              <div className="text-sm text-gray-500">
                آخرین بروزرسانی: {lastUpdated.toLocaleTimeString('fa-IR')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">کل کاربران</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalUsers.toLocaleString('fa-IR')}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">{metrics.activeUsers}</span>
              <span className="text-gray-500 mr-2">کاربر فعال</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Database className="w-6 h-6 text-green-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">کل اسناد</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalDocuments.toLocaleString('fa-IR')}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-blue-600 font-medium">{metrics.processedToday}</span>
              <span className="text-gray-500 mr-2">پردازش شده امروز</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Server className="w-6 h-6 text-purple-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">زمان پاسخ</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.responseTime}ms</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">{metrics.systemUptime}</span>
              <span className="text-gray-500 mr-2">آپتایم سیستم</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">تهدیدات امنیتی</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.securityThreats}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-red-600 font-medium">{metrics.errorRate}%</span>
              <span className="text-gray-500 mr-2">نرخ خطا</span>
            </div>
          </div>
        </div>

        {/* Security Status */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">وضعیت امنیتی</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">سیستم‌های امنیتی</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">محدودیت نرخ</span>
                    {securityStatus.rateLimiting ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">تشخیص تهدید</span>
                    {securityStatus.threatDetection ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">ثبت فعالیت</span>
                    {securityStatus.auditLogging ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">مدیریت کلید API</span>
                    {securityStatus.apiKeyManagement ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">آمار امنیتی</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">آی‌پی‌های مسدود</span>
                    <span className="text-sm font-medium text-red-600">{securityStatus.blockedIPs}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">کلیدهای API فعال</span>
                    <span className="text-sm font-medium text-green-600">{securityStatus.activeAPIKeys}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">اقدامات سریع</h3>
                <div className="space-y-2">
                  <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                    مشاهده تهدیدات
                  </button>
                  <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                    مدیریت کلیدها
                  </button>
                  <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
                    گزارش‌های امنیتی
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">فعالیت‌های اخیر</h2>
              <button className="text-sm text-blue-600 hover:text-blue-700">
                مشاهده همه
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4 space-x-reverse">
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.description}
                      </p>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(activity.severity)}`}>
                          {activity.severity}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(activity.timestamp).toLocaleString('fa-IR')}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      کاربر: {activity.user}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;