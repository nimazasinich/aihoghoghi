import { vi } from 'vitest';

export interface WebSocketMockOptions {
  readyState?: number;
  url?: string;
  protocol?: string;
  onOpen?: () => void;
  onMessage?: (event: MessageEvent) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
}

export class WebSocketMock {
  public readyState: number;
  public url: string;
  public protocol: string;
  public CONNECTING = WebSocket.CONNECTING;
  public OPEN = WebSocket.OPEN;
  public CLOSING = WebSocket.CLOSING;
  public CLOSED = WebSocket.CLOSED;
  
  public close = vi.fn();
  public send = vi.fn();
  public addEventListener = vi.fn();
  public removeEventListener = vi.fn();
  public dispatchEvent = vi.fn();
  
  private eventListeners: Map<string, Set<Function>> = new Map();
  private options: WebSocketMockOptions;
  
  constructor(url: string, protocol?: string, options: WebSocketMockOptions = {}) {
    this.url = url;
    this.protocol = protocol || '';
    this.options = options;
    this.readyState = options.readyState || WebSocket.CONNECTING;
    
    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.options.onOpen?.();
      this.triggerEvent('open', new Event('open'));
    }, 10);
  }
  
  private triggerEvent(type: string, event: Event) {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach(listener => {
        if (typeof listener === 'function') {
          listener(event);
        }
      });
    }
  }
  
  // Mock methods
  public mockMessage(data: string | ArrayBuffer | Blob) {
    const event = new MessageEvent('message', { data });
    this.options.onMessage?.(event);
    this.triggerEvent('message', event);
  }
  
  public mockClose(code?: number, reason?: string) {
    this.readyState = WebSocket.CLOSED;
    const event = new CloseEvent('close', { code, reason });
    this.options.onClose?.(event);
    this.triggerEvent('close', event);
  }
  
  public mockError() {
    this.readyState = WebSocket.CLOSED;
    const event = new Event('error');
    this.options.onError?.(event);
    this.triggerEvent('error', event);
  }
  
  public mockConnection() {
    this.readyState = WebSocket.OPEN;
    this.triggerEvent('open', new Event('open'));
  }
  
  public mockDisconnection() {
    this.readyState = WebSocket.CLOSED;
    this.triggerEvent('close', new CloseEvent('close'));
  }
}

// WebSocket mock factory
export const createWebSocketMock = (options: WebSocketMockOptions = {}) => {
  return new WebSocketMock('ws://localhost:8000/ws', undefined, options);
};

// WebSocket testing utilities
export const websocketTestUtils = {
  // Create a mock WebSocket for testing real-time features
  createMockWebSocket: (options: WebSocketMockOptions = {}) => {
    const mock = createWebSocketMock(options);
    
    // Mock the global WebSocket constructor
    vi.stubGlobal('WebSocket', vi.fn().mockImplementation((url, protocol) => {
      return new WebSocketMock(url, protocol, options);
    }));
    
    return mock;
  },
  
  // Simulate WebSocket connection states
  simulateConnectionStates: (mock: WebSocketMock) => {
    return {
      connecting: () => {
        mock.readyState = WebSocket.CONNECTING;
      },
      connected: () => {
        mock.readyState = WebSocket.OPEN;
        mock.mockConnection();
      },
      closing: () => {
        mock.readyState = WebSocket.CLOSING;
      },
      closed: () => {
        mock.readyState = WebSocket.CLOSED;
        mock.mockDisconnection();
      }
    };
  },
  
  // Simulate different types of messages
  simulateMessages: (mock: WebSocketMock) => {
    return {
      scrapingUpdate: (data: any) => {
        mock.mockMessage(JSON.stringify({
          type: 'scraping_update',
          data
        }));
      },
      
      documentProcessed: (data: any) => {
        mock.mockMessage(JSON.stringify({
          type: 'document_processed',
          data
        }));
      },
      
      systemStatus: (data: any) => {
        mock.mockMessage(JSON.stringify({
          type: 'system_status',
          data
        }));
      },
      
      error: (data: any) => {
        mock.mockMessage(JSON.stringify({
          type: 'error',
          data
        }));
      }
    };
  },
  
  // Test WebSocket event handling
  testEventHandling: (mock: WebSocketMock, eventType: string) => {
    const handler = vi.fn();
    mock.addEventListener(eventType, handler);
    
    return {
      handler,
      trigger: (event: Event) => {
        mock.triggerEvent(eventType, event);
      },
      verify: (expectedCalls: number) => {
        expect(handler).toHaveBeenCalledTimes(expectedCalls);
      }
    };
  }
};

// Real-time data simulation
export const realtimeDataSimulator = {
  // Simulate scraping status updates
  simulateScrapingStatus: (mock: WebSocketMock) => {
    const statuses = [
      { status: 'connecting', message: 'در حال اتصال به سرور' },
      { status: 'scraping', message: 'در حال جمع‌آوری اسناد' },
      { status: 'processing', message: 'در حال پردازش اسناد' },
      { status: 'completed', message: 'جمع‌آوری تکمیل شد' },
      { status: 'error', message: 'خطا در جمع‌آوری' }
    ];
    
    statuses.forEach((status, index) => {
      setTimeout(() => {
        websocketTestUtils.simulateMessages(mock).scrapingUpdate(status);
      }, index * 1000);
    });
  },
  
  // Simulate document processing updates
  simulateDocumentProcessing: (mock: WebSocketMock, documentCount = 10) => {
    for (let i = 1; i <= documentCount; i++) {
      setTimeout(() => {
        websocketTestUtils.simulateMessages(mock).documentProcessed({
          id: `doc_${i}`,
          title: `سند حقوقی ${i}`,
          status: 'processed',
          confidence: 0.9 + Math.random() * 0.1
        });
      }, i * 500);
    }
  },
  
  // Simulate system health updates
  simulateSystemHealth: (mock: WebSocketMock) => {
    const healthData = {
      status: 'healthy',
      uptime: '99.9%',
      activeConnections: Math.floor(Math.random() * 100),
      documentsProcessed: Math.floor(Math.random() * 1000),
      lastUpdate: new Date().toISOString()
    };
    
    setInterval(() => {
      websocketTestUtils.simulateMessages(mock).systemStatus(healthData);
    }, 5000);
  }
};