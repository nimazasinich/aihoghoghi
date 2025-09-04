import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import type { RegisterData } from '../../types';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ 
  onSuccess, 
  onSwitchToLogin 
}) => {
  const { register } = useAuth();
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    name: '',
    role: 'viewer'
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear messages when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    if (error) setError('');
    if (success) setSuccess('');
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'نام الزامی است';
    }
    
    if (!formData.email.trim()) {
      return 'ایمیل الزامی است';
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return 'فرمت ایمیل نامعتبر است';
    }
    
    if (!formData.password) {
      return 'رمز عبور الزامی است';
    }
    
    if (formData.password.length < 8) {
      return 'رمز عبور باید حداقل 8 کاراکتر باشد';
    }
    
    if (!/(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?])/.test(formData.password)) {
      return 'رمز عبور باید شامل حروف، اعداد و نمادها باشد';
    }
    
    if (formData.password !== confirmPassword) {
      return 'رمز عبور و تکرار آن مطابقت ندارند';
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await register(formData);
      
      if (result.success) {
        setSuccess(result.message);
        // Clear form
        setFormData({
          email: '',
          password: '',
          name: '',
          role: 'viewer'
        });
        setConfirmPassword('');
        
        // Call success callback after a delay
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('خطا در اتصال به سرور');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.name && formData.email && formData.password && confirmPassword;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 px-8 py-6">
          <h2 className="text-2xl font-bold text-white text-center">
            ثبت نام
          </h2>
          <p className="text-green-100 text-center mt-2">
            ایجاد حساب کاربری جدید
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

          {/* Success Message */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3"
              >
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-green-700 text-sm">{success}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Name Field */}
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              نام و نام خانوادگی
            </label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="نام و نام خانوادگی خود را وارد کنید"
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-right"
                required
              />
            </div>
          </div>

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
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-right"
                dir="ltr"
                required
              />
            </div>
          </div>

          {/* Role Field */}
          <div className="space-y-2">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              نقش کاربری
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-right"
            >
              <option value="viewer">مشاهده‌گر</option>
              <option value="researcher">پژوهشگر</option>
              <option value="lawyer">وکیل</option>
            </select>
            <p className="text-xs text-gray-500">
              نقش مدیر فقط توسط مدیران سیستم قابل تخصیص است
            </p>
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
                className="w-full pr-10 pl-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-right"
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
            <div className="text-xs text-gray-500 space-y-1">
              <p>رمز عبور باید شامل:</p>
              <ul className="list-disc list-inside space-y-1 mr-4">
                <li>حداقل 8 کاراکتر</li>
                <li>حروف انگلیسی</li>
                <li>اعداد</li>
                <li>نمادهای خاص</li>
              </ul>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              تکرار رمز عبور
            </label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                placeholder="رمز عبور را مجدداً وارد کنید"
                className="w-full pr-10 pl-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-right"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-start">
            <input
              type="checkbox"
              id="terms"
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-1"
              required
            />
            <label htmlFor="terms" className="mr-2 text-sm text-gray-600">
              با{' '}
              <a href="#" className="text-green-600 hover:text-green-700">
                شرایط و قوانین
              </a>{' '}
              و{' '}
              <a href="#" className="text-green-600 hover:text-green-700">
                حریم خصوصی
              </a>{' '}
              موافقم
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                در حال ثبت نام...
              </>
            ) : (
              'ثبت نام'
            )}
          </button>

          {/* Switch to Login */}
          {onSwitchToLogin && (
            <div className="text-center">
              <p className="text-gray-600">
                قبلاً ثبت نام کرده‌اید؟{' '}
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-green-600 hover:text-green-700 font-medium transition-colors"
                >
                  وارد شوید
                </button>
              </p>
            </div>
          )}
        </form>
      </div>
    </motion.div>
  );
};