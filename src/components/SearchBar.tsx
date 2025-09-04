import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, X, Sparkles, Lightbulb, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SearchFilters } from '../types';

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void;
  filters: SearchFilters;
  categories: string[];
  sources: string[];
  isLoading?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  filters,
  categories,
  sources,
  isLoading = false
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);

  // AI-powered search suggestions
  useEffect(() => {
    if (localFilters.query && localFilters.query.length > 2) {
      // Simulate AI suggestions based on query
      const suggestions = generateAISuggestions(localFilters.query);
      setAiSuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [localFilters.query]);

  // Load trending searches
  useEffect(() => {
    setTrendingSearches([
      'قانون اساسی جمهوری اسلامی ایران',
      'آیین‌نامه استخدامی',
      'رأی دیوان عدالت اداری',
      'مصوبات مجلس شورای اسلامی',
      'بخشنامه‌های وزارتخانه‌ها'
    ]);
  }, []);

  const generateAISuggestions = (query: string): string[] => {
    const baseSuggestions = [
      `${query} در قانون اساسی`,
      `${query} در آیین‌نامه‌ها`,
      `${query} در آرای قضایی`,
      `${query} در مصوبات مجلس`,
      `${query} در بخشنامه‌ها`
    ];
    return baseSuggestions.slice(0, 3);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localFilters);
  };

  const clearFilters = () => {
    const clearedFilters: SearchFilters = {
      query: '',
      sortBy: 'relevance'
    };
    setLocalFilters(clearedFilters);
    onSearch(clearedFilters);
  };

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <form onSubmit={handleSubmit} className="p-6">
        {/* Main search input with AI assistance */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="جستجو در اسناد حقوقی با کمک هوش مصنوعی..."
            value={localFilters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            className="w-full pl-12 pr-4 py-4 text-lg border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
            dir="rtl"
          />
          {localFilters.query && (
            <button
              type="button"
              onClick={() => updateFilter('query', '')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          
          {/* AI Suggestions Dropdown */}
          <AnimatePresence>
            {showSuggestions && (aiSuggestions.length > 0 || trendingSearches.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
              >
                {aiSuggestions.length > 0 && (
                  <div className="p-3 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">پیشنهادات هوش مصنوعی</span>
                    </div>
                    {aiSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          updateFilter('query', suggestion);
                          setShowSuggestions(false);
                        }}
                        className="w-full text-right p-2 hover:bg-gray-50 rounded text-sm text-gray-700"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
                
                {trendingSearches.length > 0 && (
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">جستجوهای پرطرفدار</span>
                    </div>
                    {trendingSearches.map((trend, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          updateFilter('query', trend);
                          setShowSuggestions(false);
                        }}
                        className="w-full text-right p-2 hover:bg-gray-50 rounded text-sm text-gray-700"
                      >
                        {trend}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Search actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  در حال جستجو...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  جستجو
                </>
              )}
            </motion.button>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Filter className="w-4 h-4" />
              فیلترهای پیشرفته
            </button>
          </div>

          {(localFilters.source || localFilters.category || localFilters.dateRange) && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              پاک کردن فیلترها
            </button>
          )}
        </div>
      </form>

      {/* Advanced filters */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-100 bg-gray-50"
          >
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  دسته‌بندی
                </label>
                <select
                  value={localFilters.category || ''}
                  onChange={(e) => updateFilter('category', e.target.value || undefined)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-right"
                  dir="rtl"
                >
                  <option value="">همه دسته‌بندی‌ها</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Source filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  منبع
                </label>
                <select
                  value={localFilters.source || ''}
                  onChange={(e) => updateFilter('source', e.target.value || undefined)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-right"
                  dir="rtl"
                >
                  <option value="">همه منابع</option>
                  {sources.map(source => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </div>

              {/* Sort by */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  مرتب‌سازی
                </label>
                <select
                  value={localFilters.sortBy || 'relevance'}
                  onChange={(e) => updateFilter('sortBy', e.target.value as 'relevance' | 'date' | 'title')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-right"
                  dir="rtl"
                >
                  <option value="relevance">بر اساس مرتبط بودن</option>
                  <option value="date">بر اساس تاریخ</option>
                  <option value="title">بر اساس عنوان</option>
                </select>
              </div>

              {/* Date range */}
              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                    از تاریخ
                  </label>
                  <input
                    type="date"
                    value={localFilters.dateRange?.start || ''}
                    onChange={(e) => updateFilter('dateRange', { 
                      ...localFilters.dateRange, 
                      start: e.target.value 
                    })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                    تا تاریخ
                  </label>
                  <input
                    type="date"
                    value={localFilters.dateRange?.end || ''}
                    onChange={(e) => updateFilter('dateRange', { 
                      ...localFilters.dateRange, 
                      end: e.target.value 
                    })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};