import { vi } from 'vitest';

/**
 * AI Service Mock Responses - The most comprehensive AI testing utilities ever built!
 * These mocks provide realistic AI service responses for testing our legal archive system.
 */

export interface AIClassificationResponse {
  category: string;
  confidence: number;
  keywords: string[];
  summary: string;
  legal_terms: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  complexity: 'low' | 'medium' | 'high';
}

export interface AISearchEnhancementResponse {
  enhancedQuery: string;
  suggestions: string[];
  relatedTerms: string[];
  synonyms: string[];
  legalCategories: string[];
  confidence: number;
}

export interface AIDocumentAnalysisResponse {
  summary: string;
  keyPoints: string[];
  legalImplications: string[];
  relatedLaws: string[];
  riskAssessment: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export class AIServiceMockFactory {
  private static instance: AIServiceMockFactory;
  
  static getInstance(): AIServiceMockFactory {
    if (!AIServiceMockFactory.instance) {
      AIServiceMockFactory.instance = new AIServiceMockFactory();
    }
    return AIServiceMockFactory.instance;
  }
  
  /**
   * Create realistic classification response for Persian legal documents
   */
  createClassificationResponse(overrides: Partial<AIClassificationResponse> = {}): AIClassificationResponse {
    const categories = [
      'قانون مدنی',
      'قانون تجارت',
      'قانون کار',
      'قانون جزا',
      'قانون آیین دادرسی',
      'قانون اساسی',
      'قانون مالیات',
      'قانون بیمه',
      'قانون خانواده',
      'قانون مالکیت فکری'
    ];
    
    const keywords = [
      'قرارداد', 'مالکیت', 'حقوق', 'دعوا', 'حکم', 'رای', 'دادگاه',
      'قاضی', 'وکیل', 'شاهد', 'سند', 'مدرک', 'شهادت', 'اقرار'
    ];
    
    const legalTerms = [
      'عقد', 'بیع', 'اجاره', 'قرض', 'ضمان', 'کفالت', 'وکالت',
      'وصیت', 'ارث', 'نکاح', 'طلاق', 'حضان', 'نفقه'
    ];
    
    return {
      category: categories[Math.floor(Math.random() * categories.length)],
      confidence: 0.85 + Math.random() * 0.15, // 0.85-1.0
      keywords: keywords.slice(0, Math.floor(Math.random() * 5) + 3),
      summary: 'خلاصه سند حقوقی که توسط هوش مصنوعی تولید شده است',
      legal_terms: legalTerms.slice(0, Math.floor(Math.random() * 3) + 2),
      sentiment: ['positive', 'negative', 'neutral'][Math.floor(Math.random() * 3)] as any,
      complexity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
      ...overrides
    };
  }
  
  /**
   * Create search enhancement response for Persian queries
   */
  createSearchEnhancementResponse(overrides: Partial<AISearchEnhancementResponse> = {}): AISearchEnhancementResponse {
    const suggestions = [
      'قانون مدنی ایران',
      'قراردادهای تجاری',
      'حقوق مالکیت',
      'دعاوی حقوقی',
      'آیین دادرسی مدنی',
      'قانون کار و تامین اجتماعی'
    ];
    
    const relatedTerms = [
      'حقوق', 'قانون', 'مقررات', 'دستورالعمل', 'بخشنامه',
      'آیین‌نامه', 'مصوبه', 'تصمیم', 'حکم', 'رای'
    ];
    
    const synonyms = [
      'قرارداد - عقد',
      'مالکیت - ملکیت',
      'دعوا - خصومت',
      'حکم - فرمان',
      'رای - نظر'
    ];
    
    const legalCategories = [
      'حقوق مدنی',
      'حقوق تجاری',
      'حقوق جزایی',
      'حقوق اداری',
      'حقوق بین‌الملل'
    ];
    
    return {
      enhancedQuery: 'جستجوی بهبود یافته با استفاده از هوش مصنوعی',
      suggestions: suggestions.slice(0, Math.floor(Math.random() * 4) + 2),
      relatedTerms: relatedTerms.slice(0, Math.floor(Math.random() * 5) + 3),
      synonyms: synonyms.slice(0, Math.floor(Math.random() * 3) + 2),
      legalCategories: legalCategories.slice(0, Math.floor(Math.random() * 3) + 2),
      confidence: 0.80 + Math.random() * 0.20, // 0.80-1.0
      ...overrides
    };
  }
  
  /**
   * Create document analysis response
   */
  createDocumentAnalysisResponse(overrides: Partial<AIDocumentAnalysisResponse> = {}): AIDocumentAnalysisResponse {
    const keyPoints = [
      'نکات کلیدی سند حقوقی',
      'مواد قانونی مرتبط',
      'تعهدات طرفین',
      'ضمانت‌های اجرایی',
      'مهلت‌های قانونی'
    ];
    
    const legalImplications = [
      'پیامدهای حقوقی این سند',
      'تعهدات قانونی طرفین',
      'ضمانت‌های اجرایی',
      'راه‌های قانونی پیگیری'
    ];
    
    const relatedLaws = [
      'قانون مدنی ایران',
      'قانون تجارت',
      'آیین‌نامه اجرایی',
      'دستورالعمل‌های مرتبط'
    ];
    
    const recommendations = [
      'توصیه‌های حقوقی',
      'اقدامات پیشگیرانه',
      'راه‌های حل اختلاف',
      'مشاوره حقوقی تخصصی'
    ];
    
    return {
      summary: 'تحلیل جامع سند حقوقی با استفاده از هوش مصنوعی پیشرفته',
      keyPoints: keyPoints.slice(0, Math.floor(Math.random() * 3) + 2),
      legalImplications: legalImplications.slice(0, Math.floor(Math.random() * 3) + 2),
      relatedLaws: relatedLaws.slice(0, Math.floor(Math.random() * 3) + 2),
      riskAssessment: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
      recommendations: recommendations.slice(0, Math.floor(Math.random() * 3) + 2),
      ...overrides
    };
  }
  
  /**
   * Create mock for HuggingFace API responses
   */
  createHuggingFaceResponse(model: string, input: string): any {
    const responses = {
      'persian-legal-bert': {
        embeddings: Array.from({ length: 768 }, () => Math.random() * 2 - 1),
        confidence: 0.92
      },
      'persian-legal-classifier': {
        predictions: [
          { label: 'قانون مدنی', score: 0.95 },
          { label: 'قانون تجارت', score: 0.03 },
          { label: 'قانون کار', score: 0.02 }
        ]
      },
      'persian-legal-ner': {
        entities: [
          { text: 'قرارداد', label: 'LEGAL_TERM', start: 0, end: 7 },
          { text: 'مالکیت', label: 'LEGAL_CONCEPT', start: 15, end: 22 }
        ]
      }
    };
    
    return responses[model] || { error: 'Model not found' };
  }
  
  /**
   * Create mock for OpenAI API responses
   */
  createOpenAIResponse(prompt: string): any {
    return {
      choices: [
        {
          message: {
            content: 'پاسخ هوش مصنوعی به زبان فارسی برای سوال حقوقی شما',
            role: 'assistant'
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: prompt.length,
        completion_tokens: 50,
        total_tokens: prompt.length + 50
      }
    };
  }
  
  /**
   * Create mock for error responses
   */
  createErrorResponse(errorType: string, message: string): any {
    const errorResponses = {
      'rate_limit': {
        error: 'Rate limit exceeded',
        message: 'درخواست‌های شما از حد مجاز تجاوز کرده است',
        retry_after: 60
      },
      'model_not_found': {
        error: 'Model not found',
        message: 'مدل درخواستی یافت نشد',
        available_models: ['persian-legal-bert', 'persian-legal-classifier']
      },
      'invalid_input': {
        error: 'Invalid input',
        message: 'ورودی نامعتبر است',
        details: 'لطفاً متن فارسی معتبر وارد کنید'
      },
      'service_unavailable': {
        error: 'Service unavailable',
        message: 'سرویس در حال حاضر در دسترس نیست',
        retry_after: 300
      }
    };
    
    return errorResponses[errorType] || {
      error: 'Unknown error',
      message: message || 'خطای نامشخص رخ داده است'
    };
  }
}

// Export singleton instance
export const aiServiceMockFactory = AIServiceMockFactory.getInstance();

// Export convenience functions
export const createClassificationResponse = (overrides?: Partial<AIClassificationResponse>) =>
  aiServiceMockFactory.createClassificationResponse(overrides);

export const createSearchEnhancementResponse = (overrides?: Partial<AISearchEnhancementResponse>) =>
  aiServiceMockFactory.createSearchEnhancementResponse(overrides);

export const createDocumentAnalysisResponse = (overrides?: Partial<AIDocumentAnalysisResponse>) =>
  aiServiceMockFactory.createDocumentAnalysisResponse(overrides);

export const createHuggingFaceResponse = (model: string, input: string) =>
  aiServiceMockFactory.createHuggingFaceResponse(model, input);

export const createOpenAIResponse = (prompt: string) =>
  aiServiceMockFactory.createOpenAIResponse(prompt);

export const createErrorResponse = (errorType: string, message?: string) =>
  aiServiceMockFactory.createErrorResponse(errorType, message);

export default aiServiceMockFactory;