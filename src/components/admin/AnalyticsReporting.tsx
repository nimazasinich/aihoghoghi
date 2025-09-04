/**
 * Analytics & Reporting Component for Admin Dashboard
 * Provides comprehensive analytics, custom reports, and data export functionality
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  FileText, 
  Search, 
  Download,
  Calendar,
  Filter,
  RefreshCw,
  Eye,
  Share2,
  Settings,
  PieChart,
  LineChart,
  Activity
} from 'lucide-react';

interface AnalyticsData {
  users: {
    total: number;
    active: number;
    new: number;
    growth: number;
  };
  documents: {
    total: number;
    processed: number;
    pending: number;
    growth: number;
  };
  searches: {
    total: number;
    today: number;
    popular: Array<{ term: string; count: number }>;
    growth: number;
  };
  performance: {
    avgResponseTime: number;
    uptime: number;
    errorRate: number;
    throughput: number;
  };
  trends: Array<{
    date: string;
    users: number;
    documents: number;
    searches: number;
  }>;
}

interface CustomReport {
  id: string;
  name: string;
  description: string;
  metrics: string[];
  filters: any;
  schedule: string;
  lastGenerated: string;
  status: 'active' | 'inactive';
}

const AnalyticsReporting: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [customReports, setCustomReports] = useState<CustomReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('7d');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['users', 'documents', 'searches']);

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/analytics?range=${dateRange}`);
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch custom reports
  const fetchCustomReports = async () => {
    try {
      const response = await fetch('/api/admin/reports');
      const data = await response.json();
      setCustomReports(data);
    } catch (error) {
      console.error('Failed to fetch custom reports:', error);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
    fetchCustomReports();
  }, [dateRange]);

  const tabs = [
    { id: 'overview', name: 'نمای کلی', icon: BarChart3 },
    { id: 'users', name: 'کاربران', icon: Users },
    { id: 'documents', name: 'اسناد', icon: FileText },
    { id: 'searches', name: 'جستجوها', icon: Search },
    { id: 'performance', name: 'عملکرد', icon: Activity },
    { id: 'reports', name: 'گزارش‌ها', icon: FileText }
  ];

  const exportData = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      const response = await fetch(`/api/admin/export?format=${format}&range=${dateRange}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${dateRange}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">در حال بارگذاری آمار...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">آمار و گزارش‌ها</h2>
          <p className="text-gray-600 mt-1">تحلیل جامع عملکرد سیستم</p>
        </div>
        <div className="flex space-x-3 space-x-reverse">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1d">امروز</option>
            <option value="7d">7 روز گذشته</option>
            <option value="30d">30 روز گذشته</option>
            <option value="90d">90 روز گذشته</option>
            <option value="1y">1 سال گذشته</option>
          </select>
          <button
            onClick={fetchAnalyticsData}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4 ml-2" />
            بروزرسانی
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {analyticsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">کل کاربران</p>
                <p className="text-2xl font-bold text-gray-900">{analyticsData.users.total.toLocaleString('fa-IR')}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 ml-1" />
              <span className="text-green-600 font-medium">+{analyticsData.users.growth}%</span>
              <span className="text-gray-500 mr-2">نسبت به دوره قبل</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">کل اسناد</p>
                <p className="text-2xl font-bold text-gray-900">{analyticsData.documents.total.toLocaleString('fa-IR')}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 ml-1" />
              <span className="text-green-600 font-medium">+{analyticsData.documents.growth}%</span>
              <span className="text-gray-500 mr-2">نسبت به دوره قبل</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Search className="w-6 h-6 text-purple-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">کل جستجوها</p>
                <p className="text-2xl font-bold text-gray-900">{analyticsData.searches.total.toLocaleString('fa-IR')}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 ml-1" />
              <span className="text-green-600 font-medium">+{analyticsData.searches.growth}%</span>
              <span className="text-gray-500 mr-2">نسبت به دوره قبل</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">زمان پاسخ</p>
                <p className="text-2xl font-bold text-gray-900">{analyticsData.performance.avgResponseTime}ms</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">{analyticsData.performance.uptime}%</span>
              <span className="text-gray-500 mr-2">آپتایم</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 space-x-reverse px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 ml-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && analyticsData && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">نمای کلی سیستم</h3>
                <div className="flex space-x-2 space-x-reverse">
                  <button
                    onClick={() => exportData('csv')}
                    className="flex items-center px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    <Download className="w-4 h-4 ml-1" />
                    CSV
                  </button>
                  <button
                    onClick={() => exportData('excel')}
                    className="flex items-center px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4 ml-1" />
                    Excel
                  </button>
                  <button
                    onClick={() => exportData('pdf')}
                    className="flex items-center px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    <Download className="w-4 h-4 ml-1" />
                    PDF
                  </button>
                </div>
              </div>

              {/* Trends Chart */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">روند فعالیت</h4>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <LineChart className="w-12 h-12 mx-auto mb-2" />
                    <p>نمودار روند فعالیت</p>
                    <p className="text-sm">(نیاز به کتابخانه نمودار)</p>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">عملکرد سیستم</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">زمان پاسخ متوسط</span>
                      <span className="text-sm font-medium">{analyticsData.performance.avgResponseTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">آپتایم</span>
                      <span className="text-sm font-medium text-green-600">{analyticsData.performance.uptime}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">نرخ خطا</span>
                      <span className="text-sm font-medium text-red-600">{analyticsData.performance.errorRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">توان عملیاتی</span>
                      <span className="text-sm font-medium">{analyticsData.performance.throughput} req/s</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">جستجوهای محبوب</h4>
                  <div className="space-y-2">
                    {analyticsData.searches.popular.slice(0, 5).map((search, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 truncate">{search.term}</span>
                        <span className="text-sm font-medium">{search.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && analyticsData && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">آمار کاربران</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 rounded-lg p-6">
                  <div className="flex items-center">
                    <Users className="w-8 h-8 text-blue-600 ml-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">کل کاربران</p>
                      <p className="text-2xl font-bold text-blue-600">{analyticsData.users.total}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-6">
                  <div className="flex items-center">
                    <Activity className="w-8 h-8 text-green-600 ml-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">کاربران فعال</p>
                      <p className="text-2xl font-bold text-green-600">{analyticsData.users.active}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-6">
                  <div className="flex items-center">
                    <TrendingUp className="w-8 h-8 text-purple-600 ml-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">کاربران جدید</p>
                      <p className="text-2xl font-bold text-purple-600">{analyticsData.users.new}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">روند کاربران</h4>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                    <p>نمودار روند کاربران</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && analyticsData && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">آمار اسناد</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 rounded-lg p-6">
                  <div className="flex items-center">
                    <FileText className="w-8 h-8 text-green-600 ml-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">کل اسناد</p>
                      <p className="text-2xl font-bold text-green-600">{analyticsData.documents.total}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-6">
                  <div className="flex items-center">
                    <CheckCircle className="w-8 h-8 text-blue-600 ml-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">پردازش شده</p>
                      <p className="text-2xl font-bold text-blue-600">{analyticsData.documents.processed}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-6">
                  <div className="flex items-center">
                    <Clock className="w-8 h-8 text-yellow-600 ml-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">در انتظار</p>
                      <p className="text-2xl font-bold text-yellow-600">{analyticsData.documents.pending}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">روند اسناد</h4>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <PieChart className="w-12 h-12 mx-auto mb-2" />
                    <p>نمودار توزیع اسناد</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Searches Tab */}
          {activeTab === 'searches' && analyticsData && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">آمار جستجوها</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-purple-50 rounded-lg p-6">
                  <div className="flex items-center">
                    <Search className="w-8 h-8 text-purple-600 ml-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">کل جستجوها</p>
                      <p className="text-2xl font-bold text-purple-600">{analyticsData.searches.total}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-6">
                  <div className="flex items-center">
                    <Calendar className="w-8 h-8 text-blue-600 ml-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">امروز</p>
                      <p className="text-2xl font-bold text-blue-600">{analyticsData.searches.today}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">جستجوهای محبوب</h4>
                <div className="space-y-3">
                  {analyticsData.searches.popular.map((search, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-500 ml-3">#{index + 1}</span>
                        <span className="text-sm text-gray-900">{search.term}</span>
                      </div>
                      <span className="text-sm font-medium text-blue-600">{search.count} جستجو</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && analyticsData && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">عملکرد سیستم</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center">
                    <Activity className="w-8 h-8 text-blue-600 ml-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">زمان پاسخ</p>
                      <p className="text-2xl font-bold text-gray-900">{analyticsData.performance.avgResponseTime}ms</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center">
                    <CheckCircle className="w-8 h-8 text-green-600 ml-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">آپتایم</p>
                      <p className="text-2xl font-bold text-green-600">{analyticsData.performance.uptime}%</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center">
                    <AlertTriangle className="w-8 h-8 text-red-600 ml-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">نرخ خطا</p>
                      <p className="text-2xl font-bold text-red-600">{analyticsData.performance.errorRate}%</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center">
                    <TrendingUp className="w-8 h-8 text-purple-600 ml-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">توان عملیاتی</p>
                      <p className="text-2xl font-bold text-purple-600">{analyticsData.performance.throughput}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">روند عملکرد</h4>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <LineChart className="w-12 h-12 mx-auto mb-2" />
                    <p>نمودار روند عملکرد</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">گزارش‌های سفارشی</h3>
                <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Settings className="w-4 h-4 ml-2" />
                  ایجاد گزارش جدید
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {customReports.map((report) => (
                  <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-medium text-gray-900">{report.name}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        report.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {report.status === 'active' ? 'فعال' : 'غیرفعال'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4">{report.description}</p>
                    
                    <div className="space-y-2 mb-4">
                      <p className="text-xs text-gray-500">آخرین تولید: {new Date(report.lastGenerated).toLocaleDateString('fa-IR')}</p>
                      <p className="text-xs text-gray-500">زمان‌بندی: {report.schedule}</p>
                    </div>
                    
                    <div className="flex space-x-2 space-x-reverse">
                      <button className="flex items-center px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                        <Eye className="w-4 h-4 ml-1" />
                        مشاهده
                      </button>
                      <button className="flex items-center px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                        <Download className="w-4 h-4 ml-1" />
                        دانلود
                      </button>
                      <button className="flex items-center px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700">
                        <Share2 className="w-4 h-4 ml-1" />
                        اشتراک
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsReporting;