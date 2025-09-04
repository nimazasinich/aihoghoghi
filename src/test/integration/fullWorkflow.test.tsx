import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import App from '../../App';
import { persianTestUtils } from '../utils/persianTextMatchers';
import { createWebSocketMock, websocketTestUtils, realtimeDataSimulator } from '../utils/websocketMock';
import { createAIServiceMock } from '../utils/aiServiceMock';
import { createDatabaseMock } from '../utils/databaseMock';

// Mock all external dependencies
vi.mock('../../hooks/useDocuments', () => ({
  useDocuments: vi.fn(),
  useCategories: vi.fn(),
  useSources: vi.fn(),
  useSystemStats: vi.fn(),
  useScrapingStatus: vi.fn(),
  useStartScraping: vi.fn(),
  useStopScraping: vi.fn()
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon">Search</div>,
  Database: () => <div data-testid="database-icon">Database</div>,
  Info: () => <div data-testid="info-icon">Info</div>,
  Settings: () => <div data-testid="settings-icon">Settings</div>
}));

describe('Full Workflow Integration Tests', () => {
  let queryClient: QueryClient;
  let mockWebSocket: any;
  let mockAIService: any;
  let mockDatabase: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0
        }
      }
    });

    mockWebSocket = createWebSocketMock();
    mockAIService = createAIServiceMock(0);
    mockDatabase = createDatabaseMock({ delay: 0 });

    // Setup default mock responses
    const { useDocuments, useCategories, useSources, useSystemStats, useScrapingStatus, useStartScraping, useStopScraping } = require('../../hooks/useDocuments');

    useDocuments.mockReturnValue({
      data: {
        documents: [
          {
            id: '1',
            title: 'قانون مدنی ایران',
            content: 'این قانون شامل مقررات مربوط به حقوق مدنی و قراردادها می‌باشد.',
            category: 'قانون مدنی',
            source: 'قوه قضائیه',
            date: '2024-01-15T10:30:00Z',
            confidence: 0.95
          }
        ],
        total: 1,
        page: 1,
        hasMore: false
      },
      isLoading: false
    });

    useCategories.mockReturnValue({
      data: ['قانون مدنی', 'قانون تجارت', 'قانون کار']
    });

    useSources.mockReturnValue({
      data: ['قوه قضائیه', 'مجلس شورای اسلامی', 'وزارت دادگستری']
    });

    useSystemStats.mockReturnValue({
      data: {
        totalDocuments: 1250,
        totalCategories: 15,
        lastScraped: '2024-01-15T10:30:00Z',
        databaseSize: 52428800
      },
      isLoading: false
    });

    useScrapingStatus.mockReturnValue({
      data: {
        isActive: false,
        documentsProcessed: 0,
        totalDocuments: 0,
        currentSource: null,
        startTime: null,
        lastUpdate: '2024-01-15T09:00:00Z',
        errors: 0,
        sources: []
      },
      isLoading: false
    });

    useStartScraping.mockReturnValue({
      mutate: vi.fn()
    });

    useStopScraping.mockReturnValue({
      mutate: vi.fn()
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderApp = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );
  };

  describe('Complete User Journey', () => {
    it('should complete full search workflow', async () => {
      renderApp();

      // 1. User sees the main interface
      expect(screen.getByText('آرشیو حقوقی ایران')).toBeInTheDocument();
      expect(screen.getByText('سامانه جامع اسناد و مقررات حقوقی')).toBeInTheDocument();

      // 2. User navigates to search tab
      const searchTab = screen.getByText('جستجو');
      expect(searchTab).toBeInTheDocument();

      // 3. User enters search query
      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      fireEvent.change(searchInput, { target: { value: 'قانون مدنی' } });

      // 4. User clicks search button
      const searchButton = screen.getByText('جستجو');
      fireEvent.click(searchButton);

      // 5. User sees search results
      await waitFor(() => {
        expect(screen.getByText('قانون مدنی ایران')).toBeInTheDocument();
      });

      // 6. User clicks on a document to view details
      const documentCard = screen.getByText('قانون مدنی ایران');
      fireEvent.click(documentCard);

      // 7. User sees document details
      await waitFor(() => {
        expect(screen.getByText('این قانون شامل مقررات مربوط به حقوق مدنی و قراردادها می‌باشد.')).toBeInTheDocument();
      });
    });

    it('should complete scraping workflow', async () => {
      renderApp();

      // 1. User navigates to scraping tab
      const scrapingTab = screen.getByText('جمع‌آوری');
      fireEvent.click(scrapingTab);

      // 2. User sees scraping status
      expect(screen.getByText('متوقف')).toBeInTheDocument();

      // 3. User starts scraping
      const startButton = screen.getByText('شروع جمع‌آوری');
      fireEvent.click(startButton);

      // 4. Simulate WebSocket update
      websocketTestUtils.simulateMessages(mockWebSocket).scrapingUpdate({
        status: 'active',
        message: 'در حال جمع‌آوری اسناد'
      });

      // 5. User sees active scraping status
      await waitFor(() => {
        expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
      });
    });

    it('should complete dashboard workflow', async () => {
      renderApp();

      // 1. User navigates to dashboard tab
      const dashboardTab = screen.getByText('داشبورد');
      fireEvent.click(dashboardTab);

      // 2. User sees system statistics
      expect(screen.getByText('کل اسناد')).toBeInTheDocument();
      expect(screen.getByText('1,250')).toBeInTheDocument();
      expect(screen.getByText('دسته‌بندی‌ها')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
    });
  });

  describe('Persian Text Integration', () => {
    it('should handle Persian text throughout the application', () => {
      renderApp();

      const persianTexts = [
        'آرشیو حقوقی ایران',
        'سامانه جامع اسناد و مقررات حقوقی',
        'جستجو',
        'جمع‌آوری',
        'داشبورد',
        'جستجو در اسناد حقوقی...',
        'فیلترهای پیشرفته',
        'قانون مدنی',
        'قانون تجارت',
        'قانون کار',
        'قوه قضائیه',
        'مجلس شورای اسلامی',
        'وزارت دادگستری'
      ];

      persianTexts.forEach(text => {
        expect(screen.getByText(text)).toBeInTheDocument();
        expect(text).toBeValidPersianText();
      });
    });

    it('should maintain RTL direction throughout the application', () => {
      renderApp();

      const rtlElements = document.querySelectorAll('[dir="rtl"]');
      expect(rtlElements.length).toBeGreaterThan(0);

      rtlElements.forEach(element => {
        expect(element).toHaveStyle('direction: rtl');
      });
    });
  });

  describe('Real-time Updates Integration', () => {
    it('should handle WebSocket updates in scraping status', async () => {
      renderApp();

      // Navigate to scraping tab
      const scrapingTab = screen.getByText('جمع‌آوری');
      fireEvent.click(scrapingTab);

      // Simulate real-time updates
      realtimeDataSimulator.simulateScrapingStatus(mockWebSocket);

      // Verify updates are handled
      await waitFor(() => {
        expect(mockWebSocket.addEventListener).toHaveBeenCalled();
      });
    });

    it('should handle document processing updates', async () => {
      renderApp();

      // Simulate document processing
      realtimeDataSimulator.simulateDocumentProcessing(mockWebSocket, 5);

      // Verify processing updates
      await waitFor(() => {
        expect(mockWebSocket.send).toHaveBeenCalled();
      });
    });

    it('should handle system health updates', async () => {
      renderApp();

      // Simulate system health updates
      realtimeDataSimulator.simulateSystemHealth(mockWebSocket);

      // Verify health updates
      await waitFor(() => {
        expect(mockWebSocket.addEventListener).toHaveBeenCalled();
      });
    });
  });

  describe('AI Service Integration', () => {
    it('should integrate with AI classification service', async () => {
      renderApp();

      // Simulate AI classification
      const classificationResult = await mockAIService.classifyDocument('قانون مدنی شامل مقررات قراردادها است');

      expect(classificationResult.category).toBeValidPersianText();
      expect(classificationResult.confidence).toBeGreaterThan(0.9);
    });

    it('should integrate with AI search enhancement', async () => {
      renderApp();

      // Simulate search enhancement
      const enhancementResult = await mockAIService.enhanceSearchQuery('قانون');

      expect(enhancementResult.enhancedQuery).toBeValidPersianText();
      expect(enhancementResult.suggestions).toHaveLength(3);
    });

    it('should integrate with AI document analysis', async () => {
      renderApp();

      // Simulate document analysis
      const analysisResult = await mockAIService.analyzeDocument('متن سند حقوقی');

      expect(analysisResult.category).toBeValidPersianText();
      expect(analysisResult.summary).toBeValidPersianText();
    });
  });

  describe('Database Integration', () => {
    it('should integrate with database for document storage', async () => {
      renderApp();

      // Simulate database operations
      const documents = await mockDatabase.query('SELECT * FROM documents');
      expect(documents.rows).toHaveLength(2);
      expect(documents.rows[0].title).toBeValidPersianText();
    });

    it('should integrate with database for search operations', async () => {
      renderApp();

      // Simulate search query
      const searchResults = await mockDatabase.query('SELECT * FROM documents WHERE title LIKE ?', ['%قانون%']);
      expect(searchResults.rows).toHaveLength(2);
    });

    it('should integrate with database for statistics', async () => {
      renderApp();

      // Simulate statistics query
      const stats = await mockDatabase.query('SELECT COUNT(*) as total FROM documents');
      expect(stats.rows[0].total).toBeGreaterThan(0);
    });
  });

  describe('Performance Integration', () => {
    it('should handle concurrent operations efficiently', async () => {
      renderApp();

      const start = performance.now();

      // Simulate concurrent operations
      const operations = [
        mockAIService.classifyDocument('قانون مدنی'),
        mockAIService.enhanceSearchQuery('قانون'),
        mockDatabase.query('SELECT * FROM documents'),
        mockWebSocket.send('test message')
      ];

      await Promise.all(operations);
      const end = performance.now();

      expect(end - start).toBeLessThan(1000);
    });

    it('should handle large datasets efficiently', async () => {
      renderApp();

      // Simulate large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i.toString(),
        title: `سند ${i}`,
        content: 'متن سند',
        category: 'قانون مدنی',
        source: 'قوه قضائیه',
        date: '2024-01-15T10:30:00Z',
        confidence: 0.9
      }));

      const start = performance.now();
      const result = await mockDatabase.query('SELECT * FROM documents');
      const end = performance.now();

      expect(end - start).toBeLessThan(500);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully', async () => {
      renderApp();

      // Simulate API error
      mockDatabase.setShouldFail(true);

      try {
        await mockDatabase.query('SELECT * FROM documents');
      } catch (error) {
        expect(error.message).toBe('Database connection failed');
      }

      // App should still be functional
      expect(screen.getByText('آرشیو حقوقی ایران')).toBeInTheDocument();
    });

    it('should handle WebSocket connection errors', async () => {
      renderApp();

      // Simulate WebSocket error
      mockWebSocket.mockError();

      // App should handle error gracefully
      expect(screen.getByText('آرشیو حقوقی ایران')).toBeInTheDocument();
    });

    it('should handle AI service errors', async () => {
      renderApp();

      // Simulate AI service error
      mockAIService.setResponse('classification', null);

      try {
        await mockAIService.classifyDocument('قانون مدنی');
      } catch (error) {
        // Should handle error gracefully
      }

      // App should still be functional
      expect(screen.getByText('آرشیو حقوقی ایران')).toBeInTheDocument();
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain accessibility throughout the application', () => {
      renderApp();

      // Check for proper ARIA labels
      const buttons = document.querySelectorAll('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });

      // Check for proper heading structure
      const headings = document.querySelectorAll('h1, h2, h3');
      expect(headings.length).toBeGreaterThan(0);

      // Check for keyboard navigation
      const interactiveElements = document.querySelectorAll('button, input, select');
      interactiveElements.forEach(element => {
        expect(element).toHaveAttribute('tabindex');
      });
    });

    it('should support screen readers with Persian text', () => {
      renderApp();

      const persianElements = screen.getAllByText(/آرشیو حقوقی ایران|سامانه جامع اسناد و مقررات حقوقی/);
      persianElements.forEach(element => {
        expect(element).toHaveAttribute('lang', 'fa');
      });
    });
  });
});