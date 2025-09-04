import React from 'react';
import { FileText, Database, Zap, Globe, TrendingUp, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSystemStats } from '../hooks/useDocuments';

export const Dashboard: React.FC = () => {
  const { data: stats, isLoading } = useSystemStats();

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
  );
};