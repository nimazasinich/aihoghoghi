/**
 * Database Mock Utilities
 * Comprehensive database mocking for testing without real database connections
 */

import { vi } from 'vitest';

export interface MockDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  source: string;
  url: string;
  created_at: string;
  updated_at: string;
  metadata: {
    language: string;
    confidence: number;
    tags: string[];
    entities: Array<{
      text: string;
      type: string;
      confidence: number;
    }>;
  };
}

export interface MockUser {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'lawyer' | 'researcher' | 'viewer';
  created_at: string;
  last_login: string;
  preferences: {
    language: string;
    theme: string;
    notifications: boolean;
  };
}

export interface MockSearchResult {
  documents: MockDocument[];
  total: number;
  page: number;
  per_page: number;
  query: string;
  filters: any;
  execution_time: number;
}

// Sample mock data
export const mockData = {
  documents: [
    {
      id: 'doc_001',
      title: 'قانون اساسی جمهوری اسلامی ایران',
      content: 'ماده ۱: حکومت ایران جمهوری اسلامی است که ملت ایران، بر اساس اعتقاد دیرینه اش به حکومت حق و عدل قرآن...',
      category: 'قانون اساسی',
      source: 'قوه قضائیه',
      url: 'https://example.com/constitution',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      metadata: {
        language: 'fa',
        confidence: 0.95,
        tags: ['قانون اساسی', 'جمهوری اسلامی', 'ایران'],
        entities: [
          { text: 'جمهوری اسلامی ایران', type: 'COUNTRY', confidence: 0.98 },
          { text: 'قانون اساسی', type: 'LEGAL_DOCUMENT', confidence: 0.95 }
        ]
      }
    } as MockDocument,
    {
      id: 'doc_002',
      title: 'ماده ۱ قانون مدنی',
      content: 'مصوبات مجلس شورای اسلامی پس از طی مراحل قانونی به رئیس جمهور ابلاغ می\u200cگردد...',
      category: 'قانون مدنی',
      source: 'مجلس شورای اسلامی',
      url: 'https://example.com/civil-law',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      metadata: {
        language: 'fa',
        confidence: 0.92,
        tags: ['قانون مدنی', 'مجلس', 'رئیس جمهور'],
        entities: [
          { text: 'مجلس شورای اسلامی', type: 'ORGANIZATION', confidence: 0.90 },
          { text: 'رئیس جمهور', type: 'PERSON', confidence: 0.85 }
        ]
      }
    } as MockDocument,
    {
      id: 'doc_003',
      title: 'قانون مجازات اسلامی',
      content: 'ماده ۱: هر فعل یا ترک فعلی که در قانون برای آن مجازات تعیین شده باشد، جرم محسوب می\u200cشود...',
      category: 'قانون مجازات',
      source: 'قوه قضائیه',
      url: 'https://example.com/criminal-law',
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z',
      metadata: {
        language: 'fa',
        confidence: 0.89,
        tags: ['قانون مجازات', 'جرم', 'مجازات'],
        entities: [
          { text: 'قانون مجازات اسلامی', type: 'LEGAL_DOCUMENT', confidence: 0.89 },
          { text: 'جرم', type: 'LEGAL_CONCEPT', confidence: 0.85 }
        ]
      }
    } as MockDocument
  ],

  users: [
    {
      id: 'user_001',
      username: 'admin',
      email: 'admin@legal-archive.ir',
      role: 'admin',
      created_at: '2024-01-01T00:00:00Z',
      last_login: '2024-01-15T10:30:00Z',
      preferences: {
        language: 'fa',
        theme: 'light',
        notifications: true
      }
    } as MockUser,
    {
      id: 'user_002',
      username: 'lawyer_ahmad',
      email: 'ahmad@lawfirm.ir',
      role: 'lawyer',
      created_at: '2024-01-02T00:00:00Z',
      last_login: '2024-01-15T09:15:00Z',
      preferences: {
        language: 'fa',
        theme: 'dark',
        notifications: true
      }
    } as MockUser,
    {
      id: 'user_003',
      username: 'researcher_fatemeh',
      email: 'fatemeh@university.ac.ir',
      role: 'researcher',
      created_at: '2024-01-03T00:00:00Z',
      last_login: '2024-01-15T08:45:00Z',
      preferences: {
        language: 'fa',
        theme: 'light',
        notifications: false
      }
    } as MockUser
  ]
};

// Database mock factory
export const createDatabaseMock = () => {
  let documents = [...mockData.documents];
  let users = [...mockData.users];
  let searchHistory: any[] = [];

  const mockDB = {
    // Document operations
    documents: {
      // Get all documents
      getAll: vi.fn().mockImplementation(async (options?: any) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          success: true,
          data: documents,
          total: documents.length,
          page: options?.page || 1,
          per_page: options?.per_page || 10
        };
      }),

      // Get document by ID
      getById: vi.fn().mockImplementation(async (id: string) => {
        await new Promise(resolve => setTimeout(resolve, 30));
        const document = documents.find(doc => doc.id === id);
        return {
          success: !!document,
          data: document || null,
          error: document ? null : 'Document not found'
        };
      }),

      // Search documents
      search: vi.fn().mockImplementation(async (query: string, options?: any) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Simple search implementation
        const filteredDocs = documents.filter(doc => 
          doc.title.includes(query) || 
          doc.content.includes(query) ||
          doc.category.includes(query)
        );

        // Apply pagination
        const page = options?.page || 1;
        const per_page = options?.per_page || 10;
        const start = (page - 1) * per_page;
        const end = start + per_page;
        const paginatedDocs = filteredDocs.slice(start, end);

        // Log search
        searchHistory.push({
          query,
          results_count: filteredDocs.length,
          timestamp: new Date().toISOString()
        });

        return {
          success: true,
          data: {
            documents: paginatedDocs,
            total: filteredDocs.length,
            page,
            per_page,
            query,
            filters: options?.filters || {},
            execution_time: 100
          } as MockSearchResult
        };
      }),

      // Create document
      create: vi.fn().mockImplementation(async (documentData: Partial<MockDocument>) => {
        await new Promise(resolve => setTimeout(resolve, 80));
        
        const newDocument: MockDocument = {
          id: `doc_${Date.now()}`,
          title: documentData.title || 'Untitled Document',
          content: documentData.content || '',
          category: documentData.category || 'General',
          source: documentData.source || 'Unknown',
          url: documentData.url || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: documentData.metadata || {
            language: 'fa',
            confidence: 0.0,
            tags: [],
            entities: []
          }
        };

        documents.push(newDocument);
        
        return {
          success: true,
          data: newDocument
        };
      }),

      // Update document
      update: vi.fn().mockImplementation(async (id: string, updates: Partial<MockDocument>) => {
        await new Promise(resolve => setTimeout(resolve, 60));
        
        const index = documents.findIndex(doc => doc.id === id);
        if (index === -1) {
          return {
            success: false,
            error: 'Document not found'
          };
        }

        documents[index] = {
          ...documents[index],
          ...updates,
          updated_at: new Date().toISOString()
        };

        return {
          success: true,
          data: documents[index]
        };
      }),

      // Delete document
      delete: vi.fn().mockImplementation(async (id: string) => {
        await new Promise(resolve => setTimeout(resolve, 40));
        
        const index = documents.findIndex(doc => doc.id === id);
        if (index === -1) {
          return {
            success: false,
            error: 'Document not found'
          };
        }

        const deletedDoc = documents.splice(index, 1)[0];
        
        return {
          success: true,
          data: deletedDoc
        };
      }),

      // Get documents by category
      getByCategory: vi.fn().mockImplementation(async (category: string) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const filteredDocs = documents.filter(doc => doc.category === category);
        
        return {
          success: true,
          data: filteredDocs,
          total: filteredDocs.length
        };
      }),

      // Get document statistics
      getStats: vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 30));
        
        const stats = {
          total_documents: documents.length,
          categories: [...new Set(documents.map(doc => doc.category))],
          sources: [...new Set(documents.map(doc => doc.source))],
          recent_documents: documents
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)
        };

        return {
          success: true,
          data: stats
        };
      })
    },

    // User operations
    users: {
      // Get all users
      getAll: vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 40));
        return {
          success: true,
          data: users,
          total: users.length
        };
      }),

      // Get user by ID
      getById: vi.fn().mockImplementation(async (id: string) => {
        await new Promise(resolve => setTimeout(resolve, 30));
        const user = users.find(u => u.id === id);
        return {
          success: !!user,
          data: user || null,
          error: user ? null : 'User not found'
        };
      }),

      // Get user by email
      getByEmail: vi.fn().mockImplementation(async (email: string) => {
        await new Promise(resolve => setTimeout(resolve, 30));
        const user = users.find(u => u.email === email);
        return {
          success: !!user,
          data: user || null,
          error: user ? null : 'User not found'
        };
      }),

      // Create user
      create: vi.fn().mockImplementation(async (userData: Partial<MockUser>) => {
        await new Promise(resolve => setTimeout(resolve, 60));
        
        const newUser: MockUser = {
          id: `user_${Date.now()}`,
          username: userData.username || 'user',
          email: userData.email || 'user@example.com',
          role: userData.role || 'viewer',
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
          preferences: userData.preferences || {
            language: 'fa',
            theme: 'light',
            notifications: true
          }
        };

        users.push(newUser);
        
        return {
          success: true,
          data: newUser
        };
      }),

      // Update user
      update: vi.fn().mockImplementation(async (id: string, updates: Partial<MockUser>) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const index = users.findIndex(user => user.id === id);
        if (index === -1) {
          return {
            success: false,
            error: 'User not found'
          };
        }

        users[index] = {
          ...users[index],
          ...updates
        };

        return {
          success: true,
          data: users[index]
        };
      }),

      // Delete user
      delete: vi.fn().mockImplementation(async (id: string) => {
        await new Promise(resolve => setTimeout(resolve, 40));
        
        const index = users.findIndex(user => user.id === id);
        if (index === -1) {
          return {
            success: false,
            error: 'User not found'
          };
        }

        const deletedUser = users.splice(index, 1)[0];
        
        return {
          success: true,
          data: deletedUser
        };
      })
    },

    // Search history
    searchHistory: {
      // Get search history
      getAll: vi.fn().mockImplementation(async (userId?: string) => {
        await new Promise(resolve => setTimeout(resolve, 30));
        return {
          success: true,
          data: searchHistory,
          total: searchHistory.length
        };
      }),

      // Add search to history
      add: vi.fn().mockImplementation(async (searchData: any) => {
        await new Promise(resolve => setTimeout(resolve, 20));
        
        const searchEntry = {
          id: `search_${Date.now()}`,
          ...searchData,
          timestamp: new Date().toISOString()
        };

        searchHistory.push(searchEntry);
        
        return {
          success: true,
          data: searchEntry
        };
      }),

      // Clear search history
      clear: vi.fn().mockImplementation(async (userId?: string) => {
        await new Promise(resolve => setTimeout(resolve, 20));
        
        if (userId) {
          searchHistory = searchHistory.filter(search => search.user_id !== userId);
        } else {
          searchHistory = [];
        }
        
        return {
          success: true,
          data: { cleared: true }
        };
      })
    },

    // Utility methods
    reset: () => {
      documents = [...mockData.documents];
      users = [...mockData.users];
      searchHistory = [];
    },

    getData: () => ({
      documents: [...documents],
      users: [...users],
      searchHistory: [...searchHistory]
    }),

    setData: (newData: { documents?: MockDocument[], users?: MockUser[] }) => {
      if (newData.documents) documents = [...newData.documents];
      if (newData.users) users = [...newData.users];
    }
  };

  return mockDB;
};

// Database error scenarios
export const databaseErrorScenarios = {
  // Simulate connection timeout
  simulateTimeout: (mockDB: any) => {
    mockDB.documents.getAll.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 10000));
      return { success: false, error: 'Database timeout' };
    });
  },

  // Simulate connection error
  simulateConnectionError: (mockDB: any) => {
    mockDB.documents.getAll.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return { success: false, error: 'Database connection failed' };
    });
  },

  // Simulate query error
  simulateQueryError: (mockDB: any) => {
    mockDB.documents.search.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return { success: false, error: 'Query execution failed' };
    });
  },

  // Simulate constraint violation
  simulateConstraintViolation: (mockDB: any) => {
    mockDB.users.create.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 30));
      return { success: false, error: 'Unique constraint violation' };
    });
  }
};

// Performance testing utilities
export const databasePerformanceUtils = {
  // Measure query performance
  measureQueryTime: async (queryFn: () => Promise<any>): Promise<number> => {
    const start = performance.now();
    await queryFn();
    const end = performance.now();
    return end - start;
  },

  // Simulate concurrent queries
  simulateConcurrentQueries: async (queryFn: () => Promise<any>, count: number = 10): Promise<any[]> => {
    const promises = Array(count).fill(null).map(() => queryFn());
    return Promise.all(promises);
  },

  // Simulate large dataset
  generateLargeDataset: (size: number = 1000): MockDocument[] => {
    return Array(size).fill(null).map((_, index) => ({
      id: `doc_${index}`,
      title: `مستند ${index}`,
      content: `محتوای مستند ${index} که شامل اطلاعات حقوقی است...`,
      category: ['قانون اساسی', 'قانون مدنی', 'قانون مجازات'][index % 3],
      source: `منبع ${index}`,
      url: `https://example.com/doc/${index}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        language: 'fa',
        confidence: 0.8 + (Math.random() * 0.2),
        tags: [`تگ${index}`, `برچسب${index}`],
        entities: [
          { text: `موضوع ${index}`, type: 'LEGAL_CONCEPT', confidence: 0.9 }
        ]
      }
    }));
  }
};

// Cleanup utility
export const cleanupDatabaseMocks = (): void => {
  vi.restoreAllMocks();
};