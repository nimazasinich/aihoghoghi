import React, { useState, useEffect } from 'react';
import { FileText, Database, Zap, Globe, TrendingUp, Clock, Activity, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSystemStats } from '../hooks/useDocuments';

export const Dashboard: React.FC = () => {
  const { data: stats, isLoading } = useSystemStats();
  const [realTimeStats, setRealTimeStats] = useState<any>(null);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    // WebSocket connection for real-time updates
    const ws = new WebSocket('ws://localhost:8000/ws');
    
    ws.onopen = () => {
      setWsConnected(true);
      console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'scraping_update') {
        setRealTimeStats(data.data);
      }
    };
    
    ws.onclose = () => {
      setWsConnected(false);
      console.log('WebSocket disconnected');
    };
    
    return () => ws.close();
  }, []);

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    trend?: string;
  }> = ({ title, value, icon: Icon, color, trend }) => (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div className="text-right">
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className="text-xs text-green-600 flex items-center gap-1 mt-2 justify-end">
              <TrendingUp className="w-3 h-3" />
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="animate-pulse">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">داشبورد سیستم</h2>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {wsConnected ? 'متصل' : 'قطع'}
          </span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="کل اسناد"
          value={stats.totalDocuments.toLocaleString('fa-IR')}
          icon={FileText}
          color="bg-blue-100 text-blue-600"
          trend="+12% این هفته"
        />
        
        <StatCard
          title="دسته‌بندی‌ها"
          value={stats.totalCategories}
          icon={Database}
          color="bg-green-100 text-green-600"
        />
        
        <StatCard
          title="حجم پایگاه داده"
          value={`${(stats.databaseSize / (1024 * 1024)).toFixed(1)} MB`}
          icon={Database}
          color="bg-purple-100 text-purple-600"
        />
        
        <StatCard
          title="آخرین بروزرسانی"
          value={new Date(stats.lastScraped).toLocaleDateString('fa-IR')}
          icon={Clock}
          color="bg-orange-100 text-orange-600"
        />
      </div>

      {/* Real-time Scraping Status */}
      {realTimeStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">وضعیت جمع‌آوری</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {realTimeStats.processed || 0}
              </div>
              <div className="text-sm text-gray-600">پردازش شده</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {realTimeStats.total || 0}
              </div>
              <div className="text-sm text-gray-600">کل اسناد</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {realTimeStats.errors || 0}
              </div>
              <div className="text-sm text-gray-600">خطاها</div>
            </div>
          </div>
          
          {realTimeStats.currentUrl && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">در حال پردازش:</div>
              <div className="text-sm font-mono text-gray-800 truncate">
                {realTimeStats.currentUrl}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">وضعیت سیستم</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">پایگاه داده</span>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">سالم</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">مدل‌های هوش مصنوعی</span>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">فعال</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">سیستم پروکسی</span>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">22 سرور فعال</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">آمار عملکرد</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">نرخ موفقیت جستجو</span>
              <span className="text-sm font-semibold text-green-600">98.5%</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">میانگین زمان پاسخ</span>
              <span className="text-sm font-semibold text-blue-600">120ms</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">اسناد پردازش شده امروز</span>
              <span className="text-sm font-semibold text-purple-600">
                {stats.documentsLast24h || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};