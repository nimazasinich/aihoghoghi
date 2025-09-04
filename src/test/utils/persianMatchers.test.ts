/**
 * Persian Matchers Test
 * Testing the Persian text matchers functionality
 */

import { describe, it, expect } from 'vitest';
import { persianMatchers, persianUtils } from './persianMatchers';

describe('Persian Matchers', () => {
  it('should detect Persian text', () => {
    const persianText = 'قانون اساسی جمهوری اسلامی ایران';
    expect(persianText).toContainPersian();
  });

  it('should detect legal terms', () => {
    const legalText = 'قانون اساسی ماده ۱';
    expect(legalText).toContainLegalTerms();
  });

  it('should normalize Persian text', () => {
    const text = 'قانون\u200Cاساسی\u200Dجمهوری\u200Cاسلامی';
    const normalized = persianUtils.normalizePersian(text);
    expect(normalized).toBe('قانوناساسیجمهوریاسلامی');
  });

  it('should detect Persian language', () => {
    const persianText = 'قانون اساسی';
    const englishText = 'Constitution';
    
    expect(persianUtils.isPersian(persianText)).toBe(true);
    expect(persianUtils.isPersian(englishText)).toBe(false);
  });

  it('should extract legal terms', () => {
    const text = 'ماده ۱ قانون اساسی بند الف تبصره ۲';
    const legalTerms = persianUtils.extractLegalTerms(text);
    
    expect(legalTerms).toContain('ماده');
    expect(legalTerms).toContain('قانون');
    expect(legalTerms).toContain('بند');
    expect(legalTerms).toContain('تبصره');
  });
});