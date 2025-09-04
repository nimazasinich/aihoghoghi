/**
 * Comprehensive SearchBar Component Tests
 * Testing Persian input handling, autocomplete, and search functionality
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { SearchBar } from './SearchBar';
import { persianMatchers, persianTestData, persianUtils } from '../test/utils/persianMatchers';
import { createAIServiceMock, aiServiceMocks } from '../test/utils/aiServiceMock';
import { createDatabaseMock, mockData } from '../test/utils/databaseMock';

// Mock the search hook
const mockUseSearch = vi.fn();
vi.mock('../hooks/useSearch', () => ({
  useSearch: () => mockUseSearch()
}));

// Mock the AI service
const mockAIService = createAIServiceMock();
vi.mock('../services/aiService', () => ({
  aiService: mockAIService
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    input: ({ children, ...props }: any) => <input {...props}>{children}</input>,
    ul: ({ children, ...props }: any) => <ul {...props}>{children}</ul>,
    li: ({ children, ...props }: any) => <li {...props}>{children}</li>
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon">Search</div>,
  X: () => <div data-testid="x-icon">X</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  TrendingUp: () => <div data-testid="trending-up-icon">TrendingUp</div>
}));

describe('SearchBar Component - Comprehensive Tests', () => {
  let queryClient: QueryClient;
  let mockDatabase: any;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0
        }
      }
    });
    
    mockDatabase = createDatabaseMock();
    user = userEvent.setup();
    
    // Setup default mock implementations
    mockUseSearch.mockReturnValue({
      search: vi.fn(),
      suggestions: [],
      isLoading: false,
      error: null,
      searchHistory: []
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderSearchBar = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <SearchBar />
      </QueryClientProvider>
    );
  };

  describe('Basic Rendering', () => {
    it('should render search input with Persian placeholder', () => {
      renderSearchBar();
      
      const searchInput = screen.getByPlaceholderText(/جستجو در مستندات حقوقی/i);
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('dir', 'rtl');
    });

    it('should render search button with Persian text', () => {
      renderSearchBar();
      
      const searchButton = screen.getByRole('button', { name: /جستجو/i });
      expect(searchButton).toBeInTheDocument();
      expect(searchButton).toBeInTheDocument();
    });

    it('should have proper RTL direction for Persian text', () => {
      renderSearchBar();
      
      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toHaveAttribute('dir', 'rtl');
      expect(searchInput).toHaveAttribute('lang', 'fa');
    });
  });

  describe('Persian Input Handling', () => {
    it('should handle Persian text input correctly', async () => {
      renderSearchBar();
      
      const searchInput = screen.getByRole('textbox');
      const persianText = 'قانون اساسی';
      
      await user.type(searchInput, persianText);
      
      expect(searchInput).toHaveValue(persianText);
      expect(persianText).toContainPersian();
    });

    it('should handle Persian legal terms input', async () => {
      renderSearchBar();
      
      const searchInput = screen.getByRole('textbox');
      const legalTerm = 'ماده ۱ قانون مدنی';
      
      await user.type(searchInput, legalTerm);
      
      expect(searchInput).toHaveValue(legalTerm);
      expect(legalTerm).toContainLegalTerms();
    });

    it('should handle mixed Persian and English input', async () => {
      renderSearchBar();
      
      const searchInput = screen.getByRole('textbox');
      const mixedText = 'قانون constitution';
      
      await user.type(searchInput, mixedText);
      
      expect(searchInput).toHaveValue(mixedText);
    });

    it('should handle Persian numbers correctly', async () => {
      renderSearchBar();
      
      const searchInput = screen.getByRole('textbox');
      const persianNumbers = 'ماده ۱۲۳';
      
      await user.type(searchInput, persianNumbers);
      
      expect(searchInput).toHaveValue(persianNumbers);
    });

    it('should handle Persian punctuation correctly', async () => {
      renderSearchBar();
      
      const searchInput = screen.getByRole('textbox');
      const persianPunctuation = 'قانون، ماده؛ تبصره؟';
      
      await user.type(searchInput, persianPunctuation);
      
      expect(searchInput).toHaveValue(persianPunctuation);
      expect(persianPunctuation).toBePersianNormalized();
    });
  });

  describe('Autocomplete Functionality', () => {
    it('should show Persian autocomplete suggestions', async () => {
      const mockSuggestions = [
        'قانون اساسی جمهوری اسلامی ایران',
        'قانون مدنی',
        'قانون مجازات اسلامی',
        'قانون تجارت'
      ];

      mockUseSearch.mockReturnValue({
        search: vi.fn(),
        suggestions: mockSuggestions,
        isLoading: false,
        error: null,
        searchHistory: []
      });

      renderSearchBar();
      
      const searchInput = screen.getByRole('textbox');
      await user.type(searchInput, 'قانون');
      
      await waitFor(() => {
        mockSuggestions.forEach(suggestion => {
          expect(screen.getByText(suggestion)).toBeInTheDocument();
          expect(suggestion).toContainPersian();
        });
      });
    });

    it('should filter suggestions based on Persian input', async () => {
      const allSuggestions = [
        'قانون اساسی',
        'قانون مدنی',
        'قانون مجازات',
        'آیین\u200cنامه اجرایی'
      ];

      mockUseSearch.mockReturnValue({
        search: vi.fn(),
        suggestions: allSuggestions,
        isLoading: false,
        error: null,
        searchHistory: []
      });

      renderSearchBar();
      
      const searchInput = screen.getByRole('textbox');
      await user.type(searchInput, 'قانون');
      
      await waitFor(() => {
        expect(screen.getByText('قانون اساسی')).toBeInTheDocument();
        expect(screen.getByText('قانون مدنی')).toBeInTheDocument();
        expect(screen.getByText('قانون مجازات')).toBeInTheDocument();
        expect(screen.queryByText('آیین\u200cنامه اجرایی')).not.toBeInTheDocument();
      });
    });

    it('should handle keyboard navigation in suggestions', async () => {
      const mockSuggestions = ['قانون اساسی', 'قانون مدنی', 'قانون مجازات'];

      mockUseSearch.mockReturnValue({
        search: vi.fn(),
        suggestions: mockSuggestions,
        isLoading: false,
        error: null,
        searchHistory: []
      });

      renderSearchBar();
      
      const searchInput = screen.getByRole('textbox');
      await user.type(searchInput, 'قانون');
      
      await waitFor(() => {
        expect(screen.getByText('قانون اساسی')).toBeInTheDocument();
      });

      // Test keyboard navigation
      fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
      fireEvent.keyDown(searchInput, { key: 'ArrowUp' });
      fireEvent.keyDown(searchInput, { key: 'Enter' });
    });

    it('should select suggestion on click', async () => {
      const mockSuggestions = ['قانون اساسی', 'قانون مدنی'];
      const mockSearch = vi.fn();

      mockUseSearch.mockReturnValue({
        search: mockSearch,
        suggestions: mockSuggestions,
        isLoading: false,
        error: null,
        searchHistory: []
      });

      renderSearchBar();
      
      const searchInput = screen.getByRole('textbox');
      await user.type(searchInput, 'قانون');
      
      await waitFor(() => {
        const suggestion = screen.getByText('قانون اساسی');
        fireEvent.click(suggestion);
      });

      expect(mockSearch).toHaveBeenCalledWith('قانون اساسی');
    });
  });

  describe('Search History', () => {
    it('should display Persian search history', async () => {
      const mockHistory = [
        'قانون اساسی',
        'ماده ۱ قانون مدنی',
        'دادگاه تجدیدنظر'
      ];

      mockUseSearch.mockReturnValue({
        search: vi.fn(),
        suggestions: [],
        isLoading: false,
        error: null,
        searchHistory: mockHistory
      });

      renderSearchBar();
      
      const searchInput = screen.getByRole('textbox');
      await user.click(searchInput);
      
      await waitFor(() => {
        mockHistory.forEach(historyItem => {
          expect(screen.getByText(historyItem)).toBeInTheDocument();
          expect(historyItem).toContainPersian();
        });
      });
    });

    it('should clear search history', async () => {
      const mockHistory = ['قانون اساسی', 'قانون مدنی'];
      const mockClearHistory = vi.fn();

      mockUseSearch.mockReturnValue({
        search: vi.fn(),
        suggestions: [],
        isLoading: false,
        error: null,
        searchHistory: mockHistory,
        clearHistory: mockClearHistory
      });

      renderSearchBar();
      
      const searchInput = screen.getByRole('textbox');
      await user.click(searchInput);
      
      await waitFor(() => {
        const clearButton = screen.getByText(/پاک کردن تاریخچه/i);
        fireEvent.click(clearButton);
      });

      expect(mockClearHistory).toHaveBeenCalled();
    });
  });

  describe('AI-Enhanced Search', () => {
    it('should enhance Persian search queries with AI', async () => {
      const mockSearch = vi.fn();
      const enhancedQuery = 'قانون اساسی OR قانون مدنی OR قانون مجازات';

      mockUseSearch.mockReturnValue({
        search: mockSearch,
        suggestions: [],
        isLoading: false,
        error: null,
        searchHistory: []
      });

      // Mock AI service response
      mockAIService.enhanceSearchQuery.mockResolvedValue({
        success: true,
        data: {
          original_query: 'قانون',
          enhanced_query: enhancedQuery,
          suggestions: ['قانون اساسی', 'قانون مدنی'],
          synonyms: ['مقررات', 'آیین\u200cنامه'],
          legal_terms: ['ماده', 'بند', 'تبصره']
        }
      });

      renderSearchBar();
      
      const searchInput = screen.getByRole('textbox');
      const searchButton = screen.getByRole('button', { name: /جستجو/i });
      
      await user.type(searchInput, 'قانون');
      await user.click(searchButton);
      
      await waitFor(() => {
        expect(mockAIService.enhanceSearchQuery).toHaveBeenCalledWith('قانون');
        expect(mockSearch).toHaveBeenCalled();
      });
    });

    it('should handle AI service errors gracefully', async () => {
      const mockSearch = vi.fn();

      mockUseSearch.mockReturnValue({
        search: mockSearch,
        suggestions: [],
        isLoading: false,
        error: null,
        searchHistory: []
      });

      // Mock AI service error
      mockAIService.enhanceSearchQuery.mockRejectedValue(new Error('AI service unavailable'));

      renderSearchBar();
      
      const searchInput = screen.getByRole('textbox');
      const searchButton = screen.getByRole('button', { name: /جستجو/i });
      
      await user.type(searchInput, 'قانون');
      await user.click(searchButton);
      
      // Should still perform search even if AI enhancement fails
      await waitFor(() => {
        expect(mockSearch).toHaveBeenCalledWith('قانون');
      });
    });
  });

  describe('Search Execution', () => {
    it('should execute search with Persian query', async () => {
      const mockSearch = vi.fn();

      mockUseSearch.mockReturnValue({
        search: mockSearch,
        suggestions: [],
        isLoading: false,
        error: null,
        searchHistory: []
      });

      renderSearchBar();
      
      const searchInput = screen.getByRole('textbox');
      const searchButton = screen.getByRole('button', { name: /جستجو/i });
      
      const query = 'ماده ۱ قانون مدنی';
      await user.type(searchInput, query);
      await user.click(searchButton);
      
      expect(mockSearch).toHaveBeenCalledWith(query);
    });

    it('should execute search on Enter key press', async () => {
      const mockSearch = vi.fn();

      mockUseSearch.mockReturnValue({
        search: mockSearch,
        suggestions: [],
        isLoading: false,
        error: null,
        searchHistory: []
      });

      renderSearchBar();
      
      const searchInput = screen.getByRole('textbox');
      const query = 'قانون اساسی';
      
      await user.type(searchInput, query);
      await user.keyboard('{Enter}');
      
      expect(mockSearch).toHaveBeenCalledWith(query);
    });

    it('should show loading state during search', async () => {
      mockUseSearch.mockReturnValue({
        search: vi.fn(),
        suggestions: [],
        isLoading: true,
        error: null,
        searchHistory: []
      });

      renderSearchBar();
      
      const loadingIndicator = screen.getByText(/در حال جستجو/i);
      expect(loadingIndicator).toBeInTheDocument();
    });

    it('should handle search errors', async () => {
      mockUseSearch.mockReturnValue({
        search: vi.fn(),
        suggestions: [],
        isLoading: false,
        error: 'خطا در جستجو',
        searchHistory: []
      });

      renderSearchBar();
      
      const errorMessage = screen.getByText(/خطا در جستجو/i);
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toContainPersian();
    });
  });

  describe('Performance Testing', () => {
    it('should handle rapid typing without performance issues', async () => {
      renderSearchBar();
      
      const searchInput = screen.getByRole('textbox');
      const longText = 'قانون اساسی جمهوری اسلامی ایران ماده ۱ بند الف تبصره ۲';
      
      const startTime = performance.now();
      await user.type(searchInput, longText);
      const endTime = performance.now();
      
      const typingTime = endTime - startTime;
      expect(typingTime).toBeLessThan(1000); // Should type within 1 second
    });

    it('should debounce search requests', async () => {
      const mockSearch = vi.fn();

      mockUseSearch.mockReturnValue({
        search: mockSearch,
        suggestions: [],
        isLoading: false,
        error: null,
        searchHistory: []
      });

      renderSearchBar();
      
      const searchInput = screen.getByRole('textbox');
      
      // Type rapidly
      await user.type(searchInput, 'ق', { delay: 10 });
      await user.type(searchInput, 'ا', { delay: 10 });
      await user.type(searchInput, 'ن', { delay: 10 });
      await user.type(searchInput, 'و', { delay: 10 });
      await user.type(searchInput, 'ن', { delay: 10 });
      
      // Wait for debounce
      await waitFor(() => {
        expect(mockSearch).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderSearchBar();
      
      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toHaveAttribute('aria-label', /جستجو/i);
    });

    it('should support screen readers', () => {
      renderSearchBar();
      
      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toHaveAttribute('aria-describedby');
    });

    it('should handle keyboard navigation', async () => {
      renderSearchBar();
      
      const searchInput = screen.getByRole('textbox');
      
      // Test Tab navigation
      await user.tab();
      expect(searchInput).toHaveFocus();
      
      // Test Escape key
      await user.keyboard('{Escape}');
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

      renderSearchBar();
      
      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toBeInTheDocument();
    });

    it('should handle touch interactions', async () => {
      renderSearchBar();
      
      const searchInput = screen.getByRole('textbox');
      
      // Simulate touch events
      fireEvent.touchStart(searchInput);
      fireEvent.touchEnd(searchInput);
      
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('Integration with Legal Archive System', () => {
    it('should search for Persian legal documents', async () => {
      const mockSearch = vi.fn();

      mockUseSearch.mockReturnValue({
        search: mockSearch,
        suggestions: [],
        isLoading: false,
        error: null,
        searchHistory: []
      });

      renderSearchBar();
      
      const searchInput = screen.getByRole('textbox');
      const searchButton = screen.getByRole('button', { name: /جستجو/i });
      
      const legalQuery = 'ماده ۱۱۰۵ قانون مدنی';
      await user.type(searchInput, legalQuery);
      await user.click(searchButton);
      
      expect(mockSearch).toHaveBeenCalledWith(legalQuery);
      expect(legalQuery).toContainLegalTerms();
    });

    it('should handle complex Persian legal queries', async () => {
      const mockSearch = vi.fn();

      mockUseSearch.mockReturnValue({
        search: mockSearch,
        suggestions: [],
        isLoading: false,
        error: null,
        searchHistory: []
      });

      renderSearchBar();
      
      const searchInput = screen.getByRole('textbox');
      const searchButton = screen.getByRole('button', { name: /جستجو/i });
      
      const complexQuery = 'حقوق زنان در قانون مدنی ماده ۱۱۰۵ بند الف';
      await user.type(searchInput, complexQuery);
      await user.click(searchButton);
      
      expect(mockSearch).toHaveBeenCalledWith(complexQuery);
      expect(complexQuery).toContainLegalTerms();
    });
  });
});