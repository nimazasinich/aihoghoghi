import React, { useState } from 'react';
import { User, Mail, Shield, Calendar, LogOut, Edit3, Save, X, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { fa } from 'date-fns/locale';

export const UserProfile: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        updateUser(formData);
        setMessage({ type: 'success', text: 'پروفایل با موفقیت به‌روزرسانی شد' });
        setIsEditing(false);
      } else {
        setMessage({ type: 'error', text: result.message || 'خطا در به‌روزرسانی پروفایل' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'خطا در اتصال به سرور' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'رمز عبور جدید و تکرار آن مطابقت ندارند' });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'رمز عبور جدید باید حداقل 8 کاراکتر باشد' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMessage({ type: 'success', text: 'رمز عبور با موفقیت تغییر کرد' });
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowPasswordForm(false);
      } else {
        setMessage({ type: 'error', text: result.message || 'خطا در تغییر رمز عبور' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'خطا در اتصال به سرور' });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleName = (role: string) => {
    const roleNames: Record<string, string> = {
      admin: 'مدیر سیستم',
      lawyer: 'وکیل',
      researcher: 'پژوهشگر',
      viewer: 'مشاهده‌گر'
    };
    return roleNames[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      lawyer: 'bg-blue-100 text-blue-800',
      researcher: 'bg-green-100 text-green-800',
      viewer: 'bg-gray-100 text-gray-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">کاربر یافت نشد</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{user.name}</h1>
              <p className="text-blue-100">{getRoleName(user.role)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`rounded-lg p-4 ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-700' 
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">اطلاعات شخصی</h2>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  ویرایش
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    ذخیره
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        name: user.name,
                        email: user.email
                      });
                    }}
                    className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    لغو
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نام و نام خانوادگی
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                  />
                ) : (
                  <p className="text-gray-900 py-3">{user.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ایمیل
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                    dir="ltr"
                  />
                ) : (
                  <p className="text-gray-900 py-3" dir="ltr">{user.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Password Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">رمز عبور</h2>
              {!showPasswordForm ? (
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  تغییر رمز عبور
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                  }}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                  لغو
                </button>
              )}
            </div>

            {showPasswordForm ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رمز عبور فعلی
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رمز عبور جدید
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تکرار رمز عبور جدید
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'در حال تغییر...' : 'تغییر رمز عبور'}
                </button>
              </div>
            ) : (
              <p className="text-gray-600">رمز عبور شما امن است</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Status */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">وضعیت حساب</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">نقش کاربری</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user.role)}`}>
                  {getRoleName(user.role)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">وضعیت</span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  فعال
                </span>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">اطلاعات حساب</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <span className="text-gray-600" dir="ltr">{user.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-gray-400" />
                <span className="text-gray-600">{getRoleName(user.role)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span className="text-gray-600">
                  {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { 
                    addSuffix: true, 
                    locale: fa 
                  }) : 'نامشخص'}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">عملیات</h3>
            <div className="space-y-3">
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 text-red-600 hover:text-red-700 transition-colors p-3 rounded-lg hover:bg-red-50"
              >
                <LogOut className="w-5 h-5" />
                خروج از حساب
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};