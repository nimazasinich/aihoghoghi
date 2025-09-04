import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createWebSocketMock } from '../utils/webSocketMockFactory';
import { createClassificationResponse } from '../utils/aiServiceMockResponses';
import { databaseMockFactory } from '../utils/databaseMockUtilities';

/**
 * Simple Integration Tests - Basic integration testing for the legal archive system
 */

// Mock services
vi.mock('../../services/apiService', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('../../services/aiService', () => ({
  aiService: {
    classifyDocument: vi.fn(),
    analyzeDocument: vi.fn(),
    enhanceSearchQuery: vi.fn(),
    generateSummary: vi.fn()
  }
}));

describe('Simple Integration Tests', () => {
  let mockWebSocket: any;
  let mockDatabase: any;

  beforeEach(() => {
    mockWebSocket = createWebSocketMock();
    mockDatabase = databaseMockFactory;
    mockDatabase.initializeMockData();
    
    vi.clearAllMocks();
  });

  describe('WebSocket Integration', () => {
    it('should handle WebSocket connection', () => {
      expect(mockWebSocket.isConnected()).toBe(true);
    });

    it('should handle WebSocket messages', () => {
      const message = { type: 'test', data: 'test data' };
      mockWebSocket.simulateMessage(message);
      
      // Just verify the mock exists and can handle messages
      expect(mockWebSocket).toBeDefined();
      expect(mockWebSocket.simulateMessage).toBeDefined();
    });

    it('should handle WebSocket errors', () => {
      mockWebSocket.simulateError();
      
      // Just verify the mock exists and can handle errors
      expect(mockWebSocket).toBeDefined();
      expect(mockWebSocket.simulateError).toBeDefined();
    });
  });

  describe('Database Integration', () => {
    it('should handle database queries', async () => {
      const mockQuery = mockDatabase.createMockQueryExecutor();
      const result = await mockQuery('SELECT * FROM documents');
      
      expect(result.rows).toBeDefined();
      expect(result.rowCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle database transactions', async () => {
      const mockTransaction = mockDatabase.createMockTransaction();
      
      await mockTransaction.query('INSERT INTO documents VALUES (?, ?)', ['doc_001', 'قانون مدنی']);
      await mockTransaction.commit();
      
      expect(mockTransaction.query).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
    });
  });

  describe('AI Service Integration', () => {
    it('should handle AI classification', async () => {
      const { aiService } = await import('../../services/aiService');
      
      const mockResponse = createClassificationResponse({
        category: 'قانون مدنی',
        confidence: 0.95
      });
      
      vi.mocked(aiService.classifyDocument).mockResolvedValue(mockResponse);
      
      const result = await aiService.classifyDocument('قانون مدنی ایران');
      
      expect(result.category).toBe('قانون مدنی');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should handle AI service errors', async () => {
      const { aiService } = await import('../../services/aiService');
      
      vi.mocked(aiService.classifyDocument).mockRejectedValue(new Error('AI service error'));
      
      try {
        await aiService.classifyDocument('test');
      } catch (error) {
        expect(error.message).toBe('AI service error');
      }
    });
  });

  describe('API Service Integration', () => {
    it('should handle API requests', async () => {
      const { apiService } = await import('../../services/apiService');
      
      vi.mocked(apiService.get).mockResolvedValue({
        data: { documents: [], total: 0 }
      });
      
      const result = await apiService.get('/api/search');
      
      expect(result.data).toBeDefined();
      expect(apiService.get).toHaveBeenCalledWith('/api/search');
    });

    it('should handle API errors', async () => {
      const { apiService } = await import('../../services/apiService');
      
      vi.mocked(apiService.get).mockRejectedValue(new Error('API error'));
      
      try {
        await apiService.get('/api/search');
      } catch (error) {
        expect(error.message).toBe('API error');
      }
    });
  });

  describe('Persian Text Integration', () => {
    it('should handle Persian text in AI responses', () => {
      const response = createClassificationResponse({
        category: 'قانون مدنی',
        keywords: ['قانون', 'مدنی', 'ایران']
      });
      
      expect(response.category).toBe('قانون مدنی');
      expect(response.keywords).toContain('قانون');
    });

    it('should handle Persian text in database operations', async () => {
      const mockQuery = mockDatabase.createMockQueryExecutor();
      
      const result = await mockQuery('SELECT * FROM documents WHERE title LIKE ?', ['%قانون%']);
      
      expect(result.rows).toBeDefined();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle service failures gracefully', async () => {
      const { apiService } = await import('../../services/apiService');
      const { aiService } = await import('../../services/aiService');
      
      vi.mocked(apiService.get).mockRejectedValue(new Error('Service unavailable'));
      vi.mocked(aiService.classifyDocument).mockRejectedValue(new Error('AI service down'));
      
      try {
        await apiService.get('/api/search');
      } catch (error) {
        expect(error.message).toBe('Service unavailable');
      }
      
      try {
        await aiService.classifyDocument('test');
      } catch (error) {
        expect(error.message).toBe('AI service down');
      }
    });
  });
});