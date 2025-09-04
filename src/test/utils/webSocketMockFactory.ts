import { vi } from 'vitest';

/**
 * WebSocket Mock Factory - The most advanced WebSocket testing utilities ever created!
 * This factory creates realistic WebSocket mocks for testing real-time features.
 */

export interface WebSocketMockOptions {
  readyState?: number;
  url?: string;
  protocol?: string;
  onOpen?: () => void;
  onMessage?: (event: MessageEvent) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  shouldConnect?: boolean;
  connectionDelay?: number;
  messageDelay?: number;
}

export class WebSocketMockFactory {
  private static instance: WebSocketMockFactory;
  private mockInstances: Map<string, any> = new Map();
  
  static getInstance(): WebSocketMockFactory {
    if (!WebSocketMockFactory.instance) {
      WebSocketMockFactory.instance = new WebSocketMockFactory();
    }
    return WebSocketMockFactory.instance;
  }
  
  /**
   * Create a realistic WebSocket mock with full event handling
   */
  createWebSocketMock(options: WebSocketMockOptions = {}): any {
    const {
      readyState = WebSocket.CONNECTING,
      url = 'ws://localhost:8000/ws',
      protocol = '',
      onOpen,
      onMessage,
      onClose,
      onError,
      shouldConnect = true,
      connectionDelay = 100,
      messageDelay = 50
    } = options;
    
    const mockId = Math.random().toString(36).substr(2, 9);
    
    const mock = {
      id: mockId,
      url,
      protocol,
      readyState,
      CONNECTING: WebSocket.CONNECTING,
      OPEN: WebSocket.OPEN,
      CLOSING: WebSocket.CLOSING,
      CLOSED: WebSocket.CLOSED,
      
      // Mock methods
      close: vi.fn((code?: number, reason?: string) => {
        mock.readyState = WebSocket.CLOSING;
        setTimeout(() => {
          mock.readyState = WebSocket.CLOSED;
          if (onClose) {
            onClose(new CloseEvent('close', { code, reason }));
          }
        }, 10);
      }),
      
      send: vi.fn((data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
        if (mock.readyState !== WebSocket.OPEN) {
          // Don't throw error in tests, just log
          console.warn('WebSocket is not open');
          return;
        }
        
        // Simulate message processing delay
        setTimeout(() => {
          if (onMessage) {
            const event = new MessageEvent('message', { data });
            onMessage(event);
          }
        }, messageDelay);
      }),
      
      addEventListener: vi.fn((type: string, listener: EventListener) => {
        mock.listeners = mock.listeners || new Map();
        if (!mock.listeners.has(type)) {
          mock.listeners.set(type, []);
        }
        mock.listeners.get(type).push(listener);
      }),
      
      removeEventListener: vi.fn((type: string, listener: EventListener) => {
        if (mock.listeners && mock.listeners.has(type)) {
          const listeners = mock.listeners.get(type);
          const index = listeners.indexOf(listener);
          if (index > -1) {
            listeners.splice(index, 1);
          }
        }
      }),
      
      // Event simulation methods
      simulateOpen: () => {
        mock.readyState = WebSocket.OPEN;
        if (onOpen) {
          onOpen();
        }
        if (mock.listeners && mock.listeners.has('open')) {
          mock.listeners.get('open').forEach((listener: EventListener) => {
            listener(new Event('open'));
          });
        }
      },
      
      simulateMessage: (data: any) => {
        if (mock.listeners && mock.listeners.has('message')) {
          const event = new MessageEvent('message', { data: JSON.stringify(data) });
          mock.listeners.get('message').forEach((listener: EventListener) => {
            listener(event);
          });
        }
      },
      
      simulateClose: (code?: number, reason?: string) => {
        mock.readyState = WebSocket.CLOSED;
        if (mock.listeners && mock.listeners.has('close')) {
          const event = new CloseEvent('close', { code, reason });
          mock.listeners.get('close').forEach((listener: EventListener) => {
            listener(event);
          });
        }
      },
      
      simulateError: (error?: any) => {
        if (mock.listeners && mock.listeners.has('error')) {
          const event = new Event('error');
          mock.listeners.get('error').forEach((listener: EventListener) => {
            listener(event);
          });
        }
      },
      
      // Connection simulation
      connect: () => {
        mock.readyState = WebSocket.CONNECTING;
        setTimeout(() => {
          if (shouldConnect) {
            mock.simulateOpen();
          } else {
            mock.simulateError();
          }
        }, connectionDelay);
      },
      
      // Utility methods
      isConnected: () => mock.readyState === WebSocket.OPEN,
      isConnecting: () => mock.readyState === WebSocket.CONNECTING,
      isClosed: () => mock.readyState === WebSocket.CLOSED,
      
      // Store reference for cleanup
      listeners: new Map()
    };
    
    this.mockInstances.set(mockId, mock);
    
    // Auto-connect if shouldConnect is true
    if (shouldConnect) {
      mock.readyState = WebSocket.OPEN;
    }
    
    return mock;
  }
  
  /**
   * Create a mock for legal document updates
   */
  createLegalDocumentWebSocketMock(): any {
    return this.createWebSocketMock({
      onMessage: (event: MessageEvent) => {
        // Simulate legal document updates
        const data = JSON.parse(event.data);
        console.log('Legal document update received:', data);
      }
    });
  }
  
  /**
   * Create a mock for scraping status updates
   */
  createScrapingStatusWebSocketMock(): any {
    return this.createWebSocketMock({
      onMessage: (event: MessageEvent) => {
        // Simulate scraping status updates
        const data = JSON.parse(event.data);
        console.log('Scraping status update:', data);
      }
    });
  }
  
  /**
   * Create a mock for AI analysis updates
   */
  createAIAnalysisWebSocketMock(): any {
    return this.createWebSocketMock({
      onMessage: (event: MessageEvent) => {
        // Simulate AI analysis updates
        const data = JSON.parse(event.data);
        console.log('AI analysis update:', data);
      }
    });
  }
  
  /**
   * Clean up all mock instances
   */
  cleanup(): void {
    this.mockInstances.forEach(mock => {
      if (mock.close) {
        mock.close();
      }
    });
    this.mockInstances.clear();
  }
  
  /**
   * Get all active mock instances
   */
  getAllMocks(): any[] {
    return Array.from(this.mockInstances.values());
  }
}

// Export singleton instance
export const webSocketMockFactory = WebSocketMockFactory.getInstance();

// Export convenience functions
export const createWebSocketMock = (options?: WebSocketMockOptions) => 
  webSocketMockFactory.createWebSocketMock(options);

export const createLegalDocumentWebSocketMock = () => 
  webSocketMockFactory.createLegalDocumentWebSocketMock();

export const createScrapingStatusWebSocketMock = () => 
  webSocketMockFactory.createScrapingStatusWebSocketMock();

export const createAIAnalysisWebSocketMock = () => 
  webSocketMockFactory.createAIAnalysisWebSocketMock();

export default webSocketMockFactory;