import React from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  {
    label: 'حداقل ۸ کاراکتر',
    test: (password) => password.length >= 8
  },
  {
    label: 'حداقل یک حرف بزرگ',
    test: (password) => /[A-Z]/.test(password)
  },
  {
    label: 'حداقل یک حرف کوچک',
    test: (password) => /[a-z]/.test(password)
  },
  {
    label: 'حداقل یک عدد',
    test: (password) => /\d/.test(password)
  },
  {
    label: 'حداقل یک کاراکتر خاص',
    test: (password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  }
];

const getPasswordStrength = (password: string): {
  score: number;
  label: string;
  color: string;
} => {
  const passedRequirements = requirements.filter(req => req.test(password)).length;
  const score = (passedRequirements / requirements.length) * 100;

  if (score < 40) {
    return { score, label: 'ضعیف', color: 'red' };
  } else if (score < 70) {
    return { score, label: 'متوسط', color: 'orange' };
  } else if (score < 90) {
    return { score, label: 'قوی', color: 'blue' };
  } else {
    return { score, label: 'خیلی قوی', color: 'green' };
  }
};

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  className = ''
}) => {
  const strength = getPasswordStrength(password);
  const passedRequirements = requirements.filter(req => req.test(password));

  if (!password) {
    return null;
  }

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'red':
        return 'bg-red-500';
      case 'orange':
        return 'bg-orange-500';
      case 'blue':
        return 'bg-blue-500';
      case 'green':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTextColorClasses = (color: string) => {
    switch (color) {
      case 'red':
        return 'text-red-600';
      case 'orange':
        return 'text-orange-600';
      case 'blue':
        return 'text-blue-600';
      case 'green':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={`space-y-3 ${className}`}
      dir="rtl"
    >
      {/* Strength Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">قدرت رمز عبور:</span>
          <span className={`text-sm font-medium ${getTextColorClasses(strength.color)}`}>
            {strength.label}
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${strength.score}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`h-2 rounded-full ${getColorClasses(strength.color)}`}
          />
        </div>
      </div>

      {/* Requirements List */}
      <div className="space-y-2">
        {requirements.map((requirement, index) => {
          const isPassed = requirement.test(password);
          
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center gap-2 text-sm ${
                isPassed ? 'text-green-600' : 'text-gray-500'
              }`}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 + 0.2 }}
                className={`w-4 h-4 rounded-full flex items-center justify-center ${
                  isPassed ? 'bg-green-100' : 'bg-gray-100'
                }`}
              >
                {isPassed ? (
                  <Check className="w-3 h-3 text-green-600" />
                ) : (
                  <X className="w-3 h-3 text-gray-400" />
                )}
              </motion.div>
              <span className={isPassed ? 'line-through' : ''}>
                {requirement.label}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Additional Security Tips */}
      {password.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-3"
        >
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">نکات امنیتی:</div>
            <ul className="space-y-1 text-xs">
              <li>• از ترکیب حروف، اعداد و نمادها استفاده کنید</li>
              <li>• از اطلاعات شخصی در رمز عبور استفاده نکنید</li>
              <li>• رمز عبور را با کسی به اشتراک نگذارید</li>
              <li>• به طور منظم رمز عبور خود را تغییر دهید</li>
            </ul>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};