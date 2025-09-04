/**
 * WebSocket Mock Factory
 * Comprehensive WebSocket testing utilities for real-time features
 */

import { vi } from 'vitest';

export interface WebSocketMockOptions {
  readyState?: number;
  url?: string;
  protocols?: string | string[];
  autoConnect?: boolean;
  messageDelay?: number;
  errorOnConnect?: boolean;
  closeAfterMessages?: number;
}

export interface MockMessage {
  type: string;
  data: any;
  timestamp: number;
}

export class WebSocketMock {
  public readyState: number;
  public url: string;
  public protocols: string | string[];
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  
  private messageQueue: MockMessage[] = [];
  private messageCount = 0;
  private options: WebSocketMockOptions;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(url: string, protocols?: string | string[], options: WebSocketMockOptions = {}) {
    this.url = url;
    this.protocols = protocols || [];
    this.options = {
      readyState: WebSocket.CONNECTING,
      autoConnect: true,
      messageDelay: 100,
      errorOnConnect: false,
      closeAfterMessages: 0,
      ...options
    };
    this.readyState = this.options.readyState!;

    if (this.options.autoConnect) {
      setTimeout(() => this.connect(), 0);
    }
  }

  private connect(): void {
    if (this.options.errorOnConnect) {
      this.readyState = WebSocket.CLOSED;
      this.onerror?.(new Event('error'));
      return;
    }

    this.readyState = WebSocket.OPEN;
    this.onopen?.(new Event('open'));
    
    // Start processing message queue
    this.startMessageProcessing();
  }

  private startMessageProcessing(): void {
    if (this.intervalId) return;
    
    this.intervalId = setInterval(() => {
      if (this.messageQueue.length > 0 && this.readyState === WebSocket.OPEN) {
        const message = this.messageQueue.shift()!;
        this.messageCount++;
        
        const event = new MessageEvent('message', {
          data: JSON.stringify(message.data),
          origin: this.url
        });
        
        this.onmessage?.(event);
        
        // Auto-close after specified number of messages
        if (this.options.closeAfterMessages && this.messageCount >= this.options.closeAfterMessages) {
          this.close();
        }
      }
    }, this.options.messageDelay);
  }

  public send(data: string | ArrayBuffer | Blob): void {
    if (this.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    
    // Mock sending data
    console.log('WebSocket mock send:', data);
  }

  public close(code?: number, reason?: string): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.readyState = WebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close', { code, reason }));
  }

  // Mock-specific methods for testing
  public mockMessage(type: string, data: any): void {
    this.messageQueue.push({
      type,
      data,
      timestamp: Date.now()
    });
  }

  public mockError(): void {
    this.onerror?.(new Event('error'));
  }

  public mockClose(code?: number, reason?: string): void {
    this.close(code, reason);
  }

  public getMessageCount(): number {
    return this.messageCount;
  }

  public getQueuedMessageCount(): number {
    return this.messageQueue.length;
  }

  public clearQueue(): void {
    this.messageQueue = [];
  }
}

// WebSocket factory for creating mocks
export const createWebSocketMock = (options: WebSocketMockOptions = {}): WebSocketMock => {
  return new WebSocketMock('ws://localhost:8080', undefined, options);
};

// Mock WebSocket class for global replacement
export const mockWebSocket = (options: WebSocketMockOptions = {}) => {
  const MockWebSocket = vi.fn().mockImplementation((url: string, protocols?: string | string[]) => {
    return new WebSocketMock(url, protocols, options);
  });

  // Copy static properties
  MockWebSocket.CONNECTING = WebSocket.CONNECTING;
  MockWebSocket.OPEN = WebSocket.OPEN;
  MockWebSocket.CLOSING = WebSocket.CLOSING;
  MockWebSocket.CLOSED = WebSocket.CLOSED;

  return MockWebSocket;
};

// WebSocket test scenarios
export const websocketScenarios = {
  // Successful connection and message flow
  successfulConnection: () => createWebSocketMock({
    autoConnect: true,
    messageDelay: 50
  }),

  // Connection with errors
  connectionWithErrors: () => createWebSocketMock({
    autoConnect: true,
    errorOnConnect: true
  }),

  // Slow connection
  slowConnection: () => createWebSocketMock({
    autoConnect: true,
    messageDelay: 1000
  }),

  // Auto-closing connection
  autoClosingConnection: () => createWebSocketMock({
    autoConnect: true,
    closeAfterMessages: 3
  }),

  // Manual connection (no auto-connect)
  manualConnection: () => createWebSocketMock({
    autoConnect: false
  })
};

// WebSocket message templates for legal archive system
export const legalArchiveMessages = {
  // Document processing updates
  documentProcessing: (documentId: string, status: string, progress: number) => ({
    type: 'document_processing',
    data: {
      documentId,
      status,
      progress,
      timestamp: Date.now()
    }
  }),

  // Search results updates
  searchResults: (query: string, results: any[], total: number) => ({
    type: 'search_results',
    data: {
      query,
      results,
      total,
      timestamp: Date.now()
    }
  }),

  // System status updates
  systemStatus: (status: string, metrics: any) => ({
    type: 'system_status',
    data: {
      status,
      metrics,
      timestamp: Date.now()
    }
  }),

  // AI analysis updates
  aiAnalysis: (documentId: string, analysis: any) => ({
    type: 'ai_analysis',
    data: {
      documentId,
      analysis,
      timestamp: Date.now()
    }
  }),

  // Scraping status updates
  scrapingStatus: (source: string, status: string, count: number) => ({
    type: 'scraping_status',
    data: {
      source,
      status,
      count,
      timestamp: Date.now()
    }
  }),

  // User notifications
  notification: (type: string, message: string, data?: any) => ({
    type: 'notification',
    data: {
      type,
      message,
      data,
      timestamp: Date.now()
    }
  })
};

// WebSocket testing utilities
export const websocketUtils = {
  // Wait for WebSocket to be ready
  waitForConnection: (ws: WebSocketMock, timeout = 5000): Promise<void> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, timeout);

      if (ws.readyState === WebSocket.OPEN) {
        clearTimeout(timer);
        resolve();
        return;
      }

      const originalOnOpen = ws.onopen;
      ws.onopen = (event) => {
        clearTimeout(timer);
        originalOnOpen?.(event);
        resolve();
      };
    });
  },

  // Wait for specific message type
  waitForMessage: (ws: WebSocketMock, messageType: string, timeout = 5000): Promise<any> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for message type: ${messageType}`));
      }, timeout);

      const originalOnMessage = ws.onmessage;
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === messageType) {
            clearTimeout(timer);
            originalOnMessage?.(event);
            resolve(data);
            return;
          }
        } catch (error) {
          // Continue waiting
        }
        originalOnMessage?.(event);
      };
    });
  },

  // Simulate network interruption
  simulateNetworkInterruption: (ws: WebSocketMock, duration = 2000): void => {
    ws.mockError();
    setTimeout(() => {
      // Simulate reconnection
      ws.readyState = WebSocket.OPEN;
      ws.onopen?.(new Event('open'));
    }, duration);
  },

  // Generate realistic message sequence for legal archive
  generateLegalArchiveSequence: (ws: WebSocketMock): void => {
    // Simulate document processing
    ws.mockMessage('document_processing', {
      documentId: 'doc_123',
      status: 'processing',
      progress: 25
    });

    setTimeout(() => {
      ws.mockMessage('document_processing', {
        documentId: 'doc_123',
        status: 'processing',
        progress: 50
      });
    }, 100);

    setTimeout(() => {
      ws.mockMessage('document_processing', {
        documentId: 'doc_123',
        status: 'completed',
        progress: 100
      });
    }, 200);

    setTimeout(() => {
      ws.mockMessage('ai_analysis', {
        documentId: 'doc_123',
        analysis: {
          category: 'قانون مدنی',
          confidence: 0.95,
          summary: 'ماده مربوط به حقوق مدنی'
        }
      });
    }, 300);
  }
};

// Cleanup utility
export const cleanupWebSocketMocks = (): void => {
  // Clean up any global WebSocket mocks
  vi.restoreAllMocks();
};