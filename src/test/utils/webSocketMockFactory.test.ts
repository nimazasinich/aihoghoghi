import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { webSocketMockFactory, createWebSocketMock } from './webSocketMockFactory';

/**
 * WebSocket Mock Factory Tests - Testing our WebSocket mock utilities
 */

describe('WebSocket Mock Factory', () => {
  let mockWebSocket: any;

  beforeEach(() => {
    webSocketMockFactory.cleanup(); // Clean up any existing mocks
    mockWebSocket = createWebSocketMock();
  });

  afterEach(() => {
    webSocketMockFactory.cleanup();
  });

  describe('WebSocket Creation', () => {
    it('should create WebSocket mock with default options', () => {
      expect(mockWebSocket).toBeDefined();
      expect(mockWebSocket.close).toBeDefined();
      expect(mockWebSocket.send).toBeDefined();
      expect(mockWebSocket.addEventListener).toBeDefined();
    });

    it('should create WebSocket mock with custom options', () => {
      const customMock = createWebSocketMock({
        readyState: 1,
        url: 'ws://custom-url',
        shouldConnect: false
      });

      expect(customMock.url).toBe('ws://custom-url');
      expect(customMock.readyState).toBe(1);
    });
  });

  describe('WebSocket Methods', () => {
    it('should handle close method', () => {
      mockWebSocket.close();
      expect(mockWebSocket.close).toHaveBeenCalled();
    });

    it('should handle send method', () => {
      mockWebSocket.send('test message');
      expect(mockWebSocket.send).toHaveBeenCalledWith('test message');
    });

    it('should handle addEventListener method', () => {
      const listener = () => {};
      mockWebSocket.addEventListener('message', listener);
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('message', listener);
    });
  });

  describe('WebSocket Events', () => {
    it('should simulate open event', () => {
      mockWebSocket.simulateOpen();
      expect(mockWebSocket.readyState).toBe(1);
    });

    it('should simulate message event', () => {
      const message = { type: 'test', data: 'test data' };
      mockWebSocket.simulateMessage(message);
      // Should not throw error
      expect(mockWebSocket).toBeDefined();
    });

    it('should simulate close event', () => {
      mockWebSocket.simulateClose();
      expect(mockWebSocket.readyState).toBe(3);
    });

    it('should simulate error event', () => {
      mockWebSocket.simulateError();
      // Should not throw error
      expect(mockWebSocket).toBeDefined();
    });
  });

  describe('WebSocket State', () => {
    it('should check connection state', () => {
      expect(mockWebSocket.isConnected()).toBe(true);
      expect(mockWebSocket.isConnecting()).toBe(false);
      expect(mockWebSocket.isClosed()).toBe(false);
    });

    it('should handle connection process', () => {
      mockWebSocket.connect();
      // Should not throw error
      expect(mockWebSocket).toBeDefined();
    });
  });

  describe('Factory Management', () => {
    it('should clean up all mocks', () => {
      const initialCount = webSocketMockFactory.getAllMocks().length;
      const mock1 = createWebSocketMock();
      const mock2 = createWebSocketMock();
      
      expect(webSocketMockFactory.getAllMocks()).toHaveLength(initialCount + 2);
      
      webSocketMockFactory.cleanup();
      
      expect(webSocketMockFactory.getAllMocks()).toHaveLength(0);
    });
  });
});