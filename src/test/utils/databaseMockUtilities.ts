import { vi } from 'vitest';

/**
 * Database Mock Utilities - The most advanced database testing utilities ever created!
 * These utilities provide comprehensive database mocking for testing our legal archive system.
 */

export interface MockDocument {
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

export interface MockUser {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'lawyer' | 'researcher' | 'viewer';
  created_at: string;
  last_login?: string;
  is_active: boolean;
}

export interface MockSearchResult {
  documents: MockDocument[];
  total: number;
  page: number;
  hasMore: boolean;
  query: string;
  execution_time: number;
}

export class DatabaseMockFactory {
  private static instance: DatabaseMockFactory;
  private mockData: Map<string, any[]> = new Map();
  
  static getInstance(): DatabaseMockFactory {
    if (!DatabaseMockFactory.instance) {
      DatabaseMockFactory.instance = new DatabaseMockFactory();
    }
    return DatabaseMockFactory.instance;
  }
  
  /**
   * Initialize mock database with sample data
   */
  initializeMockData(): void {
    // Mock documents
    const mockDocuments: MockDocument[] = [
      {
        id: 'doc_001',
        title: 'قانون مدنی ایران - ماده ۱',
        content: 'ماده ۱: قانون مدنی ایران شامل قواعد کلی حقوق خصوصی است.',
        category: 'قانون مدنی',
        source: 'قوه قضائیه',
        date: '2024-01-15T10:00:00Z',
        url: 'https://example.com/law/1',
        confidence: 0.98,
        legal_terms: ['قانون مدنی', 'حقوق خصوصی'],
        summary: 'تعریف کلی قانون مدنی ایران',
        keywords: ['قانون', 'مدنی', 'ایران', 'حقوق']
      },
      {
        id: 'doc_002',
        title: 'قرارداد خرید و فروش',
        content: 'قرارداد خرید و فروش ملک بین طرفین منعقد می‌گردد.',
        category: 'قانون تجارت',
        source: 'سازمان ثبت اسناد',
        date: '2024-01-14T14:30:00Z',
        url: 'https://example.com/contract/1',
        confidence: 0.95,
        legal_terms: ['قرارداد', 'خرید', 'فروش', 'ملک'],
        summary: 'نمونه قرارداد خرید و فروش ملک',
        keywords: ['قرارداد', 'خرید', 'فروش', 'ملک']
      },
      {
        id: 'doc_003',
        title: 'آیین دادرسی مدنی - ماده ۱۰',
        content: 'ماده ۱۰: دادگاه صلاحیت رسیدگی به دعاوی را دارد.',
        category: 'آیین دادرسی',
        source: 'قوه قضائیه',
        date: '2024-01-13T09:15:00Z',
        url: 'https://example.com/procedure/10',
        confidence: 0.97,
        legal_terms: ['آیین دادرسی', 'دادگاه', 'صلاحیت', 'دعوا'],
        summary: 'صلاحیت دادگاه در رسیدگی به دعاوی',
        keywords: ['آیین', 'دادرسی', 'دادگاه', 'صلاحیت']
      }
    ];
    
    // Mock users
    const mockUsers: MockUser[] = [
      {
        id: 'user_001',
        username: 'admin',
        email: 'admin@legal-archive.ir',
        role: 'admin',
        created_at: '2024-01-01T00:00:00Z',
        last_login: '2024-01-15T08:00:00Z',
        is_active: true
      },
      {
        id: 'user_002',
        username: 'lawyer_ahmad',
        email: 'ahmad@lawfirm.ir',
        role: 'lawyer',
        created_at: '2024-01-05T10:00:00Z',
        last_login: '2024-01-15T07:30:00Z',
        is_active: true
      },
      {
        id: 'user_003',
        username: 'researcher_sara',
        email: 'sara@university.ir',
        role: 'researcher',
        created_at: '2024-01-10T14:00:00Z',
        last_login: '2024-01-14T16:45:00Z',
        is_active: true
      }
    ];
    
    this.mockData.set('documents', mockDocuments);
    this.mockData.set('users', mockUsers);
  }
  
  /**
   * Create mock database connection
   */
  createMockConnection(): any {
    return {
      query: vi.fn(),
      transaction: vi.fn(),
      close: vi.fn(),
      isConnected: vi.fn(() => true),
      ping: vi.fn(() => Promise.resolve(true))
    };
  }
  
  /**
   * Create mock query executor
   */
  createMockQueryExecutor(): any {
    const executor = vi.fn();
    
    // Mock common queries
    executor.mockImplementation((sql: string, params?: any[]) => {
      const query = sql.toLowerCase();
      
      if (query.includes('select * from documents')) {
        return Promise.resolve({
          rows: this.mockData.get('documents') || [],
          rowCount: this.mockData.get('documents')?.length || 0
        });
      }
      
      if (query.includes('select * from users')) {
        return Promise.resolve({
          rows: this.mockData.get('users') || [],
          rowCount: this.mockData.get('users')?.length || 0
        });
      }
      
      if (query.includes('insert into documents')) {
        const newDoc = {
          id: `doc_${Date.now()}`,
          ...params[0]
        };
        const documents = this.mockData.get('documents') || [];
        documents.push(newDoc);
        this.mockData.set('documents', documents);
        
        return Promise.resolve({
          rows: [newDoc],
          rowCount: 1
        });
      }
      
      if (query.includes('update documents')) {
        return Promise.resolve({
          rows: [],
          rowCount: 1
        });
      }
      
      if (query.includes('delete from documents')) {
        return Promise.resolve({
          rows: [],
          rowCount: 1
        });
      }
      
      // Default response
      return Promise.resolve({
        rows: [],
        rowCount: 0
      });
    });
    
    return executor;
  }
  
  /**
   * Create mock transaction
   */
  createMockTransaction(): any {
    return {
      query: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      isActive: vi.fn(() => true)
    };
  }
  
  /**
   * Create mock search function
   */
  createMockSearchFunction(): any {
    return vi.fn().mockImplementation((query: string, options: any = {}) => {
      const documents = this.mockData.get('documents') || [];
      const { page = 1, limit = 10, category, source } = options;
      
      let filteredDocs = documents;
      
      // Filter by category
      if (category) {
        filteredDocs = filteredDocs.filter(doc => doc.category === category);
      }
      
      // Filter by source
      if (source) {
        filteredDocs = filteredDocs.filter(doc => doc.source === source);
      }
      
      // Simple text search
      if (query) {
        filteredDocs = filteredDocs.filter(doc => 
          doc.title.includes(query) || 
          doc.content.includes(query) ||
          doc.keywords?.some(keyword => keyword.includes(query))
        );
      }
      
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedDocs = filteredDocs.slice(startIndex, endIndex);
      
      const result: MockSearchResult = {
        documents: paginatedDocs,
        total: filteredDocs.length,
        page,
        hasMore: endIndex < filteredDocs.length,
        query,
        execution_time: Math.random() * 50 + 10 // 10-60ms
      };
      
      return Promise.resolve(result);
    });
  }
  
  /**
   * Create mock user authentication
   */
  createMockAuthFunction(): any {
    return vi.fn().mockImplementation((username: string, password: string) => {
      const users = this.mockData.get('users') || [];
      const user = users.find(u => u.username === username);
      
      if (user && user.is_active) {
        return Promise.resolve({
          success: true,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
          },
          token: `mock_jwt_token_${user.id}`
        });
      }
      
      return Promise.resolve({
        success: false,
        error: 'Invalid credentials'
      });
    });
  }
  
  /**
   * Create mock analytics function
   */
  createMockAnalyticsFunction(): any {
    return vi.fn().mockImplementation((type: string, data: any) => {
      return Promise.resolve({
        success: true,
        analytics: {
          type,
          timestamp: new Date().toISOString(),
          data: {
            ...data,
            processed: true
          }
        }
      });
    });
  }
  
  /**
   * Create mock backup function
   */
  createMockBackupFunction(): any {
    return vi.fn().mockImplementation(() => {
      return Promise.resolve({
        success: true,
        backup_id: `backup_${Date.now()}`,
        size: '2.5MB',
        timestamp: new Date().toISOString()
      });
    });
  }
  
  /**
   * Create mock performance monitoring
   */
  createMockPerformanceMonitor(): any {
    return {
      startTimer: vi.fn(() => ({ end: vi.fn(() => Math.random() * 100) })),
      recordMetric: vi.fn(),
      getMetrics: vi.fn(() => ({
        query_count: 150,
        avg_response_time: 45.2,
        error_rate: 0.02,
        cache_hit_rate: 0.85
      }))
    };
  }
  
  /**
   * Reset all mock data
   */
  resetMockData(): void {
    this.mockData.clear();
    this.initializeMockData();
  }
  
  /**
   * Get mock data by table name
   */
  getMockData(tableName: string): any[] {
    return this.mockData.get(tableName) || [];
  }
  
  /**
   * Set mock data for a table
   */
  setMockData(tableName: string, data: any[]): void {
    this.mockData.set(tableName, data);
  }
}

// Export singleton instance
export const databaseMockFactory = DatabaseMockFactory.getInstance();

// Export convenience functions
export const createMockConnection = () => databaseMockFactory.createMockConnection();
export const createMockQueryExecutor = () => databaseMockFactory.createMockQueryExecutor();
export const createMockTransaction = () => databaseMockFactory.createMockTransaction();
export const createMockSearchFunction = () => databaseMockFactory.createMockSearchFunction();
export const createMockAuthFunction = () => databaseMockFactory.createMockAuthFunction();
export const createMockAnalyticsFunction = () => databaseMockFactory.createMockAnalyticsFunction();
export const createMockBackupFunction = () => databaseMockFactory.createMockBackupFunction();
export const createMockPerformanceMonitor = () => databaseMockFactory.createMockPerformanceMonitor();

export default databaseMockFactory;