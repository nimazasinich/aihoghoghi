/**
 * Comprehensive DocumentViewer Component Tests
 * Testing AI analysis display, Persian document rendering, and document interaction
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { DocumentViewer } from './DocumentViewer';
import { persianMatchers, persianTestData, persianUtils } from '../test/utils/persianMatchers';
import { createAIServiceMock, aiServiceMocks } from '../test/utils/aiServiceMock';
import { createDatabaseMock, mockData } from '../test/utils/databaseMock';

// Mock the document hook
const mockUseDocument = vi.fn();
vi.mock('../hooks/useDocument', () => ({
  useDocument: () => mockUseDocument()
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
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  FileText: () => <div data-testid="file-text-icon">FileText</div>,
  Download: () => <div data-testid="download-icon">Download</div>,
  Share: () => <div data-testid="share-icon">Share</div>,
  Bookmark: () => <div data-testid="bookmark-icon">Bookmark</div>,
  Eye: () => <div data-testid="eye-icon">Eye</div>,
  Brain: () => <div data-testid="brain-icon">Brain</div>,
  Tag: () => <div data-testid="tag-icon">Tag</div>,
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  User: () => <div data-testid="user-icon">User</div>
}));

describe('DocumentViewer Component - Comprehensive Tests', () => {
  let queryClient: QueryClient;
  let mockDatabase: any;
  let user: ReturnType<typeof userEvent.setup>;

  const mockDocument = {
    id: 'doc_001',
    title: 'قانون اساسی جمهوری اسلامی ایران',
    content: 'ماده ۱: حکومت ایران جمهوری اسلامی است که ملت ایران، بر اساس اعتقاد دیرینه اش به حکومت حق و عدل قرآن، در پی انقلاب اسلامی پیروزمند خود به رهبری مرجع عالیقدر تقلید آیت الله العظمی امام خمینی، در همه پرسی دهم و یازدهم فروردین ماه یک هزار و سیصد و پنجاه و هشت هجری شمسی برابر با اول و دوم جمادی الاولی سال یک هزار و سیصد و نود و نه هجری قمری با اکثریت ۲/۹۸ درصد کلیه کسانی که حق رأی داشتند، به آن رأی مثبت داد.',
    category: 'قانون اساسی',
    source: 'قوه قضائیه',
    url: 'https://example.com/constitution',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    metadata: {
      language: 'fa',
      confidence: 0.95,
      tags: ['قانون اساسی', 'جمهوری اسلامی', 'ایران'],
      entities: [
        { text: 'جمهوری اسلامی ایران', type: 'COUNTRY', confidence: 0.98 },
        { text: 'قانون اساسی', type: 'LEGAL_DOCUMENT', confidence: 0.95 }
      ]
    }
  };

  const mockAIAnalysis = {
    category: 'قانون اساسی',
    confidence: 0.95,
    summary: 'مستند مربوط به قانون اساسی جمهوری اسلامی ایران',
    keywords: ['قانون اساسی', 'جمهوری اسلامی', 'ایران', 'ماده'],
    entities: [
      { text: 'جمهوری اسلامی ایران', type: 'COUNTRY', confidence: 0.98 },
      { text: 'قانون اساسی', type: 'LEGAL_DOCUMENT', confidence: 0.95 }
    ],
    legal_terms: ['ماده', 'بند', 'تبصره', 'قانون'],
    sentiment: 'neutral'
  };

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
    mockUseDocument.mockReturnValue({
      document: mockDocument,
      isLoading: false,
      error: null,
      aiAnalysis: mockAIAnalysis,
      isAnalyzing: false,
      analyzeDocument: vi.fn(),
      downloadDocument: vi.fn(),
      shareDocument: vi.fn(),
      bookmarkDocument: vi.fn()
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderDocumentViewer = (documentId: string = 'doc_001') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <DocumentViewer documentId={documentId} />
      </QueryClientProvider>
    );
  };

  describe('Basic Rendering', () => {
    it('should render document title in Persian', () => {
      renderDocumentViewer();
      
      const title = screen.getByText('قانون اساسی جمهوری اسلامی ایران');
      expect(title).toBeInTheDocument();
      expect(title).toContainPersian();
    });

    it('should render document content in Persian', () => {
      renderDocumentViewer();
      
      const content = screen.getByText(/ماده ۱: حکومت ایران جمهوری اسلامی است/i);
      expect(content).toBeInTheDocument();
      expect(content).toContainPersian();
    });

    it('should display document metadata', () => {
      renderDocumentViewer();
      
      expect(screen.getByText('قانون اساسی')).toBeInTheDocument(); // category
      expect(screen.getByText('قوه قضائیه')).toBeInTheDocument(); // source
      expect(screen.getByText('95%')).toBeInTheDocument(); // confidence
    });

    it('should render action buttons', () => {
      renderDocumentViewer();
      
      expect(screen.getByRole('button', { name: /دانلود/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /اشتراک/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /نشان/i })).toBeInTheDocument();
    });
  });

  describe('Persian Text Rendering', () => {
    it('should handle RTL text direction correctly', () => {
      renderDocumentViewer();
      
      const documentContent = screen.getByTestId('document-content') || screen.getByText(/ماده ۱:/);
      expect(documentContent).toHaveAttribute('dir', 'rtl');
      expect(documentContent).toHaveAttribute('lang', 'fa');
    });

    it('should display Persian legal terms correctly', () => {
      renderDocumentViewer();
      
      const legalTerms = ['ماده', 'قانون اساسی', 'جمهوری اسلامی'];
      
      legalTerms.forEach(term => {
        expect(screen.getByText(new RegExp(term))).toBeInTheDocument();
        expect(term).toContainLegalTerms();
      });
    });

    it('should handle Persian numbers correctly', () => {
      renderDocumentViewer();
      
      // Check for Persian numbers in the document
      const persianNumbers = ['۱', '۲', '۳'];
      persianNumbers.forEach(number => {
        if (screen.queryByText(new RegExp(number))) {
          expect(screen.getByText(new RegExp(number))).toBeInTheDocument();
        }
      });
    });

    it('should normalize Persian text properly', () => {
      renderDocumentViewer();
      
      const content = screen.getByText(/ماده ۱:/);
      const normalizedContent = persianUtils.normalizePersian(content.textContent || '');
      
      expect(normalizedContent).toBePersianNormalized();
    });
  });

  describe('AI Analysis Display', () => {
    it('should display AI analysis results', () => {
      renderDocumentViewer();
      
      expect(screen.getByText('تحلیل هوش مصنوعی')).toBeInTheDocument();
      expect(screen.getByText('قانون اساسی')).toBeInTheDocument(); // category
      expect(screen.getByText('95%')).toBeInTheDocument(); // confidence
    });

    it('should display AI-generated summary', () => {
      renderDocumentViewer();
      
      const summary = screen.getByText('مستند مربوط به قانون اساسی جمهوری اسلامی ایران');
      expect(summary).toBeInTheDocument();
      expect(summary).toContainPersian();
    });

    it('should display extracted keywords', () => {
      renderDocumentViewer();
      
      const keywords = ['قانون اساسی', 'جمهوری اسلامی', 'ایران', 'ماده'];
      
      keywords.forEach(keyword => {
        expect(screen.getByText(new RegExp(keyword))).toBeInTheDocument();
        expect(keyword).toContainPersian();
      });
    });

    it('should display extracted entities', () => {
      renderDocumentViewer();
      
      expect(screen.getByText('جمهوری اسلامی ایران')).toBeInTheDocument();
      expect(screen.getByText('قانون اساسی')).toBeInTheDocument();
    });

    it('should display legal terms', () => {
      renderDocumentViewer();
      
      const legalTerms = ['ماده', 'بند', 'تبصره', 'قانون'];
      
      legalTerms.forEach(term => {
        expect(screen.getByText(new RegExp(term))).toBeInTheDocument();
        expect(term).toContainLegalTerms();
      });
    });

    it('should show analysis confidence score', () => {
      renderDocumentViewer();
      
      const confidenceElement = screen.getByText('95%');
      expect(confidenceElement).toBeInTheDocument();
    });

    it('should display sentiment analysis', () => {
      renderDocumentViewer();
      
      const sentimentElement = screen.getByText('خنثی');
      expect(sentimentElement).toBeInTheDocument();
      expect(sentimentElement).toContainPersian();
    });
  });

  describe('AI Analysis Interaction', () => {
    it('should trigger AI analysis on demand', async () => {
      const mockAnalyzeDocument = vi.fn();
      
      mockUseDocument.mockReturnValue({
        document: mockDocument,
        isLoading: false,
        error: null,
        aiAnalysis: null,
        isAnalyzing: false,
        analyzeDocument: mockAnalyzeDocument,
        downloadDocument: vi.fn(),
        shareDocument: vi.fn(),
        bookmarkDocument: vi.fn()
      });

      renderDocumentViewer();
      
      const analyzeButton = screen.getByRole('button', { name: /تحلیل هوش مصنوعی/i });
      await user.click(analyzeButton);
      
      expect(mockAnalyzeDocument).toHaveBeenCalledWith('doc_001');
    });

    it('should show loading state during AI analysis', () => {
      mockUseDocument.mockReturnValue({
        document: mockDocument,
        isLoading: false,
        error: null,
        aiAnalysis: null,
        isAnalyzing: true,
        analyzeDocument: vi.fn(),
        downloadDocument: vi.fn(),
        shareDocument: vi.fn(),
        bookmarkDocument: vi.fn()
      });

      renderDocumentViewer();
      
      const loadingIndicator = screen.getByText(/در حال تحلیل/i);
      expect(loadingIndicator).toBeInTheDocument();
      expect(loadingIndicator).toContainPersian();
    });

    it('should handle AI analysis errors', () => {
      mockUseDocument.mockReturnValue({
        document: mockDocument,
        isLoading: false,
        error: null,
        aiAnalysis: null,
        isAnalyzing: false,
        analyzeDocument: vi.fn(),
        downloadDocument: vi.fn(),
        shareDocument: vi.fn(),
        bookmarkDocument: vi.fn(),
        analysisError: 'خطا در تحلیل هوش مصنوعی'
      });

      renderDocumentViewer();
      
      const errorMessage = screen.getByText(/خطا در تحلیل هوش مصنوعی/i);
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toContainPersian();
    });
  });

  describe('Document Actions', () => {
    it('should download document', async () => {
      const mockDownloadDocument = vi.fn();
      
      mockUseDocument.mockReturnValue({
        document: mockDocument,
        isLoading: false,
        error: null,
        aiAnalysis: mockAIAnalysis,
        isAnalyzing: false,
        analyzeDocument: vi.fn(),
        downloadDocument: mockDownloadDocument,
        shareDocument: vi.fn(),
        bookmarkDocument: vi.fn()
      });

      renderDocumentViewer();
      
      const downloadButton = screen.getByRole('button', { name: /دانلود/i });
      await user.click(downloadButton);
      
      expect(mockDownloadDocument).toHaveBeenCalledWith('doc_001');
    });

    it('should share document', async () => {
      const mockShareDocument = vi.fn();
      
      mockUseDocument.mockReturnValue({
        document: mockDocument,
        isLoading: false,
        error: null,
        aiAnalysis: mockAIAnalysis,
        isAnalyzing: false,
        analyzeDocument: vi.fn(),
        downloadDocument: vi.fn(),
        shareDocument: mockShareDocument,
        bookmarkDocument: vi.fn()
      });

      renderDocumentViewer();
      
      const shareButton = screen.getByRole('button', { name: /اشتراک/i });
      await user.click(shareButton);
      
      expect(mockShareDocument).toHaveBeenCalledWith('doc_001');
    });

    it('should bookmark document', async () => {
      const mockBookmarkDocument = vi.fn();
      
      mockUseDocument.mockReturnValue({
        document: mockDocument,
        isLoading: false,
        error: null,
        aiAnalysis: mockAIAnalysis,
        isAnalyzing: false,
        analyzeDocument: vi.fn(),
        downloadDocument: vi.fn(),
        shareDocument: vi.fn(),
        bookmarkDocument: mockBookmarkDocument
      });

      renderDocumentViewer();
      
      const bookmarkButton = screen.getByRole('button', { name: /نشان/i });
      await user.click(bookmarkButton);
      
      expect(mockBookmarkDocument).toHaveBeenCalledWith('doc_001');
    });
  });

  describe('Document Loading States', () => {
    it('should show loading state', () => {
      mockUseDocument.mockReturnValue({
        document: null,
        isLoading: true,
        error: null,
        aiAnalysis: null,
        isAnalyzing: false,
        analyzeDocument: vi.fn(),
        downloadDocument: vi.fn(),
        shareDocument: vi.fn(),
        bookmarkDocument: vi.fn()
      });

      renderDocumentViewer();
      
      const loadingIndicator = screen.getByText(/در حال بارگذاری/i);
      expect(loadingIndicator).toBeInTheDocument();
      expect(loadingIndicator).toContainPersian();
    });

    it('should handle document not found error', () => {
      mockUseDocument.mockReturnValue({
        document: null,
        isLoading: false,
        error: 'مستند یافت نشد',
        aiAnalysis: null,
        isAnalyzing: false,
        analyzeDocument: vi.fn(),
        downloadDocument: vi.fn(),
        shareDocument: vi.fn(),
        bookmarkDocument: vi.fn()
      });

      renderDocumentViewer();
      
      const errorMessage = screen.getByText(/مستند یافت نشد/i);
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toContainPersian();
    });

    it('should handle network error', () => {
      mockUseDocument.mockReturnValue({
        document: null,
        isLoading: false,
        error: 'خطا در اتصال به سرور',
        aiAnalysis: null,
        isAnalyzing: false,
        analyzeDocument: vi.fn(),
        downloadDocument: vi.fn(),
        shareDocument: vi.fn(),
        bookmarkDocument: vi.fn()
      });

      renderDocumentViewer();
      
      const errorMessage = screen.getByText(/خطا در اتصال به سرور/i);
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toContainPersian();
    });
  });

  describe('Document Metadata Display', () => {
    it('should display document creation date', () => {
      renderDocumentViewer();
      
      const dateElement = screen.getByText(/۲۰۲۴/i);
      expect(dateElement).toBeInTheDocument();
    });

    it('should display document source', () => {
      renderDocumentViewer();
      
      const sourceElement = screen.getByText('قوه قضائیه');
      expect(sourceElement).toBeInTheDocument();
      expect(sourceElement).toContainPersian();
    });

    it('should display document category', () => {
      renderDocumentViewer();
      
      const categoryElement = screen.getByText('قانون اساسی');
      expect(categoryElement).toBeInTheDocument();
      expect(categoryElement).toContainPersian();
    });

    it('should display document tags', () => {
      renderDocumentViewer();
      
      const tags = ['قانون اساسی', 'جمهوری اسلامی', 'ایران'];
      
      tags.forEach(tag => {
        expect(screen.getByText(new RegExp(tag))).toBeInTheDocument();
        expect(tag).toContainPersian();
      });
    });
  });

  describe('Performance Testing', () => {
    it('should render large documents efficiently', () => {
      const largeDocument = {
        ...mockDocument,
        content: 'ماده ۱: ' + 'حکومت ایران جمهوری اسلامی است. '.repeat(1000)
      };

      mockUseDocument.mockReturnValue({
        document: largeDocument,
        isLoading: false,
        error: null,
        aiAnalysis: mockAIAnalysis,
        isAnalyzing: false,
        analyzeDocument: vi.fn(),
        downloadDocument: vi.fn(),
        shareDocument: vi.fn(),
        bookmarkDocument: vi.fn()
      });

      const startTime = performance.now();
      renderDocumentViewer();
      const endTime = performance.now();
      
      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(500); // Should render within 500ms
    });

    it('should handle rapid AI analysis requests', async () => {
      const mockAnalyzeDocument = vi.fn();
      
      mockUseDocument.mockReturnValue({
        document: mockDocument,
        isLoading: false,
        error: null,
        aiAnalysis: null,
        isAnalyzing: false,
        analyzeDocument: mockAnalyzeDocument,
        downloadDocument: vi.fn(),
        shareDocument: vi.fn(),
        bookmarkDocument: vi.fn()
      });

      renderDocumentViewer();
      
      const analyzeButton = screen.getByRole('button', { name: /تحلیل هوش مصنوعی/i });
      
      // Rapid clicks
      for (let i = 0; i < 5; i++) {
        await user.click(analyzeButton);
      }
      
      // Should only call once due to debouncing
      expect(mockAnalyzeDocument).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderDocumentViewer();
      
      const documentViewer = screen.getByRole('main') || screen.getByTestId('document-viewer');
      expect(documentViewer).toHaveAttribute('aria-label', /مشاهده مستند/i);
    });

    it('should support keyboard navigation', async () => {
      renderDocumentViewer();
      
      const downloadButton = screen.getByRole('button', { name: /دانلود/i });
      
      // Test keyboard navigation
      await user.tab();
      expect(downloadButton).toHaveFocus();
      
      await user.keyboard('{Enter}');
    });

    it('should have proper heading structure', () => {
      renderDocumentViewer();
      
      const title = screen.getByRole('heading', { level: 1 });
      expect(title).toBeInTheDocument();
      expect(title).toContainPersian();
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

      renderDocumentViewer();
      
      const title = screen.getByText('قانون اساسی جمهوری اسلامی ایران');
      expect(title).toBeInTheDocument();
    });

    it('should handle touch interactions', async () => {
      renderDocumentViewer();
      
      const downloadButton = screen.getByRole('button', { name: /دانلود/i });
      
      // Simulate touch events
      fireEvent.touchStart(downloadButton);
      fireEvent.touchEnd(downloadButton);
      
      expect(downloadButton).toBeInTheDocument();
    });
  });

  describe('Integration with Legal Archive System', () => {
    it('should display legal document structure correctly', () => {
      renderDocumentViewer();
      
      // Check for legal document elements
      expect(screen.getByText(/ماده ۱:/)).toBeInTheDocument();
      expect(screen.getByText(/قانون اساسی/)).toBeInTheDocument();
    });

    it('should handle different legal document types', () => {
      const civilLawDocument = {
        ...mockDocument,
        title: 'ماده ۱ قانون مدنی',
        category: 'قانون مدنی',
        content: 'مصوبات مجلس شورای اسلامی پس از طی مراحل قانونی به رئیس جمهور ابلاغ می\u200cگردد...'
      };

      mockUseDocument.mockReturnValue({
        document: civilLawDocument,
        isLoading: false,
        error: null,
        aiAnalysis: {
          ...mockAIAnalysis,
          category: 'قانون مدنی'
        },
        isAnalyzing: false,
        analyzeDocument: vi.fn(),
        downloadDocument: vi.fn(),
        shareDocument: vi.fn(),
        bookmarkDocument: vi.fn()
      });

      renderDocumentViewer();
      
      expect(screen.getByText('ماده ۱ قانون مدنی')).toBeInTheDocument();
      expect(screen.getByText('قانون مدنی')).toBeInTheDocument();
    });
  });
});