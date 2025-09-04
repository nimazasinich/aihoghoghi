import React from 'react';
import { Play, Pause, RefreshCw, AlertCircle, CheckCircle, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { useScrapingStatus, useStartScraping, useStopScraping } from '../hooks/useDocuments';

export const ScrapingStatus: React.FC = () => {
  const { data: status, isLoading } = useScrapingStatus();
  const startScraping = useStartScraping();
  const stopScraping = useStopScraping();

  const handleStartScraping = () => {
    const defaultUrls = [
      'https://rc.majlis.ir',
      'https://divan-edalat.ir',
      'https://ijudiciary.ir'
    ];
    startScraping.mutate(defaultUrls);
  };

  if (isLoading || !status) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-2 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-2 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  const progressPercentage = status.totalDocuments > 0 
    ? (status.documentsProcessed / status.totalDocuments) * 100 
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${status.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
              {status.isActive ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                  <RefreshCw className="w-5 h-5 text-green-600" />
                </motion.div>
              ) : (
                <Pause className="w-5 h-5 text-gray-600" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                وضعیت جمع‌آوری اسناد
              </h3>
              <p className="text-sm text-gray-600">
                {status.isActive ? 'در حال جمع‌آوری...' : 'غیرفعال'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {status.isActive ? (
              <button
                onClick={() => stopScraping.mutate()}
                disabled={stopScraping.isPending}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                <Pause className="w-4 h-4" />
                توقف
              </button>
            ) : (
              <button
                onClick={handleStartScraping}
                disabled={startScraping.isPending}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                <Play className="w-4 h-4" />
                شروع
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="p-6">
        {status.isActive && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2 text-right">
              <span className="text-sm font-medium text-gray-900">
                پیشرفت: {status.documentsProcessed} از {status.totalDocuments}
              </span>
              <span className="text-sm text-gray-600">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}

        {/* Current URL */}
        {status.currentUrl && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700 text-right">
                در حال پردازش:
              </span>
            </div>
            <p className="text-sm text-gray-600 font-mono break-all">
              {status.currentUrl}
            </p>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{status.documentsProcessed}</div>
            <div className="text-sm text-blue-700">اسناد پردازش شده</div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{status.totalDocuments}</div>
            <div className="text-sm text-green-700">کل اسناد</div>
          </div>

          <div className="bg-red-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{status.errorCount}</div>
            <div className="text-sm text-red-700">خطاها</div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              {status.proxyStatus === 'active' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : status.proxyStatus === 'rotating' ? (
                <RefreshCw className="w-5 h-5 text-yellow-600 animate-spin" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="text-sm font-medium text-gray-700">
                {status.proxyStatus === 'active' ? 'فعال' : 
                 status.proxyStatus === 'rotating' ? 'در حال تغییر' : 'خطا'}
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-1">وضعیت پروکسی</div>
          </div>
        </div>

        {/* Last update */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            آخرین بروزرسانی: {formatDistanceToNow(new Date(status.lastUpdate), { addSuffix: true, locale: fa })}
          </p>
        </div>
      </div>
    </div>
  );
};