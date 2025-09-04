import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { apiService } from '../services/apiService';
import type { User, AuthState, LoginCredentials, RegisterData } from '../types';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; message: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  updateUser: (user: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'REFRESH_TOKEN'; payload: string };

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('auth_token'),
  isAuthenticated: false,
  isLoading: true
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true
      };
    
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false
      };
    
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false
      };
    
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false
      };
    
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null
      };
    
    case 'REFRESH_TOKEN':
      return {
        ...state,
        token: action.payload
      };
    
    default:
      return state;
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('auth_token');
      
      if (token) {
        try {
          // Verify token with backend
          const response = await fetch('/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            dispatch({
              type: 'LOGIN_SUCCESS',
              payload: {
                user: userData.user,
                token
              }
            });
          } else {
            // Token is invalid, remove it
            localStorage.removeItem('auth_token');
            dispatch({ type: 'LOGIN_FAILURE' });
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          localStorage.removeItem('auth_token');
          dispatch({ type: 'LOGIN_FAILURE' });
        }
      } else {
        dispatch({ type: 'LOGIN_FAILURE' });
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; message: string }> => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        localStorage.setItem('auth_token', data.token);
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user: data.user,
            token: data.token
          }
        });
        
        return { success: true, message: data.message };
      } else {
        dispatch({ type: 'LOGIN_FAILURE' });
        return { success: false, message: data.message || 'خطا در ورود' };
      }
    } catch (error) {
      console.error('Login error:', error);
      dispatch({ type: 'LOGIN_FAILURE' });
      return { success: false, message: 'خطا در اتصال به سرور' };
    }
  };

  const register = async (data: RegisterData): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        return { success: true, message: result.message };
      } else {
        return { success: false, message: result.message || 'خطا در ثبت نام' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'خطا در اتصال به سرور' };
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    dispatch({ type: 'LOGOUT' });
    
    // Call logout endpoint
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    }).catch(error => {
      console.error('Logout error:', error);
    });
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('auth_token', data.token);
        dispatch({ type: 'REFRESH_TOKEN', payload: data.token });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  };

  const updateUser = (userData: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshToken,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Higher-order component for protected routes
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: string
) => {
  return (props: P) => {
    const { isAuthenticated, user, isLoading } = useAuth();
    
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      );
    }
    
    if (!isAuthenticated) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              نیاز به ورود
            </h2>
            <p className="text-gray-600 mb-4">
              برای دسترسی به این صفحه باید وارد شوید
            </p>
            <button
              onClick={() => window.location.href = '/login'}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              ورود
            </button>
          </div>
        </div>
      );
    }
    
    if (requiredRole && user?.role !== requiredRole) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              دسترسی محدود
            </h2>
            <p className="text-gray-600 mb-4">
              شما دسترسی لازم برای این صفحه را ندارید
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              بازگشت به صفحه اصلی
            </button>
          </div>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
};