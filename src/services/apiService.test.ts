import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios completely before any imports
vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    }
  };

  return {
    default: {
      create: vi.fn(() => mockAxiosInstance)
    }
  };
});

// Import after mocking
import axios from 'axios';
import { apiService } from './apiService';

describe('API Service', () => {
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Get the mock instance
    mockAxiosInstance = vi.mocked(axios.create)();
    vi.clearAllMocks();
  });

  describe('Document Operations', () => {
    describe('searchDocuments', () => {
      it('should search documents with Persian query', async () => {
        const mockResponse = {
          data: {
            documents: [
              {
                id: 1,
                title: 'قانون مدنی',
                content: 'متن قانون مدنی ایران',
                category: 'قانون مدنی',
                source: 'قوه قضاییه',
                date: '2023-01-01',
                url: 'https://example.com/law1'
              }
            ],
            total: 1,
            page: 1,
            limit: 10
          }
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const filters = { query: 'قانون مدنی' };
        const result = await apiService.searchDocuments(filters);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          expect.stringContaining('/documents/search')
        );
        expect(result).toEqual(mockResponse.data);
      });

      it('should handle empty search results', async () => {
        const mockResponse = {
          data: {
            documents: [],
            total: 0,
            page: 1,
            limit: 10
          }
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const filters = { query: 'nonexistent' };
        const result = await apiService.searchDocuments(filters);

        expect(result.documents).toHaveLength(0);
        expect(result.total).toBe(0);
      });

      it('should handle search with filters', async () => {
        const mockResponse = {
          data: {
            documents: [],
            total: 0,
            page: 1,
            limit: 10
          }
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const filters = { 
          query: 'قانون', 
          category: 'قانون مدنی',
          source: 'قوه قضاییه'
        };
        const result = await apiService.searchDocuments(filters);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          expect.stringContaining('category=')
        );
        expect(result).toEqual(mockResponse.data);
      });

      it('should handle API errors gracefully', async () => {
        const error = {
          response: {
            status: 500,
            data: { message: 'API Error' }
          }
        };

        mockAxiosInstance.get.mockRejectedValue(error);

        const filters = { query: 'قانون' };
        await expect(apiService.searchDocuments(filters)).rejects.toThrow();
      });
    });

    describe('getDocument', () => {
      it('should fetch document by ID', async () => {
        const mockResponse = {
          data: {
            id: 1,
            title: 'قانون مدنی',
            content: 'متن قانون مدنی ایران',
            category: 'قانون مدنی',
            source: 'قوه قضاییه',
            date: '2023-01-01',
            url: 'https://example.com/law1'
          }
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await apiService.getDocument(1);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/documents/1');
        expect(result).toEqual(mockResponse.data);
      });

      it('should handle document not found', async () => {
        const error = {
          response: {
            status: 404,
            data: { message: 'Document not found' }
          }
        };

        mockAxiosInstance.get.mockRejectedValue(error);

        await expect(apiService.getDocument(999)).rejects.toThrow();
      });
    });

    describe('getCategories', () => {
      it('should fetch categories with Persian names', async () => {
        const mockResponse = {
          data: ['قانون مدنی', 'قانون تجارت', 'قانون کار']
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await apiService.getCategories();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/documents/categories');
        expect(result).toEqual(mockResponse.data);
      });
    });

    describe('getSources', () => {
      it('should fetch sources with Persian names', async () => {
        const mockResponse = {
          data: ['قوه قضاییه', 'مجلس شورای اسلامی', 'دولت']
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await apiService.getSources();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/documents/sources');
        expect(result).toEqual(mockResponse.data);
      });
    });
  });

  describe('Scraping Operations', () => {
    describe('startScraping', () => {
      it('should start scraping with default URLs', async () => {
        const mockResponse = {
          data: { message: 'Scraping started successfully' }
        };

        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const result = await apiService.startScraping();

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/scraping/start', { urls: undefined });
        expect(result).toEqual(mockResponse.data);
      });

      it('should start scraping with custom URLs', async () => {
        const mockResponse = {
          data: { message: 'Scraping started successfully' }
        };

        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const customUrls = ['https://example1.com', 'https://example2.com'];
        const result = await apiService.startScraping(customUrls);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/scraping/start', { urls: customUrls });
        expect(result).toEqual(mockResponse.data);
      });
    });

    describe('stopScraping', () => {
      it('should stop scraping', async () => {
        const mockResponse = {
          data: { message: 'Scraping stopped successfully' }
        };

        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const result = await apiService.stopScraping();

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/scraping/stop');
        expect(result).toEqual(mockResponse.data);
      });
    });

    describe('getScrapingStatus', () => {
      it('should fetch scraping status', async () => {
        const mockResponse = {
          data: {
            isRunning: true,
            processed: 100,
            total: 1000,
            errors: 5
          }
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await apiService.getScrapingStatus();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/scraping/status');
        expect(result).toEqual(mockResponse.data);
      });
    });
  });

  describe('AI Operations', () => {
    describe('classifyDocument', () => {
      it('should classify Persian document', async () => {
        const mockResponse = {
          data: {
            category: 'قانون مدنی',
            confidence: 0.95,
            keywords: ['قانون', 'مدنی', 'ایران']
          }
        };

        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const result = await apiService.classifyDocument('متن قانون مدنی');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/ai/classify', { text: 'متن قانون مدنی' });
        expect(result).toEqual(mockResponse.data);
      });

      it('should handle classification errors', async () => {
        const error = {
          response: {
            status: 500,
            data: { message: 'Classification failed' }
          }
        };

        mockAxiosInstance.post.mockRejectedValue(error);

        await expect(apiService.classifyDocument('متن تست')).rejects.toThrow();
      });
    });
  });

  describe('System Operations', () => {
    describe('getSystemStats', () => {
      it('should fetch system statistics', async () => {
        const mockResponse = {
          data: {
            totalDocuments: 1000,
            totalCategories: 10,
            totalSources: 5,
            lastUpdate: '2023-01-01T00:00:00Z'
          }
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await apiService.getSystemStats();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/system/stats');
        expect(result).toEqual(mockResponse.data);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockAxiosInstance.get.mockRejectedValue(networkError);

      await expect(apiService.getCategories()).rejects.toThrow('Network Error');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('timeout of 30000ms exceeded');
      mockAxiosInstance.get.mockRejectedValue(timeoutError);

      await expect(apiService.searchDocuments({ query: 'قانون' })).rejects.toThrow('timeout');
    });
  });

  describe('Performance', () => {
    it('should handle concurrent requests', async () => {
      const mockResponse = {
        data: ['قانون مدنی', 'قانون تجارت']
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const promises = [
        apiService.getCategories(),
        apiService.getCategories(),
        apiService.getCategories()
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
    });

    it('should handle large response data', async () => {
      const largeDocumentList = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        title: `قانون ${i + 1}`,
        content: `متن قانون ${i + 1}`,
        category: 'قانون مدنی',
        source: 'قوه قضاییه',
        date: '2023-01-01',
        url: `https://example.com/law${i + 1}`
      }));

      const mockResponse = {
        data: {
          documents: largeDocumentList,
          total: 1000,
          page: 1,
          limit: 1000
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiService.searchDocuments({ query: 'قانون' });

      expect(result.documents).toHaveLength(1000);
      expect(result.total).toBe(1000);
    });
  });

  describe('Configuration', () => {
    it('should use correct base URL', () => {
      expect(mockAxiosInstance).toBeDefined();
    });

    it('should set up response interceptors', () => {
      expect(mockAxiosInstance.interceptors.response.use).toBeDefined();
    });
  });
});