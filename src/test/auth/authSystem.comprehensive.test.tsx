import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { LoginForm } from '../../components/auth/LoginForm';
import { RegisterForm } from '../../components/auth/RegisterForm';
import { UserProfile } from '../../components/auth/UserProfile';
import { RoleBasedRoute } from '../../components/auth/RoleBasedRoute';
import { PasswordStrengthIndicator } from '../../components/auth/PasswordStrengthIndicator';
import { TwoFactorSetup } from '../../components/auth/TwoFactorSetup';
import { apiService } from '../../services/apiService';
import type { User, LoginCredentials, RegisterData } from '../../types';

// Mock the API service
vi.mock('../../services/apiService', () => ({
  apiService: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    refreshToken: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    updateProfile: vi.fn()
  }
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    input: ({ children, ...props }: any) => <input {...props}>{children}</input>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    h3: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    img: ({ children, ...props }: any) => <img {...props}>{children}</img>,
    ul: ({ children, ...props }: any) => <ul {...props}>{children}</ul>,
    li: ({ children, ...props }: any) => <li {...props}>{children}</li>
  },
  AnimatePresence: ({ children }: any) => children
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Eye: () => <span data-testid="eye-icon">👁️</span>,
  EyeOff: () => <span data-testid="eye-off-icon">🙈</span>,
  Mail: () => <span data-testid="mail-icon">📧</span>,
  Lock: () => <span data-testid="lock-icon">🔒</span>,
  User: () => <span data-testid="user-icon">👤</span>,
  AlertCircle: () => <span data-testid="alert-icon">⚠️</span>,
  Loader2: () => <span data-testid="loader-icon">⏳</span>,
  CheckCircle: () => <span data-testid="check-icon">✅</span>,
  Shield: () => <span data-testid="shield-icon">🛡️</span>,
  Smartphone: () => <span data-testid="phone-icon">📱</span>,
  Key: () => <span data-testid="key-icon">🔑</span>,
  Copy: () => <span data-testid="copy-icon">📋</span>,
  Check: () => <span data-testid="check-icon">✓</span>,
  X: () => <span data-testid="x-icon">✗</span>
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 days ago')
}));

vi.mock('date-fns/locale', () => ({
  fa: {}
}));

const mockUser: User = {
  id: '1',
  email: 'test@example.com',
  name: 'کاربر تست',
  role: 'lawyer',
  createdAt: '2024-01-01T00:00:00Z',
  lastLogin: '2024-01-15T10:00:00Z'
};

const mockLoginCredentials: LoginCredentials = {
  email: 'test@example.com',
  password: 'password123'
};

const mockRegisterData: RegisterData = {
  email: 'newuser@example.com',
  password: 'NewPassword123!',
  name: 'کاربر جدید',
  role: 'researcher'
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Authentication System - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('LoginForm Component', () => {
    it('should render login form with Persian labels', () => {
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      expect(screen.getByText('ورود به سیستم')).toBeInTheDocument();
      expect(screen.getByText('ایمیل')).toBeInTheDocument();
      expect(screen.getByText('رمز عبور')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ورود/i })).toBeInTheDocument();
    });

    it('should handle Persian email input', async () => {
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText('ایمیل');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should handle Persian password input', async () => {
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText('رمز عبور');
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      expect(passwordInput).toHaveValue('password123');
    });

    it('should toggle password visibility', async () => {
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText('رمز عبور');
      const toggleButton = screen.getByTestId('eye-icon');

      expect(passwordInput).toHaveAttribute('type', 'password');
      
      fireEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');
    });

    it('should handle successful login', async () => {
      vi.mocked(apiService.login).mockResolvedValue({
        success: true,
        message: 'ورود موفقیت‌آمیز',
        user: mockUser,
        token: 'mock-token'
      });

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText('ایمیل');
      const passwordInput = screen.getByLabelText('رمز عبور');
      const submitButton = screen.getByRole('button', { name: /ورود/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(apiService.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        });
      });
    });

    it('should handle login error', async () => {
      vi.mocked(apiService.login).mockResolvedValue({
        success: false,
        message: 'ایمیل یا رمز عبور اشتباه است'
      });

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText('ایمیل');
      const passwordInput = screen.getByLabelText('رمز عبور');
      const submitButton = screen.getByRole('button', { name: /ورود/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('ایمیل یا رمز عبور اشتباه است')).toBeInTheDocument();
      });
    });

    it('should validate form fields', async () => {
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /ورود/i });
      fireEvent.click(submitButton);

      // Form should not submit with empty fields
      expect(apiService.login).not.toHaveBeenCalled();
    });
  });

  describe('RegisterForm Component', () => {
    it('should render registration form with Persian labels', () => {
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );

      expect(screen.getByText('ثبت‌نام')).toBeInTheDocument();
      expect(screen.getByText('نام')).toBeInTheDocument();
      expect(screen.getByText('ایمیل')).toBeInTheDocument();
      expect(screen.getByText('رمز عبور')).toBeInTheDocument();
      expect(screen.getByText('تکرار رمز عبور')).toBeInTheDocument();
    });

    it('should handle Persian name input', async () => {
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );

      const nameInput = screen.getByLabelText('نام');
      fireEvent.change(nameInput, { target: { value: 'کاربر جدید' } });

      expect(nameInput).toHaveValue('کاربر جدید');
    });

    it('should handle role selection', async () => {
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );

      const roleSelect = screen.getByLabelText('نقش');
      fireEvent.change(roleSelect, { target: { value: 'lawyer' } });

      expect(roleSelect).toHaveValue('lawyer');
    });

    it('should validate password confirmation', async () => {
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText('رمز عبور');
      const confirmPasswordInput = screen.getByLabelText('تکرار رمز عبور');

      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } });

      const submitButton = screen.getByRole('button', { name: /ثبت‌نام/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('رمزهای عبور مطابقت ندارند')).toBeInTheDocument();
      });
    });

    it('should handle successful registration', async () => {
      vi.mocked(apiService.register).mockResolvedValue({
        success: true,
        message: 'ثبت‌نام موفقیت‌آمیز',
        user: mockUser
      });

      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );

      const nameInput = screen.getByLabelText('نام');
      const emailInput = screen.getByLabelText('ایمیل');
      const passwordInput = screen.getByLabelText('رمز عبور');
      const confirmPasswordInput = screen.getByLabelText('تکرار رمز عبور');
      const submitButton = screen.getByRole('button', { name: /ثبت‌نام/i });

      fireEvent.change(nameInput, { target: { value: 'کاربر جدید' } });
      fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'NewPassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(apiService.register).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'NewPassword123!',
          name: 'کاربر جدید',
          role: 'viewer'
        });
      });
    });
  });

  describe('PasswordStrengthIndicator Component', () => {
    it('should not render when password is empty', () => {
      render(<PasswordStrengthIndicator password="" />);
      expect(screen.queryByText('قدرت رمز عبور:')).not.toBeInTheDocument();
    });

    it('should show weak password strength', () => {
      render(<PasswordStrengthIndicator password="123" />);
      expect(screen.getByText('ضعیف')).toBeInTheDocument();
    });

    it('should show medium password strength', () => {
      render(<PasswordStrengthIndicator password="Password123" />);
      expect(screen.getByText('متوسط')).toBeInTheDocument();
    });

    it('should show strong password strength', () => {
      render(<PasswordStrengthIndicator password="Password123!" />);
      expect(screen.getByText('قوی')).toBeInTheDocument();
    });

    it('should show very strong password strength', () => {
      render(<PasswordStrengthIndicator password="VeryStrongPassword123!" />);
      expect(screen.getByText('خیلی قوی')).toBeInTheDocument();
    });

    it('should display password requirements', () => {
      render(<PasswordStrengthIndicator password="test" />);
      
      expect(screen.getByText('حداقل ۸ کاراکتر')).toBeInTheDocument();
      expect(screen.getByText('حداقل یک حرف بزرگ')).toBeInTheDocument();
      expect(screen.getByText('حداقل یک حرف کوچک')).toBeInTheDocument();
      expect(screen.getByText('حداقل یک عدد')).toBeInTheDocument();
      expect(screen.getByText('حداقل یک کاراکتر خاص')).toBeInTheDocument();
    });

    it('should show security tips', () => {
      render(<PasswordStrengthIndicator password="test" />);
      
      expect(screen.getByText('نکات امنیتی:')).toBeInTheDocument();
      expect(screen.getByText('• از ترکیب حروف، اعداد و نمادها استفاده کنید')).toBeInTheDocument();
    });
  });

  describe('RoleBasedRoute Component', () => {
    it('should redirect unauthenticated users to login', () => {
      render(
        <TestWrapper>
          <RoleBasedRoute allowedRoles={['admin']}>
            <div>Protected Content</div>
          </RoleBasedRoute>
        </TestWrapper>
      );

      // Should redirect to login (this would be handled by router in real app)
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should show access denied for insufficient permissions', () => {
      // Mock authenticated user with viewer role
      vi.mocked(apiService.getCurrentUser).mockResolvedValue({
        ...mockUser,
        role: 'viewer'
      });

      render(
        <TestWrapper>
          <RoleBasedRoute allowedRoles={['admin']}>
            <div>Admin Content</div>
          </RoleBasedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('دسترسی محدود')).toBeInTheDocument();
      expect(screen.getByText('شما دسترسی لازم را ندارید')).toBeInTheDocument();
    });

    it('should allow access for authorized roles', () => {
      // Mock authenticated user with admin role
      vi.mocked(apiService.getCurrentUser).mockResolvedValue({
        ...mockUser,
        role: 'admin'
      });

      render(
        <TestWrapper>
          <RoleBasedRoute allowedRoles={['admin', 'lawyer']}>
            <div>Admin Content</div>
          </RoleBasedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });
  });

  describe('TwoFactorSetup Component', () => {
    it('should render two-factor setup form', () => {
      render(
        <TestWrapper>
          <TwoFactorSetup />
        </TestWrapper>
      );

      expect(screen.getByText('احراز هویت دو مرحله‌ای')).toBeInTheDocument();
      expect(screen.getByText('امنیت حساب کاربری خود را افزایش دهید')).toBeInTheDocument();
    });

    it('should show app recommendations', () => {
      render(
        <TestWrapper>
          <TwoFactorSetup />
        </TestWrapper>
      );

      expect(screen.getByText('Google Authenticator')).toBeInTheDocument();
      expect(screen.getByText('Authy')).toBeInTheDocument();
    });

    it('should display QR code', () => {
      render(
        <TestWrapper>
          <TwoFactorSetup />
        </TestWrapper>
      );

      expect(screen.getByAltText('QR Code')).toBeInTheDocument();
    });

    it('should show manual entry option', () => {
      render(
        <TestWrapper>
          <TwoFactorSetup />
        </TestWrapper>
      );

      expect(screen.getByText('یا به صورت دستی وارد کنید:')).toBeInTheDocument();
    });
  });

  describe('Authentication Integration', () => {
    it('should handle complete login flow', async () => {
      vi.mocked(apiService.login).mockResolvedValue({
        success: true,
        message: 'ورود موفقیت‌آمیز',
        user: mockUser,
        token: 'mock-token'
      });

      vi.mocked(apiService.getCurrentUser).mockResolvedValue(mockUser);

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText('ایمیل');
      const passwordInput = screen.getByLabelText('رمز عبور');
      const submitButton = screen.getByRole('button', { name: /ورود/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(apiService.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        });
      });

      // Check if token is stored
      if (typeof localStorage !== 'undefined') {
        expect(localStorage.getItem('auth_token')).toBe('mock-token');
      }
    });

    it('should handle token refresh', async () => {
      vi.mocked(apiService.refreshToken).mockResolvedValue({
        success: true,
        token: 'new-token'
      });

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('auth_token', 'old-token');
      }

      render(
        <TestWrapper>
          <div>Test Content</div>
        </TestWrapper>
      );

      // In a real app, this would be triggered by an API call
      await waitFor(() => {
        expect(apiService.refreshToken).toHaveBeenCalled();
      });
    });

    it('should handle logout', async () => {
      vi.mocked(apiService.logout).mockResolvedValue({
        success: true,
        message: 'خروج موفقیت‌آمیز'
      });

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('auth_token', 'mock-token');
      }

      render(
        <TestWrapper>
          <UserProfile />
        </TestWrapper>
      );

      const logoutButton = screen.getByText('خروج');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(apiService.logout).toHaveBeenCalled();
      });

      if (typeof localStorage !== 'undefined') {
        expect(localStorage.getItem('auth_token')).toBeNull();
      }
    });
  });

  describe('Persian Text Support', () => {
    it('should handle Persian text in all forms', () => {
      render(
        <TestWrapper>
          <div>
            <LoginForm />
            <RegisterForm />
          </div>
        </TestWrapper>
      );

      // Check Persian text rendering
      expect(screen.getByText('ورود به سیستم')).toBeInTheDocument();
      expect(screen.getByText('ثبت‌نام')).toBeInTheDocument();
      expect(screen.getByText('آرشیو حقوقی ایران')).toBeInTheDocument();
    });

    it('should handle Persian error messages', async () => {
      vi.mocked(apiService.login).mockResolvedValue({
        success: false,
        message: 'ایمیل یا رمز عبور اشتباه است'
      });

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText('ایمیل');
      const passwordInput = screen.getByLabelText('رمز عبور');
      const submitButton = screen.getByRole('button', { name: /ورود/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('ایمیل یا رمز عبور اشتباه است')).toBeInTheDocument();
      });
    });

    it('should handle Persian success messages', async () => {
      vi.mocked(apiService.register).mockResolvedValue({
        success: true,
        message: 'ثبت‌نام موفقیت‌آمیز',
        user: mockUser
      });

      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );

      const nameInput = screen.getByLabelText('نام');
      const emailInput = screen.getByLabelText('ایمیل');
      const passwordInput = screen.getByLabelText('رمز عبور');
      const confirmPasswordInput = screen.getByLabelText('تکرار رمز عبور');
      const submitButton = screen.getByRole('button', { name: /ثبت‌نام/i });

      fireEvent.change(nameInput, { target: { value: 'کاربر جدید' } });
      fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'NewPassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('ثبت‌نام موفقیت‌آمیز')).toBeInTheDocument();
      });
    });
  });

  describe('Security Features', () => {
    it('should validate password strength', () => {
      render(<PasswordStrengthIndicator password="weak" />);
      expect(screen.getByText('ضعیف')).toBeInTheDocument();

      render(<PasswordStrengthIndicator password="StrongPassword123!" />);
      expect(screen.getByText('قوی')).toBeInTheDocument();
    });

    it('should handle rate limiting', async () => {
      vi.mocked(apiService.login).mockRejectedValue(new Error('Rate limit exceeded'));

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText('ایمیل');
      const passwordInput = screen.getByLabelText('رمز عبور');
      const submitButton = screen.getByRole('button', { name: /ورود/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('خطا در اتصال به سرور')).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      vi.mocked(apiService.login).mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText('ایمیل');
      const passwordInput = screen.getByLabelText('رمز عبور');
      const submitButton = screen.getByRole('button', { name: /ورود/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('خطا در اتصال به سرور')).toBeInTheDocument();
      });
    });
  });
});