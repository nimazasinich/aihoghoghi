import { describe, it, expect } from 'vitest';
import { persianTextMatchers } from './persianTextMatchers';

/**
 * Persian Text Matchers Tests - Testing our custom Persian text matchers
 */

describe('Persian Text Matchers', () => {
  describe('toContainPersianText', () => {
    it('should match Persian text correctly', () => {
      const result = persianTextMatchers.toContainPersianText('قانون مدنی ایران', 'قانون');
      expect(result.pass).toBe(true);
    });

    it('should not match non-Persian text', () => {
      const result = persianTextMatchers.toContainPersianText('English text', 'قانون');
      expect(result.pass).toBe(false);
    });
  });

  describe('toBeValidPersianText', () => {
    it('should validate Persian text correctly', () => {
      const result = persianTextMatchers.toBeValidPersianText('قانون مدنی ایران');
      expect(result.pass).toBe(true);
    });

    it('should reject mixed text', () => {
      const result = persianTextMatchers.toBeValidPersianText('قانون English مدنی');
      expect(result.pass).toBe(false);
    });
  });

  describe('toHavePersianDirection', () => {
    it('should detect Persian direction', () => {
      const result = persianTextMatchers.toHavePersianDirection('قانون مدنی');
      expect(result.pass).toBe(true);
    });

    it('should not detect Persian direction in English', () => {
      const result = persianTextMatchers.toHavePersianDirection('English text');
      expect(result.pass).toBe(false);
    });
  });

  describe('toContainLegalTerms', () => {
    it('should detect legal terms', () => {
      const result = persianTextMatchers.toContainLegalTerms('قانون مدنی ایران');
      expect(result.pass).toBe(true);
    });

    it('should not detect legal terms in non-legal text', () => {
      const result = persianTextMatchers.toContainLegalTerms('متن عادی');
      expect(result.pass).toBe(false);
    });
  });

  describe('toHavePersianPunctuation', () => {
    it('should detect Persian punctuation', () => {
      const result = persianTextMatchers.toHavePersianPunctuation('قانون مدنی؛ ماده ۱');
      expect(result.pass).toBe(true);
    });

    it('should not detect Persian punctuation in English', () => {
      const result = persianTextMatchers.toHavePersianPunctuation('English text, with punctuation.');
      expect(result.pass).toBe(false);
    });
  });
});