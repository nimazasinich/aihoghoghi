export interface Document {
  id: number;
  url: string;
  title: string;
  content: string;
  source: string;
  category: string;
  scraped_at: string;
  content_hash: string;
  classification?: {
    category: string;
    confidence: number;
    entities: Array<{
      text: string;
      label: string;
      start: number;
      end: number;
    }>;
  };
}

export interface SearchFilters {
  query: string;
  source?: string;
  category?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  sortBy?: 'relevance' | 'date' | 'title';
}

export interface ScrapingStatus {
  isActive: boolean;
  currentUrl: string;
  documentsProcessed: number;
  totalDocuments: number;
  errorCount: number;
  lastUpdate: string;
  proxyStatus: 'active' | 'rotating' | 'failed';
}

export interface ApiResponse<T> {
  data: T;
  total?: number;
  page?: number;
  limit?: number;
  message?: string;
}