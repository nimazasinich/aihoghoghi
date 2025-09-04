import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import type { LoginCredentials } from '../../types';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ 
  onSuccess, 
  onSwitchToRegister 
}) => {
  const { login, isLoading } = useAuth();
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const result = await login(formData);
      
      if (result.success) {
        onSuccess?.();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('خطا در اتصال به سرور');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.email && formData.password;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6">
          <h2 className="text-2xl font-bold text-white text-center">
            ورود به سیستم
          </h2>
          <p className="text-blue-100 text-center mt-2">
            آرشیو حقوقی ایران
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-red-700 text-sm">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email Field */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              ایمیل
            </label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="ایمیل خود را وارد کنید"
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-right"
                dir="ltr"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              رمز عبور
            </label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="رمز عبور خود را وارد کنید"
                className="w-full pr-10 pl-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-right"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="mr-2 text-sm text-gray-600">مرا به خاطر بسپار</span>
            </label>
            <button
              type="button"
              className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              فراموشی رمز عبور؟
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                در حال ورود...
              </>
            ) : (
              'ورود'
            )}
          </button>

          {/* Switch to Register */}
          {onSwitchToRegister && (
            <div className="text-center">
              <p className="text-gray-600">
                حساب کاربری ندارید؟{' '}
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  ثبت نام کنید
                </button>
              </p>
            </div>
          )}
        </form>

        {/* Demo Credentials */}
        <div className="px-8 pb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              اطلاعات ورود پیش‌فرض:
            </h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>ایمیل:</strong> admin@iranian-legal-archive.ir</p>
              <p><strong>رمز عبور:</strong> admin123!@#</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};