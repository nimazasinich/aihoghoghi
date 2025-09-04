import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

export interface Document {
  id: string;
  title: string;
  content: string;
  category: string;
  source: string;
  date: string;
  url: string;
  confidence: number;
  legal_terms?: string[];
  summary?: string;
  keywords?: string[];
}

export interface SearchFilters {
  query: string;
  category?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy: 'relevance' | 'date' | 'title';
}

export interface SearchResult {
  documents: Document[];
  total: number;
  page: number;
  hasMore: boolean;
  query: string;
  execution_time: number;
}

export interface SystemStats {
  totalDocuments: number;
  totalCategories: number;
  totalSources: number;
  activeUsers: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
  lastUpdate: string;
  aiAnalysis?: any;
}

export interface Category {
  id: string;
  name: string;
  count: number;
}

export interface Source {
  id: string;
  name: string;
  url: string;
  reliability: number;
  lastScraped: string;
}

/**
 * Hook for managing document search and retrieval
 */
export function useDocuments(filters: SearchFilters) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (filters.query) {
      searchDocuments();
    }
  }, [filters]);

  const searchDocuments = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.get('/api/search', {
        params: filters
      });

      setDocuments(response.data.documents);
      setTotal(response.data.total);
      setHasMore(response.data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در جستجو');
    } finally {
      setLoading(false);
    }
  };

  return {
    documents,
    loading,
    error,
    total,
    hasMore,
    searchDocuments
  };
}

/**
 * Hook for getting system statistics
 */
export function useSystemStats() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    try {
      const response = await apiService.get('/api/stats');
      setStats(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری آمار');
    } finally {
      setLoading(false);
    }
  };

  return {
    data: stats,
    isLoading: loading,
    error,
    refetch: fetchSystemStats
  };
}

/**
 * Hook for getting categories
 */
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await apiService.get('/api/categories');
      setCategories(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری دسته‌بندی‌ها');
    } finally {
      setLoading(false);
    }
  };

  return {
    data: categories,
    isLoading: loading,
    error,
    refetch: fetchCategories
  };
}

/**
 * Hook for getting sources
 */
export function useSources() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const response = await apiService.get('/api/sources');
      setSources(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری منابع');
    } finally {
      setLoading(false);
    }
  };

  return {
    data: sources,
    isLoading: loading,
    error,
    refetch: fetchSources
  };
}

/**
 * Hook for getting a specific document
 */
export function useDocument(id: string) {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchDocument();
    }
  }, [id]);

  const fetchDocument = async () => {
    try {
      const response = await apiService.get(`/api/documents/${id}`);
      setDocument(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری سند');
    } finally {
      setLoading(false);
    }
  };

  return {
    data: document,
    isLoading: loading,
    error,
    refetch: fetchDocument
  };
}

/**
 * Hook for document analysis
 */
export function useDocumentAnalysis(documentId: string) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeDocument = async () => {
    if (!documentId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.post(`/api/documents/${documentId}/analyze`);
      setAnalysis(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در تحلیل سند');
    } finally {
      setLoading(false);
    }
  };

  return {
    analysis,
    loading,
    error,
    analyzeDocument
  };
}

/**
 * Hook for scraping status
 */
export function useScrapingStatus() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScrapingStatus();
  }, []);

  const fetchScrapingStatus = async () => {
    try {
      const response = await apiService.get('/api/scraping/status');
      setStatus(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری وضعیت جمع‌آوری');
    } finally {
      setLoading(false);
    }
  };

  return {
    data: status,
    isLoading: loading,
    error,
    refetch: fetchScrapingStatus
  };
}

/**
 * Hook for starting scraping
 */
export function useStartScraping() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startScraping = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.post('/api/scraping/start');
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در شروع جمع‌آوری');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return startScraping;
}

/**
 * Hook for stopping scraping
 */
export function useStopScraping() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopScraping = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.post('/api/scraping/stop');
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در توقف جمع‌آوری');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return stopScraping;
}