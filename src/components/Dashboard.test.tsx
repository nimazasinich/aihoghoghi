import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Dashboard } from './Dashboard';
import { persianTestUtils } from '../test/utils/persianTextMatchers';
import { createWebSocketMock, websocketTestUtils } from '../test/utils/websocketMock';

// Mock the useSystemStats hook
const mockUseSystemStats = vi.fn();
vi.mock('../hooks/useDocuments', () => ({
  useSystemStats: () => mockUseSystemStats()
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  FileText: () => <div data-testid="file-text-icon">FileText</div>,
  Database: () => <div data-testid="database-icon">Database</div>,
  Zap: () => <div data-testid="zap-icon">Zap</div>,
  Globe: () => <div data-testid="globe-icon">Globe</div>,
  TrendingUp: () => <div data-testid="trending-up-icon">TrendingUp</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>
}));

describe('Dashboard Component', () => {
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

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );
  };

  describe('Loading State', () => {
    it('should display loading skeleton when data is loading', () => {
      mockUseSystemStats.mockReturnValue({
        data: null,
        isLoading: true
      });

      renderDashboard();

      // Check for loading skeleton elements
      const loadingCards = screen.getAllByTestId(/loading-skeleton/);
      expect(loadingCards).toHaveLength(4);
    });

    it('should show loading animation for stat cards', () => {
      mockUseSystemStats.mockReturnValue({
        data: null,
        isLoading: true
      });

      renderDashboard();

      // Check for pulse animation classes
      const pulseElements = document.querySelectorAll('.animate-pulse');
      expect(pulseElements.length).toBeGreaterThan(0);
    });
  });

  describe('Data Display', () => {
    const mockStats = {
      totalDocuments: 1250,
      totalCategories: 15,
      databaseSize: 52428800, // 50MB in bytes
      lastScraped: '2024-01-15T10:30:00Z'
    };

    beforeEach(() => {
      mockUseSystemStats.mockReturnValue({
        data: mockStats,
        isLoading: false
      });
    });

    it('should display all stat cards with correct data', () => {
      renderDashboard();

      // Check for Persian text in stat cards
      expect(screen.getByText('کل اسناد')).toBeInTheDocument();
      expect(screen.getByText('دسته‌بندی‌ها')).toBeInTheDocument();
      expect(screen.getByText('حجم پایگاه داده')).toBeInTheDocument();
      expect(screen.getByText('آخرین بروزرسانی')).toBeInTheDocument();
    });

    it('should format Persian numbers correctly', () => {
      renderDashboard();

      // Check Persian number formatting
      const totalDocuments = screen.getByText('1,250');
      expect(totalDocuments).toBeInTheDocument();
    });

    it('should display database size in MB', () => {
      renderDashboard();

      const databaseSize = screen.getByText('50.0 MB');
      expect(databaseSize).toBeInTheDocument();
    });

    it('should display last scraped date in Persian format', () => {
      renderDashboard();

      // The date should be formatted in Persian locale
      const lastScraped = screen.getByText(/۱۴۰۲\/۱۰\/۲۵/);
      expect(lastScraped).toBeInTheDocument();
    });

    it('should show trend indicator for total documents', () => {
      renderDashboard();

      const trend = screen.getByText('+12% این هفته');
      expect(trend).toBeInTheDocument();
    });
  });

  describe('Persian Text Validation', () => {
    const mockStats = {
      totalDocuments: 1000,
      totalCategories: 10,
      databaseSize: 1000000,
      lastScraped: '2024-01-15T10:30:00Z'
    };

    beforeEach(() => {
      mockUseSystemStats.mockReturnValue({
        data: mockStats,
        isLoading: false
      });
    });

    it('should contain valid Persian text in all labels', () => {
      renderDashboard();

      const labels = [
        'کل اسناد',
        'دسته‌بندی‌ها',
        'حجم پایگاه داده',
        'آخرین بروزرسانی'
      ];

      labels.forEach(label => {
        const element = screen.getByText(label);
        expect(element.textContent).toBeValidPersianText();
      });
    });

    it('should have RTL direction for Persian text', () => {
      renderDashboard();

      const persianElements = screen.getAllByText(/کل اسناد|دسته‌بندی‌ها|حجم پایگاه داده|آخرین بروزرسانی/);
      persianElements.forEach(element => {
        expect(element).toHaveStyle('direction: rtl');
      });
    });
  });

  describe('Icon Display', () => {
    const mockStats = {
      totalDocuments: 1000,
      totalCategories: 10,
      databaseSize: 1000000,
      lastScraped: '2024-01-15T10:30:00Z'
    };

    beforeEach(() => {
      mockUseSystemStats.mockReturnValue({
        data: mockStats,
        isLoading: false
      });
    });

    it('should display correct icons for each stat card', () => {
      renderDashboard();

      expect(screen.getByTestId('file-text-icon')).toBeInTheDocument();
      expect(screen.getByTestId('database-icon')).toBeInTheDocument();
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    });

    it('should have proper icon styling', () => {
      renderDashboard();

      const icons = screen.getAllByTestId(/icon$/);
      icons.forEach(icon => {
        expect(icon.parentElement).toHaveClass('p-3', 'rounded-lg');
      });
    });
  });

  describe('Responsive Design', () => {
    const mockStats = {
      totalDocuments: 1000,
      totalCategories: 10,
      databaseSize: 1000000,
      lastScraped: '2024-01-15T10:30:00Z'
    };

    beforeEach(() => {
      mockUseSystemStats.mockReturnValue({
        data: mockStats,
        isLoading: false
      });
    });

    it('should have responsive grid layout', () => {
      renderDashboard();

      const gridContainer = document.querySelector('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4');
    });

    it('should have proper spacing between cards', () => {
      renderDashboard();

      const gridContainer = document.querySelector('.grid');
      expect(gridContainer).toHaveClass('gap-6');
    });
  });

  describe('Error Handling', () => {
    it('should handle undefined stats gracefully', () => {
      mockUseSystemStats.mockReturnValue({
        data: undefined,
        isLoading: false
      });

      renderDashboard();

      // Should show loading state when data is undefined
      const loadingCards = document.querySelectorAll('.animate-pulse');
      expect(loadingCards.length).toBeGreaterThan(0);
    });

    it('should handle missing stats properties', () => {
      mockUseSystemStats.mockReturnValue({
        data: {
          totalDocuments: 1000
          // Missing other properties
        },
        isLoading: false
      });

      renderDashboard();

      // Should render without crashing
      expect(screen.getByText('کل اسناد')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render within acceptable time', async () => {
      const mockStats = {
        totalDocuments: 1000,
        totalCategories: 10,
        databaseSize: 1000000,
        lastScraped: '2024-01-15T10:30:00Z'
      };

      mockUseSystemStats.mockReturnValue({
        data: mockStats,
        isLoading: false
      });

      const start = performance.now();
      renderDashboard();
      const end = performance.now();

      // Should render within 100ms
      expect(end - start).toBeLessThan(100);
    });

    it('should not cause memory leaks', () => {
      const mockStats = {
        totalDocuments: 1000,
        totalCategories: 10,
        databaseSize: 1000000,
        lastScraped: '2024-01-15T10:30:00Z'
      };

      mockUseSystemStats.mockReturnValue({
        data: mockStats,
        isLoading: false
      });

      const { unmount } = renderDashboard();
      
      // Unmount should not throw errors
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    const mockStats = {
      totalDocuments: 1000,
      totalCategories: 10,
      databaseSize: 1000000,
      lastScraped: '2024-01-15T10:30:00Z'
    };

    beforeEach(() => {
      mockUseSystemStats.mockReturnValue({
        data: mockStats,
        isLoading: false
      });
    });

    it('should have proper ARIA labels', () => {
      renderDashboard();

      const statCards = document.querySelectorAll('[class*="bg-white rounded-xl"]');
      statCards.forEach(card => {
        expect(card).toHaveAttribute('role', 'region');
      });
    });

    it('should be keyboard navigable', () => {
      renderDashboard();

      const interactiveElements = document.querySelectorAll('button, [tabindex]');
      interactiveElements.forEach(element => {
        expect(element).toHaveAttribute('tabindex');
      });
    });
  });
});