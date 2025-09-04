import React from 'react';
import { Calendar, ExternalLink, Hash, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { faIR } from 'date-fns/locale';
import type { Document } from '../types';

interface DocumentCardProps {
  document: Document;
  onView: (document: Document) => void;
  searchQuery?: string;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onView,
  searchQuery
}) => {
  const highlightText = (text: string, query?: string) => {
    if (!query || query.length < 2) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'قانون اساسی': 'bg-red-100 text-red-800',
      'قوانین عادی': 'bg-blue-100 text-blue-800',
      'آیین‌نامه': 'bg-green-100 text-green-800',
      'مصوبات': 'bg-purple-100 text-purple-800',
      'رأی قضایی': 'bg-orange-100 text-orange-800',
      'نظریه مشورتی': 'bg-cyan-100 text-cyan-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden group cursor-pointer"
      onClick={() => onView(document)}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(document.category)}`}>
              {document.category}
            </span>
            {document.classification && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                اعتماد: {Math.round(document.classification.confidence * 100)}%
              </span>
            )}
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2 text-right leading-relaxed">
          {highlightText(document.title, searchQuery)}
        </h3>

        {/* Content preview */}
        <p className="text-gray-600 text-sm line-clamp-3 mb-4 text-right leading-relaxed">
          {highlightText(document.content.substring(0, 200) + '...', searchQuery)}
        </p>

        {/* Entities (if available) */}
        {document.classification?.entities && document.classification.entities.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1 justify-end">
              {document.classification.entities.slice(0, 3).map((entity, index) => (
                <span
                  key={index}
                  className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full"
                >
                  {entity.text}
                </span>
              ))}
              {document.classification.entities.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{document.classification.entities.length - 3} موارد دیگر
                </span>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDistanceToNow(new Date(document.scraped_at), { addSuffix: true, locale: faIR })}</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span>{document.source}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Hash className="w-3 h-3" />
            <span className="font-mono text-xs">{document.content_hash.substring(0, 8)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};