export interface Document {
  id: string;
  title: string;
  content: string;
  category: string;
  source: string;
  url: string;
  date: string;
  confidence: number;
  tags?: string[];
  summary?: string;
}

export interface SearchFilters {
  query: string;
  category?: string;
  source?: string;
  sortBy: 'relevance' | 'date' | 'title';
  dateFrom?: string;
  dateTo?: string;
}

export interface ScrapingStatus {
  isActive: boolean;
  documentsProcessed: number;
  totalDocuments: number;
  currentSource: string | null;
  startTime: string | null;
  lastUpdate: string;
  errors: number;
  sources: Array<{
    name: string;
    status: 'active' | 'pending' | 'completed' | 'error';
    documents: number;
  }>;
}

export interface ApiResponse<T> {
  data: T;
  total?: number;
  page?: number;
  hasMore?: boolean;
  documents?: T[];
}

export interface Category {
  id: string;
  name: string;
  count: number;
  description?: string;
}

export interface Source {
  id: string;
  name: string;
  url: string;
  reliability: number;
  lastScraped: string;
  status: 'active' | 'inactive' | 'error';
}

export interface SystemStats {
  totalDocuments: number;
  totalCategories: number;
  lastScraped: string;
  databaseSize: number;
  activeUsers?: number;
  uptime?: string;
}

export interface ClassificationResult {
  category: string;
  confidence: number;
  entities: Array<{
    text: string;
    label: string;
    start: number;
    end: number;
  }>;
}

export interface SearchResult {
  documents: Document[];
  total: number;
  page: number;
  hasMore: boolean;
  query: string;
  filters: SearchFilters;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'lawyer' | 'researcher' | 'viewer';
  createdAt: string;
  lastLogin?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: string;
}

export interface ApiError {
  message: string;
  code: string;
  details?: any;
}

export interface WebSocketMessage {
  type: 'scraping_update' | 'document_processed' | 'system_status' | 'error';
  data: any;
  timestamp: string;
}

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  uptime: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: string;
  details?: any;
}