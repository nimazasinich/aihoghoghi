/**
 * AI Service Mock Responses
 * Comprehensive mocking for AI services including HuggingFace integration
 */

import { vi } from 'vitest';

export interface AIMockResponse {
  success: boolean;
  data?: any;
  error?: string;
  latency?: number;
}

export interface DocumentAnalysis {
  category: string;
  confidence: number;
  summary: string;
  keywords: string[];
  entities: Array<{
    text: string;
    type: string;
    confidence: number;
  }>;
  legal_terms: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface SearchEnhancement {
  original_query: string;
  enhanced_query: string;
  suggestions: string[];
  synonyms: string[];
  legal_terms: string[];
}

// Mock AI service responses
export const aiServiceMocks = {
  // Document classification responses
  documentClassification: {
    constitutional: {
      success: true,
      data: {
        category: 'قانون اساسی',
        confidence: 0.95,
        summary: 'مستند مربوط به قانون اساسی جمهوری اسلامی ایران',
        keywords: ['قانون اساسی', 'جمهوری اسلامی', 'ایران', 'ماده'],
        entities: [
          { text: 'جمهوری اسلامی ایران', type: 'COUNTRY', confidence: 0.98 },
          { text: 'قانون اساسی', type: 'LEGAL_DOCUMENT', confidence: 0.95 }
        ],
        legal_terms: ['ماده', 'بند', 'تبصره', 'قانون'],
        sentiment: 'neutral'
      } as DocumentAnalysis,
      latency: 150
    },

    civil: {
      success: true,
      data: {
        category: 'قانون مدنی',
        confidence: 0.92,
        summary: 'مستند مربوط به حقوق مدنی و قوانین مربوط به اشخاص',
        keywords: ['قانون مدنی', 'حقوق', 'اشخاص', 'عقود'],
        entities: [
          { text: 'قانون مدنی', type: 'LEGAL_DOCUMENT', confidence: 0.92 },
          { text: 'اشخاص', type: 'LEGAL_CONCEPT', confidence: 0.88 }
        ],
        legal_terms: ['ماده', 'عقد', 'شخص', 'حق'],
        sentiment: 'neutral'
      } as DocumentAnalysis,
      latency: 120
    },

    criminal: {
      success: true,
      data: {
        category: 'قانون مجازات اسلامی',
        confidence: 0.89,
        summary: 'مستند مربوط به قوانین کیفری و مجازات‌ها',
        keywords: ['قانون مجازات', 'جرم', 'مجازات', 'کیفر'],
        entities: [
          { text: 'قانون مجازات اسلامی', type: 'LEGAL_DOCUMENT', confidence: 0.89 },
          { text: 'جرم', type: 'LEGAL_CONCEPT', confidence: 0.85 }
        ],
        legal_terms: ['ماده', 'جرم', 'مجازات', 'کیفر'],
        sentiment: 'negative'
      } as DocumentAnalysis,
      latency: 180
    },

    commercial: {
      success: true,
      data: {
        category: 'قانون تجارت',
        confidence: 0.87,
        summary: 'مستند مربوط به قوانین تجاری و بازرگانی',
        keywords: ['قانون تجارت', 'شرکت', 'تجارت', 'بازرگانی'],
        entities: [
          { text: 'قانون تجارت', type: 'LEGAL_DOCUMENT', confidence: 0.87 },
          { text: 'شرکت', type: 'LEGAL_CONCEPT', confidence: 0.82 }
        ],
        legal_terms: ['ماده', 'شرکت', 'تجارت', 'بازرگانی'],
        sentiment: 'neutral'
      } as DocumentAnalysis,
      latency: 140
    }
  },

  // Search enhancement responses
  searchEnhancement: {
    basic: {
      success: true,
      data: {
        original_query: 'قانون',
        enhanced_query: 'قانون اساسی OR قانون مدنی OR قانون مجازات',
        suggestions: [
          'قانون اساسی جمهوری اسلامی ایران',
          'قانون مدنی',
          'قانون مجازات اسلامی',
          'قانون تجارت'
        ],
        synonyms: ['مقررات', 'آیین\u200cنامه', 'دستورالعمل'],
        legal_terms: ['ماده', 'بند', 'تبصره', 'فصل']
      } as SearchEnhancement,
      latency: 80
    },

    complex: {
      success: true,
      data: {
        original_query: 'حقوق زنان در قانون',
        enhanced_query: 'حقوق زنان AND (قانون مدنی OR قانون اساسی) AND (ماده OR بند)',
        suggestions: [
          'حقوق زنان در قانون مدنی',
          'حقوق زنان در قانون اساسی',
          'ماده ۱۱۰۵ قانون مدنی',
          'حقوق زن در خانواده'
        ],
        synonyms: ['حقوق بانوان', 'حقوق زن', 'حقوق خانواده'],
        legal_terms: ['ماده', 'حق', 'زن', 'خانواده', 'طلاق']
      } as SearchEnhancement,
      latency: 120
    }
  },

  // Error responses
  errors: {
    timeout: {
      success: false,
      error: 'AI service timeout',
      latency: 5000
    },

    rateLimit: {
      success: false,
      error: 'Rate limit exceeded',
      latency: 100
    },

    invalidInput: {
      success: false,
      error: 'Invalid input format',
      latency: 50
    },

    serviceUnavailable: {
      success: false,
      error: 'AI service unavailable',
      latency: 200
    }
  }
};

// Mock HuggingFace API responses
export const huggingFaceMocks = {
  // Persian BERT model responses
  persianBERT: {
    classification: {
      success: true,
      data: {
        predictions: [
          { label: 'قانون اساسی', score: 0.95 },
          { label: 'قانون مدنی', score: 0.03 },
          { label: 'قانون مجازات', score: 0.02 }
        ],
        model: 'HooshvareLab/bert-fa-base-uncased',
        inference_time: 0.15
      },
      latency: 150
    },

    questionAnswering: {
      success: true,
      data: {
        answer: 'ماده ۱ قانون اساسی',
        confidence: 0.92,
        context: 'ماده ۱: حکومت ایران جمهوری اسلامی است...',
        model: 'HooshvareLab/bert-fa-base-uncased',
        inference_time: 0.12
      },
      latency: 120
    },

    textGeneration: {
      success: true,
      data: {
        generated_text: 'این ماده مربوط به حقوق اساسی شهروندان است و...',
        model: 'HooshvareLab/gpt2-fa',
        inference_time: 0.25
      },
      latency: 250
    }
  },

  // Error responses
  errors: {
    modelNotFound: {
      success: false,
      error: 'Model not found',
      latency: 100
    },

    tokenLimitExceeded: {
      success: false,
      error: 'Token limit exceeded',
      latency: 50
    },

    apiKeyInvalid: {
      success: false,
      error: 'Invalid API key',
      latency: 30
    }
  }
};

// Mock AI service factory
export const createAIServiceMock = () => {
  const mockService = {
    // Document analysis
    analyzeDocument: vi.fn().mockImplementation(async (text: string, options?: any) => {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Return appropriate mock based on content
      if (text.includes('قانون اساسی')) {
        return aiServiceMocks.documentClassification.constitutional;
      } else if (text.includes('قانون مدنی')) {
        return aiServiceMocks.documentClassification.civil;
      } else if (text.includes('قانون مجازات')) {
        return aiServiceMocks.documentClassification.criminal;
      } else if (text.includes('قانون تجارت')) {
        return aiServiceMocks.documentClassification.commercial;
      } else {
        return aiServiceMocks.documentClassification.constitutional;
      }
    }),

    // Search enhancement
    enhanceSearchQuery: vi.fn().mockImplementation(async (query: string) => {
      await new Promise(resolve => setTimeout(resolve, 80));
      
      if (query.length > 10) {
        return aiServiceMocks.searchEnhancement.complex;
      } else {
        return aiServiceMocks.searchEnhancement.basic;
      }
    }),

    // Text summarization
    summarizeText: vi.fn().mockImplementation(async (text: string) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return {
        success: true,
        data: {
          summary: 'خلاصه مستند: ' + text.substring(0, 100) + '...',
          key_points: ['نکته کلیدی ۱', 'نکته کلیدی ۲', 'نکته کلیدی ۳'],
          confidence: 0.88
        },
        latency: 200
      };
    }),

    // Entity extraction
    extractEntities: vi.fn().mockImplementation(async (text: string) => {
      await new Promise(resolve => setTimeout(resolve, 120));
      
      return {
        success: true,
        data: {
          entities: [
            { text: 'ایران', type: 'COUNTRY', confidence: 0.95 },
            { text: 'قانون', type: 'LEGAL_DOCUMENT', confidence: 0.90 }
          ],
          legal_terms: ['ماده', 'بند', 'تبصره']
        },
        latency: 120
      };
    }),

    // Sentiment analysis
    analyzeSentiment: vi.fn().mockImplementation(async (text: string) => {
      await new Promise(resolve => setTimeout(resolve, 90));
      
      return {
        success: true,
        data: {
          sentiment: 'neutral',
          confidence: 0.85,
          scores: {
            positive: 0.1,
            negative: 0.1,
            neutral: 0.8
          }
        },
        latency: 90
      };
    }),

    // HuggingFace integration
    huggingFace: {
      classify: vi.fn().mockImplementation(async (text: string, model: string) => {
        await new Promise(resolve => setTimeout(resolve, 150));
        return huggingFaceMocks.persianBERT.classification;
      }),

      questionAnswer: vi.fn().mockImplementation(async (question: string, context: string) => {
        await new Promise(resolve => setTimeout(resolve, 120));
        return huggingFaceMocks.persianBERT.questionAnswering;
      }),

      generateText: vi.fn().mockImplementation(async (prompt: string) => {
        await new Promise(resolve => setTimeout(resolve, 250));
        return huggingFaceMocks.persianBERT.textGeneration;
      })
    }
  };

  return mockService;
};

// Mock error scenarios
export const createErrorScenarios = () => ({
  // Simulate timeout
  simulateTimeout: (mockService: any) => {
    mockService.analyzeDocument.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 6000));
      return aiServiceMocks.errors.timeout;
    });
  },

  // Simulate rate limiting
  simulateRateLimit: (mockService: any) => {
    mockService.analyzeDocument.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return aiServiceMocks.errors.rateLimit;
    });
  },

  // Simulate service unavailable
  simulateServiceUnavailable: (mockService: any) => {
    mockService.analyzeDocument.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return aiServiceMocks.errors.serviceUnavailable;
    });
  },

  // Simulate invalid input
  simulateInvalidInput: (mockService: any) => {
    mockService.analyzeDocument.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return aiServiceMocks.errors.invalidInput;
    });
  }
});

// Performance testing utilities
export const performanceUtils = {
  // Measure AI service response time
  measureResponseTime: async (fn: () => Promise<any>): Promise<number> => {
    const start = performance.now();
    await fn();
    const end = performance.now();
    return end - start;
  },

  // Batch processing simulation
  simulateBatchProcessing: async (items: any[], batchSize: number = 5): Promise<any[]> => {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(item => createAIServiceMock().analyzeDocument(item))
      );
      results.push(...batchResults);
    }
    return results;
  },

  // Load testing simulation
  simulateLoadTest: async (concurrentRequests: number = 10): Promise<any[]> => {
    const promises = Array(concurrentRequests).fill(null).map(() =>
      createAIServiceMock().analyzeDocument('مستند تست')
    );
    return Promise.all(promises);
  }
};

// Cleanup utility
export const cleanupAIMocks = (): void => {
  vi.restoreAllMocks();
};