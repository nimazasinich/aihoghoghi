import { expect } from 'vitest';

/**
 * Persian Text Testing Matchers - The most comprehensive Persian text testing utilities ever built!
 * These matchers ensure our legal archive system handles Persian text perfectly.
 */

export const persianTextMatchers = {
  /**
   * Check if text contains Persian characters and expected content
   */
  toContainPersianText: (received: string, expected: string) => {
    const persianRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    const hasPersian = persianRegex.test(received);
    const containsExpected = received.includes(expected);
    
    return {
      pass: hasPersian && containsExpected,
      message: () => `Expected "${received}" to contain Persian text "${expected}"`
    };
  },
  
  /**
   * Validate if text is properly formatted Persian text
   */
  toBeValidPersianText: (received: string) => {
    const persianRegex = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\d\.,!?؛:()]+$/;
    const isValid = persianRegex.test(received);
    
    return {
      pass: isValid,
      message: () => `Expected "${received}" to be valid Persian text`
    };
  },
  
  /**
   * Check if text has proper RTL direction
   */
  toHavePersianDirection: (received: string) => {
    const rtlRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    const hasRTL = rtlRegex.test(received);
    
    return {
      pass: hasRTL,
      message: () => `Expected "${received}" to have Persian RTL direction`
    };
  },
  
  /**
   * Check if text is properly RTL formatted
   */
  toBeRTLText: (received: string) => {
    const rtlRegex = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\d\.,!?؛:()]+$/;
    const isRTL = rtlRegex.test(received);
    
    return {
      pass: isRTL,
      message: () => `Expected "${received}" to be RTL text`
    };
  },
  
  /**
   * Check if text contains legal Persian terms
   */
  toContainLegalTerms: (received: string) => {
    const legalTerms = [
      'قانون', 'حقوق', 'قرارداد', 'مالکیت', 'دعوا', 'حکم', 'رای', 'دادگاه',
      'قاضی', 'وکیل', 'شاهد', 'سند', 'مدرک', 'شهادت', 'اقرار', 'انکار'
    ];
    const containsLegal = legalTerms.some(term => received.includes(term));
    
    return {
      pass: containsLegal,
      message: () => `Expected "${received}" to contain legal Persian terms`
    };
  },
  
  /**
   * Check if text has proper Persian punctuation
   */
  toHavePersianPunctuation: (received: string) => {
    const persianPunctuation = /[؛،؟]/;
    const hasPersianPunct = persianPunctuation.test(received);
    
    return {
      pass: hasPersianPunct,
      message: () => `Expected "${received}" to have Persian punctuation`
    };
  }
};

// Extend expect with Persian matchers
expect.extend(persianTextMatchers);

// Declare custom matchers for TypeScript
declare module 'vitest' {
  interface Assertion<T = any> {
    toBeValidPersianText(): T;
    toContainPersianText(expected: string): T;
    toHavePersianDirection(): T;
    toBeRTLText(): T;
    toContainLegalTerms(): T;
    toHavePersianPunctuation(): T;
  }
}

export default persianTextMatchers;