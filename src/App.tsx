import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Search, Database, Settings, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { SearchBar } from './components/SearchBar';
import { SearchResults } from './components/SearchResults';
import { ScrapingStatus } from './components/ScrapingStatus';
import { Dashboard } from './components/Dashboard';
import { useDocuments, useCategories, useSources } from './hooks/useDocuments';
import type { SearchFilters } from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'search' | 'scraping' | 'dashboard'>('search');
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    sortBy: 'relevance'
  });
  const [page, setPage] = useState(1);

  const { data: documents, isLoading } = useDocuments(filters, page);
  const { data: categories = [] } = useCategories();
  const { data: sources = [] } = useSources();

  const handleSearch = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const tabs = [
    { id: 'search', label: 'جستجو', icon: Search },
    { id: 'scraping', label: 'جمع‌آوری', icon: Database },
    { id: 'dashboard', label: 'داشبورد', icon: Info },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <h1 className="text-xl font-bold text-gray-900">
                  آرشیو حقوقی ایران
                </h1>
                <p className="text-sm text-gray-600">
                  سامانه جامع اسناد و مقررات حقوقی
                </p>
              </div>
            </div>

            <nav className="flex items-center">
              <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <Dashboard />}
            
            {activeTab === 'scraping' && <ScrapingStatus />}
            
            {activeTab === 'search' && (
              <div className="space-y-8">
                <SearchBar
                  onSearch={handleSearch}
                  filters={filters}
                  categories={categories}
                  sources={sources}
                  isLoading={isLoading}
                />
                
                <SearchResults
                  results={documents}
                  isLoading={isLoading}
                  searchQuery={filters.query}
                  onLoadMore={() => setPage(prev => prev + 1)}
                  hasMore={documents?.total ? (page * 10) < documents.total : false}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;