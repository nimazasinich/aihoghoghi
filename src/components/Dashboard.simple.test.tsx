import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Dashboard } from './Dashboard';

// Mock the useSystemStats hook
const mockUseSystemStats = vi.fn();
vi.mock('../hooks/useDocuments', () => ({
  useSystemStats: () => mockUseSystemStats()
}));

// Mock framer-motion
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

describe('Dashboard Component - Simple Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0
        }
      }
    });
    
    vi.clearAllMocks();
  });

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );
  };

  describe('Basic Rendering', () => {
    it('should display loading skeleton when data is loading', () => {
      mockUseSystemStats.mockReturnValue({
        data: null,
        isLoading: true
      });

      renderDashboard();

      // Check for loading skeleton elements
      const loadingElements = document.querySelectorAll('.animate-pulse');
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it('should display stats when data is available', () => {
      const mockStats = {
        totalDocuments: 1250,
        totalCategories: 15,
        databaseSize: 52428800,
        lastScraped: '2024-01-15T10:30:00Z'
      };

      mockUseSystemStats.mockReturnValue({
        data: mockStats,
        isLoading: false
      });

      renderDashboard();

      // Check for Persian text in stat cards
      expect(screen.getByText('کل اسناد')).toBeInTheDocument();
      expect(screen.getByText('دسته‌بندی‌ها')).toBeInTheDocument();
      expect(screen.getByText('حجم پایگاه داده')).toBeInTheDocument();
      expect(screen.getByText('آخرین بروزرسانی')).toBeInTheDocument();
    });

    it('should format Persian numbers correctly', () => {
      const mockStats = {
        totalDocuments: 1250,
        totalCategories: 15,
        databaseSize: 52428800,
        lastScraped: '2024-01-15T10:30:00Z'
      };

      mockUseSystemStats.mockReturnValue({
        data: mockStats,
        isLoading: false
      });

      renderDashboard();

      // Check Persian number formatting
      const totalDocuments = screen.getByText('1,250');
      expect(totalDocuments).toBeInTheDocument();
    });

    it('should display database size in MB', () => {
      const mockStats = {
        totalDocuments: 1250,
        totalCategories: 15,
        databaseSize: 52428800,
        lastScraped: '2024-01-15T10:30:00Z'
      };

      mockUseSystemStats.mockReturnValue({
        data: mockStats,
        isLoading: false
      });

      renderDashboard();

      const databaseSize = screen.getByText('50.0 MB');
      expect(databaseSize).toBeInTheDocument();
    });

    it('should show trend indicator for total documents', () => {
      const mockStats = {
        totalDocuments: 1250,
        totalCategories: 15,
        databaseSize: 52428800,
        lastScraped: '2024-01-15T10:30:00Z'
      };

      mockUseSystemStats.mockReturnValue({
        data: mockStats,
        isLoading: false
      });

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
  });

  describe('Error Handling', () => {
    it('should handle undefined stats gracefully', () => {
      mockUseSystemStats.mockReturnValue({
        data: undefined,
        isLoading: false
      });

      expect(() => renderDashboard()).not.toThrow();
    });

    it('should handle missing stats properties', () => {
      mockUseSystemStats.mockReturnValue({
        data: {
          totalDocuments: 1000
          // Missing other properties
        },
        isLoading: false
      });

      expect(() => renderDashboard()).not.toThrow();
    });
  });
});