import { vi } from 'vitest';

export interface DatabaseMockOptions {
  delay?: number;
  shouldFail?: boolean;
  customResponses?: Record<string, any>;
}

export interface QueryResult {
  rows: any[];
  rowCount: number;
  fields: Array<{name: string, type: string}>;
}

export interface TransactionResult {
  success: boolean;
  results: QueryResult[];
  error?: string;
}

// Database Mock Class
export class DatabaseMock {
  private delay: number;
  private shouldFail: boolean;
  private customResponses: Record<string, any>;
  private queryHistory: Array<{query: string, params: any[], timestamp: Date}> = [];
  private connectionCount: number = 0;
  
  constructor(options: DatabaseMockOptions = {}) {
    this.delay = options.delay || 50;
    this.shouldFail = options.shouldFail || false;
    this.customResponses = options.customResponses || {};
    this.setupDefaultResponses();
  }
  
  private setupDefaultResponses() {
    // Default responses for common queries
    this.customResponses = {
      'SELECT * FROM documents': {
        rows: [
          {
            id: '1',
            title: 'قانون مدنی',
            content: 'متن قانون مدنی',
            category: 'قانون مدنی',
            source: 'قوه قضائیه',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '2',
            title: 'قانون تجارت',
            content: 'متن قانون تجارت',
            category: 'قانون تجارت',
            source: 'قوه قضائیه',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ],
        rowCount: 2,
        fields: [
          { name: 'id', type: 'varchar' },
          { name: 'title', type: 'varchar' },
          { name: 'content', type: 'text' },
          { name: 'category', type: 'varchar' },
          { name: 'source', type: 'varchar' },
          { name: 'created_at', type: 'timestamp' },
          { name: 'updated_at', type: 'timestamp' }
        ]
      },
      
      'SELECT * FROM categories': {
        rows: [
          { id: '1', name: 'قانون مدنی', count: 150 },
          { id: '2', name: 'قانون تجارت', count: 120 },
          { id: '3', name: 'قانون کار', count: 80 }
        ],
        rowCount: 3,
        fields: [
          { name: 'id', type: 'varchar' },
          { name: 'name', type: 'varchar' },
          { name: 'count', type: 'integer' }
        ]
      },
      
      'SELECT * FROM sources': {
        rows: [
          { id: '1', name: 'قوه قضائیه', url: 'https://judiciary.ir', reliability: 0.95 },
          { id: '2', name: 'مجلس شورای اسلامی', url: 'https://majlis.ir', reliability: 0.90 }
        ],
        rowCount: 2,
        fields: [
          { name: 'id', type: 'varchar' },
          { name: 'name', type: 'varchar' },
          { name: 'url', type: 'varchar' },
          { name: 'reliability', type: 'float' }
        ]
      }
    };
  }
  
  // Mock connection
  async connect(): Promise<DatabaseMock> {
    await this.simulateDelay();
    this.connectionCount++;
    
    if (this.shouldFail) {
      throw new Error('Database connection failed');
    }
    
    return this;
  }
  
  // Mock query execution
  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    await this.simulateDelay();
    
    // Record query for testing
    this.queryHistory.push({
      query: sql,
      params,
      timestamp: new Date()
    });
    
    if (this.shouldFail) {
      throw new Error(`Query failed: ${sql}`);
    }
    
    // Check for custom response
    const normalizedQuery = sql.trim().toUpperCase();
    for (const [pattern, response] of Object.entries(this.customResponses)) {
      if (normalizedQuery.includes(pattern.toUpperCase())) {
        return response;
      }
    }
    
    // Default response
    return {
      rows: [],
      rowCount: 0,
      fields: []
    };
  }
  
  // Mock transaction
  async transaction<T>(callback: (client: DatabaseMock) => Promise<T>): Promise<T> {
    await this.simulateDelay();
    
    if (this.shouldFail) {
      throw new Error('Transaction failed');
    }
    
    try {
      const result = await callback(this);
      return result;
    } catch (error) {
      throw error;
    }
  }
  
  // Mock batch operations
  async batch(queries: Array<{sql: string, params: any[]}>): Promise<QueryResult[]> {
    await this.simulateDelay();
    
    if (this.shouldFail) {
      throw new Error('Batch operation failed');
    }
    
    const results: QueryResult[] = [];
    for (const query of queries) {
      const result = await this.query(query.sql, query.params);
      results.push(result);
    }
    
    return results;
  }
  
  // Mock close connection
  async close(): Promise<void> {
    await this.simulateDelay();
    this.connectionCount = Math.max(0, this.connectionCount - 1);
  }
  
  // Mock health check
  async healthCheck(): Promise<{status: string, uptime: number, connections: number}> {
    await this.simulateDelay();
    
    return {
      status: this.shouldFail ? 'unhealthy' : 'healthy',
      uptime: Date.now(),
      connections: this.connectionCount
    };
  }
  
  // Utility methods
  private async simulateDelay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.delay));
  }
  
  // Testing utilities
  getQueryHistory(): Array<{query: string, params: any[], timestamp: Date}> {
    return [...this.queryHistory];
  }
  
  clearQueryHistory(): void {
    this.queryHistory = [];
  }
  
  getConnectionCount(): number {
    return this.connectionCount;
  }
  
  setCustomResponse(query: string, response: QueryResult): void {
    this.customResponses[query] = response;
  }
  
  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }
  
  setDelay(delay: number): void {
    this.delay = delay;
  }
}

// Database Mock Factory
export const createDatabaseMock = (options: DatabaseMockOptions = {}): DatabaseMock => {
  return new DatabaseMock(options);
};

// Database Testing Utilities
export const databaseTestUtils = {
  // Create mock with specific responses
  createMockWithResponses: (responses: Record<string, QueryResult>) => {
    const mock = createDatabaseMock({ customResponses: responses });
    return mock;
  },
  
  // Test query performance
  testQueryPerformance: async (mock: DatabaseMock, queries: Array<{sql: string, params: any[]}>) => {
    const results = [];
    for (const query of queries) {
      const start = performance.now();
      const result = await mock.query(query.sql, query.params);
      const end = performance.now();
      
      results.push({
        query: query.sql,
        duration: end - start,
        rowCount: result.rowCount,
        success: true
      });
    }
    return results;
  },
  
  // Test transaction handling
  testTransaction: async (mock: DatabaseMock, operations: Array<{sql: string, params: any[]}>) => {
    try {
      const result = await mock.transaction(async (client) => {
        const results = [];
        for (const operation of operations) {
          const queryResult = await client.query(operation.sql, operation.params);
          results.push(queryResult);
        }
        return results;
      });
      
      return {
        success: true,
        results,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        results: [],
        error: error.message
      };
    }
  },
  
  // Test connection pooling
  testConnectionPooling: async (mock: DatabaseMock, concurrentConnections = 10) => {
    const connections = [];
    const start = performance.now();
    
    // Create concurrent connections
    for (let i = 0; i < concurrentConnections; i++) {
      connections.push(mock.connect());
    }
    
    await Promise.all(connections);
    const end = performance.now();
    
    return {
      connectionCount: mock.getConnectionCount(),
      duration: end - start,
      success: true
    };
  },
  
  // Test error handling
  testErrorHandling: async (mock: DatabaseMock) => {
    mock.setShouldFail(true);
    
    try {
      await mock.connect();
      return { success: false, error: 'Expected connection to fail' };
    } catch (error) {
      return { success: true, error: error.message };
    }
  },
  
  // Test query validation
  testQueryValidation: async (mock: DatabaseMock, invalidQueries: string[]) => {
    const results = [];
    
    for (const query of invalidQueries) {
      try {
        await mock.query(query);
        results.push({ query, success: false, error: 'Expected query to fail' });
      } catch (error) {
        results.push({ query, success: true, error: error.message });
      }
    }
    
    return results;
  }
};

// Mock data generators
export const mockDataGenerators = {
  // Generate mock documents
  generateDocuments: (count = 10) => {
    const categories = ['قانون مدنی', 'قانون تجارت', 'قانون کار', 'قانون مجازات اسلامی'];
    const sources = ['قوه قضائیه', 'مجلس شورای اسلامی', 'وزارت دادگستری'];
    
    return Array.from({ length: count }, (_, index) => ({
      id: `doc_${index + 1}`,
      title: `سند حقوقی ${index + 1}`,
      content: `محتوای سند حقوقی شماره ${index + 1}`,
      category: categories[index % categories.length],
      source: sources[index % sources.length],
      created_at: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
      updated_at: new Date().toISOString(),
      confidence: 0.8 + Math.random() * 0.2
    }));
  },
  
  // Generate mock categories
  generateCategories: (count = 5) => {
    const categories = ['قانون مدنی', 'قانون تجارت', 'قانون کار', 'قانون مجازات اسلامی', 'قانون اساسی'];
    
    return categories.slice(0, count).map((name, index) => ({
      id: `cat_${index + 1}`,
      name,
      count: Math.floor(Math.random() * 1000),
      description: `توضیحات ${name}`
    }));
  },
  
  // Generate mock sources
  generateSources: (count = 3) => {
    const sources = [
      { name: 'قوه قضائیه', url: 'https://judiciary.ir' },
      { name: 'مجلس شورای اسلامی', url: 'https://majlis.ir' },
      { name: 'وزارت دادگستری', url: 'https://justice.gov.ir' }
    ];
    
    return sources.slice(0, count).map((source, index) => ({
      id: `src_${index + 1}`,
      name: source.name,
      url: source.url,
      reliability: 0.8 + Math.random() * 0.2,
      lastScraped: new Date().toISOString(),
      status: 'active'
    }));
  }
};