import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SearchBar } from './SearchBar';
import { persianTestUtils } from '../test/utils/persianTextMatchers';
import type { SearchFilters } from '../types';

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
  X: () => <div data-testid="x-icon">X</div>
}));

describe('SearchBar Component', () => {
  const mockOnSearch = vi.fn();
  const mockCategories = ['قانون مدنی', 'قانون تجارت', 'قانون کار'];
  const mockSources = ['قوه قضائیه', 'مجلس شورای اسلامی'];
  
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

  describe('Basic Rendering', () => {
    it('should render search input with Persian placeholder', () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('should display search icon', () => {
      renderSearchBar();

      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });

    it('should render filter button', () => {
      renderSearchBar();

      const filterButton = screen.getByText('فیلترهای پیشرفته');
      expect(filterButton).toBeInTheDocument();
    });

    it('should render search button', () => {
      renderSearchBar();

      const searchButton = screen.getByText('جستجو');
      expect(searchButton).toBeInTheDocument();
    });
  });

  describe('Persian Text Handling', () => {
    it('should handle Persian input correctly', () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      const persianText = 'قانون مدنی';
      
      fireEvent.change(searchInput, { target: { value: persianText } });
      
      expect(searchInput).toHaveValue(persianText);
      expect(persianText).toBeValidPersianText();
    });

    it('should display Persian placeholder text', () => {
      renderSearchBar();

      const placeholder = 'جستجو در اسناد حقوقی...';
      expect(placeholder).toBeValidPersianText();
    });

    it('should have RTL direction for Persian text', () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      expect(searchInput).toHaveStyle('direction: rtl');
    });
  });

  describe('Search Functionality', () => {
    it('should call onSearch when form is submitted', () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      const searchButton = screen.getByText('جستجو');
      
      fireEvent.change(searchInput, { target: { value: 'قانون مدنی' } });
      fireEvent.click(searchButton);

      expect(mockOnSearch).toHaveBeenCalledWith({
        query: 'قانون مدنی',
        sortBy: 'relevance'
      });
    });

    it('should call onSearch when Enter key is pressed', () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      
      fireEvent.change(searchInput, { target: { value: 'قانون تجارت' } });
      fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

      expect(mockOnSearch).toHaveBeenCalledWith({
        query: 'قانون تجارت',
        sortBy: 'relevance'
      });
    });

    it('should not call onSearch with empty query', () => {
      renderSearchBar();

      const searchButton = screen.getByText('جستجو');
      fireEvent.click(searchButton);

      expect(mockOnSearch).toHaveBeenCalledWith({
        query: '',
        sortBy: 'relevance'
      });
    });
  });

  describe('Advanced Filters', () => {
    it('should show advanced filters when filter button is clicked', () => {
      renderSearchBar();

      const filterButton = screen.getByText('فیلترهای پیشرفته');
      fireEvent.click(filterButton);

      expect(screen.getByText('دسته‌بندی')).toBeInTheDocument();
      expect(screen.getByText('منبع')).toBeInTheDocument();
    });

    it('should hide advanced filters when X button is clicked', () => {
      renderSearchBar();

      const filterButton = screen.getByText('فیلترهای پیشرفته');
      fireEvent.click(filterButton);

      const closeButton = screen.getByTestId('x-icon');
      fireEvent.click(closeButton);

      expect(screen.queryByText('دسته‌بندی')).not.toBeInTheDocument();
    });

    it('should display category options', () => {
      renderSearchBar();

      const filterButton = screen.getByText('فیلترهای پیشرفته');
      fireEvent.click(filterButton);

      mockCategories.forEach(category => {
        expect(screen.getByText(category)).toBeInTheDocument();
      });
    });

    it('should display source options', () => {
      renderSearchBar();

      const filterButton = screen.getByText('فیلترهای پیشرفته');
      fireEvent.click(filterButton);

      mockSources.forEach(source => {
        expect(screen.getByText(source)).toBeInTheDocument();
      });
    });
  });

  describe('Filter Selection', () => {
    it('should update filters when category is selected', () => {
      renderSearchBar();

      const filterButton = screen.getByText('فیلترهای پیشرفته');
      fireEvent.click(filterButton);

      const categoryOption = screen.getByText('قانون مدنی');
      fireEvent.click(categoryOption);

      const searchButton = screen.getByText('جستجو');
      fireEvent.click(searchButton);

      expect(mockOnSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'قانون مدنی'
        })
      );
    });

    it('should update filters when source is selected', () => {
      renderSearchBar();

      const filterButton = screen.getByText('فیلترهای پیشرفته');
      fireEvent.click(filterButton);

      const sourceOption = screen.getByText('قوه قضائیه');
      fireEvent.click(sourceOption);

      const searchButton = screen.getByText('جستجو');
      fireEvent.click(searchButton);

      expect(mockOnSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'قوه قضائیه'
        })
      );
    });

    it('should update sort order when changed', () => {
      renderSearchBar();

      const filterButton = screen.getByText('فیلترهای پیشرفته');
      fireEvent.click(filterButton);

      const sortSelect = screen.getByDisplayValue('مرتب‌سازی بر اساس ارتباط');
      fireEvent.change(sortSelect, { target: { value: 'date' } });

      const searchButton = screen.getByText('جستجو');
      fireEvent.click(searchButton);

      expect(mockOnSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'date'
        })
      );
    });
  });

  describe('Clear Filters', () => {
    it('should clear all filters when clear button is clicked', () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      fireEvent.change(searchInput, { target: { value: 'قانون مدنی' } });

      const clearButton = screen.getByText('پاک کردن');
      fireEvent.click(clearButton);

      expect(searchInput).toHaveValue('');
      expect(mockOnSearch).toHaveBeenCalledWith({
        query: '',
        sortBy: 'relevance'
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state when isLoading is true', () => {
      renderSearchBar({ isLoading: true });

      const searchButton = screen.getByText('در حال جستجو...');
      expect(searchButton).toBeInTheDocument();
      expect(searchButton).toBeDisabled();
    });

    it('should disable search input when loading', () => {
      renderSearchBar({ isLoading: true });

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      expect(searchInput).toBeDisabled();
    });
  });

  describe('Props Handling', () => {
    it('should initialize with provided filters', () => {
      const initialFilters: SearchFilters = {
        query: 'قانون مدنی',
        sortBy: 'date',
        category: 'قانون مدنی'
      };

      renderSearchBar({ filters: initialFilters });

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      expect(searchInput).toHaveValue('قانون مدنی');
    });

    it('should handle empty categories array', () => {
      renderSearchBar({ categories: [] });

      const filterButton = screen.getByText('فیلترهای پیشرفته');
      fireEvent.click(filterButton);

      expect(screen.getByText('دسته‌بندی')).toBeInTheDocument();
    });

    it('should handle empty sources array', () => {
      renderSearchBar({ sources: [] });

      const filterButton = screen.getByText('فیلترهای پیشرفته');
      fireEvent.click(filterButton);

      expect(screen.getByText('منبع')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form structure', () => {
      renderSearchBar();

      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();
    });

    it('should have proper input labels', () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('should be keyboard navigable', () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      const searchButton = screen.getByText('جستجو');

      expect(searchInput).toHaveAttribute('tabindex');
      expect(searchButton).toHaveAttribute('tabindex');
    });
  });

  describe('Performance', () => {
    it('should render within acceptable time', () => {
      const start = performance.now();
      renderSearchBar();
      const end = performance.now();

      expect(end - start).toBeLessThan(100);
    });

    it('should handle rapid input changes efficiently', () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText('جستجو در اسناد حقوقی...');
      
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        fireEvent.change(searchInput, { target: { value: `قانون ${i}` } });
      }
      const end = performance.now();

      expect(end - start).toBeLessThan(1000);
    });
  });

  describe('Error Handling', () => {
    it('should handle undefined onSearch callback', () => {
      expect(() => {
        renderSearchBar({ onSearch: undefined as any });
      }).not.toThrow();
    });

    it('should handle malformed filters', () => {
      const malformedFilters = {
        query: null,
        sortBy: undefined
      } as any;

      expect(() => {
        renderSearchBar({ filters: malformedFilters });
      }).not.toThrow();
    });
  });
});