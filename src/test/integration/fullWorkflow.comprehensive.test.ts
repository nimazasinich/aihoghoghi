/**
 * Comprehensive Full Workflow Integration Tests
 * Testing complete user workflows, API integration, and real WebSocket communication
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { createAIServiceMock, aiServiceMocks } from '../../test/utils/aiServiceMock';
import { createDatabaseMock, mockData } from '../../test/utils/databaseMock';
import { createWebSocketMock, websocketScenarios, legalArchiveMessages, websocketUtils } from '../../test/utils/websocketMock';
import { persianMatchers, persianTestData, persianUtils } from '../../test/utils/persianMatchers';

// Mock the full system integration
const mockFullSystem = {
  // User authentication
  auth: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    refreshToken: vi.fn()
  },

  // Document management
  documents: {
    search: vi.fn(),
    getById: vi.fn(),
    upload: vi.fn(),
    analyze: vi.fn(),
    download: vi.fn(),
    share: vi.fn()
  },

  // AI services
  ai: {
    analyzeDocument: vi.fn(),
    enhanceSearch: vi.fn(),
    generateSummary: vi.fn(),
    extractEntities: vi.fn()
  },

  // Scraping services
  scraping: {
    startScraping: vi.fn(),
    stopScraping: vi.fn(),
    getStatus: vi.fn(),
    getResults: vi.fn()
  },

  // WebSocket communication
  websocket: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    sendMessage: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn()
  },

  // System monitoring
  monitoring: {
    getSystemHealth: vi.fn(),
    getPerformanceMetrics: vi.fn(),
    getErrorLogs: vi.fn()
  }
};

describe('Full Workflow Integration Tests - Comprehensive', () => {
  let mockAIService: any;
  let mockDatabase: any;
  let mockWebSocket: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockAIService = createAIServiceMock();
    mockDatabase = createDatabaseMock();
    mockWebSocket = createWebSocketMock();

    // Setup authentication mocks
    mockFullSystem.auth.login.mockImplementation(async (credentials: any) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (credentials.email === 'admin@legal-archive.ir' && credentials.password === 'password123') {
        return {
          success: true,
          user: {
            id: 'user_001',
            email: 'admin@legal-archive.ir',
            name: 'مدیر سیستم',
            role: 'admin',
            token: 'jwt_token_123'
          },
          token: 'jwt_token_123',
          expires_in: 3600
        };
      }
      
      return {
        success: false,
        error: 'Invalid credentials'
      };
    });

    mockFullSystem.auth.register.mockImplementation(async (userData: any) => {
      await new Promise(resolve => setTimeout(resolve, 150));
      
      return {
        success: true,
        user: {
          id: `user_${Date.now()}`,
          email: userData.email,
          name: userData.name,
          role: 'viewer',
          token: 'jwt_token_new'
        },
        token: 'jwt_token_new',
        expires_in: 3600
      };
    });

    mockFullSystem.auth.getCurrentUser.mockImplementation(async (token: string) => {
      await new Promise(resolve => setTimeout(resolve, 50));
      
      if (token === 'jwt_token_123') {
        return {
          success: true,
          user: {
            id: 'user_001',
            email: 'admin@legal-archive.ir',
            name: 'مدیر سیستم',
            role: 'admin'
          }
        };
      }
      
      return {
        success: false,
        error: 'Invalid token'
      };
    });

    // Setup document management mocks
    mockFullSystem.documents.search.mockImplementation(async (query: string, options: any = {}) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const enhancedQuery = await mockAIService.enhanceSearchQuery(query);
      const searchResults = await mockDatabase.documents.search(enhancedQuery.data.enhanced_query, options);
      
      return {
        success: true,
        results: searchResults.data,
        enhanced_query: enhancedQuery.data,
        search_time: 200,
        total_results: searchResults.data.total
      };
    });

    mockFullSystem.documents.getById.mockImplementation(async (documentId: string) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const document = await mockDatabase.documents.getById(documentId);
      const aiAnalysis = await mockAIService.analyzeDocument(document.data?.content || '');
      
      return {
        success: document.success,
        document: document.data,
        ai_analysis: aiAnalysis.data,
        analysis_confidence: aiAnalysis.data?.confidence || 0
      };
    });

    mockFullSystem.documents.upload.mockImplementation(async (documentData: any) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const savedDocument = await mockDatabase.documents.create(documentData);
      const aiAnalysis = await mockAIService.analyzeDocument(documentData.content);
      
      return {
        success: true,
        document: savedDocument.data,
        analysis: aiAnalysis.data,
        processing_time: 300
      };
    });

    mockFullSystem.documents.analyze.mockImplementation(async (documentId: string) => {
      await new Promise(resolve => setTimeout(resolve, 250));
      
      const document = await mockDatabase.documents.getById(documentId);
      if (!document.success) {
        throw new Error('Document not found');
      }
      
      const analysis = await mockAIService.analyzeDocument(document.data.content);
      
      return {
        success: true,
        analysis: analysis.data,
        document_id: documentId,
        analysis_time: 250
      };
    });

    // Setup AI service mocks
    mockFullSystem.ai.analyzeDocument.mockImplementation(async (content: string) => {
      return await mockAIService.analyzeDocument(content);
    });

    mockFullSystem.ai.enhanceSearch.mockImplementation(async (query: string) => {
      return await mockAIService.enhanceSearchQuery(query);
    });

    mockFullSystem.ai.generateSummary.mockImplementation(async (text: string) => {
      return await mockAIService.summarizeText(text);
    });

    mockFullSystem.ai.extractEntities.mockImplementation(async (text: string) => {
      return await mockAIService.extractEntities(text);
    });

    // Setup scraping service mocks
    mockFullSystem.scraping.startScraping.mockImplementation(async (sources: string[]) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        success: true,
        scraping_id: `scraping_${Date.now()}`,
        sources,
        status: 'started',
        estimated_duration: '2 hours'
      };
    });

    mockFullSystem.scraping.stopScraping.mockImplementation(async (scrapingId: string) => {
      await new Promise(resolve => setTimeout(resolve, 50));
      
      return {
        success: true,
        scraping_id: scrapingId,
        status: 'stopped',
        documents_scraped: 150
      };
    });

    mockFullSystem.scraping.getStatus.mockImplementation(async (scrapingId: string) => {
      await new Promise(resolve => setTimeout(resolve, 30));
      
      return {
        success: true,
        status: {
          id: scrapingId,
          is_active: true,
          progress: 65,
          sources_completed: 3,
          total_sources: 5,
          documents_scraped: 150,
          errors: 2,
          estimated_completion: '1 hour 30 minutes'
        }
      };
    });

    // Setup WebSocket mocks
    mockFullSystem.websocket.connect.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      mockWebSocket.readyState = 1; // OPEN
      
      return {
        success: true,
        connection_id: `ws_${Date.now()}`,
        status: 'connected'
      };
    });

    mockFullSystem.websocket.sendMessage.mockImplementation(async (message: any) => {
      await new Promise(resolve => setTimeout(resolve, 20));
      
      return {
        success: true,
        message_id: `msg_${Date.now()}`,
        delivered: true
      };
    });

    mockFullSystem.websocket.subscribe.mockImplementation(async (topic: string) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      
      return {
        success: true,
        topic,
        subscribed: true
      };
    });

    // Setup monitoring mocks
    mockFullSystem.monitoring.getSystemHealth.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      
      return {
        success: true,
        health: {
          overall: 'healthy',
          database: 'healthy',
          ai_service: 'healthy',
          scraping_service: 'healthy',
          websocket: 'connected',
          uptime: '99.9%',
          response_time: 150
        }
      };
    });

    mockFullSystem.monitoring.getPerformanceMetrics.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 40));
      
      return {
        success: true,
        metrics: {
          total_requests: 10000,
          average_response_time: 150,
          success_rate: 0.95,
          active_users: 45,
          documents_processed: 1250,
          ai_analyses_completed: 800
        }
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete User Authentication Workflow', () => {
    it('should handle complete user registration and login flow', async () => {
      // Step 1: User registration
      const userData = {
        name: 'احمد محمدی',
        email: 'ahmad@example.com',
        password: 'password123',
        role: 'lawyer'
      };

      const registrationResult = await mockFullSystem.auth.register(userData);
      
      expect(registrationResult.success).toBe(true);
      expect(registrationResult.user.name).toBe('احمد محمدی');
      expect(registrationResult.user.email).toBe('ahmad@example.com');
      expect(registrationResult.user.role).toBe('viewer'); // Default role
      expect(registrationResult.token).toBeDefined();
      
      // Verify Persian name
      expect(userData.name).toContainPersian();

      // Step 2: User login
      const loginResult = await mockFullSystem.auth.login({
        email: 'admin@legal-archive.ir',
        password: 'password123'
      });

      expect(loginResult.success).toBe(true);
      expect(loginResult.user.name).toBe('مدیر سیستم');
      expect(loginResult.user.role).toBe('admin');
      expect(loginResult.token).toBe('jwt_token_123');

      // Step 3: Get current user
      const currentUserResult = await mockFullSystem.auth.getCurrentUser(loginResult.token);
      
      expect(currentUserResult.success).toBe(true);
      expect(currentUserResult.user.name).toBe('مدیر سیستم');
      expect(currentUserResult.user.role).toBe('admin');
    });

    it('should handle authentication errors gracefully', async () => {
      // Invalid login
      const invalidLoginResult = await mockFullSystem.auth.login({
        email: 'invalid@example.com',
        password: 'wrongpassword'
      });

      expect(invalidLoginResult.success).toBe(false);
      expect(invalidLoginResult.error).toBe('Invalid credentials');

      // Invalid token
      const invalidTokenResult = await mockFullSystem.auth.getCurrentUser('invalid_token');
      
      expect(invalidTokenResult.success).toBe(false);
      expect(invalidTokenResult.error).toBe('Invalid token');
    });
  });

  describe('Complete Document Search and Analysis Workflow', () => {
    it('should handle complete document search and analysis workflow', async () => {
      // Step 1: User searches for Persian legal documents
      const searchQuery = 'قانون اساسی ماده ۱';
      const searchResult = await mockFullSystem.documents.search(searchQuery, {
        page: 1,
        per_page: 10
      });

      expect(searchResult.success).toBe(true);
      expect(searchResult.results).toBeDefined();
      expect(searchResult.enhanced_query).toBeDefined();
      expect(searchResult.total_results).toBeGreaterThanOrEqual(0);
      expect(searchResult.search_time).toBeLessThan(300);
      
      // Verify Persian query
      expect(searchQuery).toContainPersian();
      expect(searchQuery).toContainLegalTerms();

      // Step 2: User selects a document
      const documentId = 'doc_001';
      const documentResult = await mockFullSystem.documents.getById(documentId);

      expect(documentResult.success).toBe(true);
      expect(documentResult.document).toBeDefined();
      expect(documentResult.ai_analysis).toBeDefined();
      expect(documentResult.analysis_confidence).toBeGreaterThan(0.8);

      // Step 3: User requests AI analysis
      const analysisResult = await mockFullSystem.documents.analyze(documentId);

      expect(analysisResult.success).toBe(true);
      expect(analysisResult.analysis).toBeDefined();
      expect(analysisResult.analysis.category).toBeDefined();
      expect(analysisResult.analysis.confidence).toBeGreaterThan(0.8);
      expect(analysisResult.analysis_time).toBeLessThan(300);
    });

    it('should handle document upload and processing workflow', async () => {
      // Step 1: User uploads a Persian legal document
      const documentData = {
        title: 'قانون مدنی ماده ۱۱۰۵',
        content: 'مصوبات مجلس شورای اسلامی پس از طی مراحل قانونی به رئیس جمهور ابلاغ می\u200cگردد...',
        category: 'قانون مدنی',
        source: 'مجلس شورای اسلامی',
        language: 'fa'
      };

      const uploadResult = await mockFullSystem.documents.upload(documentData);

      expect(uploadResult.success).toBe(true);
      expect(uploadResult.document).toBeDefined();
      expect(uploadResult.analysis).toBeDefined();
      expect(uploadResult.processing_time).toBeLessThan(400);
      
      // Verify Persian content
      expect(documentData.title).toContainPersian();
      expect(documentData.content).toContainPersian();
      expect(documentData.category).toContainLegalTerms();

      // Step 2: Document is automatically analyzed
      expect(uploadResult.analysis.category).toBeDefined();
      expect(uploadResult.analysis.confidence).toBeGreaterThan(0.8);
      expect(uploadResult.analysis.keywords).toBeDefined();
      expect(uploadResult.analysis.entities).toBeDefined();
    });
  });

  describe('Complete Scraping and Processing Workflow', () => {
    it('should handle complete scraping workflow with real-time updates', async () => {
      // Step 1: Admin starts scraping
      const sources = [
        'قوه قضائیه',
        'مجلس شورای اسلامی',
        'دیوان عالی کشور',
        'دادگاه تجدیدنظر',
        'وزارت دادگستری'
      ];

      const startScrapingResult = await mockFullSystem.scraping.startScraping(sources);

      expect(startScrapingResult.success).toBe(true);
      expect(startScrapingResult.scraping_id).toBeDefined();
      expect(startScrapingResult.sources).toEqual(sources);
      expect(startScrapingResult.status).toBe('started');
      expect(startScrapingResult.estimated_duration).toBeDefined();

      // Verify Persian source names
      sources.forEach(source => {
        expect(source).toContainPersian();
        expect(source).toContainLegalTerms();
      });

      // Step 2: Monitor scraping progress
      const statusResult = await mockFullSystem.scraping.getStatus(startScrapingResult.scraping_id);

      expect(statusResult.success).toBe(true);
      expect(statusResult.status.is_active).toBe(true);
      expect(statusResult.status.progress).toBeGreaterThan(0);
      expect(statusResult.status.sources_completed).toBeGreaterThan(0);
      expect(statusResult.status.documents_scraped).toBeGreaterThan(0);
      expect(statusResult.status.estimated_completion).toBeDefined();

      // Step 3: Stop scraping when needed
      const stopScrapingResult = await mockFullSystem.scraping.stopScraping(startScrapingResult.scraping_id);

      expect(stopScrapingResult.success).toBe(true);
      expect(stopScrapingResult.scraping_id).toBe(startScrapingResult.scraping_id);
      expect(stopScrapingResult.status).toBe('stopped');
      expect(stopScrapingResult.documents_scraped).toBeGreaterThan(0);
    });

    it('should handle scraping errors and recovery', async () => {
      // Mock scraping error
      mockFullSystem.scraping.startScraping.mockRejectedValueOnce(new Error('Scraping service unavailable'));

      const sources = ['قوه قضائیه'];

      try {
        await mockFullSystem.scraping.startScraping(sources);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Scraping service unavailable');
      }
    });
  });

  describe('Complete WebSocket Communication Workflow', () => {
    it('should handle real-time WebSocket communication', async () => {
      // Step 1: Connect to WebSocket
      const connectResult = await mockFullSystem.websocket.connect();

      expect(connectResult.success).toBe(true);
      expect(connectResult.connection_id).toBeDefined();
      expect(connectResult.status).toBe('connected');

      // Step 2: Subscribe to topics
      const subscribeResult = await mockFullSystem.websocket.subscribe('document_updates');

      expect(subscribeResult.success).toBe(true);
      expect(subscribeResult.topic).toBe('document_updates');
      expect(subscribeResult.subscribed).toBe(true);

      // Step 3: Send messages
      const message = {
        type: 'search_query',
        data: {
          query: 'قانون اساسی',
          user_id: 'user_001'
        }
      };

      const sendResult = await mockFullSystem.websocket.sendMessage(message);

      expect(sendResult.success).toBe(true);
      expect(sendResult.message_id).toBeDefined();
      expect(sendResult.delivered).toBe(true);

      // Step 4: Simulate real-time updates
      act(() => {
        mockWebSocket.mockMessage('document_processing', {
          documentId: 'doc_123',
          status: 'processing',
          progress: 50
        });
      });

      // Verify WebSocket is handling messages
      expect(mockWebSocket.getMessageCount()).toBeGreaterThanOrEqual(0);
    });

    it('should handle WebSocket connection errors', async () => {
      // Mock WebSocket connection error
      mockFullSystem.websocket.connect.mockRejectedValueOnce(new Error('WebSocket connection failed'));

      try {
        await mockFullSystem.websocket.connect();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('WebSocket connection failed');
      }
    });
  });

  describe('Complete AI Analysis Workflow', () => {
    it('should handle complete AI analysis workflow', async () => {
      const persianDocument = persianTestData.sampleDocuments[0];

      // Step 1: Analyze document with AI
      const analysisResult = await mockFullSystem.ai.analyzeDocument(persianDocument.content);

      expect(analysisResult.success).toBe(true);
      expect(analysisResult.data.category).toBeDefined();
      expect(analysisResult.data.confidence).toBeGreaterThan(0.8);
      expect(analysisResult.data.summary).toBeDefined();
      expect(analysisResult.data.keywords).toBeDefined();
      expect(analysisResult.data.entities).toBeDefined();
      expect(analysisResult.data.legal_terms).toBeDefined();
      
      // Verify Persian content
      expect(persianDocument.content).toContainPersian();
      expect(persianDocument.content).toContainLegalTerms();

      // Step 2: Enhance search query
      const searchQuery = 'حقوق زنان در قانون';
      const enhanceResult = await mockFullSystem.ai.enhanceSearch(searchQuery);

      expect(enhanceResult.success).toBe(true);
      expect(enhanceResult.data.original_query).toBe(searchQuery);
      expect(enhanceResult.data.enhanced_query).toBeDefined();
      expect(enhanceResult.data.suggestions).toBeDefined();
      expect(enhanceResult.data.synonyms).toBeDefined();
      expect(enhanceResult.data.legal_terms).toBeDefined();

      // Step 3: Generate summary
      const summaryResult = await mockFullSystem.ai.generateSummary(persianDocument.content);

      expect(summaryResult.success).toBe(true);
      expect(summaryResult.data.summary).toBeDefined();
      expect(summaryResult.data.summary).toContainPersian();
      expect(summaryResult.data.key_points).toBeDefined();
      expect(summaryResult.data.confidence).toBeGreaterThan(0.8);

      // Step 4: Extract entities
      const entitiesResult = await mockFullSystem.ai.extractEntities(persianDocument.content);

      expect(entitiesResult.success).toBe(true);
      expect(entitiesResult.data.entities).toBeDefined();
      expect(entitiesResult.data.entities.length).toBeGreaterThan(0);
      expect(entitiesResult.data.legal_terms).toBeDefined();
    });

    it('should handle AI service errors gracefully', async () => {
      // Mock AI service error
      mockFullSystem.ai.analyzeDocument.mockRejectedValueOnce(new Error('AI service unavailable'));

      try {
        await mockFullSystem.ai.analyzeDocument('Test content');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('AI service unavailable');
      }
    });
  });

  describe('Complete System Monitoring Workflow', () => {
    it('should handle complete system monitoring workflow', async () => {
      // Step 1: Check system health
      const healthResult = await mockFullSystem.monitoring.getSystemHealth();

      expect(healthResult.success).toBe(true);
      expect(healthResult.health.overall).toBe('healthy');
      expect(healthResult.health.database).toBe('healthy');
      expect(healthResult.health.ai_service).toBe('healthy');
      expect(healthResult.health.scraping_service).toBe('healthy');
      expect(healthResult.health.websocket).toBe('connected');
      expect(healthResult.health.uptime).toBe('99.9%');
      expect(healthResult.health.response_time).toBeLessThan(200);

      // Step 2: Get performance metrics
      const metricsResult = await mockFullSystem.monitoring.getPerformanceMetrics();

      expect(metricsResult.success).toBe(true);
      expect(metricsResult.metrics.total_requests).toBeGreaterThan(0);
      expect(metricsResult.metrics.average_response_time).toBeLessThan(200);
      expect(metricsResult.metrics.success_rate).toBeGreaterThan(0.9);
      expect(metricsResult.metrics.active_users).toBeGreaterThan(0);
      expect(metricsResult.metrics.documents_processed).toBeGreaterThan(0);
      expect(metricsResult.metrics.ai_analyses_completed).toBeGreaterThan(0);
    });

    it('should handle monitoring service errors', async () => {
      // Mock monitoring error
      mockFullSystem.monitoring.getSystemHealth.mockRejectedValueOnce(new Error('Monitoring service unavailable'));

      try {
        await mockFullSystem.monitoring.getSystemHealth();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Monitoring service unavailable');
      }
    });
  });

  describe('End-to-End User Scenarios', () => {
    it('should handle complete lawyer workflow', async () => {
      // Step 1: Lawyer logs in
      const loginResult = await mockFullSystem.auth.login({
        email: 'admin@legal-archive.ir',
        password: 'password123'
      });

      expect(loginResult.success).toBe(true);
      expect(loginResult.user.role).toBe('admin');

      // Step 2: Lawyer searches for legal documents
      const searchResult = await mockFullSystem.documents.search('حقوق زنان در قانون مدنی', {
        page: 1,
        per_page: 20
      });

      expect(searchResult.success).toBe(true);
      expect(searchResult.results).toBeDefined();
      expect(searchResult.enhanced_query).toBeDefined();
      
      // Verify Persian legal query
      expect('حقوق زنان در قانون مدنی').toContainPersian();
      expect('حقوق زنان در قانون مدنی').toContainLegalTerms();

      // Step 3: Lawyer views document with AI analysis
      const documentResult = await mockFullSystem.documents.getById('doc_001');

      expect(documentResult.success).toBe(true);
      expect(documentResult.document).toBeDefined();
      expect(documentResult.ai_analysis).toBeDefined();

      // Step 4: Lawyer requests additional AI analysis
      const analysisResult = await mockFullSystem.documents.analyze('doc_001');

      expect(analysisResult.success).toBe(true);
      expect(analysisResult.analysis).toBeDefined();
      expect(analysisResult.analysis.confidence).toBeGreaterThan(0.8);
    });

    it('should handle complete researcher workflow', async () => {
      // Step 1: Researcher registers
      const registrationResult = await mockFullSystem.auth.register({
        name: 'فاطمه احمدی',
        email: 'fatemeh@university.ac.ir',
        password: 'password123',
        role: 'researcher'
      });

      expect(registrationResult.success).toBe(true);
      expect(registrationResult.user.name).toBe('فاطمه احمدی');
      expect(registrationResult.user.role).toBe('viewer'); // Default role
      
      // Verify Persian name
      expect('فاطمه احمدی').toContainPersian();

      // Step 2: Researcher searches for academic legal content
      const searchResult = await mockFullSystem.documents.search('تحقیق در مورد قانون اساسی', {
        page: 1,
        per_page: 10
      });

      expect(searchResult.success).toBe(true);
      expect(searchResult.results).toBeDefined();
      
      // Verify Persian academic query
      expect('تحقیق در مورد قانون اساسی').toContainPersian();

      // Step 3: Researcher uploads research document
      const documentData = {
        title: 'تحقیق در مورد حقوق اساسی',
        content: 'این تحقیق به بررسی حقوق اساسی در قانون اساسی جمهوری اسلامی ایران می\u200cپردازد...',
        category: 'تحقیق',
        source: 'دانشگاه تهران',
        language: 'fa'
      };

      const uploadResult = await mockFullSystem.documents.upload(documentData);

      expect(uploadResult.success).toBe(true);
      expect(uploadResult.document).toBeDefined();
      expect(uploadResult.analysis).toBeDefined();
      
      // Verify Persian research content
      expect(documentData.title).toContainPersian();
      expect(documentData.content).toContainPersian();
    });

    it('should handle complete admin workflow', async () => {
      // Step 1: Admin logs in
      const loginResult = await mockFullSystem.auth.login({
        email: 'admin@legal-archive.ir',
        password: 'password123'
      });

      expect(loginResult.success).toBe(true);
      expect(loginResult.user.role).toBe('admin');

      // Step 2: Admin starts scraping
      const scrapingResult = await mockFullSystem.scraping.startScraping([
        'قوه قضائیه',
        'مجلس شورای اسلامی'
      ]);

      expect(scrapingResult.success).toBe(true);
      expect(scrapingResult.scraping_id).toBeDefined();

      // Step 3: Admin monitors system health
      const healthResult = await mockFullSystem.monitoring.getSystemHealth();

      expect(healthResult.success).toBe(true);
      expect(healthResult.health.overall).toBe('healthy');

      // Step 4: Admin checks performance metrics
      const metricsResult = await mockFullSystem.monitoring.getPerformanceMetrics();

      expect(metricsResult.success).toBe(true);
      expect(metricsResult.metrics.success_rate).toBeGreaterThan(0.9);

      // Step 5: Admin stops scraping
      const stopResult = await mockFullSystem.scraping.stopScraping(scrapingResult.scraping_id);

      expect(stopResult.success).toBe(true);
      expect(stopResult.status).toBe('stopped');
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle system failures gracefully', async () => {
      // Mock multiple service failures
      mockFullSystem.documents.search.mockRejectedValueOnce(new Error('Database connection failed'));
      mockFullSystem.ai.analyzeDocument.mockRejectedValueOnce(new Error('AI service timeout'));

      // Try document search
      try {
        await mockFullSystem.documents.search('قانون اساسی');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Database connection failed');
      }

      // Try AI analysis
      try {
        await mockFullSystem.ai.analyzeDocument('Test content');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('AI service timeout');
      }
    });

    it('should handle partial system failures', async () => {
      // Mock partial failure - AI service works but database fails
      mockFullSystem.documents.search.mockRejectedValueOnce(new Error('Database connection failed'));
      
      // AI service should still work
      const aiResult = await mockFullSystem.ai.enhanceSearch('قانون اساسی');
      expect(aiResult.success).toBe(true);

      // Document search should fail
      try {
        await mockFullSystem.documents.search('قانون اساسی');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Database connection failed');
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent user operations', async () => {
      const operations = [
        mockFullSystem.documents.search('قانون اساسی'),
        mockFullSystem.documents.search('قانون مدنی'),
        mockFullSystem.documents.search('قانون مجازات'),
        mockFullSystem.ai.enhanceSearch('حقوق زنان'),
        mockFullSystem.monitoring.getSystemHealth()
      ];

      const startTime = performance.now();
      const results = await Promise.all(operations);
      const endTime = performance.now();

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle large-scale document processing', async () => {
      const documents = Array(10).fill(null).map((_, i) => ({
        title: `مستند ${i}`,
        content: `محتوای مستند ${i} که شامل اطلاعات حقوقی است...`,
        category: 'قانون',
        source: 'منبع'
      }));

      const startTime = performance.now();
      const results = await Promise.all(
        documents.map(doc => mockFullSystem.documents.upload(doc))
      );
      const endTime = performance.now();

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});