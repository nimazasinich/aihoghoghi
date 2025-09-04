/**
 * Persian Text Testing Matchers
 * Comprehensive utilities for testing Persian/Farsi text handling
 */

import { expect } from 'vitest';

// Persian text validation utilities
export const persianMatchers = {
  // Check if text contains Persian characters
  toContainPersian: (received: string) => {
    const persianRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    const pass = persianRegex.test(received);
    
    return {
      message: () => pass 
        ? `Expected "${received}" not to contain Persian characters`
        : `Expected "${received}" to contain Persian characters`,
      pass
    };
  },

  // Check if text is properly RTL formatted
  toBeRTLFormatted: (received: string) => {
    const hasRTLChars = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(received);
    const hasProperDirection = received.includes('dir="rtl"') || received.includes('direction: rtl');
    
    const pass = hasRTLChars && hasProperDirection;
    
    return {
      message: () => pass
        ? `Expected "${received}" not to be RTL formatted`
        : `Expected "${received}" to be RTL formatted with proper direction attributes`,
      pass
    };
  },

  // Check if Persian text is properly normalized
  toBePersianNormalized: (received: string) => {
    // Check for common Persian normalization issues
    const hasMixedNumbers = /[\u06F0-\u06F9].*[\u0030-\u0039]|[\u0030-\u0039].*[\u06F0-\u06F9]/.test(received);
    const hasProperSpacing = !/\s{2,}/.test(received); // No double spaces
    const hasProperPunctuation = !/[،؛؟]{2,}/.test(received); // No repeated Persian punctuation
    
    const pass = !hasMixedNumbers && hasProperSpacing && hasProperPunctuation;
    
    return {
      message: () => pass
        ? `Expected "${received}" not to be Persian normalized`
        : `Expected "${received}" to be properly normalized (no mixed numbers, proper spacing, no repeated punctuation)`,
      pass
    };
  },

  // Check if text contains legal Persian terms
  toContainLegalTerms: (received: string) => {
    const legalTerms = [
      'قانون', 'ماده', 'بند', 'تبصره', 'مقررات', 'آیین\u200cنامه',
      'دستورالعمل', 'بخشنامه', 'رأی', 'حکم', 'دادگاه', 'قاضی',
      'وکیل', 'شاکی', 'متهم', 'محکوم', 'برائت', 'محکومیت',
      'قضائیه', 'مجلس', 'دیوان', 'دادگاه', 'وزارت', 'دادگستری'
    ];
    
    const foundTerms = legalTerms.filter(term => received.includes(term));
    const pass = foundTerms.length > 0;
    
    return {
      message: () => pass
        ? `Expected "${received}" not to contain legal terms, but found: ${foundTerms.join(', ')}`
        : `Expected "${received}" to contain Persian legal terms`,
      pass
    };
  }
};

// Persian text test data
export const persianTestData = {
  // Common Persian legal terms
  legalTerms: [
    'قانون اساسی جمهوری اسلامی ایران',
    'ماده ۱ قانون مدنی',
    'بند الف تبصره ۲',
    'آیین\u200cنامه اجرایی',
    'دستورالعمل اجرایی',
    'رأی دادگاه تجدیدنظر',
    'حکم قطعی',
    'وکیل مدافع',
    'شاکی خصوصی',
    'متهم اصلی'
  ],

  // Persian numbers (both forms)
  numbers: {
    western: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    persian: ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
  },

  // Persian punctuation
  punctuation: {
    comma: '،',
    semicolon: '؛',
    question: '؟',
    exclamation: '!'
  },

  // Sample legal documents
  sampleDocuments: [
    {
      title: 'قانون اساسی جمهوری اسلامی ایران',
      content: 'ماده ۱: حکومت ایران جمهوری اسلامی است که ملت ایران، بر اساس اعتقاد دیرینه اش به حکومت حق و عدل قرآن، در پی انقلاب اسلامی پیروزمند خود به رهبری مرجع عالیقدر تقلید آیت الله العظمی امام خمینی، در همه پرسی دهم و یازدهم فروردین ماه یک هزار و سیصد و پنجاه و هشت هجری شمسی برابر با اول و دوم جمادی الاولی سال یک هزار و سیصد و نود و نه هجری قمری با اکثریت ۲/۹۸ درصد کلیه کسانی که حق رأی داشتند، به آن رأی مثبت داد.',
      category: 'constitutional'
    },
    {
      title: 'ماده ۱ قانون مدنی',
      content: 'مصوبات مجلس شورای اسلامی پس از طی مراحل قانونی به رئیس جمهور ابلاغ می\u200cگردد. رئیس جمهور باید ظرف پنج روز آن را امضا و به مجریان ابلاغ نماید و دستور انتشار آن را صادر کند و روزنامه رسمی موظف است ظرف ۷۲ ساعت پس از ابلاغ، آن را منتشر نماید.',
      category: 'civil'
    }
  ],

  // Persian search queries
  searchQueries: [
    'قانون اساسی',
    'ماده ۱',
    'دادگاه تجدیدنظر',
    'وکیل مدافع',
    'حکم قطعی',
    'رأی دیوان عالی کشور'
  ]
};

// Utility functions for Persian text testing
export const persianUtils = {
  // Convert Western numbers to Persian
  toPersianNumbers: (text: string): string => {
    const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return text.replace(/[0-9]/g, (digit) => persianNumbers[parseInt(digit)]);
  },

  // Convert Persian numbers to Western
  toWesternNumbers: (text: string): string => {
    const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return text.replace(/[\u06F0-\u06F9]/g, (digit) => {
      const index = persianNumbers.indexOf(digit);
      return index !== -1 ? index.toString() : digit;
    });
  },

  // Normalize Persian text
  normalizePersian: (text: string): string => {
    return text
      .replace(/\u200C/g, '') // Remove zero-width non-joiner
      .replace(/\u200D/g, '') // Remove zero-width joiner
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[!]{2,}/g, '!') // Remove repeated exclamation marks
      .trim();
  },

  // Check if text is Persian
  isPersian: (text: string): boolean => {
    const persianRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    return persianRegex.test(text);
  },

  // Extract legal terms from text
  extractLegalTerms: (text: string): string[] => {
    const legalTerms = [
      'قانون', 'ماده', 'بند', 'تبصره', 'مقررات', 'آیین\u200cنامه',
      'دستورالعمل', 'بخشنامه', 'رأی', 'حکم', 'دادگاه', 'قاضی',
      'وکیل', 'شاکی', 'متهم', 'محکوم', 'برائت', 'محکومیت',
      'قضائیه', 'مجلس', 'دیوان', 'دادگاه', 'وزارت', 'دادگستری'
    ];
    
    return legalTerms.filter(term => text.includes(term));
  },

  // Get Persian text direction
  getDirection: (text: string): 'rtl' | 'ltr' => {
    return persianUtils.isPersian(text) ? 'rtl' : 'ltr';
  },

  // Validate Persian legal document structure
  validateLegalDocument: (text: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Check for required legal elements
    if (!text.includes('ماده') && !text.includes('بند') && !text.includes('تبصره')) {
      errors.push('Document should contain legal structure elements (ماده, بند, تبصره)');
    }
    
    // Check for proper Persian formatting
    if (!persianUtils.isPersian(text)) {
      errors.push('Document should contain Persian text');
    }
    
    // Check for mixed number systems
    const hasWesternNumbers = /[0-9]/.test(text);
    const hasPersianNumbers = /[\u06F0-\u06F9]/.test(text);
    if (hasWesternNumbers && hasPersianNumbers) {
      errors.push('Document should use consistent number system');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

// Extend Vitest matchers
declare module 'vitest' {
  interface Assertion<T = any> {
    toContainPersian(): T;
    toBeRTLFormatted(): T;
    toBePersianNormalized(): T;
    toContainLegalTerms(): T;
  }
  
  interface AsymmetricMatchersContaining {
    toContainPersian(): any;
    toBeRTLFormatted(): any;
    toBePersianNormalized(): any;
    toContainLegalTerms(): any;
  }
}

// Register custom matchers
expect.extend(persianMatchers);