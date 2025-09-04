import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ScrapingStatus } from './ScrapingStatus';
import { persianTestUtils } from '../test/utils/persianTextMatchers';
import { createWebSocketMock, websocketTestUtils, realtimeDataSimulator } from '../test/utils/websocketMock';

// Mock the hooks
const mockUseScrapingStatus = vi.fn();
const mockUseStartScraping = vi.fn();
const mockUseStopScraping = vi.fn();

vi.mock('../hooks/useDocuments', () => ({
  useScrapingStatus: () => mockUseScrapingStatus(),
  useStartScraping: () => mockUseStartScraping(),
  useStopScraping: () => mockUseStopScraping()
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Play: () => <div data-testid="play-icon">Play</div>,
  Pause: () => <div data-testid="pause-icon">Pause</div>,
  RefreshCw: () => <div data-testid="refresh-icon">Refresh</div>,
  AlertCircle: () => <div data-testid="alert-icon">Alert</div>,
  CheckCircle: () => <div data-testid="check-icon">Check</div>,
  Globe: () => <div data-testid="globe-icon">Globe</div>
}));

describe('ScrapingStatus Component', () => {
  let queryClient: QueryClient;
  let mockWebSocket: any;

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
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderScrapingStatus = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ScrapingStatus />
      </QueryClientProvider>
    );
  };

  describe('Loading State', () => {
    it('should display loading skeleton when data is loading', () => {
      mockUseScrapingStatus.mockReturnValue({
        data: null,
        isLoading: true
      });

      renderScrapingStatus();

      const loadingElements = document.querySelectorAll('.animate-pulse');
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it('should show loading animation for status cards', () => {
      mockUseScrapingStatus.mockReturnValue({
        data: null,
        isLoading: true
      });

      renderScrapingStatus();

      const pulseElements = document.querySelectorAll('.animate-pulse');
      expect(pulseElements.length).toBeGreaterThan(0);
    });
  });

  describe('Active Scraping State', () => {
    const activeStatus = {
      isActive: true,
      documentsProcessed: 150,
      totalDocuments: 500,
      currentSource: 'قوه قضائیه',
      startTime: '2024-01-15T10:00:00Z',
      lastUpdate: '2024-01-15T10:30:00Z',
      errors: 2,
      sources: [
        { name: 'قوه قضائیه', status: 'active', documents: 75 },
        { name: 'مجلس شورای اسلامی', status: 'pending', documents: 0 },
        { name: 'وزارت دادگستری', status: 'completed', documents: 75 }
      ]
    };

    beforeEach(() => {
      mockUseScrapingStatus.mockReturnValue({
        data: activeStatus,
        isLoading: false
      });

      mockUseStartScraping.mockReturnValue({
        mutate: vi.fn()
      });

      mockUseStopScraping.mockReturnValue({
        mutate: vi.fn()
      });
    });

    it('should display active scraping status', () => {
      renderScrapingStatus();

      expect(screen.getByText('در حال جمع‌آوری')).toBeInTheDocument();
      expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
    });

    it('should show progress bar with correct percentage', () => {
      renderScrapingStatus();

      const progressBar = document.querySelector('.bg-blue-600');
      expect(progressBar).toHaveStyle('width: 30%'); // 150/500 * 100
    });

    it('should display documents processed count', () => {
      renderScrapingStatus();

      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('از 500 سند')).toBeInTheDocument();
    });

    it('should show current source', () => {
      renderScrapingStatus();

      expect(screen.getByText('قوه قضائیه')).toBeInTheDocument();
    });

    it('should display stop button when active', () => {
      renderScrapingStatus();

      const stopButton = screen.getByText('توقف جمع‌آوری');
      expect(stopButton).toBeInTheDocument();
    });

    it('should show error count', () => {
      renderScrapingStatus();

      expect(screen.getByText('2 خطا')).toBeInTheDocument();
    });
  });

  describe('Inactive Scraping State', () => {
    const inactiveStatus = {
      isActive: false,
      documentsProcessed: 0,
      totalDocuments: 0,
      currentSource: null,
      startTime: null,
      lastUpdate: '2024-01-15T09:00:00Z',
      errors: 0,
      sources: []
    };

    beforeEach(() => {
      mockUseScrapingStatus.mockReturnValue({
        data: inactiveStatus,
        isLoading: false
      });

      mockUseStartScraping.mockReturnValue({
        mutate: vi.fn()
      });

      mockUseStopScraping.mockReturnValue({
        mutate: vi.fn()
      });
    });

    it('should display inactive scraping status', () => {
      renderScrapingStatus();

      expect(screen.getByText('متوقف')).toBeInTheDocument();
      expect(screen.getByTestId('pause-icon')).toBeInTheDocument();
    });

    it('should show start button when inactive', () => {
      renderScrapingStatus();

      const startButton = screen.getByText('شروع جمع‌آوری');
      expect(startButton).toBeInTheDocument();
    });

    it('should show zero progress when inactive', () => {
      renderScrapingStatus();

      const progressBar = document.querySelector('.bg-blue-600');
      expect(progressBar).toHaveStyle('width: 0%');
    });
  });

  describe('Persian Text Handling', () => {
    const status = {
      isActive: true,
      documentsProcessed: 100,
      totalDocuments: 200,
      currentSource: 'قوه قضائیه',
      startTime: '2024-01-15T10:00:00Z',
      lastUpdate: '2024-01-15T10:30:00Z',
      errors: 0,
      sources: []
    };

    beforeEach(() => {
      mockUseScrapingStatus.mockReturnValue({
        data: status,
        isLoading: false
      });

      mockUseStartScraping.mockReturnValue({
        mutate: vi.fn()
      });

      mockUseStopScraping.mockReturnValue({
        mutate: vi.fn()
      });
    });

    it('should display Persian text correctly', () => {
      renderScrapingStatus();

      const persianTexts = [
        'در حال جمع‌آوری',
        'از 200 سند',
        'قوه قضائیه',
        'توقف جمع‌آوری'
      ];

      persianTexts.forEach(text => {
        expect(screen.getByText(text)).toBeInTheDocument();
        expect(text).toBeValidPersianText();
      });
    });

    it('should have RTL direction for Persian text', () => {
      renderScrapingStatus();

      const persianElements = screen.getAllByText(/در حال جمع‌آوری|از 200 سند|قوه قضائیه/);
      persianElements.forEach(element => {
        expect(element).toHaveStyle('direction: rtl');
      });
    });
  });

  describe('Button Functionality', () => {
    const mockStartMutate = vi.fn();
    const mockStopMutate = vi.fn();

    beforeEach(() => {
      mockUseStartScraping.mockReturnValue({
        mutate: mockStartMutate
      });

      mockUseStopScraping.mockReturnValue({
        mutate: mockStopMutate
      });
    });

    it('should call start scraping when start button is clicked', () => {
      const status = {
        isActive: false,
        documentsProcessed: 0,
        totalDocuments: 0,
        currentSource: null,
        startTime: null,
        lastUpdate: '2024-01-15T09:00:00Z',
        errors: 0,
        sources: []
      };

      mockUseScrapingStatus.mockReturnValue({
        data: status,
        isLoading: false
      });

      renderScrapingStatus();

      const startButton = screen.getByText('شروع جمع‌آوری');
      fireEvent.click(startButton);

      expect(mockStartMutate).toHaveBeenCalledWith([
        'https://rc.majlis.ir',
        'https://divan-edalat.ir',
        'https://ijudiciary.ir'
      ]);
    });

    it('should call stop scraping when stop button is clicked', () => {
      const status = {
        isActive: true,
        documentsProcessed: 100,
        totalDocuments: 200,
        currentSource: 'قوه قضائیه',
        startTime: '2024-01-15T10:00:00Z',
        lastUpdate: '2024-01-15T10:30:00Z',
        errors: 0,
        sources: []
      };

      mockUseScrapingStatus.mockReturnValue({
        data: status,
        isLoading: false
      });

      renderScrapingStatus();

      const stopButton = screen.getByText('توقف جمع‌آوری');
      fireEvent.click(stopButton);

      expect(mockStopMutate).toHaveBeenCalled();
    });
  });

  describe('Source Status Display', () => {
    const statusWithSources = {
      isActive: true,
      documentsProcessed: 150,
      totalDocuments: 500,
      currentSource: 'قوه قضائیه',
      startTime: '2024-01-15T10:00:00Z',
      lastUpdate: '2024-01-15T10:30:00Z',
      errors: 2,
      sources: [
        { name: 'قوه قضائیه', status: 'active', documents: 75 },
        { name: 'مجلس شورای اسلامی', status: 'pending', documents: 0 },
        { name: 'وزارت دادگستری', status: 'completed', documents: 75 }
      ]
    };

    beforeEach(() => {
      mockUseScrapingStatus.mockReturnValue({
        data: statusWithSources,
        isLoading: false
      });

      mockUseStartScraping.mockReturnValue({
        mutate: vi.fn()
      });

      mockUseStopScraping.mockReturnValue({
        mutate: vi.fn()
      });
    });

    it('should display all sources', () => {
      renderScrapingStatus();

      expect(screen.getByText('قوه قضائیه')).toBeInTheDocument();
      expect(screen.getByText('مجلس شورای اسلامی')).toBeInTheDocument();
      expect(screen.getByText('وزارت دادگستری')).toBeInTheDocument();
    });

    it('should show source status indicators', () => {
      renderScrapingStatus();

      // Check for status icons
      expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });

    it('should display document count for each source', () => {
      renderScrapingStatus();

      expect(screen.getByText('75 سند')).toBeInTheDocument();
      expect(screen.getByText('0 سند')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should handle WebSocket updates', () => {
      const status = {
        isActive: true,
        documentsProcessed: 100,
        totalDocuments: 200,
        currentSource: 'قوه قضائیه',
        startTime: '2024-01-15T10:00:00Z',
        lastUpdate: '2024-01-15T10:30:00Z',
        errors: 0,
        sources: []
      };

      mockUseScrapingStatus.mockReturnValue({
        data: status,
        isLoading: false
      });

      renderScrapingStatus();

      // Simulate WebSocket update
      websocketTestUtils.simulateMessages(mockWebSocket).scrapingUpdate({
        status: 'processing',
        message: 'در حال پردازش اسناد'
      });

      // Component should handle updates gracefully
      expect(screen.getByText('در حال جمع‌آوری')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle undefined status gracefully', () => {
      mockUseScrapingStatus.mockReturnValue({
        data: undefined,
        isLoading: false
      });

      expect(() => {
        renderScrapingStatus();
      }).not.toThrow();
    });

    it('should handle missing status properties', () => {
      const incompleteStatus = {
        isActive: true
        // Missing other properties
      };

      mockUseScrapingStatus.mockReturnValue({
        data: incompleteStatus,
        isLoading: false
      });

      expect(() => {
        renderScrapingStatus();
      }).not.toThrow();
    });

    it('should handle undefined mutation functions', () => {
      const status = {
        isActive: false,
        documentsProcessed: 0,
        totalDocuments: 0,
        currentSource: null,
        startTime: null,
        lastUpdate: '2024-01-15T09:00:00Z',
        errors: 0,
        sources: []
      };

      mockUseScrapingStatus.mockReturnValue({
        data: status,
        isLoading: false
      });

      mockUseStartScraping.mockReturnValue({
        mutate: undefined
      });

      expect(() => {
        renderScrapingStatus();
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should render within acceptable time', () => {
      const status = {
        isActive: true,
        documentsProcessed: 100,
        totalDocuments: 200,
        currentSource: 'قوه قضائیه',
        startTime: '2024-01-15T10:00:00Z',
        lastUpdate: '2024-01-15T10:30:00Z',
        errors: 0,
        sources: []
      };

      mockUseScrapingStatus.mockReturnValue({
        data: status,
        isLoading: false
      });

      const start = performance.now();
      renderScrapingStatus();
      const end = performance.now();

      expect(end - start).toBeLessThan(100);
    });

    it('should handle frequent updates efficiently', () => {
      const status = {
        isActive: true,
        documentsProcessed: 100,
        totalDocuments: 200,
        currentSource: 'قوه قضائیه',
        startTime: '2024-01-15T10:00:00Z',
        lastUpdate: '2024-01-15T10:30:00Z',
        errors: 0,
        sources: []
      };

      mockUseScrapingStatus.mockReturnValue({
        data: status,
        isLoading: false
      });

      const { rerender } = renderScrapingStatus();

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        rerender(
          <QueryClientProvider client={queryClient}>
            <ScrapingStatus />
          </QueryClientProvider>
        );
      }
      const end = performance.now();

      expect(end - start).toBeLessThan(1000);
    });
  });

  describe('Accessibility', () => {
    const status = {
      isActive: true,
      documentsProcessed: 100,
      totalDocuments: 200,
      currentSource: 'قوه قضائیه',
      startTime: '2024-01-15T10:00:00Z',
      lastUpdate: '2024-01-15T10:30:00Z',
      errors: 0,
      sources: []
    };

    beforeEach(() => {
      mockUseScrapingStatus.mockReturnValue({
        data: status,
        isLoading: false
      });

      mockUseStartScraping.mockReturnValue({
        mutate: vi.fn()
      });

      mockUseStopScraping.mockReturnValue({
        mutate: vi.fn()
      });
    });

    it('should have proper ARIA labels', () => {
      renderScrapingStatus();

      const buttons = document.querySelectorAll('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('should be keyboard navigable', () => {
      renderScrapingStatus();

      const interactiveElements = document.querySelectorAll('button');
      interactiveElements.forEach(element => {
        expect(element).toHaveAttribute('tabindex');
      });
    });

    it('should have proper progress bar accessibility', () => {
      renderScrapingStatus();

      const progressBar = document.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInTheDocument();
    });
  });
});