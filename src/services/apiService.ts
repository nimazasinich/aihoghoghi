import axios from 'axios';
import type { Document, SearchFilters, ScrapingStatus, ApiResponse, LoginCredentials, RegisterData, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Try to refresh token
      try {
        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
          headers: {
            Authorization: `Bearer ${typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : ''}`
          }
        });
        
        if (refreshResponse.data.success) {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('auth_token', refreshResponse.data.token);
          }
          originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('auth_token');
        }
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
    
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
  },

  // Authentication operations
  async login(credentials: LoginCredentials): Promise<{ success: boolean; message: string; user?: User; token?: string }> {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  async register(data: RegisterData): Promise<{ success: boolean; message: string; user?: User }> {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  async logout(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  async refreshToken(): Promise<{ success: boolean; token?: string }> {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/auth/reset-password', { token, new_password: newPassword });
    return response.data;
  },

  async updateProfile(profileData: Partial<User>): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.put('/auth/profile', profileData);
    return response.data;
  }
};