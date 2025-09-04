import { describe, it, expect } from 'vitest';
import { 
  aiServiceMockFactory, 
  createClassificationResponse, 
  createSearchEnhancementResponse,
  createDocumentAnalysisResponse,
  createHuggingFaceResponse,
  createOpenAIResponse,
  createErrorResponse
} from './aiServiceMockResponses';

/**
 * AI Service Mock Responses Tests - Testing our AI service mock utilities
 */

describe('AI Service Mock Responses', () => {
  describe('Classification Response', () => {
    it('should create classification response with defaults', () => {
      const response = createClassificationResponse();
      
      expect(response.category).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0.8);
      expect(response.keywords).toBeDefined();
      expect(response.summary).toBeDefined();
    });

    it('should create classification response with overrides', () => {
      const response = createClassificationResponse({
        category: 'قانون مدنی',
        confidence: 0.95
      });
      
      expect(response.category).toBe('قانون مدنی');
      expect(response.confidence).toBe(0.95);
    });
  });

  describe('Search Enhancement Response', () => {
    it('should create search enhancement response', () => {
      const response = createSearchEnhancementResponse();
      
      expect(response.enhancedQuery).toBeDefined();
      expect(response.suggestions).toBeDefined();
      expect(response.relatedTerms).toBeDefined();
      expect(response.synonyms).toBeDefined();
      expect(response.legalCategories).toBeDefined();
    });

    it('should create search enhancement response with overrides', () => {
      const response = createSearchEnhancementResponse({
        enhancedQuery: 'قرارداد خرید و فروش',
        confidence: 0.98
      });
      
      expect(response.enhancedQuery).toBe('قرارداد خرید و فروش');
      expect(response.confidence).toBe(0.98);
    });
  });

  describe('Document Analysis Response', () => {
    it('should create document analysis response', () => {
      const response = createDocumentAnalysisResponse();
      
      expect(response.summary).toBeDefined();
      expect(response.keyPoints).toBeDefined();
      expect(response.legalImplications).toBeDefined();
      expect(response.relatedLaws).toBeDefined();
      expect(response.riskAssessment).toBeDefined();
      expect(response.recommendations).toBeDefined();
    });

    it('should create document analysis response with overrides', () => {
      const response = createDocumentAnalysisResponse({
        summary: 'تحلیل جامع سند',
        riskAssessment: 'high'
      });
      
      expect(response.summary).toBe('تحلیل جامع سند');
      expect(response.riskAssessment).toBe('high');
    });
  });

  describe('HuggingFace Response', () => {
    it('should create HuggingFace response for legal BERT', () => {
      const response = createHuggingFaceResponse('persian-legal-bert', 'قانون مدنی');
      
      expect(response.embeddings).toBeDefined();
      expect(response.confidence).toBeDefined();
    });

    it('should create HuggingFace response for classifier', () => {
      const response = createHuggingFaceResponse('persian-legal-classifier', 'قانون مدنی');
      
      expect(response.predictions).toBeDefined();
      expect(response.predictions[0].label).toBeDefined();
      expect(response.predictions[0].score).toBeDefined();
    });

    it('should handle unknown model', () => {
      const response = createHuggingFaceResponse('unknown-model', 'test');
      
      expect(response.error).toBe('Model not found');
    });
  });

  describe('OpenAI Response', () => {
    it('should create OpenAI response', () => {
      const response = createOpenAIResponse('قانون مدنی چیست؟');
      
      expect(response.choices).toBeDefined();
      expect(response.choices[0].message.content).toBeDefined();
      expect(response.usage).toBeDefined();
    });
  });

  describe('Error Response', () => {
    it('should create rate limit error response', () => {
      const response = createErrorResponse('rate_limit', 'Rate limit exceeded');
      
      expect(response.error).toBe('Rate limit exceeded');
      expect(response.message).toBeDefined();
      expect(response.retry_after).toBeDefined();
    });

    it('should create model not found error response', () => {
      const response = createErrorResponse('model_not_found', 'Model not found');
      
      expect(response.error).toBe('Model not found');
      expect(response.message).toBeDefined();
      expect(response.available_models).toBeDefined();
    });

    it('should create service unavailable error response', () => {
      const response = createErrorResponse('service_unavailable', 'Service unavailable');
      
      expect(response.error).toBe('Service unavailable');
      expect(response.message).toBeDefined();
      expect(response.retry_after).toBeDefined();
    });

    it('should create unknown error response', () => {
      const response = createErrorResponse('unknown_error', 'Unknown error');
      
      expect(response.error).toBe('Unknown error');
      expect(response.message).toBe('Unknown error');
    });
  });

  describe('Factory Methods', () => {
    it('should create multiple responses consistently', () => {
      const response1 = createClassificationResponse();
      const response2 = createClassificationResponse();
      
      expect(response1).toBeDefined();
      expect(response2).toBeDefined();
      expect(typeof response1.category).toBe('string');
      expect(typeof response2.category).toBe('string');
    });

    it('should handle Persian text in responses', () => {
      const response = createClassificationResponse({
        category: 'قانون مدنی',
        keywords: ['قانون', 'مدنی', 'ایران']
      });
      
      expect(response.category).toBe('قانون مدنی');
      expect(response.keywords).toContain('قانون');
    });
  });
});