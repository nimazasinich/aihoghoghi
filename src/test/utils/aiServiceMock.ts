import { vi } from 'vitest';

export interface AIMockResponse {
  category: string;
  confidence: number;
  keywords: string[];
  summary: string;
  language: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  entities?: Array<{
    text: string;
    type: string;
    confidence: number;
  }>;
}

export interface SearchEnhancementResponse {
  enhancedQuery: string;
  suggestions: string[];
  relatedTerms: string[];
  confidence: number;
  language: string;
}

export interface ClassificationResponse {
  category: string;
  subcategory?: string;
  confidence: number;
  keywords: string[];
  summary: string;
  legalRelevance: number;
}

// AI Service Mock Factory
export class AIServiceMock {
  private responses: Map<string, any> = new Map();
  private delay: number = 100;
  
  constructor(delay = 100) {
    this.delay = delay;
    this.setupDefaultResponses();
  }
  
  private setupDefaultResponses() {
    // Default Persian legal document classification
    this.responses.set('classification', {
      category: 'قانون مدنی',
      subcategory: 'قراردادها',
      confidence: 0.95,
      keywords: ['قرارداد', 'مالکیت', 'حقوق', 'تعهد'],
      summary: 'سند مربوط به قراردادهای حقوقی و تعهدات طرفین',
      legalRelevance: 0.9,
      language: 'fa'
    });
    
    // Default search enhancement
    this.responses.set('search_enhancement', {
      enhancedQuery: 'قانون مدنی و قراردادها',
      suggestions: ['قانون مدنی', 'قانون تجارت', 'قانون کار'],
      relatedTerms: ['حقوق', 'قانون', 'مقررات', 'قرارداد'],
      confidence: 0.85,
      language: 'fa'
    });
    
    // Default document analysis
    this.responses.set('document_analysis', {
      category: 'قانون مدنی',
      confidence: 0.92,
      keywords: ['مالکیت', 'ارث', 'وصیت'],
      summary: 'تحلیل سند حقوقی مربوط به مالکیت و ارث',
      sentiment: 'neutral',
      entities: [
        { text: 'قانون مدنی', type: 'LEGAL_DOCUMENT', confidence: 0.95 },
        { text: 'مالکیت', type: 'LEGAL_CONCEPT', confidence: 0.9 }
      ],
      language: 'fa'
    });
  }
  
  // Mock classification method
  async classifyDocument(content: string, options = {}): Promise<ClassificationResponse> {
    await this.simulateDelay();
    
    const response = this.responses.get('classification') || {
      category: 'قانون عمومی',
      confidence: 0.8,
      keywords: ['حقوق', 'قانون'],
      summary: 'سند حقوقی عمومی',
      legalRelevance: 0.7
    };
    
    // Simulate different responses based on content
    if (content.includes('قرارداد')) {
      response.category = 'قانون مدنی';
      response.subcategory = 'قراردادها';
      response.keywords = ['قرارداد', 'تعهد', 'مالکیت'];
    } else if (content.includes('جرم')) {
      response.category = 'قانون مجازات اسلامی';
      response.subcategory = 'جرایم';
      response.keywords = ['جرم', 'مجازات', 'قانون'];
    } else if (content.includes('کار')) {
      response.category = 'قانون کار';
      response.subcategory = 'روابط کار';
      response.keywords = ['کار', 'کارگر', 'کارفرما'];
    }
    
    return { ...response };
  }
  
  // Mock search enhancement method
  async enhanceSearchQuery(query: string, options = {}): Promise<SearchEnhancementResponse> {
    await this.simulateDelay();
    
    const response = this.responses.get('search_enhancement') || {
      enhancedQuery: query,
      suggestions: [],
      relatedTerms: [],
      confidence: 0.7,
      language: 'fa'
    };
    
    // Enhance query based on content
    if (query.includes('قرارداد')) {
      response.enhancedQuery = 'قرارداد و تعهدات حقوقی';
      response.suggestions = ['قانون مدنی', 'قراردادها', 'تعهدات'];
      response.relatedTerms = ['مالکیت', 'حقوق', 'قانون'];
    }
    
    return { ...response };
  }
  
  // Mock document analysis method
  async analyzeDocument(content: string, options = {}): Promise<AIMockResponse> {
    await this.simulateDelay();
    
    const response = this.responses.get('document_analysis') || {
      category: 'قانون عمومی',
      confidence: 0.8,
      keywords: ['حقوق', 'قانون'],
      summary: 'تحلیل سند حقوقی',
      sentiment: 'neutral',
      entities: [],
      language: 'fa'
    };
    
    // Analyze content and adjust response
    if (content.includes('مثبت')) {
      response.sentiment = 'positive';
    } else if (content.includes('منفی')) {
      response.sentiment = 'negative';
    }
    
    return { ...response };
  }
  
  // Mock text extraction method
  async extractText(document: any): Promise<string> {
    await this.simulateDelay();
    
    // Simulate text extraction from document
    return 'متن استخراج شده از سند حقوقی به زبان فارسی';
  }
  
  // Mock language detection
  async detectLanguage(text: string): Promise<string> {
    await this.simulateDelay();
    
    const persianRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    return persianRegex.test(text) ? 'fa' : 'en';
  }
  
  // Mock entity extraction
  async extractEntities(text: string): Promise<Array<{text: string, type: string, confidence: number}>> {
    await this.simulateDelay();
    
    return [
      { text: 'قانون مدنی', type: 'LEGAL_DOCUMENT', confidence: 0.95 },
      { text: 'مالکیت', type: 'LEGAL_CONCEPT', confidence: 0.9 },
      { text: 'قرارداد', type: 'LEGAL_CONCEPT', confidence: 0.85 }
    ];
  }
  
  // Mock similarity calculation
  async calculateSimilarity(text1: string, text2: string): Promise<number> {
    await this.simulateDelay();
    
    // Simple similarity calculation based on common words
    const words1 = text1.split(' ');
    const words2 = text2.split(' ');
    const commonWords = words1.filter(word => words2.includes(word));
    
    return commonWords.length / Math.max(words1.length, words2.length);
  }
  
  // Mock batch processing
  async processBatch(documents: any[]): Promise<any[]> {
    await this.simulateDelay();
    
    return documents.map((doc, index) => ({
      id: doc.id,
      category: 'قانون مدنی',
      confidence: 0.9 - (index * 0.01),
      processed: true,
      timestamp: new Date().toISOString()
    }));
  }
  
  // Utility methods
  private async simulateDelay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.delay));
  }
  
  // Set custom response for testing
  setResponse(key: string, response: any): void {
    this.responses.set(key, response);
  }
  
  // Get response for verification
  getResponse(key: string): any {
    return this.responses.get(key);
  }
  
  // Clear all responses
  clearResponses(): void {
    this.responses.clear();
    this.setupDefaultResponses();
  }
  
  // Set delay for testing
  setDelay(delay: number): void {
    this.delay = delay;
  }
}

// AI Service Mock Factory
export const createAIServiceMock = (delay = 100): AIServiceMock => {
  return new AIServiceMock(delay);
};

// AI Service Testing Utilities
export const aiServiceTestUtils = {
  // Create mock with specific responses
  createMockWithResponses: (responses: Record<string, any>) => {
    const mock = createAIServiceMock(0); // No delay for testing
    Object.entries(responses).forEach(([key, value]) => {
      mock.setResponse(key, value);
    });
    return mock;
  },
  
  // Test classification accuracy
  testClassificationAccuracy: async (mock: AIServiceMock, testCases: Array<{content: string, expectedCategory: string}>) => {
    const results = [];
    for (const testCase of testCases) {
      const result = await mock.classifyDocument(testCase.content);
      results.push({
        input: testCase.content,
        expected: testCase.expectedCategory,
        actual: result.category,
        confidence: result.confidence,
        correct: result.category === testCase.expectedCategory
      });
    }
    return results;
  },
  
  // Test search enhancement
  testSearchEnhancement: async (mock: AIServiceMock, queries: string[]) => {
    const results = [];
    for (const query of queries) {
      const result = await mock.enhanceSearchQuery(query);
      results.push({
        originalQuery: query,
        enhancedQuery: result.enhancedQuery,
        suggestions: result.suggestions,
        confidence: result.confidence
      });
    }
    return results;
  },
  
  // Test performance
  testPerformance: async (mock: AIServiceMock, operation: () => Promise<any>, iterations = 100) => {
    const times = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await operation();
      const end = performance.now();
      times.push(end - start);
    }
    
    return {
      average: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      median: times.sort((a, b) => a - b)[Math.floor(times.length / 2)]
    };
  }
};

// Mock HuggingFace integration
export const huggingFaceMock = {
  // Mock model loading
  loadModel: vi.fn().mockResolvedValue({
    model: 'mock-model',
    tokenizer: 'mock-tokenizer',
    loaded: true
  }),
  
  // Mock text classification
  classifyText: vi.fn().mockResolvedValue({
    label: 'قانون مدنی',
    score: 0.95
  }),
  
  // Mock text generation
  generateText: vi.fn().mockResolvedValue('متن تولید شده توسط مدل'),
  
  // Mock embedding generation
  generateEmbedding: vi.fn().mockResolvedValue(new Array(768).fill(0.1)),
  
  // Mock similarity calculation
  calculateSimilarity: vi.fn().mockResolvedValue(0.85)
};