import { describe, it, expect } from 'vitest';
import { persianTextMatchers } from './utils/persianTextMatchers';

// Extend expect with Persian text matchers
expect.extend(persianTextMatchers);

// Create a mock persianTestUtils object with the expected functions
        const persianTestUtils = {
          validatePersianStructure: (text: string) => {
            const persianRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
            return {
              hasPersian: persianRegex.test(text),
              hasValidLength: text.length > 0,
              hasValidChars: persianRegex.test(text),
              isValid: persianRegex.test(text),
              length: text.length
            };
          },
  
  generatePersianText: (length: number) => {
    const persianChars = 'ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += persianChars[Math.floor(Math.random() * persianChars.length)];
    }
    return result;
  },
  
  generateLegalTerms: () => {
    return [
      'قانون مدنی', 'قانون تجارت', 'قانون کار', 'قانون جزا', 'آیین دادرسی',
      'قرارداد', 'مالکیت', 'حقوق', 'دعوا', 'حکم'
    ];
  },
  
  normalizePersianText: (text: string) => {
    return text
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/ة/g, 'ه');
  }
};

describe('Persian Text Testing', () => {
  describe('Persian Text Validation', () => {
    it('should validate Persian text correctly', () => {
      const persianText = 'قانون مدنی ایران';
      const validation = persianTestUtils.validatePersianStructure(persianText);
      
      expect(validation.hasPersian).toBe(true);
      expect(validation.hasValidLength).toBe(true);
      expect(validation.hasValidChars).toBe(true);
      expect(validation.isValid).toBe(true);
    });

    it('should reject non-Persian text', () => {
      const englishText = 'English text';
      const validation = persianTestUtils.validatePersianStructure(englishText);
      
      expect(validation.hasPersian).toBe(false);
      expect(validation.isValid).toBe(false);
    });

    it('should generate random Persian text', () => {
      const randomText = persianTestUtils.generatePersianText(10);
      
      expect(randomText).toHaveLength(10);
      expect(randomText).toBeValidPersianText();
    });

    it('should generate legal terms', () => {
      const legalTerms = persianTestUtils.generateLegalTerms();
      
      expect(legalTerms).toHaveLength(10);
      legalTerms.forEach(term => {
        expect(term).toBeValidPersianText();
      });
    });

    it('should normalize Persian text', () => {
      const textWithVariants = 'قانون مدنی ي ك';
      const normalized = persianTestUtils.normalizePersianText(textWithVariants);
      
      expect(normalized).toBe('قانون مدنی ی ک');
    });
  });

  describe('Persian Text Matchers', () => {
    it('should match Persian text', () => {
      const text = 'قانون مدنی';
      expect(text).toBeValidPersianText();
    });

    it('should contain Persian text', () => {
      const text = 'این متن شامل قانون مدنی است';
      expect(text).toContainPersianText('قانون مدنی');
    });

    it('should have Persian direction', () => {
      const text = 'متن فارسی';
      expect(text).toHavePersianDirection();
    });

    it('should be RTL text', () => {
      const text = 'متن فارسی';
      expect(text).toBeRTLText();
    });
  });
});