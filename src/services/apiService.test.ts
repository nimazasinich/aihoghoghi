import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { apiService } from './apiService';
import { persianTestUtils } from '../test/utils/persianTextMatchers';
import type { SearchFilters, Document, ScrapingStatus } from '../types';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('API Service', () => {
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      interceptors: {
        response: {
          use: vi.fn()
        }
      }
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Document Operations', () => {
    describe('searchDocuments', () => {
      it('should search documents with Persian query', async () => {
        const mockResponse = {
          data: {
            documents: [
              {
                id: '1',
                title: 'قانون مدنی',
                content: 'متن قانون مدنی',
                category: 'قانون مدنی',
                source: 'قوه قضائیه',
                date: '2024-01-15T10:30:00Z',
                confidence: 0.95
              }
            ],
            total: 1,
            page: 1,
            hasMore: false
          }
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const filters: SearchFilters = {
          query: 'قانون مدنی',
          sortBy: 'relevance'
        };

        const result = await apiService.searchDocuments(filters, 1, 10);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          '/documents/search?page=1&limit=10&query=%D9%82%D8%A7%D9%86%D9%88%D9%86+%D9%85%D8%AF%D9%86%DB%8C&sortBy=relevance'
        );
        expect(result.documents).toHaveLength(1);
        expect(result.documents[0].title).toBeValidPersianText();
      });

      it('should handle empty search results', async () => {
        const mockResponse = {
          data: {
            documents: [],
            total: 0,
            page: 1,
            hasMore: false
          }
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const filters: SearchFilters = {
          query: 'جستجوی بدون نتیجه',
          sortBy: 'relevance'
        };

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
            hasMore: false
          }
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const filters: SearchFilters = {
          query: 'قانون',
          category: 'قانون مدنی',
          source: 'قوه قضائیه',
          sortBy: 'date'
        };

        await apiService.searchDocuments(filters, 2, 20);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          expect.stringContaining('category=%D9%82%D8%A7%D9%86%D9%88%D9%86+%D9%85%D8%AF%D9%86%DB%8C')
        );
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          expect.stringContaining('source=%D9%82%D9%88%D9%87+%D9%82%D8%B6%D8%A7%D8%A6%DB%8C%D9%87')
        );
      });

      it('should handle API errors gracefully', async () => {
        const error = new Error('API Error');
        mockAxiosInstance.get.mockRejectedValue(error);

        const filters: SearchFilters = {
          query: 'قانون مدنی',
          sortBy: 'relevance'
        };

        await expect(apiService.searchDocuments(filters)).rejects.toThrow('API Error');
      });
    });

    describe('getDocument', () => {
      it('should fetch document by ID', async () => {
        const mockDocument: Document = {
          id: '1',
          title: 'قانون مدنی',
          content: 'متن کامل قانون مدنی',
          category: 'قانون مدنی',
          source: 'قوه قضائیه',
          url: 'https://example.com/law',
          date: '2024-01-15T10:30:00Z',
          confidence: 0.95
        };

        const mockResponse = { data: mockDocument };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await apiService.getDocument(1);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/documents/1');
        expect(result).toEqual(mockDocument);
        expect(result.title).toBeValidPersianText();
      });

      it('should handle document not found', async () => {
        const error = new Error('Document not found');
        mockAxiosInstance.get.mockRejectedValue(error);

        await expect(apiService.getDocument(999)).rejects.toThrow('Document not found');
      });
    });

    describe('getCategories', () => {
      it('should fetch categories with Persian names', async () => {
        const mockCategories = [
          'قانون مدنی',
          'قانون تجارت',
          'قانون کار',
          'قانون مجازات اسلامی'
        ];

        const mockResponse = { data: mockCategories };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await apiService.getCategories();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/documents/categories');
        expect(result).toEqual(mockCategories);
        result.forEach(category => {
          expect(category).toBeValidPersianText();
        });
      });
    });

    describe('getSources', () => {
      it('should fetch sources with Persian names', async () => {
        const mockSources = [
          'قوه قضائیه',
          'مجلس شورای اسلامی',
          'وزارت دادگستری'
        ];

        const mockResponse = { data: mockSources };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await apiService.getSources();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/documents/sources');
        expect(result).toEqual(mockSources);
        result.forEach(source => {
          expect(source).toBeValidPersianText();
        });
      });
    });
  });

  describe('Scraping Operations', () => {
    describe('startScraping', () => {
      it('should start scraping with default URLs', async () => {
        const mockResponse = {
          data: { message: 'جمع‌آوری اسناد شروع شد' }
        };

        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const result = await apiService.startScraping();

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/scraping/start', { urls: undefined });
        expect(result.message).toBeValidPersianText();
      });

      it('should start scraping with custom URLs', async () => {
        const mockResponse = {
          data: { message: 'جمع‌آوری اسناد شروع شد' }
        };

        const customUrls = [
          'https://rc.majlis.ir',
          'https://divan-edalat.ir'
        ];

        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const result = await apiService.startScraping(customUrls);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/scraping/start', { urls: customUrls });
        expect(result.message).toBeValidPersianText();
      });
    });

    describe('stopScraping', () => {
      it('should stop scraping', async () => {
        const mockResponse = {
          data: { message: 'جمع‌آوری اسناد متوقف شد' }
        };

        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const result = await apiService.stopScraping();

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/scraping/stop');
        expect(result.message).toBeValidPersianText();
      });
    });

    describe('getScrapingStatus', () => {
      it('should fetch scraping status', async () => {
        const mockStatus: ScrapingStatus = {
          isActive: true,
          documentsProcessed: 150,
          totalDocuments: 500,
          currentSource: 'قوه قضائیه',
          startTime: '2024-01-15T10:00:00Z',
          lastUpdate: '2024-01-15T10:30:00Z',
          errors: 2,
          sources: [
            { name: 'قوه قضائیه', status: 'active', documents: 75 },
            { name: 'مجلس شورای اسلامی', status: 'pending', documents: 0 }
          ]
        };

        const mockResponse = { data: mockStatus };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await apiService.getScrapingStatus();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/scraping/status');
        expect(result).toEqual(mockStatus);
        expect(result.currentSource).toBeValidPersianText();
      });
    });
  });

  describe('AI Operations', () => {
    describe('classifyDocument', () => {
      it('should classify Persian document', async () => {
        const mockClassification = {
          category: 'قانون مدنی',
          confidence: 0.95,
          entities: [
            { text: 'قانون مدنی', label: 'LEGAL_DOCUMENT', start: 0, end: 10 },
            { text: 'قرارداد', label: 'LEGAL_CONCEPT', start: 15, end: 22 }
          ]
        };

        const mockResponse = { data: mockClassification };
        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const result = await apiService.classifyDocument('قانون مدنی شامل مقررات قراردادها است');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/ai/classify', {
          text: 'قانون مدنی شامل مقررات قراردادها است'
        });
        expect(result.category).toBeValidPersianText();
        expect(result.confidence).toBeGreaterThan(0.9);
      });

      it('should handle classification errors', async () => {
        const error = new Error('Classification failed');
        mockAxiosInstance.post.mockRejectedValue(error);

        await expect(apiService.classifyDocument('متن تست')).rejects.toThrow('Classification failed');
      });
    });
  });

  describe('System Operations', () => {
    describe('getSystemStats', () => {
      it('should fetch system statistics', async () => {
        const mockStats = {
          totalDocuments: 1250,
          totalCategories: 15,
          lastScraped: '2024-01-15T10:30:00Z',
          databaseSize: 52428800
        };

        const mockResponse = { data: mockStats };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await apiService.getSystemStats();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/system/stats');
        expect(result).toEqual(mockStats);
        expect(result.totalDocuments).toBeGreaterThan(0);
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

    it('should handle 404 errors', async () => {
      const notFoundError = {
        response: {
          status: 404,
          data: { message: 'Not found' }
        }
      };
      mockAxiosInstance.get.mockRejectedValue(notFoundError);

      await expect(apiService.getDocument(999)).rejects.toThrow();
    });

    it('should handle 500 errors', async () => {
      const serverError = {
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        }
      };
      mockAxiosInstance.get.mockRejectedValue(serverError);

      await expect(apiService.getSystemStats()).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle concurrent requests', async () => {
      const mockResponse = { data: [] };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const start = performance.now();
      const promises = Array.from({ length: 10 }, () => apiService.getCategories());
      await Promise.all(promises);
      const end = performance.now();

      expect(end - start).toBeLessThan(1000);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(10);
    });

    it('should handle large response data', async () => {
      const largeDocumentList = Array.from({ length: 1000 }, (_, i) => ({
        id: i.toString(),
        title: `سند ${i}`,
        content: 'متن سند',
        category: 'قانون مدنی',
        source: 'قوه قضائیه',
        date: '2024-01-15T10:30:00Z',
        confidence: 0.9
      }));

      const mockResponse = {
        data: {
          documents: largeDocumentList,
          total: 1000,
          page: 1,
          hasMore: false
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const start = performance.now();
      const result = await apiService.searchDocuments({ query: 'قانون' });
      const end = performance.now();

      expect(result.documents).toHaveLength(1000);
      expect(end - start).toBeLessThan(500);
    });
  });

  describe('Configuration', () => {
    it('should use correct base URL', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:8000/api',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    });

    it('should set up response interceptors', () => {
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });
});