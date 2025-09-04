import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DocumentViewer } from './DocumentViewer';
import { persianTestUtils } from '../test/utils/persianTextMatchers';
import type { Document } from '../types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: () => <div data-testid="x-icon">X</div>,
  Download: () => <div data-testid="download-icon">Download</div>,
  Share2: () => <div data-testid="share-icon">Share</div>,
  Copy: () => <div data-testid="copy-icon">Copy</div>,
  ExternalLink: () => <div data-testid="external-link-icon">ExternalLink</div>,
  Tag: () => <div data-testid="tag-icon">Tag</div>,
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn().mockReturnValue('2 روز پیش')
}));

vi.mock('date-fns/locale', () => ({
  fa: {}
}));

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined)
  }
}));

// Mock navigator.share
Object.assign(navigator, {
  share: vi.fn().mockResolvedValue(undefined)
}));

describe('DocumentViewer Component', () => {
  const mockDocument: Document = {
    id: '1',
    title: 'قانون مدنی ایران',
    content: 'این قانون شامل مقررات مربوط به حقوق مدنی و قراردادها می‌باشد.',
    category: 'قانون مدنی',
    source: 'قوه قضائیه',
    url: 'https://example.com/law',
    date: '2024-01-15T10:30:00Z',
    confidence: 0.95,
    tags: ['حقوق', 'قانون', 'قرارداد'],
    summary: 'خلاصه قانون مدنی ایران'
  };

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDocumentViewer = (props = {}) => {
    const defaultProps = {
      document: mockDocument,
      onClose: mockOnClose,
      searchQuery: '',
      ...props
    };

    return render(<DocumentViewer {...defaultProps} />);
  };

  describe('Basic Rendering', () => {
    it('should render document title', () => {
      renderDocumentViewer();

      expect(screen.getByText('قانون مدنی ایران')).toBeInTheDocument();
    });

    it('should render document content', () => {
      renderDocumentViewer();

      expect(screen.getByText('این قانون شامل مقررات مربوط به حقوق مدنی و قراردادها می‌باشد.')).toBeInTheDocument();
    });

    it('should render document category', () => {
      renderDocumentViewer();

      expect(screen.getByText('قانون مدنی')).toBeInTheDocument();
    });

    it('should render document source', () => {
      renderDocumentViewer();

      expect(screen.getByText('قوه قضائیه')).toBeInTheDocument();
    });

    it('should render close button', () => {
      renderDocumentViewer();

      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });
  });

  describe('Persian Text Handling', () => {
    it('should display Persian text correctly', () => {
      renderDocumentViewer();

      const title = screen.getByText('قانون مدنی ایران');
      expect(title.textContent).toBeValidPersianText();
    });

    it('should have RTL direction for Persian content', () => {
      renderDocumentViewer();

      const content = screen.getByText('این قانون شامل مقررات مربوط به حقوق مدنی و قراردادها می‌باشد.');
      expect(content).toHaveStyle('direction: rtl');
    });

    it('should handle Persian search query highlighting', () => {
      renderDocumentViewer({ searchQuery: 'قانون' });

      const highlightedText = screen.getByText('قانون');
      expect(highlightedText).toHaveClass('bg-yellow-200');
    });
  });

  describe('Search Query Highlighting', () => {
    it('should highlight search query in content', () => {
      renderDocumentViewer({ searchQuery: 'قرارداد' });

      const highlightedText = screen.getByText('قرارداد');
      expect(highlightedText).toHaveClass('bg-yellow-200', 'px-1', 'rounded');
    });

    it('should not highlight if query is too short', () => {
      renderDocumentViewer({ searchQuery: 'ق' });

      const content = screen.getByText('این قانون شامل مقررات مربوط به حقوق مدنی و قراردادها می‌باشد.');
      expect(content).not.toHaveClass('bg-yellow-200');
    });

    it('should handle multiple occurrences of search query', () => {
      const documentWithMultipleOccurrences: Document = {
        ...mockDocument,
        content: 'قانون مدنی شامل مقررات قانونی است. این قانون مهم است.'
      };

      renderDocumentViewer({ 
        document: documentWithMultipleOccurrences,
        searchQuery: 'قانون'
      });

      const highlightedElements = screen.getAllByText('قانون');
      expect(highlightedElements).toHaveLength(2);
      highlightedElements.forEach(element => {
        expect(element).toHaveClass('bg-yellow-200');
      });
    });

    it('should escape special regex characters in search query', () => {
      renderDocumentViewer({ searchQuery: 'قانون (مدنی)' });

      // Should not throw error and should render normally
      expect(screen.getByText('قانون مدنی ایران')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render copy button', () => {
      renderDocumentViewer();

      expect(screen.getByTestId('copy-icon')).toBeInTheDocument();
    });

    it('should render download button', () => {
      renderDocumentViewer();

      expect(screen.getByTestId('download-icon')).toBeInTheDocument();
    });

    it('should render share button', () => {
      renderDocumentViewer();

      expect(screen.getByTestId('share-icon')).toBeInTheDocument();
    });

    it('should render external link button', () => {
      renderDocumentViewer();

      expect(screen.getByTestId('external-link-icon')).toBeInTheDocument();
    });
  });

  describe('Copy Functionality', () => {
    it('should copy document content to clipboard', async () => {
      renderDocumentViewer();

      const copyButton = screen.getByTestId('copy-icon').parentElement;
      fireEvent.click(copyButton!);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockDocument.content);
      });
    });

    it('should show copied feedback', async () => {
      renderDocumentViewer();

      const copyButton = screen.getByTestId('copy-icon').parentElement;
      fireEvent.click(copyButton!);

      await waitFor(() => {
        expect(screen.getByText('کپی شد!')).toBeInTheDocument();
      });
    });

    it('should handle copy error gracefully', async () => {
      navigator.clipboard.writeText = vi.fn().mockRejectedValue(new Error('Copy failed'));

      renderDocumentViewer();

      const copyButton = screen.getByTestId('copy-icon').parentElement;
      fireEvent.click(copyButton!);

      // Should not throw error
      expect(screen.getByText('قانون مدنی ایران')).toBeInTheDocument();
    });
  });

  describe('Share Functionality', () => {
    it('should share document when share button is clicked', async () => {
      renderDocumentViewer();

      const shareButton = screen.getByTestId('share-icon').parentElement;
      fireEvent.click(shareButton!);

      await waitFor(() => {
        expect(navigator.share).toHaveBeenCalledWith({
          title: mockDocument.title,
          text: mockDocument.summary,
          url: mockDocument.url
        });
      });
    });

    it('should handle share error gracefully', async () => {
      navigator.share = vi.fn().mockRejectedValue(new Error('Share failed'));

      renderDocumentViewer();

      const shareButton = screen.getByTestId('share-icon').parentElement;
      fireEvent.click(shareButton!);

      // Should not throw error
      expect(screen.getByText('قانون مدنی ایران')).toBeInTheDocument();
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', () => {
      renderDocumentViewer();

      const closeButton = screen.getByTestId('x-icon').parentElement;
      fireEvent.click(closeButton!);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when escape key is pressed', () => {
      renderDocumentViewer();

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Document Metadata', () => {
    it('should display document confidence score', () => {
      renderDocumentViewer();

      expect(screen.getByText('95%')).toBeInTheDocument();
    });

    it('should display document date', () => {
      renderDocumentViewer();

      expect(screen.getByText('2 روز پیش')).toBeInTheDocument();
    });

    it('should display document tags', () => {
      renderDocumentViewer();

      mockDocument.tags?.forEach(tag => {
        expect(screen.getByText(tag)).toBeInTheDocument();
      });
    });

    it('should display document summary', () => {
      renderDocumentViewer();

      expect(screen.getByText('خلاصه قانون مدنی ایران')).toBeInTheDocument();
    });
  });

  describe('External Link', () => {
    it('should open external link in new tab', () => {
      renderDocumentViewer();

      const externalLink = screen.getByTestId('external-link-icon').parentElement;
      expect(externalLink).toHaveAttribute('href', mockDocument.url);
      expect(externalLink).toHaveAttribute('target', '_blank');
      expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive layout classes', () => {
      renderDocumentViewer();

      const container = document.querySelector('.max-w-4xl');
      expect(container).toBeInTheDocument();
    });

    it('should have proper spacing and padding', () => {
      renderDocumentViewer();

      const content = document.querySelector('.p-6');
      expect(content).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderDocumentViewer();

      const closeButton = screen.getByTestId('x-icon').parentElement;
      expect(closeButton).toHaveAttribute('aria-label');
    });

    it('should be keyboard navigable', () => {
      renderDocumentViewer();

      const interactiveElements = document.querySelectorAll('button, a');
      interactiveElements.forEach(element => {
        expect(element).toHaveAttribute('tabindex');
      });
    });

    it('should have proper heading structure', () => {
      renderDocumentViewer();

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render within acceptable time', () => {
      const start = performance.now();
      renderDocumentViewer();
      const end = performance.now();

      expect(end - start).toBeLessThan(100);
    });

    it('should handle large content efficiently', () => {
      const largeDocument: Document = {
        ...mockDocument,
        content: 'متن طولانی '.repeat(1000)
      };

      const start = performance.now();
      renderDocumentViewer({ document: largeDocument });
      const end = performance.now();

      expect(end - start).toBeLessThan(500);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing document properties', () => {
      const incompleteDocument = {
        id: '1',
        title: 'قانون مدنی'
      } as Document;

      expect(() => {
        renderDocumentViewer({ document: incompleteDocument });
      }).not.toThrow();
    });

    it('should handle undefined search query', () => {
      expect(() => {
        renderDocumentViewer({ searchQuery: undefined });
      }).not.toThrow();
    });

    it('should handle null onClose callback', () => {
      expect(() => {
        renderDocumentViewer({ onClose: null as any });
      }).not.toThrow();
    });
  });
});