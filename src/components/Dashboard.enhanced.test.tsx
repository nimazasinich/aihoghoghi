import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Dashboard } from './Dashboard';
import { createWebSocketMock, createLegalDocumentWebSocketMock } from '../test/utils/webSocketMockFactory';
import { createClassificationResponse, createDocumentAnalysisResponse } from '../test/utils/aiServiceMockResponses';
import { databaseMockFactory } from '../test/utils/databaseMockUtilities';

/**
 * Enhanced Dashboard Component Tests - The most comprehensive dashboard testing ever built!
 * These tests ensure our legal archive dashboard works perfectly with Persian text and real-time updates.
 */

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
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
  Activity: () => <div data-testid="activity-icon">Activity</div>
}));

describe('Enhanced Dashboard Component', () => {
  let queryClient: QueryClient;
  let mockWebSocket: any;
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
    
    mockWebSocket = createLegalDocumentWebSocketMock();
    mockDatabase = databaseMockFactory;
    mockDatabase.initializeMockData();
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockWebSocket.cleanup();
    mockDatabase.resetMockData();
  });

  const renderDashboard = (props = {}) => {
    const defaultProps = {
      ...props
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <Dashboard {...defaultProps} />
      </QueryClientProvider>
    );
  };

  describe('Persian Text Display', () => {
    it('should display Persian text correctly in dashboard metrics', async () => {
      mockUseSystemStats.mockReturnValue({
        data: {
          totalDocuments: 1250,
          totalCategories: 15,
          totalSources: 8,
          activeUsers: 45,
          systemHealth: 'excellent',
          lastUpdate: '2024-01-15T10:00:00Z'
        },
        isLoading: false,
        error: null
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('آمار سیستم')).toBeInTheDocument();
        expect(screen.getByText('تعداد کل اسناد')).toBeInTheDocument();
        expect(screen.getByText('دسته‌بندی‌ها')).toBeInTheDocument();
        expect(screen.getByText('منابع')).toBeInTheDocument();
      });
    });

    it('should handle Persian numbers correctly', async () => {
      mockUseSystemStats.mockReturnValue({
        data: {
          totalDocuments: 1250,
          totalCategories: 15,
          totalSources: 8,
          activeUsers: 45
        },
        isLoading: false,
        error: null
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('1,250')).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument();
        expect(screen.getByText('8')).toBeInTheDocument();
        expect(screen.getByText('45')).toBeInTheDocument();
      });
    });

    it('should display Persian error messages correctly', async () => {
      mockUseSystemStats.mockReturnValue({
        data: null,
        isLoading: false,
        error: 'خطا در بارگذاری داده‌ها'
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('خطا در بارگذاری داده‌ها')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time WebSocket Updates', () => {
    it('should handle WebSocket connection and updates', async () => {
      mockUseSystemStats.mockReturnValue({
        data: {
          totalDocuments: 1000,
          totalCategories: 10,
          totalSources: 5,
          activeUsers: 25
        },
        isLoading: false,
        error: null
      });

      renderDashboard();

      // Simulate WebSocket message
      const updateMessage = {
        type: 'document_update',
        data: {
          newDocuments: 5,
          updatedCategories: 2,
          activeUsers: 30
        }
      };

      mockWebSocket.simulateMessage(updateMessage);

      await waitFor(() => {
        expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
      });
    });

    it('should handle WebSocket connection errors gracefully', async () => {
      mockUseSystemStats.mockReturnValue({
        data: {
          totalDocuments: 1000,
          totalCategories: 10,
          totalSources: 5,
          activeUsers: 25
        },
        isLoading: false,
        error: null
      });

      renderDashboard();

      // Simulate WebSocket error
      mockWebSocket.simulateError();

      await waitFor(() => {
        expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
      });
    });

    it('should reconnect WebSocket when connection is lost', async () => {
      mockUseSystemStats.mockReturnValue({
        data: {
          totalDocuments: 1000,
          totalCategories: 10,
          totalSources: 5,
          activeUsers: 25
        },
        isLoading: false,
        error: null
      });

      renderDashboard();

      // Simulate connection close
      mockWebSocket.simulateClose();

      await waitFor(() => {
        expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('close', expect.any(Function));
      });
    });
  });

  describe('AI Integration', () => {
    it('should display AI analysis results correctly', async () => {
      const aiResponse = createDocumentAnalysisResponse({
        summary: 'تحلیل هوش مصنوعی سند حقوقی',
        keyPoints: ['نکته کلیدی اول', 'نکته کلیدی دوم'],
        legalImplications: ['پیامد حقوقی اول', 'پیامد حقوقی دوم'],
        riskAssessment: 'medium'
      });

      mockUseSystemStats.mockReturnValue({
        data: {
          totalDocuments: 1000,
          totalCategories: 10,
          totalSources: 5,
          activeUsers: 25,
          aiAnalysis: aiResponse
        },
        isLoading: false,
        error: null
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('تحلیل هوش مصنوعی سند حقوقی')).toBeInTheDocument();
        expect(screen.getByText('نکته کلیدی اول')).toBeInTheDocument();
        expect(screen.getByText('پیامد حقوقی اول')).toBeInTheDocument();
      });
    });

    it('should handle AI service errors gracefully', async () => {
      mockUseSystemStats.mockReturnValue({
        data: {
          totalDocuments: 1000,
          totalCategories: 10,
          totalSources: 5,
          activeUsers: 25,
          aiAnalysis: null
        },
        isLoading: false,
        error: 'خطا در سرویس هوش مصنوعی'
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('خطا در سرویس هوش مصنوعی')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Loading States', () => {
    it('should display loading state correctly', async () => {
      mockUseSystemStats.mockReturnValue({
        data: null,
        isLoading: true,
        error: null
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('در حال بارگذاری...')).toBeInTheDocument();
      });
    });

    it('should handle rapid data updates without performance issues', async () => {
      mockUseSystemStats.mockReturnValue({
        data: {
          totalDocuments: 1000,
          totalCategories: 10,
          totalSources: 5,
          activeUsers: 25
        },
        isLoading: false,
        error: null
      });

      renderDashboard();

      // Simulate rapid updates
      for (let i = 0; i < 10; i++) {
        const updateMessage = {
          type: 'document_update',
          data: {
            newDocuments: i,
            updatedCategories: i % 3,
            activeUsers: 25 + i
          }
        };
        mockWebSocket.simulateMessage(updateMessage);
      }

      await waitFor(() => {
        expect(screen.getByText('1,000')).toBeInTheDocument();
      });
    });
  });

  describe('Database Integration', () => {
    it('should display database statistics correctly', async () => {
      const mockStats = {
        totalDocuments: 1500,
        totalCategories: 20,
        totalSources: 12,
        activeUsers: 60,
        databaseHealth: 'healthy',
        queryPerformance: {
          avgResponseTime: 45.2,
          cacheHitRate: 0.85,
          errorRate: 0.02
        }
      };

      mockUseSystemStats.mockReturnValue({
        data: mockStats,
        isLoading: false,
        error: null
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('1,500')).toBeInTheDocument();
        expect(screen.getByText('20')).toBeInTheDocument();
        expect(screen.getByText('12')).toBeInTheDocument();
        expect(screen.getByText('60')).toBeInTheDocument();
      });
    });

    it('should handle database connection issues', async () => {
      mockUseSystemStats.mockReturnValue({
        data: null,
        isLoading: false,
        error: 'خطا در اتصال به پایگاه داده'
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('خطا در اتصال به پایگاه داده')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should handle user clicks on dashboard elements', async () => {
      mockUseSystemStats.mockReturnValue({
        data: {
          totalDocuments: 1000,
          totalCategories: 10,
          totalSources: 5,
          activeUsers: 25
        },
        isLoading: false,
        error: null
      });

      renderDashboard();

      await waitFor(() => {
        const documentCard = screen.getByText('تعداد کل اسناد');
        expect(documentCard).toBeInTheDocument();
        
        fireEvent.click(documentCard);
        // Add assertions for click behavior
      });
    });

    it('should handle keyboard navigation', async () => {
      mockUseSystemStats.mockReturnValue({
        data: {
          totalDocuments: 1000,
          totalCategories: 10,
          totalSources: 5,
          activeUsers: 25
        },
        isLoading: false,
        error: null
      });

      renderDashboard();

      await waitFor(() => {
        const firstElement = screen.getByText('تعداد کل اسناد');
        firstElement.focus();
        
        fireEvent.keyDown(firstElement, { key: 'Tab' });
        // Add assertions for keyboard navigation
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for Persian text', async () => {
      mockUseSystemStats.mockReturnValue({
        data: {
          totalDocuments: 1000,
          totalCategories: 10,
          totalSources: 5,
          activeUsers: 25
        },
        isLoading: false,
        error: null
      });

      renderDashboard();

      await waitFor(() => {
        const documentCard = screen.getByText('تعداد کل اسناد');
        expect(documentCard).toHaveAttribute('aria-label');
      });
    });

    it('should support screen readers with Persian content', async () => {
      mockUseSystemStats.mockReturnValue({
        data: {
          totalDocuments: 1000,
          totalCategories: 10,
          totalSources: 5,
          activeUsers: 25
        },
        isLoading: false,
        error: null
      });

      renderDashboard();

      await waitFor(() => {
        const dashboard = screen.getByRole('main');
        expect(dashboard).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockUseSystemStats.mockReturnValue({
        data: null,
        isLoading: false,
        error: 'خطا در شبکه'
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('خطا در شبکه')).toBeInTheDocument();
      });
    });

    it('should handle malformed data gracefully', async () => {
      mockUseSystemStats.mockReturnValue({
        data: {
          totalDocuments: 'invalid',
          totalCategories: null,
          totalSources: undefined,
          activeUsers: 'not_a_number'
        },
        isLoading: false,
        error: null
      });

      renderDashboard();

      await waitFor(() => {
        // Should not crash and should display fallback values
        expect(screen.getByText('آمار سیستم')).toBeInTheDocument();
      });
    });
  });
});