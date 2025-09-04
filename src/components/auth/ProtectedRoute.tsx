import React, { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
  fallback?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  fallback 
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">در حال بررسی احراز هویت...</p>
        </div>
      </div>
    );
  }

  // User not authenticated
  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-6">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-white" />
                <div>
                  <h2 className="text-xl font-bold text-white">
                    نیاز به ورود
                  </h2>
                  <p className="text-orange-100 text-sm">
                    برای دسترسی به این صفحه باید وارد شوید
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-8 h-8 text-amber-600" />
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    دسترسی محدود
                  </h3>
                  <p className="text-gray-600 mb-6">
                    این صفحه فقط برای کاربران وارد شده قابل دسترسی است
                  </p>
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={() => window.location.href = '/login'}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    ورود به سیستم
                  </button>
                  
                  <button
                    onClick={() => window.location.href = '/register'}
                    className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    ثبت نام
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check role-based access
  if (requiredRole && user?.role !== requiredRole) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-pink-600 px-8 py-6">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-white" />
                <div>
                  <h2 className="text-xl font-bold text-white">
                    دسترسی محدود
                  </h2>
                  <p className="text-red-100 text-sm">
                    شما دسترسی لازم برای این صفحه را ندارید
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    مجوز دسترسی
                  </h3>
                  <p className="text-gray-600 mb-2">
                    این صفحه فقط برای کاربران با نقش <strong>{getRoleName(requiredRole)}</strong> قابل دسترسی است
                  </p>
                  <p className="text-sm text-gray-500">
                    نقش فعلی شما: <strong>{getRoleName(user?.role || '')}</strong>
                  </p>
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={() => window.location.href = '/'}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    بازگشت به صفحه اصلی
                  </button>
                  
                  <button
                    onClick={() => window.location.href = '/profile'}
                    className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    مشاهده پروفایل
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated and has required role
  return <>{children}</>;
};

// Helper function to get role name in Persian
function getRoleName(role: string): string {
  const roleNames: Record<string, string> = {
    admin: 'مدیر',
    lawyer: 'وکیل',
    researcher: 'پژوهشگر',
    viewer: 'مشاهده‌گر'
  };
  
  return roleNames[role] || role;
}

// Higher-order component for role-based access
export const withRole = <P extends object>(
  Component: React.ComponentType<P>,
  requiredRole: string
) => {
  return (props: P) => (
    <ProtectedRoute requiredRole={requiredRole}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

// Component for admin-only access
export const AdminOnly: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRole="admin">
    {children}
  </ProtectedRoute>
);

// Component for lawyer and above access
export const LawyerAndAbove: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  const hasAccess = user?.role === 'admin' || user?.role === 'lawyer';
  
  if (!hasAccess) {
    return (
      <ProtectedRoute requiredRole="lawyer">
        {children}
      </ProtectedRoute>
    );
  }
  
  return <>{children}</>;
};

// Component for researcher and above access
export const ResearcherAndAbove: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  const hasAccess = user?.role === 'admin' || user?.role === 'lawyer' || user?.role === 'researcher';
  
  if (!hasAccess) {
    return (
      <ProtectedRoute requiredRole="researcher">
        {children}
      </ProtectedRoute>
    );
  }
  
  return <>{children}</>;
};