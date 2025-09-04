import React, { useState } from 'react';
import { Brain, Sparkles, TrendingUp, Target, BarChart3, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Entity {
  text: string;
  label: string;
  start: number;
  end: number;
  confidence: number;
}

interface Sentiment {
  positive: number;
  negative: number;
  neutral: number;
}

interface AIAnalysisData {
  category: string;
  confidence: number;
  entities: Entity[];
  sentiment: Sentiment;
  processed_at: number;
}

interface AIAnalysisProps {
  analysis: AIAnalysisData | null;
  isLoading?: boolean;
}

export const AIAnalysis: React.FC<AIAnalysisProps> = ({ analysis, isLoading = false }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'entities' | 'sentiment'>('overview');

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="text-center py-8">
          <Brain className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">تحلیل هوش مصنوعی</h3>
          <p className="text-gray-600">هیچ تحلیلی در دسترس نیست</p>
        </div>
      </div>
    );
  }

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'قانون اساسی': 'bg-blue-100 text-blue-800',
      'قوانین عادی': 'bg-green-100 text-green-800',
      'آیین‌نامه': 'bg-purple-100 text-purple-800',
      'مصوبات': 'bg-orange-100 text-orange-800',
      'رأی قضایی': 'bg-red-100 text-red-800',
      'نظریه مشورتی': 'bg-indigo-100 text-indigo-800',
      'بخشنامه': 'bg-yellow-100 text-yellow-800',
      'قرارداد': 'bg-pink-100 text-pink-800',
      'عمومی': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors['عمومی'];
  };

  const getEntityColor = (label: string) => {
    const colors: { [key: string]: string } = {
      'PERSON': 'bg-blue-100 text-blue-800',
      'ORG': 'bg-green-100 text-green-800',
      'LAW': 'bg-purple-100 text-purple-800',
      'DATE': 'bg-orange-100 text-orange-800',
      'MONEY': 'bg-yellow-100 text-yellow-800'
    };
    return colors[label] || 'bg-gray-100 text-gray-800';
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSentimentLabel = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'مثبت';
      case 'negative': return 'منفی';
      default: return 'خنثی';
    }
  };

  const dominantSentiment = Object.entries(analysis.sentiment).reduce((a, b) => 
    analysis.sentiment[a[0]] > analysis.sentiment[b[0]] ? a : b
  );

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">تحلیل هوش مصنوعی</h2>
            <p className="text-sm text-gray-600">نتایج پردازش با مدل‌های BERT فارسی</p>
          </div>
        </div>

        {/* Category and Confidence */}
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(analysis.category)}`}>
            {analysis.category}
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              اطمینان: {(analysis.confidence * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100">
        <nav className="flex">
          {[
            { id: 'overview', label: 'نمای کلی', icon: BarChart3 },
            { id: 'entities', label: 'موجودیت‌ها', icon: Sparkles },
            { id: 'sentiment', label: 'احساسات', icon: TrendingUp }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600 bg-purple-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Category Analysis */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">دسته‌بندی سند</h3>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{analysis.category}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${analysis.confidence * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {(analysis.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{analysis.entities.length}</div>
                  <div className="text-sm text-blue-700">موجودیت شناسایی شده</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className={`text-2xl font-bold ${getSentimentColor(dominantSentiment[0])}`}>
                    {getSentimentLabel(dominantSentiment[0])}
                  </div>
                  <div className="text-sm text-gray-600">احساس غالب</div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'entities' && (
            <motion.div
              key="entities"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold text-gray-900">موجودیت‌های شناسایی شده</h3>
              
              {analysis.entities.length > 0 ? (
                <div className="space-y-3">
                  {analysis.entities.map((entity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getEntityColor(entity.label)}`}>
                          {entity.label}
                        </span>
                        <span className="text-gray-900 font-medium">{entity.text}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{ width: `${entity.confidence * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {(entity.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>هیچ موجودیتی شناسایی نشده</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'sentiment' && (
            <motion.div
              key="sentiment"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold text-gray-900">تحلیل احساسات</h3>
              
              <div className="space-y-4">
                {Object.entries(analysis.sentiment).map(([sentiment, value]) => (
                  <div key={sentiment} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {getSentimentLabel(sentiment)}
                      </span>
                      <span className={`text-sm font-semibold ${getSentimentColor(sentiment)}`}>
                        {(value * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          sentiment === 'positive' ? 'bg-green-500' :
                          sentiment === 'negative' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`}
                        style={{ width: `${value * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-gray-700">نتیجه کلی</span>
                </div>
                <p className="text-sm text-gray-600">
                  این سند با اطمینان {dominantSentiment[1].toFixed(2)} به عنوان 
                  <span className={`font-semibold ${getSentimentColor(dominantSentiment[0])}`}>
                    {' '}{getSentimentLabel(dominantSentiment[0])}{' '}
                  </span>
                  طبقه‌بندی شده است.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};