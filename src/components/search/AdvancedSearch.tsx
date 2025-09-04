/**
 * Advanced Search Interface for Legal API Platform
 * Provides Persian autocomplete, search history, saved searches, and voice search
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Mic, 
  MicOff, 
  History, 
  Bookmark, 
  Filter, 
  Calendar,
  FileText,
  User,
  Tag,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  Share2,
  Star,
  StarOff,
  Clock,
  TrendingUp
} from 'lucide-react';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'recent' | 'saved' | 'popular' | 'template';
  category?: string;
  count?: number;
}

interface SearchFilter {
  id: string;
  name: string;
  type: 'date' | 'select' | 'multiselect' | 'range';
  options?: Array<{ value: string; label: string; count?: number }>;
  value?: any;
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: any;
  createdAt: string;
  lastUsed: string;
  useCount: number;
  isStarred: boolean;
}

interface SearchTemplate {
  id: string;
  name: string;
  description: string;
  query: string;
  filters: any;
  category: string;
}

const AdvancedSearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchSuggestion[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [searchTemplates, setSearchTemplates] = useState<SearchTemplate[]>([]);
  const [activeFilters, setActiveFilters] = useState<SearchFilter[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'fa-IR';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Load initial data
  useEffect(() => {
    loadSearchHistory();
    loadSavedSearches();
    loadSearchTemplates();
    loadFilters();
  }, []);

  // Load search suggestions
  useEffect(() => {
    if (searchQuery.length > 1) {
      loadSuggestions(searchQuery);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery]);

  const loadSearchHistory = async () => {
    try {
      const response = await fetch('/api/search/history');
      const data = await response.json();
      setSearchHistory(data.map((item: any) => ({
        id: item.id,
        text: item.query,
        type: 'recent' as const,
        category: item.category
      })));
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  };

  const loadSavedSearches = async () => {
    try {
      const response = await fetch('/api/search/saved');
      const data = await response.json();
      setSavedSearches(data);
    } catch (error) {
      console.error('Failed to load saved searches:', error);
    }
  };

  const loadSearchTemplates = async () => {
    try {
      const response = await fetch('/api/search/templates');
      const data = await response.json();
      setSearchTemplates(data);
    } catch (error) {
      console.error('Failed to load search templates:', error);
    }
  };

  const loadFilters = async () => {
    try {
      const response = await fetch('/api/search/filters');
      const data = await response.json();
      setActiveFilters(data);
    } catch (error) {
      console.error('Failed to load filters:', error);
    }
  };

  const loadSuggestions = async (query: string) => {
    try {
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const performSearch = async (query: string, filters: any = {}) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/search/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          filters,
          page: currentPage,
          limit: 20
        })
      });
      
      const data = await response.json();
      setSearchResults(data.results);
      setTotalResults(data.total);
      
      // Add to search history
      addToHistory(query);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addToHistory = async (query: string) => {
    try {
      await fetch('/api/search/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      loadSearchHistory();
    } catch (error) {
      console.error('Failed to add to history:', error);
    }
  };

  const saveSearch = async (name: string) => {
    try {
      await fetch('/api/search/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          query: searchQuery,
          filters: activeFilters.reduce((acc, filter) => {
            acc[filter.id] = filter.value;
            return acc;
          }, {} as any)
        })
      });
      loadSavedSearches();
    } catch (error) {
      console.error('Failed to save search:', error);
    }
  };

  const toggleStar = async (searchId: string) => {
    try {
      await fetch(`/api/search/saved/${searchId}/star`, {
        method: 'PUT'
      });
      loadSavedSearches();
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  };

  const startVoiceSearch = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopVoiceSearch = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      const filters = activeFilters.reduce((acc, filter) => {
        if (filter.value !== undefined && filter.value !== '') {
          acc[filter.id] = filter.value;
        }
        return acc;
      }, {} as any);
      
      performSearch(searchQuery, filters);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.text);
    setShowSuggestions(false);
    
    if (suggestion.type === 'template') {
      const template = searchTemplates.find(t => t.id === suggestion.id);
      if (template) {
        setActiveFilters(template.filters);
      }
    }
    
    handleSearch();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'recent': return <History className="w-4 h-4" />;
      case 'saved': return <Bookmark className="w-4 h-4" />;
      case 'popular': return <TrendingUp className="w-4 h-4" />;
      case 'template': return <FileText className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case 'recent': return 'text-blue-600 bg-blue-100';
      case 'saved': return 'text-green-600 bg-green-100';
      case 'popular': return 'text-purple-600 bg-purple-100';
      case 'template': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6" dir="rtl">
      {/* Search Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">جستجوی پیشرفته</h1>
        <p className="text-gray-600">جستجوی هوشمند در اسناد حقوقی با قابلیت‌های پیشرفته</p>
      </div>

      {/* Main Search Bar */}
      <div className="relative mb-6">
        <div className="flex items-center bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="flex-1 relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setShowSuggestions(true)}
              placeholder="جستجو در اسناد حقوقی..."
              className="w-full px-6 py-4 text-lg border-0 rounded-lg focus:ring-0 focus:outline-none"
            />
            
            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full flex items-center px-4 py-3 text-right hover:bg-gray-50 transition-colors"
                  >
                    <div className={`p-2 rounded-lg ml-3 ${getSuggestionColor(suggestion.type)}`}>
                      {getSuggestionIcon(suggestion.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{suggestion.text}</p>
                      {suggestion.category && (
                        <p className="text-xs text-gray-500">{suggestion.category}</p>
                      )}
                    </div>
                    {suggestion.count && (
                      <span className="text-xs text-gray-400">{suggestion.count}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2 space-x-reverse px-4">
            {/* Voice Search */}
            <button
              onClick={isListening ? stopVoiceSearch : startVoiceSearch}
              className={`p-3 rounded-lg transition-colors ${
                isListening 
                  ? 'bg-red-100 text-red-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            
            {/* Search Button */}
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Search className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Search Options */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4 space-x-reverse">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              showFilters 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-4 h-4 ml-2" />
            فیلترها
            {showFilters ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
          </button>
          
          <button className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <History className="w-4 h-4 ml-2" />
            تاریخچه
          </button>
          
          <button className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <Bookmark className="w-4 h-4 ml-2" />
            جستجوهای ذخیره شده
          </button>
        </div>
        
        <div className="flex items-center space-x-2 space-x-reverse">
          <button className="flex items-center px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
            <Download className="w-4 h-4 ml-1" />
            خروجی
          </button>
          <button className="flex items-center px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
            <Share2 className="w-4 h-4 ml-1" />
            اشتراک
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">فیلترهای پیشرفته</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeFilters.map((filter) => (
              <div key={filter.id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {filter.name}
                </label>
                
                {filter.type === 'date' && (
                  <input
                    type="date"
                    value={filter.value || ''}
                    onChange={(e) => {
                      const newFilters = activeFilters.map(f => 
                        f.id === filter.id ? { ...f, value: e.target.value } : f
                      );
                      setActiveFilters(newFilters);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
                
                {filter.type === 'select' && (
                  <select
                    value={filter.value || ''}
                    onChange={(e) => {
                      const newFilters = activeFilters.map(f => 
                        f.id === filter.id ? { ...f, value: e.target.value } : f
                      );
                      setActiveFilters(newFilters);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">همه</option>
                    {filter.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} {option.count && `(${option.count})`}
                      </option>
                    ))}
                  </select>
                )}
                
                {filter.type === 'multiselect' && (
                  <div className="space-y-2">
                    {filter.options?.map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filter.value?.includes(option.value) || false}
                          onChange={(e) => {
                            const currentValues = filter.value || [];
                            const newValues = e.target.checked
                              ? [...currentValues, option.value]
                              : currentValues.filter((v: string) => v !== option.value);
                            
                            const newFilters = activeFilters.map(f => 
                              f.id === filter.id ? { ...f, value: newValues } : f
                            );
                            setActiveFilters(newFilters);
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="mr-2 text-sm text-gray-700">
                          {option.label} {option.count && `(${option.count})`}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Templates */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">قالب‌های جستجو</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {searchTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => {
                setSearchQuery(template.query);
                setActiveFilters(template.filters);
                handleSearch();
              }}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-right"
            >
              <h4 className="font-medium text-gray-900 mb-2">{template.name}</h4>
              <p className="text-sm text-gray-600 mb-2">{template.description}</p>
              <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                {template.category}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                نتایج جستجو ({totalResults.toLocaleString('fa-IR')})
              </h3>
              <button
                onClick={() => {
                  const name = prompt('نام جستجو:');
                  if (name) saveSearch(name);
                }}
                className="flex items-center px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                <Bookmark className="w-4 h-4 ml-1" />
                ذخیره جستجو
              </button>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {searchResults.map((result, index) => (
              <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      {result.title}
                    </h4>
                    <p className="text-gray-600 mb-3 line-clamp-3">
                      {result.excerpt}
                    </p>
                    <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-500">
                      <span className="flex items-center">
                        <FileText className="w-4 h-4 ml-1" />
                        {result.type}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 ml-1" />
                        {new Date(result.date).toLocaleDateString('fa-IR')}
                      </span>
                      <span className="flex items-center">
                        <User className="w-4 h-4 ml-1" />
                        {result.author}
                      </span>
                      {result.tags && (
                        <span className="flex items-center">
                          <Tag className="w-4 h-4 ml-1" />
                          {result.tags.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse mr-4">
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <Star className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch;