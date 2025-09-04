import React, { useState } from 'react';
import { X, Download, Share2, Copy, ExternalLink, Tag, Calendar, Brain, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { fa } from 'date-fns/locale';
import type { Document } from '../types';
import { AIAnalysis } from './AIAnalysis';

interface DocumentViewerProps {
  document: Document;
  onClose: () => void;
  searchQuery?: string;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  onClose,
  searchQuery
}) => {
  const [showCopied, setShowCopied] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(document.content);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text');
    }
  };

  const analyzeWithAI = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/classify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: document.content }),
      });
      
      if (response.ok) {
        const analysis = await response.json();
        setAiAnalysis(analysis);
        setShowAIAnalysis(true);
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const shareDocument = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          text: document.content.substring(0, 300) + '...',
          url: document.url,
        });
      } catch (err) {
        console.error('Share failed');
      }
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <a
                  href={document.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  title="مشاهده در سایت اصلی"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
                <button
                  onClick={shareDocument}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  title="اشتراک‌گذاری"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button
                  onClick={copyToClipboard}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors relative"
                  title="کپی متن"
                >
                  <Copy className="w-5 h-5" />
                  {showCopied && (
                    <motion.span
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
                    >
                      کپی شد!
                    </motion.span>
                  )}
                </button>
                <button
                  onClick={analyzeWithAI}
                  disabled={isAnalyzing}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                  title="تحلیل با هوش مصنوعی"
                >
                  {isAnalyzing ? (
                    <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Brain className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="text-sm text-gray-500 text-right">
              آخرین بروزرسانی: {formatDistanceToNow(new Date(document.scraped_at), { addSuffix: true, locale: fa })}
            </div>
          </div>

          {/* Document info */}
          <div className="p-6 border-b border-gray-200 bg-white">
            <h1 className="text-2xl font-bold text-gray-900 mb-4 text-right leading-relaxed">
              {document.title}
            </h1>
            
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                <span>{document.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                <span>{document.source}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{new Date(document.scraped_at).toLocaleDateString('fa-IR')}</span>
              </div>
            </div>

            {/* AI Classification Results */}
            {document.classification && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2 text-right">نتایج تحلیل هوش مصنوعی</h4>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-blue-700">
                    دسته‌بندی: {document.classification.category}
                  </span>
                  <span className="text-blue-600">
                    اعتماد: {Math.round(document.classification.confidence * 100)}%
                  </span>
                </div>
                
                {document.classification.entities.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-sm font-medium text-blue-900 mb-2 text-right">موجودیت‌های شناسایی شده:</h5>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {document.classification.entities.map((entity, index) => (
                        <span
                          key={index}
                          className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
                        >
                          {entity.text} ({entity.label})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <div className="prose prose-lg max-w-none text-right" dir="rtl">
                <div className="whitespace-pre-wrap leading-relaxed text-gray-800 font-light">
                  {highlightText(document.content, searchQuery)}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* AI Analysis Modal */}
      <AnimatePresence>
        {showAIAnalysis && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAIAnalysis(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">تحلیل هوش مصنوعی</h2>
                  </div>
                  <button
                    onClick={() => setShowAIAnalysis(false)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <AIAnalysis analysis={aiAnalysis} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};