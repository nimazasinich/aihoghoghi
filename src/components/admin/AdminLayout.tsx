/**
 * Admin Layout Component - Main layout for admin dashboard
 * Provides navigation, sidebar, and main content area
 */

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  BarChart3, 
  Shield, 
  FileText, 
  Search,
  Menu,
  X,
  LogOut,
  Bell,
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activeTab = 'dashboard', onTabChange }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navigation = [
    { id: 'dashboard', name: 'داشبورد', icon: LayoutDashboard, href: '/admin' },
    { id: 'users', name: 'مدیریت کاربران', icon: Users, href: '/admin/users' },
    { id: 'documents', name: 'مدیریت اسناد', icon: FileText, href: '/admin/documents' },
    { id: 'analytics', name: 'آمار و گزارش‌ها', icon: BarChart3, href: '/admin/analytics' },
    { id: 'search', name: 'جستجوی پیشرفته', icon: Search, href: '/admin/search' },
    { id: 'security', name: 'امنیت', icon: Shield, href: '/admin/security' },
    { id: 'settings', name: 'تنظیمات', icon: Settings, href: '/admin/settings' }
  ];

  const handleTabClick = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
    }
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-gray-600 opacity-75"></div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 right-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : 'translate-x-full'
      } ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'}`}>
        
        {/* Sidebar header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          {!sidebarCollapsed && (
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="mr-3 text-lg font-semibold text-gray-900">پنل مدیریت</span>
            </div>
          )}
          
          <div className="flex items-center space-x-2 space-x-reverse">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:block p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {sidebarCollapsed ? (
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-600" />
              )}
            </button>
            
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${sidebarCollapsed ? 'mx-auto' : 'ml-3'}`} />
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            {!sidebarCollapsed && (
              <div className="mr-3 flex-1">
                <p className="text-sm font-medium text-gray-900">مدیر سیستم</p>
                <p className="text-xs text-gray-500">admin@legal-api.ir</p>
              </div>
            )}
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <LogOut className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:mr-16' : 'lg:mr-64'}`}>
        {/* Top navigation */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              
              <div className="mr-4">
                <h1 className="text-xl font-semibold text-gray-900">
                  {navigation.find(item => item.id === activeTab)?.name || 'پنل مدیریت'}
                </h1>
                <p className="text-sm text-gray-500">سیستم مدیریت حقوقی</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 space-x-reverse">
              {/* Notifications */}
              <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User menu */}
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">مدیر سیستم</p>
                  <p className="text-xs text-gray-500">مدیر</p>
                </div>
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;