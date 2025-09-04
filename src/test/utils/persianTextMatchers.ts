import { expect } from 'vitest';

export interface PersianTextMatchers {
  toContainPersianText(expected: string): void;
  toBeValidPersianText(): void;
  toHavePersianDirection(): void;
  toBeRTLText(): void;
}

declare global {
  namespace Vi {
    interface Assertion<T = any> extends PersianTextMatchers {}
    interface AsymmetricMatchersContaining extends PersianTextMatchers {}
  }
}

export const persianTextMatchers = {
  toContainPersianText: (received: string, expected: string) => {
    const persianRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    const hasPersian = persianRegex.test(received);
    const containsExpected = received.includes(expected);
    
    return {
      pass: hasPersian && containsExpected,
      message: () => `Expected "${received}" to contain Persian text "${expected}"`,
      expected,
      received
    };
  },
  
  toBeValidPersianText: (received: string) => {
    const persianRegex = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\d\.,!?؛:()]+$/;
    const isValid = persianRegex.test(received);
    
    return {
      pass: isValid,
      message: () => `Expected "${received}" to be valid Persian text`,
      expected: 'valid Persian text',
      received
    };
  },
  
  toHavePersianDirection: (received: string) => {
    const rtlRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    const hasRTL = rtlRegex.test(received);
    
    return {
      pass: hasRTL,
      message: () => `Expected "${received}" to have Persian/RTL direction`,
      expected: 'Persian/RTL text',
      received
    };
  },
  
  toBeRTLText: (received: string) => {
    const rtlRegex = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\d\.,!?؛:()]+$/;
    const isRTL = rtlRegex.test(received);
    
    return {
      pass: isRTL,
      message: () => `Expected "${received}" to be RTL text`,
      expected: 'RTL text',
      received
    };
  }
};

// Persian text testing utilities
export const persianTestUtils = {
  // Generate random Persian text for testing
  generatePersianText: (length = 10) => {
    const persianChars = 'ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += persianChars.charAt(Math.floor(Math.random() * persianChars.length));
    }
    return result;
  },
  
  // Generate Persian legal terms
  generateLegalTerms: () => [
    'قانون مدنی',
    'قانون تجارت',
    'قانون کار',
    'قانون مجازات اسلامی',
    'قانون آیین دادرسی مدنی',
    'قانون آیین دادرسی کیفری',
    'قانون اساسی',
    'قانون انتخابات',
    'قانون مالیات',
    'قانون بیمه'
  ],
  
  // Test Persian text normalization
  normalizePersianText: (text: string) => {
    return text
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/ة/g, 'ه')
      .trim();
  },
  
  // Validate Persian text structure
  validatePersianStructure: (text: string) => {
    const persianRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    const hasPersian = persianRegex.test(text);
    const hasValidLength = text.length > 0 && text.length < 1000;
    const hasValidChars = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\d\.,!?؛:()]+$/.test(text);
    
    return {
      hasPersian,
      hasValidLength,
      hasValidChars,
      isValid: hasPersian && hasValidLength && hasValidChars
    };
  }
};