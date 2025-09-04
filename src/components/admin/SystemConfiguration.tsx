/**
 * System Configuration Panel for Admin Dashboard
 * Provides comprehensive system settings management
 */

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Database, 
  Server, 
  Shield, 
  Zap,
  Globe,
  Key,
  Bell,
  HardDrive,
  Cpu,
  MemoryStick,
  Network
} from 'lucide-react';

interface SystemConfig {
  proxy: {
    enabled: boolean;
    providers: string[];
    rotationInterval: number;
    maxRetries: number;
    timeout: number;
  };
  ai: {
    model: string;
    temperature: number;
    maxTokens: number;
    apiKey: string;
    endpoint: string;
  };
  database: {
    connectionPool: number;
    queryTimeout: number;
    backupInterval: number;
    optimizationEnabled: boolean;
  };
  cache: {
    enabled: boolean;
    provider: 'redis' | 'memory';
    ttl: number;
    maxSize: number;
  };
  features: {
    [key: string]: boolean;
  };
  security: {
    rateLimiting: boolean;
    threatDetection: boolean;
    auditLogging: boolean;
    encryptionEnabled: boolean;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    webhook: boolean;
    slack: boolean;
  };
}

const SystemConfiguration: React.FC = () => {
  const [config, setConfig] = useState<SystemConfig>({
    proxy: {
      enabled: true,
      providers: ['provider1', 'provider2'],
      rotationInterval: 300,
      maxRetries: 3,
      timeout: 30
    },
    ai: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      apiKey: '',
      endpoint: 'https://api.openai.com/v1'
    },
    database: {
      connectionPool: 20,
      queryTimeout: 30,
      backupInterval: 24,
      optimizationEnabled: true
    },
    cache: {
      enabled: true,
      provider: 'redis',
      ttl: 3600,
      maxSize: 1000
    },
    features: {
      advancedSearch: true,
      documentUpload: true,
      realTimeUpdates: true,
      analytics: true,
      apiAccess: true
    },
    security: {
      rateLimiting: true,
      threatDetection: true,
      auditLogging: true,
      encryptionEnabled: true
    },
    notifications: {
      email: true,
      sms: false,
      webhook: true,
      slack: false
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('proxy');
  const [systemStatus, setSystemStatus] = useState<any>(null);

  // Fetch system configuration
  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/config');
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Failed to fetch configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch system status
  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/admin/system-status');
      const data = await response.json();
      setSystemStatus(data);
    } catch (error) {
      console.error('Failed to fetch system status:', error);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchSystemStatus();
  }, []);

  // Save configuration
  const saveConfig = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        // Show success message
        console.log('Configuration saved successfully');
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Update configuration
  const updateConfig = (section: string, key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof SystemConfig],
        [key]: value
      }
    }));
  };

  const tabs = [
    { id: 'proxy', name: 'تنظیمات پروکسی', icon: Globe },
    { id: 'ai', name: 'مدل هوش مصنوعی', icon: Cpu },
    { id: 'database', name: 'پایگاه داده', icon: Database },
    { id: 'cache', name: 'کش', icon: HardDrive },
    { id: 'features', name: 'ویژگی‌ها', icon: Zap },
    { id: 'security', name: 'امنیت', icon: Shield },
    { id: 'notifications', name: 'اعلان‌ها', icon: Bell }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">در حال بارگذاری تنظیمات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">تنظیمات سیستم</h2>
          <p className="text-gray-600 mt-1">مدیریت تنظیمات پیشرفته سیستم</p>
        </div>
        <div className="flex space-x-3 space-x-reverse">
          <button
            onClick={fetchConfig}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4 ml-2" />
            بروزرسانی
          </button>
          <button
            onClick={saveConfig}
            disabled={isSaving}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4 ml-2" />
            {isSaving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>

      {/* System Status */}
      {systemStatus && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">وضعیت سیستم</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center p-4 bg-green-50 rounded-lg">
              <Server className="w-8 h-8 text-green-600 ml-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">سرور</p>
                <p className="text-lg font-bold text-green-600">آنلاین</p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-blue-50 rounded-lg">
              <Database className="w-8 h-8 text-blue-600 ml-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">پایگاه داده</p>
                <p className="text-lg font-bold text-blue-600">متصل</p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-purple-50 rounded-lg">
              <MemoryStick className="w-8 h-8 text-purple-600 ml-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">حافظه</p>
                <p className="text-lg font-bold text-purple-600">{systemStatus.memoryUsage}%</p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-orange-50 rounded-lg">
              <Network className="w-8 h-8 text-orange-600 ml-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">شبکه</p>
                <p className="text-lg font-bold text-orange-600">{systemStatus.networkLatency}ms</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        {/* Tabs */}
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
          {/* Proxy Settings */}
          {activeTab === 'proxy' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">تنظیمات پروکسی</h3>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.proxy.enabled}
                    onChange={(e) => updateConfig('proxy', 'enabled', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="mr-2 text-sm text-gray-700">فعال</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    فاصله چرخش (ثانیه)
                  </label>
                  <input
                    type="number"
                    value={config.proxy.rotationInterval}
                    onChange={(e) => updateConfig('proxy', 'rotationInterval', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    حداکثر تلاش مجدد
                  </label>
                  <input
                    type="number"
                    value={config.proxy.maxRetries}
                    onChange={(e) => updateConfig('proxy', 'maxRetries', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    زمان انتظار (ثانیه)
                  </label>
                  <input
                    type="number"
                    value={config.proxy.timeout}
                    onChange={(e) => updateConfig('proxy', 'timeout', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* AI Settings */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">تنظیمات مدل هوش مصنوعی</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    مدل
                  </label>
                  <select
                    value={config.ai.model}
                    onChange={(e) => updateConfig('ai', 'model', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="claude-3">Claude 3</option>
                    <option value="gemini-pro">Gemini Pro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    دما (Temperature)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={config.ai.temperature}
                    onChange={(e) => updateConfig('ai', 'temperature', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-500 mt-1">{config.ai.temperature}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    حداکثر توکن‌ها
                  </label>
                  <input
                    type="number"
                    value={config.ai.maxTokens}
                    onChange={(e) => updateConfig('ai', 'maxTokens', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    کلید API
                  </label>
                  <input
                    type="password"
                    value={config.ai.apiKey}
                    onChange={(e) => updateConfig('ai', 'apiKey', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••••••••••"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Database Settings */}
          {activeTab === 'database' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">تنظیمات پایگاه داده</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اندازه Pool اتصال
                  </label>
                  <input
                    type="number"
                    value={config.database.connectionPool}
                    onChange={(e) => updateConfig('database', 'connectionPool', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    زمان انتظار Query (ثانیه)
                  </label>
                  <input
                    type="number"
                    value={config.database.queryTimeout}
                    onChange={(e) => updateConfig('database', 'queryTimeout', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    فاصله پشتیبان‌گیری (ساعت)
                  </label>
                  <input
                    type="number"
                    value={config.database.backupInterval}
                    onChange={(e) => updateConfig('database', 'backupInterval', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.database.optimizationEnabled}
                      onChange={(e) => updateConfig('database', 'optimizationEnabled', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="mr-2 text-sm text-gray-700">بهینه‌سازی خودکار</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Cache Settings */}
          {activeTab === 'cache' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">تنظیمات کش</h3>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.cache.enabled}
                    onChange={(e) => updateConfig('cache', 'enabled', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="mr-2 text-sm text-gray-700">فعال</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ارائه‌دهنده
                  </label>
                  <select
                    value={config.cache.provider}
                    onChange={(e) => updateConfig('cache', 'provider', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="redis">Redis</option>
                    <option value="memory">Memory</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    زمان انقضا (ثانیه)
                  </label>
                  <input
                    type="number"
                    value={config.cache.ttl}
                    onChange={(e) => updateConfig('cache', 'ttl', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    حداکثر اندازه
                  </label>
                  <input
                    type="number"
                    value={config.cache.maxSize}
                    onChange={(e) => updateConfig('cache', 'maxSize', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Features */}
          {activeTab === 'features' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">ویژگی‌های سیستم</h3>

              <div className="space-y-4">
                {Object.entries(config.features).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {key === 'advancedSearch' && 'جستجوی پیشرفته'}
                        {key === 'documentUpload' && 'آپلود اسناد'}
                        {key === 'realTimeUpdates' && 'بروزرسانی‌های لحظه‌ای'}
                        {key === 'analytics' && 'تحلیل‌ها'}
                        {key === 'apiAccess' && 'دسترسی API'}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {key === 'advancedSearch' && 'فعال‌سازی قابلیت‌های جستجوی پیشرفته'}
                        {key === 'documentUpload' && 'امکان آپلود و پردازش اسناد'}
                        {key === 'realTimeUpdates' && 'بروزرسانی‌های لحظه‌ای در رابط کاربری'}
                        {key === 'analytics' && 'نمایش آمار و تحلیل‌های سیستم'}
                        {key === 'apiAccess' && 'دسترسی به API برای توسعه‌دهندگان'}
                      </p>
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => updateConfig('features', key, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">تنظیمات امنیتی</h3>

              <div className="space-y-4">
                {Object.entries(config.security).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {key === 'rateLimiting' && 'محدودیت نرخ'}
                        {key === 'threatDetection' && 'تشخیص تهدید'}
                        {key === 'auditLogging' && 'ثبت فعالیت'}
                        {key === 'encryptionEnabled' && 'رمزگذاری'}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {key === 'rateLimiting' && 'محدود کردن تعداد درخواست‌ها از هر کاربر'}
                        {key === 'threatDetection' && 'تشخیص و مسدود کردن تهدیدات امنیتی'}
                        {key === 'auditLogging' && 'ثبت تمام فعالیت‌های کاربران و سیستم'}
                        {key === 'encryptionEnabled' && 'رمزگذاری داده‌های حساس'}
                      </p>
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => updateConfig('security', key, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">تنظیمات اعلان‌ها</h3>

              <div className="space-y-4">
                {Object.entries(config.notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {key === 'email' && 'ایمیل'}
                        {key === 'sms' && 'پیامک'}
                        {key === 'webhook' && 'Webhook'}
                        {key === 'slack' && 'Slack'}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {key === 'email' && 'ارسال اعلان‌ها از طریق ایمیل'}
                        {key === 'sms' && 'ارسال اعلان‌ها از طریق پیامک'}
                        {key === 'webhook' && 'ارسال اعلان‌ها به Webhook'}
                        {key === 'slack' && 'ارسال اعلان‌ها به Slack'}
                      </p>
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => updateConfig('notifications', key, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
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

export default SystemConfiguration;