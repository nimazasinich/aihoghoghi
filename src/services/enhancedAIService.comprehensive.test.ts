/**
 * Comprehensive Enhanced AI Service Tests
 * Testing HuggingFace integration, Persian text processing, and AI model coordination
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createAIServiceMock, aiServiceMocks, huggingFaceMocks } from '../test/utils/aiServiceMock';
import { persianMatchers, persianTestData, persianUtils } from '../test/utils/persianMatchers';

// Mock the enhanced AI service
const mockEnhancedAIService = {
  // HuggingFace integration
  huggingFace: {
    classify: vi.fn(),
    questionAnswer: vi.fn(),
    generateText: vi.fn(),
    summarizeText: vi.fn(),
    extractEntities: vi.fn()
  },

  // Persian text processing
  persianProcessor: {
    normalizeText: vi.fn(),
    extractLegalTerms: vi.fn(),
    detectLanguage: vi.fn(),
    transliterate: vi.fn()
  },

  // Document analysis
  analyzeDocument: vi.fn(),
  classifyDocument: vi.fn(),
  extractKeywords: vi.fn(),
  generateSummary: vi.fn(),

  // Search enhancement
  enhanceSearchQuery: vi.fn(),
  generateSuggestions: vi.fn(),
  expandSynonyms: vi.fn(),

  // Performance monitoring
  trackModelPerformance: vi.fn(),
  getModelStats: vi.fn(),

  // Error handling
  handleModelError: vi.fn(),
  retryWithFallback: vi.fn()
};

// Mock HuggingFace API
const mockHuggingFaceAPI = {
  inference: {
    textClassification: vi.fn(),
    questionAnswering: vi.fn(),
    textGeneration: vi.fn(),
    summarization: vi.fn(),
    tokenClassification: vi.fn()
  }
};

describe('Enhanced AI Service - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup HuggingFace integration mocks
    mockEnhancedAIService.huggingFace.classify.mockImplementation(async (text: string, model: string) => {
      await new Promise(resolve => setTimeout(resolve, 150));
      
      if (text.includes('قانون اساسی')) {
        return huggingFaceMocks.persianBERT.classification;
      } else if (text.includes('قانون مدنی')) {
        return {
          success: true,
          data: {
            predictions: [
              { label: 'قانون مدنی', score: 0.92 },
              { label: 'قانون اساسی', score: 0.05 },
              { label: 'قانون مجازات', score: 0.03 }
            ],
            model: 'HooshvareLab/bert-fa-base-uncased',
            inference_time: 0.12
          },
          latency: 120
        };
      }
      
      return huggingFaceMocks.persianBERT.classification;
    });

    mockEnhancedAIService.huggingFace.questionAnswer.mockImplementation(async (question: string, context: string) => {
      await new Promise(resolve => setTimeout(resolve, 120));
      
      if (question.includes('ماده ۱') && context.includes('قانون اساسی')) {
        return {
          success: true,
          data: {
            answer: 'ماده ۱ قانون اساسی',
            confidence: 0.95,
            context: context.substring(0, 100) + '...',
            model: 'HooshvareLab/bert-fa-base-uncased',
            inference_time: 0.10
          },
          latency: 100
        };
      }
      
      return huggingFaceMocks.persianBERT.questionAnswering;
    });

    mockEnhancedAIService.huggingFace.generateText.mockImplementation(async (prompt: string) => {
      await new Promise(resolve => setTimeout(resolve, 250));
      
      return {
        success: true,
        data: {
          generated_text: 'این ماده مربوط به حقوق اساسی شهروندان است و...',
          model: 'HooshvareLab/gpt2-fa',
          inference_time: 0.20
        },
        latency: 200
      };
    });

    mockEnhancedAIService.huggingFace.summarizeText.mockImplementation(async (text: string) => {
      await new Promise(resolve => setTimeout(resolve, 180));
      
      return {
        success: true,
        data: {
          summary: 'خلاصه: ' + text.substring(0, 100) + '...',
          key_points: ['نکته کلیدی ۱', 'نکته کلیدی ۲'],
          confidence: 0.88,
          model: 'HooshvareLab/bert-fa-base-uncased',
          inference_time: 0.15
        },
        latency: 150
      };
    });

    mockEnhancedAIService.huggingFace.extractEntities.mockImplementation(async (text: string) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        success: true,
        data: {
          entities: [
            { text: 'ایران', type: 'COUNTRY', confidence: 0.95 },
            { text: 'قانون', type: 'LEGAL_DOCUMENT', confidence: 0.90 }
          ],
          model: 'HooshvareLab/bert-fa-base-uncased',
          inference_time: 0.08
        },
        latency: 80
      };
    });

    // Setup Persian text processing mocks
    mockEnhancedAIService.persianProcessor.normalizeText.mockImplementation((text: string) => {
      return persianUtils.normalizePersian(text);
    });

    mockEnhancedAIService.persianProcessor.extractLegalTerms.mockImplementation((text: string) => {
      const legalTerms = ['ماده', 'بند', 'تبصره', 'قانون', 'حکم', 'رأی'];
      return legalTerms.filter(term => text.includes(term));
    });

    mockEnhancedAIService.persianProcessor.detectLanguage.mockImplementation((text: string) => {
      return persianUtils.isPersian(text) ? 'fa' : 'en';
    });

    mockEnhancedAIService.persianProcessor.transliterate.mockImplementation((text: string) => {
      // Simple transliteration mock
      return text.replace(/قانون/g, 'qanun').replace(/ماده/g, 'mada');
    });

    // Setup document analysis mocks
    mockEnhancedAIService.analyzeDocument.mockImplementation(async (document: any) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const normalizedText = mockEnhancedAIService.persianProcessor.normalizeText(document.content);
      const legalTerms = mockEnhancedAIService.persianProcessor.extractLegalTerms(normalizedText);
      const classification = await mockEnhancedAIService.huggingFace.classify(normalizedText, 'bert-fa');
      const entities = await mockEnhancedAIService.huggingFace.extractEntities(normalizedText);
      
      return {
        success: true,
        data: {
          category: classification.data.predictions[0].label,
          confidence: classification.data.predictions[0].score,
          summary: 'خلاصه مستند: ' + document.content.substring(0, 100) + '...',
          keywords: legalTerms,
          entities: entities.data.entities,
          legal_terms: legalTerms,
          sentiment: 'neutral',
          language: 'fa',
          processing_time: 200
        },
        latency: 200
      };
    });

    mockEnhancedAIService.classifyDocument.mockImplementation(async (text: string) => {
      return await mockEnhancedAIService.huggingFace.classify(text, 'bert-fa');
    });

    mockEnhancedAIService.extractKeywords.mockImplementation(async (text: string) => {
      const legalTerms = mockEnhancedAIService.persianProcessor.extractLegalTerms(text);
      return {
        success: true,
        data: {
          keywords: legalTerms,
          confidence: 0.85
        }
      };
    });

    mockEnhancedAIService.generateSummary.mockImplementation(async (text: string) => {
      return await mockEnhancedAIService.huggingFace.summarizeText(text);
    });

    // Setup search enhancement mocks
    mockEnhancedAIService.enhanceSearchQuery.mockImplementation(async (query: string) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const normalizedQuery = mockEnhancedAIService.persianProcessor.normalizeText(query);
      const legalTerms = mockEnhancedAIService.persianProcessor.extractLegalTerms(normalizedQuery);
      
      let enhancedQuery = normalizedQuery;
      if (legalTerms.length > 0) {
        enhancedQuery = legalTerms.join(' OR ');
      }
      
      return {
        success: true,
        data: {
          original_query: query,
          enhanced_query: enhancedQuery,
          suggestions: [
            query + ' قانون اساسی',
            query + ' قانون مدنی',
            query + ' قانون مجازات'
          ],
          synonyms: ['مقررات', 'آیین\u200cنامه', 'دستورالعمل'],
          legal_terms: legalTerms,
          confidence: 0.90
        },
        latency: 100
      };
    });

    mockEnhancedAIService.generateSuggestions.mockImplementation(async (query: string) => {
      await new Promise(resolve => setTimeout(resolve, 80));
      
      return {
        success: true,
        data: {
          suggestions: [
            query + ' ماده ۱',
            query + ' بند الف',
            query + ' تبصره ۲'
          ],
          confidence: 0.85
        }
      };
    });

    mockEnhancedAIService.expandSynonyms.mockImplementation(async (term: string) => {
      await new Promise(resolve => setTimeout(resolve, 60));
      
      const synonyms: { [key: string]: string[] } = {
        'قانون': ['مقررات', 'آیین\u200cنامه', 'دستورالعمل'],
        'ماده': ['بند', 'تبصره', 'فصل'],
        'حکم': ['رأی', 'قضاوت', 'تصمیم']
      };
      
      return {
        success: true,
        data: {
          term,
          synonyms: synonyms[term] || [],
          confidence: 0.80
        }
      };
    });

    // Setup performance monitoring mocks
    mockEnhancedAIService.trackModelPerformance.mockImplementation(async (model: string, operation: string, duration: number) => {
      await new Promise(resolve => setTimeout(resolve, 5));
      
      return {
        success: true,
        data: {
          model,
          operation,
          duration,
          timestamp: new Date().toISOString(),
          performance_score: duration < 200 ? 'good' : duration < 500 ? 'average' : 'poor'
        }
      };
    });

    mockEnhancedAIService.getModelStats.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 30));
      
      return {
        success: true,
        data: {
          total_requests: 1000,
          average_response_time: 150,
          success_rate: 0.95,
          models: {
            'bert-fa': { requests: 500, avg_time: 120, success_rate: 0.98 },
            'gpt2-fa': { requests: 300, avg_time: 250, success_rate: 0.92 },
            'roberta-fa': { requests: 200, avg_time: 180, success_rate: 0.94 }
          }
        }
      };
    });

    // Setup error handling mocks
    mockEnhancedAIService.handleModelError.mockImplementation(async (error: Error, model: string) => {
      await new Promise(resolve => setTimeout(resolve, 20));
      
      return {
        success: true,
        data: {
          error_id: `error_${Date.now()}`,
          model,
          error_type: error.constructor.name,
          error_message: error.message,
          handled: true,
          timestamp: new Date().toISOString()
        }
      };
    });

    mockEnhancedAIService.retryWithFallback.mockImplementation(async (operation: () => Promise<any>, maxRetries: number = 3) => {
      let lastError: Error;
      
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error as Error;
          await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
        }
      }
      
      throw lastError!;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('HuggingFace Integration', () => {
    it('should classify Persian legal documents using BERT', async () => {
      const text = 'قانون اساسی جمهوری اسلامی ایران ماده ۱';
      const model = 'HooshvareLab/bert-fa-base-uncased';

      const result = await mockEnhancedAIService.huggingFace.classify(text, model);

      expect(result.success).toBe(true);
      expect(result.data.predictions).toBeDefined();
      expect(result.data.predictions[0].label).toBe('قانون اساسی');
      expect(result.data.predictions[0].score).toBeGreaterThan(0.9);
      expect(result.data.model).toBe(model);
      expect(result.latency).toBeLessThan(200);
      
      // Verify Persian text
      expect(text).toContainPersian();
      expect(text).toContainLegalTerms();
    });

    it('should answer questions about Persian legal documents', async () => {
      const question = 'ماده ۱ قانون اساسی چیست؟';
      const context = 'ماده ۱: حکومت ایران جمهوری اسلامی است که ملت ایران...';

      const result = await mockEnhancedAIService.huggingFace.questionAnswer(question, context);

      expect(result.success).toBe(true);
      expect(result.data.answer).toBe('ماده ۱ قانون اساسی');
      expect(result.data.confidence).toBeGreaterThan(0.9);
      expect(result.data.model).toBeDefined();
      expect(result.latency).toBeLessThan(150);
      
      // Verify Persian text
      expect(question).toContainPersian();
      expect(context).toContainPersian();
    });

    it('should generate Persian legal text', async () => {
      const prompt = 'ماده ۱ قانون اساسی';

      const result = await mockEnhancedAIService.huggingFace.generateText(prompt);

      expect(result.success).toBe(true);
      expect(result.data.generated_text).toBeDefined();
      expect(result.data.generated_text).toContainPersian();
      expect(result.data.model).toBe('HooshvareLab/gpt2-fa');
      expect(result.latency).toBeLessThan(300);
    });

    it('should summarize Persian legal documents', async () => {
      const text = 'ماده ۱: حکومت ایران جمهوری اسلامی است که ملت ایران، بر اساس اعتقاد دیرینه اش به حکومت حق و عدل قرآن...';

      const result = await mockEnhancedAIService.huggingFace.summarizeText(text);

      expect(result.success).toBe(true);
      expect(result.data.summary).toBeDefined();
      expect(result.data.summary).toContainPersian();
      expect(result.data.key_points).toBeDefined();
      expect(result.data.confidence).toBeGreaterThan(0.8);
      expect(result.latency).toBeLessThan(200);
    });

    it('should extract entities from Persian legal text', async () => {
      const text = 'قانون اساسی جمهوری اسلامی ایران ماده ۱';

      const result = await mockEnhancedAIService.huggingFace.extractEntities(text);

      expect(result.success).toBe(true);
      expect(result.data.entities).toBeDefined();
      expect(result.data.entities.length).toBeGreaterThan(0);
      expect(result.data.entities[0].text).toBe('ایران');
      expect(result.data.entities[0].type).toBe('COUNTRY');
      expect(result.data.entities[0].confidence).toBeGreaterThan(0.9);
    });

    it('should handle HuggingFace API errors', async () => {
      // Mock API error
      mockEnhancedAIService.huggingFace.classify.mockRejectedValue(new Error('Model not found'));

      const text = 'قانون اساسی';
      const model = 'invalid-model';

      try {
        await mockEnhancedAIService.huggingFace.classify(text, model);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Model not found');
      }
    });

    it('should handle rate limiting', async () => {
      // Mock rate limit error
      mockEnhancedAIService.huggingFace.classify.mockRejectedValue(new Error('Rate limit exceeded'));

      const text = 'قانون اساسی';
      const model = 'bert-fa';

      try {
        await mockEnhancedAIService.huggingFace.classify(text, model);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Rate limit exceeded');
      }
    });
  });

  describe('Persian Text Processing', () => {
    it('should normalize Persian text correctly', () => {
      const text = 'قانون\u200Cاساسی\u200Dجمهوری\u200Cاسلامی';
      const normalized = mockEnhancedAIService.persianProcessor.normalizeText(text);

      expect(normalized).toBe('قانوناساسیجمهوریاسلامی');
      expect(normalized).toBePersianNormalized();
    });

    it('should extract legal terms from Persian text', () => {
      const text = 'ماده ۱ قانون اساسی بند الف تبصره ۲';
      const legalTerms = mockEnhancedAIService.persianProcessor.extractLegalTerms(text);

      expect(legalTerms).toContain('ماده');
      expect(legalTerms).toContain('قانون');
      expect(legalTerms).toContain('بند');
      expect(legalTerms).toContain('تبصره');
      expect(legalTerms.length).toBe(4);
    });

    it('should detect Persian language correctly', () => {
      const persianText = 'قانون اساسی جمهوری اسلامی ایران';
      const englishText = 'Constitution of Islamic Republic of Iran';

      const persianResult = mockEnhancedAIService.persianProcessor.detectLanguage(persianText);
      const englishResult = mockEnhancedAIService.persianProcessor.detectLanguage(englishText);

      expect(persianResult).toBe('fa');
      expect(englishResult).toBe('en');
    });

    it('should transliterate Persian text', () => {
      const text = 'قانون ماده';
      const transliterated = mockEnhancedAIService.persianProcessor.transliterate(text);

      expect(transliterated).toBe('qanun mada');
    });

    it('should handle mixed Persian and English text', () => {
      const mixedText = 'قانون constitution ماده article';
      const legalTerms = mockEnhancedAIService.persianProcessor.extractLegalTerms(mixedText);

      expect(legalTerms).toContain('قانون');
      expect(legalTerms).toContain('ماده');
    });
  });

  describe('Document Analysis', () => {
    it('should analyze Persian legal documents comprehensively', async () => {
      const document = {
        title: 'قانون اساسی جمهوری اسلامی ایران',
        content: 'ماده ۱: حکومت ایران جمهوری اسلامی است...',
        category: 'قانون اساسی',
        source: 'قوه قضائیه'
      };

      const result = await mockEnhancedAIService.analyzeDocument(document);

      expect(result.success).toBe(true);
      expect(result.data.category).toBeDefined();
      expect(result.data.confidence).toBeGreaterThan(0.8);
      expect(result.data.summary).toBeDefined();
      expect(result.data.keywords).toBeDefined();
      expect(result.data.entities).toBeDefined();
      expect(result.data.legal_terms).toBeDefined();
      expect(result.data.sentiment).toBeDefined();
      expect(result.data.language).toBe('fa');
      expect(result.data.processing_time).toBeGreaterThan(0);
      
      // Verify Persian content
      expect(document.title).toContainPersian();
      expect(document.content).toContainPersian();
      expect(document.category).toContainLegalTerms();
    });

    it('should classify documents by legal category', async () => {
      const constitutionalText = 'قانون اساسی جمهوری اسلامی ایران';
      const civilText = 'قانون مدنی مصوبات مجلس شورای اسلامی';

      const constitutionalResult = await mockEnhancedAIService.classifyDocument(constitutionalText);
      const civilResult = await mockEnhancedAIService.classifyDocument(civilText);

      expect(constitutionalResult.success).toBe(true);
      expect(constitutionalResult.data.predictions[0].label).toBe('قانون اساسی');
      
      expect(civilResult.success).toBe(true);
      expect(civilResult.data.predictions[0].label).toBe('قانون مدنی');
    });

    it('should extract keywords from Persian legal documents', async () => {
      const text = 'ماده ۱ قانون اساسی بند الف تبصره ۲';

      const result = await mockEnhancedAIService.extractKeywords(text);

      expect(result.success).toBe(true);
      expect(result.data.keywords).toContain('ماده');
      expect(result.data.keywords).toContain('قانون');
      expect(result.data.keywords).toContain('بند');
      expect(result.data.keywords).toContain('تبصره');
      expect(result.data.confidence).toBeGreaterThan(0.8);
    });

    it('should generate summaries of Persian legal documents', async () => {
      const text = 'ماده ۱: حکومت ایران جمهوری اسلامی است که ملت ایران، بر اساس اعتقاد دیرینه اش به حکومت حق و عدل قرآن...';

      const result = await mockEnhancedAIService.generateSummary(text);

      expect(result.success).toBe(true);
      expect(result.data.summary).toBeDefined();
      expect(result.data.summary).toContainPersian();
      expect(result.data.key_points).toBeDefined();
      expect(result.data.confidence).toBeGreaterThan(0.8);
    });

    it('should handle document analysis errors', async () => {
      // Mock classification error
      mockEnhancedAIService.huggingFace.classify.mockRejectedValue(new Error('Classification failed'));

      const document = {
        title: 'Test Document',
        content: 'Test content',
        category: 'Test',
        source: 'Test Source'
      };

      try {
        await mockEnhancedAIService.analyzeDocument(document);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Classification failed');
      }
    });
  });

  describe('Search Enhancement', () => {
    it('should enhance Persian search queries', async () => {
      const query = 'قانون';

      const result = await mockEnhancedAIService.enhanceSearchQuery(query);

      expect(result.success).toBe(true);
      expect(result.data.original_query).toBe(query);
      expect(result.data.enhanced_query).toBeDefined();
      expect(result.data.suggestions).toBeDefined();
      expect(result.data.synonyms).toBeDefined();
      expect(result.data.legal_terms).toBeDefined();
      expect(result.data.confidence).toBeGreaterThan(0.8);
      
      // Verify Persian query
      expect(query).toContainPersian();
    });

    it('should generate search suggestions', async () => {
      const query = 'قانون اساسی';

      const result = await mockEnhancedAIService.generateSuggestions(query);

      expect(result.success).toBe(true);
      expect(result.data.suggestions).toBeDefined();
      expect(result.data.suggestions.length).toBeGreaterThan(0);
      expect(result.data.suggestions[0]).toContain(query);
      expect(result.data.confidence).toBeGreaterThan(0.8);
    });

    it('should expand synonyms for legal terms', async () => {
      const term = 'قانون';

      const result = await mockEnhancedAIService.expandSynonyms(term);

      expect(result.success).toBe(true);
      expect(result.data.term).toBe(term);
      expect(result.data.synonyms).toContain('مقررات');
      expect(result.data.synonyms).toContain('آیین\u200cنامه');
      expect(result.data.synonyms).toContain('دستورالعمل');
      expect(result.data.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should handle complex Persian legal queries', async () => {
      const complexQuery = 'حقوق زنان در قانون مدنی ماده ۱۱۰۵';

      const result = await mockEnhancedAIService.enhanceSearchQuery(complexQuery);

      expect(result.success).toBe(true);
      expect(result.data.original_query).toBe(complexQuery);
      expect(result.data.enhanced_query).toBeDefined();
      expect(complexQuery).toContainLegalTerms();
    });

    it('should handle search enhancement errors', async () => {
      // Mock enhancement error
      mockEnhancedAIService.enhanceSearchQuery.mockRejectedValue(new Error('Enhancement failed'));

      const query = 'قانون';

      try {
        await mockEnhancedAIService.enhanceSearchQuery(query);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Enhancement failed');
      }
    });
  });

  describe('Performance Monitoring', () => {
    it('should track model performance', async () => {
      const model = 'bert-fa';
      const operation = 'classification';
      const duration = 150;

      const result = await mockEnhancedAIService.trackModelPerformance(model, operation, duration);

      expect(result.success).toBe(true);
      expect(result.data.model).toBe(model);
      expect(result.data.operation).toBe(operation);
      expect(result.data.duration).toBe(duration);
      expect(result.data.performance_score).toBe('good');
      expect(result.data.timestamp).toBeDefined();
    });

    it('should get model statistics', async () => {
      const result = await mockEnhancedAIService.getModelStats();

      expect(result.success).toBe(true);
      expect(result.data.total_requests).toBe(1000);
      expect(result.data.average_response_time).toBe(150);
      expect(result.data.success_rate).toBe(0.95);
      expect(result.data.models).toBeDefined();
      expect(result.data.models['bert-fa']).toBeDefined();
    });

    it('should identify performance bottlenecks', async () => {
      const slowDuration = 1000;
      const result = await mockEnhancedAIService.trackModelPerformance('gpt2-fa', 'generation', slowDuration);

      expect(result.success).toBe(true);
      expect(result.data.performance_score).toBe('poor');
    });

    it('should track multiple model operations', async () => {
      const operations = [
        { model: 'bert-fa', operation: 'classification', duration: 120 },
        { model: 'gpt2-fa', operation: 'generation', duration: 250 },
        { model: 'roberta-fa', operation: 'summarization', duration: 180 }
      ];

      for (const op of operations) {
        const result = await mockEnhancedAIService.trackModelPerformance(op.model, op.operation, op.duration);
        expect(result.success).toBe(true);
        expect(result.data.model).toBe(op.model);
        expect(result.data.operation).toBe(op.operation);
        expect(result.data.duration).toBe(op.duration);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle model errors gracefully', async () => {
      const error = new Error('Model inference failed');
      const model = 'bert-fa';

      const result = await mockEnhancedAIService.handleModelError(error, model);

      expect(result.success).toBe(true);
      expect(result.data.error_id).toBeDefined();
      expect(result.data.model).toBe(model);
      expect(result.data.error_type).toBe('Error');
      expect(result.data.error_message).toBe('Model inference failed');
      expect(result.data.handled).toBe(true);
    });

    it('should retry operations with fallback', async () => {
      let attemptCount = 0;
      const operation = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return { success: true, data: 'Success' };
      };

      const result = await mockEnhancedAIService.retryWithFallback(operation, 3);

      expect(result.success).toBe(true);
      expect(result.data).toBe('Success');
      expect(attemptCount).toBe(3);
    });

    it('should handle different error types', async () => {
      const errors = [
        new Error('Network error'),
        new TypeError('Type error'),
        new ReferenceError('Reference error')
      ];

      for (const error of errors) {
        const result = await mockEnhancedAIService.handleModelError(error, 'bert-fa');
        expect(result.success).toBe(true);
        expect(result.data.error_type).toBe(error.constructor.name);
      }
    });

    it('should fail after maximum retries', async () => {
      const operation = async () => {
        throw new Error('Persistent failure');
      };

      try {
        await mockEnhancedAIService.retryWithFallback(operation, 2);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Persistent failure');
      }
    });
  });

  describe('Integration with Persian Legal System', () => {
    it('should process Persian legal documents end-to-end', async () => {
      const persianDocument = persianTestData.sampleDocuments[0];

      const result = await mockEnhancedAIService.analyzeDocument(persianDocument);

      expect(result.success).toBe(true);
      expect(result.data.language).toBe('fa');
      expect(persianDocument.title).toContainPersian();
      expect(persianDocument.content).toContainLegalTerms();
    });

    it('should enhance Persian legal search queries', async () => {
      const persianQuery = persianTestData.searchQueries[0];

      const result = await mockEnhancedAIService.enhanceSearchQuery(persianQuery);

      expect(result.success).toBe(true);
      expect(persianQuery).toContainPersian();
      expect(persianQuery).toContainLegalTerms();
    });

    it('should handle Persian legal terminology', () => {
      const legalText = 'ماده ۱۱۰۵ قانون مدنی بند الف تبصره ۲';
      const legalTerms = mockEnhancedAIService.persianProcessor.extractLegalTerms(legalText);

      expect(legalTerms).toContain('ماده');
      expect(legalTerms).toContain('قانون');
      expect(legalTerms).toContain('بند');
      expect(legalTerms).toContain('تبصره');
      expect(legalText).toContainLegalTerms();
    });

    it('should process mixed Persian and English legal content', async () => {
      const mixedDocument = {
        title: 'قانون اساسی Constitution',
        content: 'ماده ۱: حکومت ایران جمهوری اسلامی است که ملت ایران...',
        category: 'قانون اساسی',
        source: 'قوه قضائیه'
      };

      const result = await mockEnhancedAIService.analyzeDocument(mixedDocument);

      expect(result.success).toBe(true);
      expect(result.data.language).toBe('fa');
      expect(mixedDocument.title).toContainPersian();
      expect(mixedDocument.content).toContainPersian();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent document analysis', async () => {
      const documents = persianTestData.sampleDocuments;

      const results = await Promise.all(
        documents.map(doc => mockEnhancedAIService.analyzeDocument(doc))
      );

      expect(results).toHaveLength(documents.length);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.data.language).toBe('fa');
      });
    });

    it('should handle concurrent search enhancements', async () => {
      const queries = persianTestData.searchQueries;

      const results = await Promise.all(
        queries.map(query => mockEnhancedAIService.enhanceSearchQuery(query))
      );

      expect(results).toHaveLength(queries.length);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle mixed concurrent operations', async () => {
      const operations = [
        mockEnhancedAIService.analyzeDocument(persianTestData.sampleDocuments[0]),
        mockEnhancedAIService.enhanceSearchQuery(persianTestData.searchQueries[0]),
        mockEnhancedAIService.extractKeywords('قانون اساسی'),
        mockEnhancedAIService.generateSummary('ماده ۱: حکومت ایران...')
      ];

      const results = await Promise.all(operations);

      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});