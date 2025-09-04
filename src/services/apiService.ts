import axios from 'axios';
import type { Document, SearchFilters, ScrapingStatus, ApiResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request/response interceptors for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
);

export const apiService = {
  // Document operations
  async searchDocuments(filters: SearchFilters, page = 1, limit = 10): Promise<ApiResponse<Document[]>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    });
    
    const response = await apiClient.get(`/documents/search?${params}`);
    return response.data;
  },

  async getDocument(id: number): Promise<Document> {
    const response = await apiClient.get(`/documents/${id}`);
    return response.data;
  },

  async getCategories(): Promise<string[]> {
    const response = await apiClient.get('/documents/categories');
    return response.data;
  },

  async getSources(): Promise<string[]> {
    const response = await apiClient.get('/documents/sources');
    return response.data;
  },

  // Scraping operations
  async startScraping(urls?: string[]): Promise<{ message: string }> {
    const response = await apiClient.post('/scraping/start', { urls });
    return response.data;
  },

  async stopScraping(): Promise<{ message: string }> {
    const response = await apiClient.post('/scraping/stop');
    return response.data;
  },

  async getScrapingStatus(): Promise<ScrapingStatus> {
    const response = await apiClient.get('/scraping/status');
    return response.data;
  },

  // AI operations
  async classifyDocument(text: string): Promise<{
    category: string;
    confidence: number;
    entities: Array<{ text: string; label: string; start: number; end: number }>;
  }> {
    const response = await apiClient.post('/ai/classify', { text });
    return response.data;
  },

  async getSystemStats(): Promise<{
    totalDocuments: number;
    totalCategories: number;
    lastScraped: string;
    databaseSize: number;
  }> {
    const response = await apiClient.get('/system/stats');
    return response.data;
  }
};