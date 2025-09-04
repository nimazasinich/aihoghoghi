import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, Lock } from 'lucide-react';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallbackPath?: string;
  showAccessDenied?: boolean;
}

export const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({
  children,
  allowedRoles,
  fallbackPath = '/',
  showAccessDenied = true
}) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // If not authenticated, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check if user has required role
  const hasAccess = allowedRoles.includes(user.role);

  if (!hasAccess) {
    if (showAccessDenied) {
      return <AccessDeniedPage userRole={user.role} allowedRoles={allowedRoles} />;
    } else {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  return <>{children}</>;
};

interface AccessDeniedPageProps {
  userRole: string;
  allowedRoles: string[];
}

const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({ userRole, allowedRoles }) => {
  const getRoleDisplayName = (role: string): string => {
    const roleNames: Record<string, string> = {
      admin: 'مدیر سیستم',
      lawyer: 'وکیل',
      researcher: 'محقق',
      viewer: 'مشاهده‌گر'
    };
    return roleNames[role] || role;
  };

  const getRoleDescription = (role: string): string => {
    const descriptions: Record<string, string> = {
      admin: 'دسترسی کامل به تمام بخش‌های سیستم',
      lawyer: 'دسترسی به اسناد حقوقی و ابزارهای تخصصی',
      researcher: 'دسترسی به اسناد و ابزارهای تحقیقاتی',
      viewer: 'دسترسی محدود به مشاهده اسناد'
    };
    return descriptions[role] || 'دسترسی محدود';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-orange-500 px-8 py-6">
            <div className="flex items-center justify-center gap-3">
              <Shield className="w-8 h-8 text-white" />
              <h1 className="text-2xl font-bold text-white">
                دسترسی محدود
              </h1>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            {/* Access Denied Icon */}
            <div className="flex justify-center">
              <div className="bg-red-100 p-4 rounded-full">
                <Lock className="w-12 h-12 text-red-600" />
              </div>
            </div>

            {/* Message */}
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">
                شما دسترسی لازم را ندارید
              </h2>
              <p className="text-gray-600">
                برای دسترسی به این بخش، نقش کاربری شما باید یکی از موارد زیر باشد:
              </p>
            </div>

            {/* Allowed Roles */}
            <div className="space-y-3">
              {allowedRoles.map((role) => (
                <div
                  key={role}
                  className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <div className="font-medium text-green-800">
                      {getRoleDisplayName(role)}
                    </div>
                    <div className="text-sm text-green-600">
                      {getRoleDescription(role)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Current Role */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <div>
                  <div className="font-medium text-gray-900">
                    نقش فعلی شما: {getRoleDisplayName(userRole)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {getRoleDescription(userRole)}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={() => window.history.back()}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                بازگشت
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                صفحه اصلی
              </button>
            </div>

            {/* Help Text */}
            <div className="text-center">
              <p className="text-sm text-gray-500">
                برای تغییر نقش کاربری، با مدیر سیستم تماس بگیرید
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Convenience components for common role checks
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RoleBasedRoute allowedRoles={['admin']}>{children}</RoleBasedRoute>
);

export const LawyerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RoleBasedRoute allowedRoles={['admin', 'lawyer']}>{children}</RoleBasedRoute>
);

export const ResearcherRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RoleBasedRoute allowedRoles={['admin', 'lawyer', 'researcher']}>{children}</RoleBasedRoute>
);

export const AuthenticatedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RoleBasedRoute allowedRoles={['admin', 'lawyer', 'researcher', 'viewer']}>{children}</RoleBasedRoute>
);