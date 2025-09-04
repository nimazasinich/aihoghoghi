import { describe, it, expect } from 'vitest';
import { persianTestUtils } from './utils/persianTextMatchers';

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