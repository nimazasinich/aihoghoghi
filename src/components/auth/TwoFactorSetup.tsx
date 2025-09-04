import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Smartphone, Key, CheckCircle, AlertCircle, Copy, Eye, EyeOff } from 'lucide-react';
import { apiService } from '../../services/apiService';

interface TwoFactorSetupProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

interface TwoFactorData {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({
  onComplete,
  onCancel
}) => {
  const [step, setStep] = useState<'setup' | 'verify' | 'complete'>('setup');
  const [twoFactorData, setTwoFactorData] = useState<TwoFactorData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    initializeTwoFactor();
  }, []);

  const initializeTwoFactor = async () => {
    setIsLoading(true);
    setError('');

    try {
      // This would be a real API call in production
      const mockData: TwoFactorData = {
        secret: 'JBSWY3DPEHPK3PXP',
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        backupCodes: [
          '12345678',
          '87654321',
          '11223344',
          '44332211',
          '55667788',
          '88776655',
          '99887766',
          '66778899'
        ]
      };

      setTwoFactorData(mockData);
    } catch (err) {
      setError('خطا در راه‌اندازی احراز هویت دو مرحله‌ای');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('کد تایید باید ۶ رقم باشد');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // This would be a real API call in production
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock verification - in real app, verify with backend
      if (verificationCode === '123456') {
        setStep('complete');
      } else {
        setError('کد تایید نامعتبر است');
      }
    } catch (err) {
      setError('خطا در تایید کد');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, codeType: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(codeType);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadBackupCodes = () => {
    if (!twoFactorData) return;

    const content = `کدهای پشتیبان احراز هویت دو مرحله‌ای
تاریخ ایجاد: ${new Date().toLocaleDateString('fa-IR')}

${twoFactorData.backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}

نکات مهم:
- این کدها را در جای امن نگهداری کنید
- هر کد فقط یک بار قابل استفاده است
- در صورت گم کردن تلفن، از این کدها استفاده کنید
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading && !twoFactorData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="mr-3 text-gray-600">در حال راه‌اندازی...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-white" />
            <div>
              <h2 className="text-2xl font-bold text-white">
                احراز هویت دو مرحله‌ای
              </h2>
              <p className="text-blue-100">
                امنیت حساب کاربری خود را افزایش دهید
              </p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {step === 'setup' && twoFactorData && (
              <motion.div
                key="setup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    مرحله ۱: نصب اپلیکیشن احراز هویت
                  </h3>
                  <p className="text-gray-600">
                    یکی از اپلیکیشن‌های زیر را روی تلفن خود نصب کنید
                  </p>
                </div>

                {/* App Recommendations */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-gray-200 rounded-lg text-center">
                    <div className="text-2xl mb-2">📱</div>
                    <div className="font-medium">Google Authenticator</div>
                    <div className="text-sm text-gray-600">Google Play / App Store</div>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg text-center">
                    <div className="text-2xl mb-2">🔐</div>
                    <div className="font-medium">Authy</div>
                    <div className="text-sm text-gray-600">Google Play / App Store</div>
                  </div>
                </div>

                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    مرحله ۲: اسکن QR کد
                  </h3>
                  <p className="text-gray-600 mb-4">
                    QR کد زیر را با اپلیکیشن احراز هویت اسکن کنید
                  </p>
                </div>

                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                    <img
                      src={twoFactorData.qrCode}
                      alt="QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                </div>

                {/* Manual Entry */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      یا به صورت دستی وارد کنید:
                    </span>
                    <button
                      onClick={() => copyToClipboard(twoFactorData.secret, 'secret')}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Copy className="w-4 h-4" />
                      {copiedCode === 'secret' ? 'کپی شد!' : 'کپی'}
                    </button>
                  </div>
                  <div className="font-mono text-sm bg-white p-2 rounded border">
                    {twoFactorData.secret}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('verify')}
                    className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    ادامه
                  </button>
                  {onCancel && (
                    <button
                      onClick={onCancel}
                      className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      انصراف
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {step === 'verify' && (
              <motion.div
                key="verify"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    مرحله ۳: تایید کد
                  </h3>
                  <p className="text-gray-600">
                    کد ۶ رقمی نمایش داده شده در اپلیکیشن را وارد کنید
                  </p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-red-700 text-sm">{error}</p>
                  </motion.div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      کد تایید
                    </label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl font-mono tracking-widest"
                      maxLength={6}
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Key className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <div className="font-medium mb-1">نکته:</div>
                        <p>کد تایید هر ۳۰ ثانیه تغییر می‌کند. اگر کد منقضی شد، منتظر کد جدید بمانید.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleVerifyCode}
                    disabled={isLoading || verificationCode.length !== 6}
                    className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'در حال تایید...' : 'تایید کد'}
                  </button>
                  <button
                    onClick={() => setStep('setup')}
                    className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    بازگشت
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'complete' && twoFactorData && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    احراز هویت دو مرحله‌ای فعال شد!
                  </h3>
                  <p className="text-gray-600">
                    حساب کاربری شما اکنون محافظت بیشتری دارد
                  </p>
                </div>

                {/* Backup Codes */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <div className="font-medium mb-1">کدهای پشتیبان مهم!</div>
                      <p>این کدها را در جای امن نگهداری کنید. در صورت گم کردن تلفن، از این کدها استفاده کنید.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      کدهای پشتیبان:
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowBackupCodes(!showBackupCodes)}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                      >
                        {showBackupCodes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {showBackupCodes ? 'مخفی' : 'نمایش'}
                      </button>
                      <button
                        onClick={downloadBackupCodes}
                        className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
                      >
                        <Copy className="w-4 h-4" />
                        دانلود
                      </button>
                    </div>
                  </div>

                  {showBackupCodes && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="grid grid-cols-2 gap-2"
                    >
                      {twoFactorData.backupCodes.map((code, index) => (
                        <div
                          key={index}
                          className="font-mono text-sm bg-white p-2 rounded border text-center"
                        >
                          {code}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>

                <div className="flex gap-3">
                  {onComplete && (
                    <button
                      onClick={onComplete}
                      className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                      تکمیل
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};