import React, { useState } from 'react';
import { FileText, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DocumentCard } from './DocumentCard';
import { DocumentViewer } from './DocumentViewer';
import type { Document, ApiResponse } from '../types';

interface SearchResultsProps {
  results: ApiResponse<Document[]> | undefined;
  isLoading: boolean;
  searchQuery: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  isLoading,
  searchQuery,
  onLoadMore,
  hasMore = false
}) => {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  if (isLoading && !results?.data) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!results?.data || results.data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          {searchQuery ? (
            <FileText className="w-8 h-8 text-gray-400" />
          ) : (
            <Clock className="w-8 h-8 text-gray-400" />
          )}
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {searchQuery ? 'نتیجه‌ای یافت نشد' : 'آماده برای جستجو'}
        </h3>
        <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
          {searchQuery 
            ? 'متأسفانه هیچ سندی با این معیارهای جستجو یافت نشد. لطفاً کلیدواژه‌های دیگری امتحان کنید.'
            : 'برای شروع، کلیدواژه مورد نظر خود را در کادر جستجو وارد کنید.'
          }
        </p>
      </motion.div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Results header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {results.total} سند یافت شد
            {searchQuery && ` برای "${searchQuery}"`}
          </p>
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <RefreshCw className="w-4 h-4 animate-spin" />
              در حال بروزرسانی...
            </div>
          )}
        </div>

        {/* Documents grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {results.data.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onView={setSelectedDocument}
                searchQuery={searchQuery}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Load more button */}
        {hasMore && (
          <div className="text-center pt-6">
            <button
              onClick={onLoadMore}
              disabled={isLoading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  در حال بارگذاری...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  مشاهده بیشتر
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Document viewer modal */}
      {selectedDocument && (
        <DocumentViewer
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
          searchQuery={searchQuery}
        />
      )}
    </>
  );
};