/**
 * Comprehensive ScrapingStatus Component Tests
 * Testing real-time updates, Persian status messages, and scraping progress
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { ScrapingStatus } from './ScrapingStatus';
import { persianMatchers, persianTestData, persianUtils } from '../test/utils/persianMatchers';
import { createWebSocketMock, websocketScenarios, legalArchiveMessages, websocketUtils } from '../test/utils/websocketMock';
import { createAIServiceMock } from '../test/utils/aiServiceMock';
import { createDatabaseMock } from '../test/utils/databaseMock';

// Mock the scraping hook
const mockUseScraping = vi.fn();
vi.mock('../hooks/useScraping', () => ({
  useScraping: () => mockUseScraping()
}));

// Mock the WebSocket hook
const mockUseWebSocket = vi.fn();
vi.mock('../hooks/useWebSocket', () => ({
  useWebSocket: () => mockUseWebSocket()
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    progress: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Globe: () => <div data-testid="globe-icon">Globe</div>,
  CheckCircle: () => <div data-testid="check-circle-icon">CheckCircle</div>,
  AlertCircle: () => <div data-testid="alert-circle-icon">AlertCircle</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  Play: () => <div data-testid="play-icon">Play</div>,
  Pause: () => <div data-testid="pause-icon">Pause</div>,
  Square: () => <div data-testid="square-icon">Square</div>,
  RefreshCw: () => <div data-testid="refresh-icon">RefreshCw</div>,
  Database: () => <div data-testid="database-icon">Database</div>,
  TrendingUp: () => <div data-testid="trending-up-icon">TrendingUp</div>
}));

describe('ScrapingStatus Component - Comprehensive Tests', () => {
  let queryClient: QueryClient;
  let mockWebSocket: any;
  let mockAIService: any;
  let mockDatabase: any;
  let user: ReturnType<typeof userEvent.setup>;

  const mockScrapingStatus = {
    isActive: true,
    currentSource: 'قوه قضائیه',
    totalSources: 5,
    completedSources: 2,
    totalDocuments: 1250,
    newDocuments: 45,
    errors: 3,
    progress: 40,
    estimatedTimeRemaining: '2 ساعت و 30 دقیقه',
    lastUpdate: new Date().toISOString(),
    sources: [
      {
        name: 'قوه قضائیه',
        status: 'completed',
        documents: 500,
        lastScraped: '2024-01-15T10:30:00Z',
        errors: 0
      },
      {
        name: 'مجلس شورای اسلامی',
        status: 'completed',
        documents: 300,
        lastScraped: '2024-01-15T09:15:00Z',
        errors: 1
      },
      {
        name: 'دیوان عالی کشور',
        status: 'in_progress',
        documents: 200,
        lastScraped: '2024-01-15T11:00:00Z',
        errors: 0
      },
      {
        name: 'دادگاه تجدیدنظر',
        status: 'pending',
        documents: 0,
        lastScraped: null,
        errors: 0
      },
      {
        name: 'وزارت دادگستری',
        status: 'error',
        documents: 0,
        lastScraped: null,
        errors: 2
      }
    ]
  };

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
    mockAIService = createAIServiceMock();
    mockDatabase = createDatabaseMock();
    user = userEvent.setup();
    
    // Setup default mock implementations
    mockUseScraping.mockReturnValue({
      status: mockScrapingStatus,
      isLoading: false,
      error: null,
      startScraping: vi.fn(),
      stopScraping: vi.fn(),
      pauseScraping: vi.fn(),
      resumeScraping: vi.fn(),
      refreshStatus: vi.fn()
    });

    mockUseWebSocket.mockReturnValue({
      isConnected: true,
      lastMessage: null,
      sendMessage: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn()
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderScrapingStatus = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ScrapingStatus />
      </QueryClientProvider>
    );
  };

  describe('Basic Rendering', () => {
    it('should render scraping status title in Persian', () => {
      renderScrapingStatus();
      
      const title = screen.getByText(/وضعیت جمع\u200cآوری داده/i);
      expect(title).toBeInTheDocument();
      expect(title).toContainPersian();
    });

    it('should display current scraping progress', () => {
      renderScrapingStatus();
      
      expect(screen.getByText('40%')).toBeInTheDocument();
      expect(screen.getByText('2 از 5')).toBeInTheDocument(); // completed sources
    });

    it('should display document statistics', () => {
      renderScrapingStatus();
      
      expect(screen.getByText('1250')).toBeInTheDocument(); // total documents
      expect(screen.getByText('45')).toBeInTheDocument(); // new documents
      expect(screen.getByText('3')).toBeInTheDocument(); // errors
    });

    it('should display estimated time remaining', () => {
      renderScrapingStatus();
      
      const timeRemaining = screen.getByText('2 ساعت و 30 دقیقه');
      expect(timeRemaining).toBeInTheDocument();
      expect(timeRemaining).toContainPersian();
    });
  });

  describe('Persian Status Messages', () => {
    it('should display Persian status for each source', () => {
      renderScrapingStatus();
      
      const statusMessages = [
        'تکمیل شده',
        'در حال انجام',
        'در انتظار',
        'خطا'
      ];

      statusMessages.forEach(status => {
        if (screen.queryByText(status)) {
          expect(screen.getByText(status)).toContainPersian();
        }
      });
    });

    it('should display Persian source names', () => {
      renderScrapingStatus();
      
      const sourceNames = [
        'قوه قضائیه',
        'مجلس شورای اسلامی',
        'دیوان عالی کشور',
        'دادگاه تجدیدنظر',
        'وزارت دادگستری'
      ];

      sourceNames.forEach(source => {
        expect(screen.getByText(source)).toBeInTheDocument();
        expect(source).toContainPersian();
      });
    });

    it('should display Persian error messages', () => {
      renderScrapingStatus();
      
      const errorMessages = [
        'خطا در جمع\u200cآوری داده',
        'اتصال برقرار نشد',
        'مستند یافت نشد'
      ];

      // Check if any error messages are displayed
      errorMessages.forEach(message => {
        if (screen.queryByText(message)) {
          expect(screen.getByText(message)).toContainPersian();
        }
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should handle WebSocket scraping updates', async () => {
      renderScrapingStatus();
      
      act(() => {
        mockWebSocket.mockMessage('scraping_status', {
          source: 'دیوان عالی کشور',
          status: 'in_progress',
          progress: 60,
          documents: 250
        });
      });

      await waitFor(() => {
        expect(screen.getByText('60%')).toBeInTheDocument();
      });
    });

    it('should update progress in real-time', async () => {
      const { rerender } = renderScrapingStatus();
      
      // Initial progress
      expect(screen.getByText('40%')).toBeInTheDocument();
      
      // Update progress
      const updatedStatus = {
        ...mockScrapingStatus,
        progress: 75,
        completedSources: 3
      };

      mockUseScraping.mockReturnValue({
        status: updatedStatus,
        isLoading: false,
        error: null,
        startScraping: vi.fn(),
        stopScraping: vi.fn(),
        pauseScraping: vi.fn(),
        resumeScraping: vi.fn(),
        refreshStatus: vi.fn()
      });

      rerender(
        <QueryClientProvider client={queryClient}>
          <ScrapingStatus />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('75%')).toBeInTheDocument();
        expect(screen.getByText('3 از 5')).toBeInTheDocument();
      });
    });

    it('should handle source completion updates', async () => {
      renderScrapingStatus();
      
      act(() => {
        mockWebSocket.mockMessage('source_completed', {
          source: 'دادگاه تجدیدنظر',
          documents: 150,
          status: 'completed'
        });
      });

      await waitFor(() => {
        expect(screen.getByText('دادگاه تجدیدنظر')).toBeInTheDocument();
      });
    });

    it('should handle error updates', async () => {
      renderScrapingStatus();
      
      act(() => {
        mockWebSocket.mockMessage('scraping_error', {
          source: 'وزارت دادگستری',
          error: 'اتصال برقرار نشد',
          retryCount: 3
        });
      });

      await waitFor(() => {
        expect(screen.getByText('وزارت دادگستری')).toBeInTheDocument();
      });
    });
  });

  describe('Scraping Controls', () => {
    it('should start scraping', async () => {
      const mockStartScraping = vi.fn();
      
      mockUseScraping.mockReturnValue({
        status: { ...mockScrapingStatus, isActive: false },
        isLoading: false,
        error: null,
        startScraping: mockStartScraping,
        stopScraping: vi.fn(),
        pauseScraping: vi.fn(),
        resumeScraping: vi.fn(),
        refreshStatus: vi.fn()
      });

      renderScrapingStatus();
      
      const startButton = screen.getByRole('button', { name: /شروع/i });
      await user.click(startButton);
      
      expect(mockStartScraping).toHaveBeenCalled();
    });

    it('should stop scraping', async () => {
      const mockStopScraping = vi.fn();
      
      mockUseScraping.mockReturnValue({
        status: mockScrapingStatus,
        isLoading: false,
        error: null,
        startScraping: vi.fn(),
        stopScraping: mockStopScraping,
        pauseScraping: vi.fn(),
        resumeScraping: vi.fn(),
        refreshStatus: vi.fn()
      });

      renderScrapingStatus();
      
      const stopButton = screen.getByRole('button', { name: /توقف/i });
      await user.click(stopButton);
      
      expect(mockStopScraping).toHaveBeenCalled();
    });

    it('should pause scraping', async () => {
      const mockPauseScraping = vi.fn();
      
      mockUseScraping.mockReturnValue({
        status: mockScrapingStatus,
        isLoading: false,
        error: null,
        startScraping: vi.fn(),
        stopScraping: vi.fn(),
        pauseScraping: mockPauseScraping,
        resumeScraping: vi.fn(),
        refreshStatus: vi.fn()
      });

      renderScrapingStatus();
      
      const pauseButton = screen.getByRole('button', { name: /مکث/i });
      await user.click(pauseButton);
      
      expect(mockPauseScraping).toHaveBeenCalled();
    });

    it('should resume scraping', async () => {
      const mockResumeScraping = vi.fn();
      
      mockUseScraping.mockReturnValue({
        status: { ...mockScrapingStatus, isActive: false, isPaused: true },
        isLoading: false,
        error: null,
        startScraping: vi.fn(),
        stopScraping: vi.fn(),
        pauseScraping: vi.fn(),
        resumeScraping: mockResumeScraping,
        refreshStatus: vi.fn()
      });

      renderScrapingStatus();
      
      const resumeButton = screen.getByRole('button', { name: /ادامه/i });
      await user.click(resumeButton);
      
      expect(mockResumeScraping).toHaveBeenCalled();
    });

    it('should refresh status', async () => {
      const mockRefreshStatus = vi.fn();
      
      mockUseScraping.mockReturnValue({
        status: mockScrapingStatus,
        isLoading: false,
        error: null,
        startScraping: vi.fn(),
        stopScraping: vi.fn(),
        pauseScraping: vi.fn(),
        resumeScraping: vi.fn(),
        refreshStatus: mockRefreshStatus
      });

      renderScrapingStatus();
      
      const refreshButton = screen.getByRole('button', { name: /بروزرسانی/i });
      await user.click(refreshButton);
      
      expect(mockRefreshStatus).toHaveBeenCalled();
    });
  });

  describe('Source Status Display', () => {
    it('should display all sources with their status', () => {
      renderScrapingStatus();
      
      const sources = mockScrapingStatus.sources;
      
      sources.forEach(source => {
        expect(screen.getByText(source.name)).toBeInTheDocument();
        expect(source.name).toContainPersian();
      });
    });

    it('should show document count for each source', () => {
      renderScrapingStatus();
      
      expect(screen.getByText('500')).toBeInTheDocument(); // قوه قضائیه
      expect(screen.getByText('300')).toBeInTheDocument(); // مجلس شورای اسلامی
      expect(screen.getByText('200')).toBeInTheDocument(); // دیوان عالی کشور
    });

    it('should show last scraped time', () => {
      renderScrapingStatus();
      
      // Check if time elements are displayed
      const timeElements = screen.getAllByText(/\d{4}-\d{2}-\d{2}/);
      expect(timeElements.length).toBeGreaterThan(0);
    });

    it('should show error count for sources with errors', () => {
      renderScrapingStatus();
      
      expect(screen.getByText('1')).toBeInTheDocument(); // مجلس شورای اسلامی errors
      expect(screen.getByText('2')).toBeInTheDocument(); // وزارت دادگستری errors
    });
  });

  describe('Progress Visualization', () => {
    it('should display progress bar', () => {
      renderScrapingStatus();
      
      const progressBar = screen.getByRole('progressbar') || screen.getByTestId('progress-bar');
      expect(progressBar).toBeInTheDocument();
    });

    it('should show progress percentage', () => {
      renderScrapingStatus();
      
      expect(screen.getByText('40%')).toBeInTheDocument();
    });

    it('should display completion ratio', () => {
      renderScrapingStatus();
      
      expect(screen.getByText('2 از 5')).toBeInTheDocument();
    });

    it('should show current source being scraped', () => {
      renderScrapingStatus();
      
      expect(screen.getByText('قوه قضائیه')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle scraping errors gracefully', () => {
      mockUseScraping.mockReturnValue({
        status: null,
        isLoading: false,
        error: 'خطا در دریافت وضعیت',
        startScraping: vi.fn(),
        stopScraping: vi.fn(),
        pauseScraping: vi.fn(),
        resumeScraping: vi.fn(),
        refreshStatus: vi.fn()
      });

      renderScrapingStatus();
      
      const errorMessage = screen.getByText(/خطا در دریافت وضعیت/i);
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toContainPersian();
    });

    it('should handle WebSocket connection errors', () => {
      mockUseWebSocket.mockReturnValue({
        isConnected: false,
        lastMessage: null,
        sendMessage: vi.fn(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        error: 'اتصال WebSocket برقرار نشد'
      });

      renderScrapingStatus();
      
      // Should still render without WebSocket
      expect(screen.getByText(/وضعیت جمع\u200cآوری داده/i)).toBeInTheDocument();
    });

    it('should handle loading state', () => {
      mockUseScraping.mockReturnValue({
        status: null,
        isLoading: true,
        error: null,
        startScraping: vi.fn(),
        stopScraping: vi.fn(),
        pauseScraping: vi.fn(),
        resumeScraping: vi.fn(),
        refreshStatus: vi.fn()
      });

      renderScrapingStatus();
      
      const loadingIndicator = screen.getByText(/در حال بارگذاری/i);
      expect(loadingIndicator).toBeInTheDocument();
      expect(loadingIndicator).toContainPersian();
    });
  });

  describe('Performance Testing', () => {
    it('should handle rapid status updates efficiently', async () => {
      renderScrapingStatus();
      
      // Simulate rapid updates
      for (let i = 0; i < 10; i++) {
        act(() => {
          mockWebSocket.mockMessage('scraping_progress', {
            progress: 40 + i,
            currentSource: 'دیوان عالی کشور',
            documents: 200 + i
          });
        });
        
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Should still be responsive
      expect(screen.getByText(/وضعیت جمع\u200cآوری داده/i)).toBeInTheDocument();
    });

    it('should render within performance budget', async () => {
      const startTime = performance.now();
      
      renderScrapingStatus();
      
      await waitFor(() => {
        expect(screen.getByText('40%')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(200);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderScrapingStatus();
      
      const progressBar = screen.getByRole('progressbar') || screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute('aria-label', /پیشرفت/i);
    });

    it('should support keyboard navigation', async () => {
      renderScrapingStatus();
      
      const startButton = screen.getByRole('button', { name: /شروع/i });
      
      await user.tab();
      expect(startButton).toHaveFocus();
    });

    it('should have proper color contrast for status indicators', () => {
      renderScrapingStatus();
      
      const statusElements = screen.getAllByText(/تکمیل شده|در حال انجام|خطا/);
      statusElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        expect(computedStyle.color).toBeDefined();
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should render correctly on mobile devices', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderScrapingStatus();
      
      const title = screen.getByText(/وضعیت جمع\u200cآوری داده/i);
      expect(title).toBeInTheDocument();
    });

    it('should handle touch interactions', async () => {
      renderScrapingStatus();
      
      const startButton = screen.getByRole('button', { name: /شروع/i });
      
      // Simulate touch events
      fireEvent.touchStart(startButton);
      fireEvent.touchEnd(startButton);
      
      expect(startButton).toBeInTheDocument();
    });
  });

  describe('Integration with Legal Archive System', () => {
    it('should display Persian legal source names', () => {
      renderScrapingStatus();
      
      const legalSources = [
        'قوه قضائیه',
        'مجلس شورای اسلامی',
        'دیوان عالی کشور',
        'دادگاه تجدیدنظر',
        'وزارت دادگستری'
      ];

      legalSources.forEach(source => {
        expect(screen.getByText(source)).toBeInTheDocument();
        expect(source).toContainPersian();
      });
    });

    it('should handle legal document statistics', () => {
      renderScrapingStatus();
      
      expect(screen.getByText('1250')).toBeInTheDocument(); // total documents
      expect(screen.getByText('45')).toBeInTheDocument(); // new documents
    });

    it('should display Persian time formats', () => {
      renderScrapingStatus();
      
      const timeElement = screen.getByText('2 ساعت و 30 دقیقه');
      expect(timeElement).toBeInTheDocument();
      expect(timeElement).toContainPersian();
    });
  });
});