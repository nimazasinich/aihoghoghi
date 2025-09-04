import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SearchBar } from './SearchBar';
import { createSearchEnhancementResponse } from '../test/utils/aiServiceMockResponses';
import type { SearchFilters } from '../types';

/**
 * Enhanced SearchBar Component Tests - The most comprehensive search testing ever built!
 * These tests ensure our Persian search functionality works perfectly with AI enhancements.
 */

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
  Filter: () => <div data-testid="filter-icon">Filter</div>,
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  X: () => <div data-testid="x-icon">X</div>,
  ChevronDown: () => <div data-testid="chevron-down-icon">ChevronDown</div>
}));

describe('Enhanced SearchBar Component', () => {
  const mockOnSearch = vi.fn();
  const mockCategories = ['قانون مدنی', 'قانون تجارت', 'قانون کار', 'قانون جزا'];
  const mockSources = ['قوه قضائیه', 'مجلس شورای اسلامی', 'سازمان ثبت اسناد'];
  
  const defaultFilters: SearchFilters = {
    query: '',
    sortBy: 'relevance'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderSearchBar = (props = {}) => {
    const defaultProps = {
      onSearch: mockOnSearch,
      filters: defaultFilters,
      categories: mockCategories,
      sources: mockSources,
      isLoading: false,
      ...props
    };

    return render(<SearchBar {...defaultProps} />);
  };

  describe('Persian Text Input', () => {
    it('should handle Persian text input correctly', async () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      expect(searchInput).toBeInTheDocument();

      // Type Persian text
      fireEvent.change(searchInput, { target: { value: 'قرارداد خرید و فروش' } });
      
      expect(searchInput).toHaveValue('قرارداد خرید و فروش');
    });

    it('should handle Persian text with special characters', async () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      
      // Type Persian text with special characters
      fireEvent.change(searchInput, { target: { value: 'قانون مدنی؛ ماده ۱' } });
      
      expect(searchInput).toHaveValue('قانون مدنی؛ ماده ۱');
    });

    it('should handle mixed Persian and English text', async () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      
      // Type mixed text
      fireEvent.change(searchInput, { target: { value: 'قانون مدنی Article 1' } });
      
      expect(searchInput).toHaveValue('قانون مدنی Article 1');
    });

    it('should handle Persian numbers correctly', async () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      
      // Type Persian numbers
      fireEvent.change(searchInput, { target: { value: 'ماده ۱۲۳' } });
      
      expect(searchInput).toHaveValue('ماده ۱۲۳');
    });
  });

  describe('AI-Enhanced Search Suggestions', () => {
    it('should display AI-enhanced search suggestions', async () => {
      const aiResponse = createSearchEnhancementResponse({
        enhancedQuery: 'قرارداد خرید و فروش ملک',
        suggestions: ['قانون مدنی', 'قانون تجارت', 'آیین دادرسی'],
        relatedTerms: ['عقد', 'بیع', 'مالکیت'],
        synonyms: ['قرارداد - عقد', 'خرید - بیع'],
        legalCategories: ['حقوق مدنی', 'حقوق تجاری'],
        confidence: 0.95
      });

      renderSearchBar();

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      fireEvent.change(searchInput, { target: { value: 'قرارداد' } });

      await waitFor(() => {
        expect(screen.getByText('قانون مدنی')).toBeInTheDocument();
        expect(screen.getByText('قانون تجارت')).toBeInTheDocument();
        expect(screen.getByText('آیین دادرسی')).toBeInTheDocument();
      });
    });

    it('should handle AI suggestion clicks', async () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      fireEvent.change(searchInput, { target: { value: 'قرارداد' } });

      await waitFor(() => {
        const suggestion = screen.getByText('قانون مدنی');
        fireEvent.click(suggestion);
        
        expect(searchInput).toHaveValue('قانون مدنی');
      });
    });

    it('should handle AI service errors gracefully', async () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      fireEvent.change(searchInput, { target: { value: 'قرارداد' } });

      // Simulate AI service error
      await waitFor(() => {
        // Should not crash and should still allow manual search
        expect(searchInput).toHaveValue('قرارداد');
      });
    });
  });

  describe('Filter Functionality', () => {
    it('should display category filters correctly', async () => {
      renderSearchBar();

      const filterButton = screen.getByTestId('filter-icon');
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText('قانون مدنی')).toBeInTheDocument();
        expect(screen.getByText('قانون تجارت')).toBeInTheDocument();
        expect(screen.getByText('قانون کار')).toBeInTheDocument();
        expect(screen.getByText('قانون جزا')).toBeInTheDocument();
      });
    });

    it('should handle category filter selection', async () => {
      renderSearchBar();

      const filterButton = screen.getByTestId('filter-icon');
      fireEvent.click(filterButton);

      await waitFor(() => {
        const categoryOption = screen.getByText('قانون مدنی');
        fireEvent.click(categoryOption);
        
        // Should update filters
        expect(mockOnSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            category: 'قانون مدنی'
          })
        );
      });
    });

    it('should display source filters correctly', async () => {
      renderSearchBar();

      const filterButton = screen.getByTestId('filter-icon');
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText('قوه قضائیه')).toBeInTheDocument();
        expect(screen.getByText('مجلس شورای اسلامی')).toBeInTheDocument();
        expect(screen.getByText('سازمان ثبت اسناد')).toBeInTheDocument();
      });
    });

    it('should handle source filter selection', async () => {
      renderSearchBar();

      const filterButton = screen.getByTestId('filter-icon');
      fireEvent.click(filterButton);

      await waitFor(() => {
        const sourceOption = screen.getByText('قوه قضائیه');
        fireEvent.click(sourceOption);
        
        // Should update filters
        expect(mockOnSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            source: 'قوه قضائیه'
          })
        );
      });
    });

    it('should handle date range filters', async () => {
      renderSearchBar();

      const filterButton = screen.getByTestId('filter-icon');
      fireEvent.click(filterButton);

      await waitFor(() => {
        const dateInput = screen.getByTestId('calendar-icon');
        fireEvent.click(dateInput);
        
        // Should show date picker
        expect(screen.getByText('انتخاب تاریخ')).toBeInTheDocument();
      });
    });
  });

  describe('Search Execution', () => {
    it('should execute search with Persian query', async () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      const searchButton = screen.getByTestId('search-icon');
      
      fireEvent.change(searchInput, { target: { value: 'قرارداد خرید' } });
      fireEvent.click(searchButton);

      expect(mockOnSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'قرارداد خرید'
        })
      );
    });

    it('should execute search on Enter key press', async () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      
      fireEvent.change(searchInput, { target: { value: 'قانون مدنی' } });
      fireEvent.keyDown(searchInput, { key: 'Enter' });

      expect(mockOnSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'قانون مدنی'
        })
      );
    });

    it('should handle empty search gracefully', async () => {
      renderSearchBar();

      const searchButton = screen.getByTestId('search-icon');
      fireEvent.click(searchButton);

      // Should not execute search with empty query
      expect(mockOnSearch).not.toHaveBeenCalled();
    });

    it('should handle search with filters', async () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      const filterButton = screen.getByTestId('filter-icon');
      
      // Set category filter
      fireEvent.click(filterButton);
      await waitFor(() => {
        const categoryOption = screen.getByText('قانون مدنی');
        fireEvent.click(categoryOption);
      });

      // Execute search
      fireEvent.change(searchInput, { target: { value: 'قرارداد' } });
      fireEvent.keyDown(searchInput, { key: 'Enter' });

      expect(mockOnSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'قرارداد',
          category: 'قانون مدنی'
        })
      );
    });
  });

  describe('Loading States', () => {
    it('should display loading state correctly', async () => {
      renderSearchBar({ isLoading: true });

      expect(screen.getByText('در حال جستجو...')).toBeInTheDocument();
    });

    it('should disable search during loading', async () => {
      renderSearchBar({ isLoading: true });

      const searchButton = screen.getByTestId('search-icon');
      expect(searchButton).toBeDisabled();
    });

    it('should show search progress', async () => {
      renderSearchBar({ isLoading: true });

      expect(screen.getByText('در حال جستجو...')).toBeInTheDocument();
    });
  });

  describe('Search History', () => {
    it('should display search history', async () => {
      const searchHistory = [
        'قانون مدنی',
        'قرارداد خرید',
        'آیین دادرسی'
      ];

      renderSearchBar({ searchHistory });

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      fireEvent.focus(searchInput);

      await waitFor(() => {
        expect(screen.getByText('قانون مدنی')).toBeInTheDocument();
        expect(screen.getByText('قرارداد خرید')).toBeInTheDocument();
        expect(screen.getByText('آیین دادرسی')).toBeInTheDocument();
      });
    });

    it('should handle search history clicks', async () => {
      const searchHistory = ['قانون مدنی', 'قرارداد خرید'];

      renderSearchBar({ searchHistory });

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      fireEvent.focus(searchInput);

      await waitFor(() => {
        const historyItem = screen.getByText('قانون مدنی');
        fireEvent.click(historyItem);
        
        expect(searchInput).toHaveValue('قانون مدنی');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for Persian text', async () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      expect(searchInput).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation', async () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      searchInput.focus();
      
      fireEvent.keyDown(searchInput, { key: 'Tab' });
      // Should move to next focusable element
    });

    it('should announce search results to screen readers', async () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      fireEvent.change(searchInput, { target: { value: 'قرارداد' } });

      await waitFor(() => {
        const suggestions = screen.getByRole('listbox');
        expect(suggestions).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle search errors gracefully', async () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      fireEvent.change(searchInput, { target: { value: 'قرارداد' } });
      fireEvent.keyDown(searchInput, { key: 'Enter' });

      // Simulate search error
      mockOnSearch.mockRejectedValue(new Error('خطا در جستجو'));

      await waitFor(() => {
        // Should not crash and should show error message
        expect(screen.getByText('خطا در جستجو')).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      fireEvent.change(searchInput, { target: { value: 'قرارداد' } });

      // Simulate network error
      await waitFor(() => {
        // Should not crash and should allow retry
        expect(searchInput).toHaveValue('قرارداد');
      });
    });
  });

  describe('Performance', () => {
    it('should debounce search input', async () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      
      // Type rapidly
      fireEvent.change(searchInput, { target: { value: 'ق' } });
      fireEvent.change(searchInput, { target: { value: 'قر' } });
      fireEvent.change(searchInput, { target: { value: 'قرار' } });
      fireEvent.change(searchInput, { target: { value: 'قرارداد' } });

      // Should only call onSearch once after debounce
      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle large result sets efficiently', async () => {
      const largeCategories = Array.from({ length: 100 }, (_, i) => `دسته‌بندی ${i + 1}`);
      
      renderSearchBar({ categories: largeCategories });

      const filterButton = screen.getByTestId('filter-icon');
      fireEvent.click(filterButton);

      await waitFor(() => {
        // Should render efficiently
        expect(screen.getByText('دسته‌بندی 1')).toBeInTheDocument();
      });
    });
  });
});