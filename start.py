#!/usr/bin/env python3
"""
Main startup script for Iranian Legal Archive System
This script initializes all components and starts the server
"""

import asyncio
import logging
import sys
import os
from pathlib import Path

# Add backend to Python path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('iranian_legal_archive.log')
    ]
)

logger = logging.getLogger(__name__)

async def main():
    """Main startup function"""
    try:
        logger.info("🚀 Starting Iranian Legal Archive System...")
        
        # Import and initialize components
        from backend.database import DocumentDatabase
        from backend.ai_classifier import PersianBERTClassifier
        from backend.proxy_manager import AdvancedProxyManager
        from backend.scraper import LegalDocumentScraper
        
        # Initialize database
        logger.info("📊 Initializing database...")
        database = DocumentDatabase()
        logger.info("✅ Database initialized successfully")
        
        # Initialize AI classifier
        logger.info("🤖 Loading AI models...")
        ai_classifier = PersianBERTClassifier()
        logger.info("✅ AI models loaded successfully")
        
        # Initialize proxy manager
        logger.info("🌐 Initializing proxy manager...")
        proxy_manager = AdvancedProxyManager()
        
        # Test proxy health
        health_status = await proxy_manager.health_check()
        healthy_proxies = sum(1 for status in health_status.values() if status.get('status') == 'healthy')
        logger.info(f"✅ Proxy health check: {healthy_proxies}/{len(health_status)} proxies healthy")
        
        # Initialize scraper
        logger.info("🕷️ Initializing scraper...")
        scraper = LegalDocumentScraper(database, ai_classifier)
        logger.info("✅ Scraper initialized successfully")
        
        # Get initial database stats
        stats = await database.get_database_stats()
        logger.info(f"📈 Database contains {stats['total_documents']} documents")
        
        # Start FastAPI server
        logger.info("🌐 Starting FastAPI server...")
        import uvicorn
        
        # Print startup information
        print("\n" + "="*60)
        print("🇮🇷 Iranian Legal Archive System")
        print("="*60)
        print(f"📊 Database: {stats['total_documents']} documents")
        print(f"🤖 AI Models: {'Loaded' if ai_classifier.classifiers else 'Fallback mode'}")
        print(f"🌐 Proxies: {healthy_proxies}/{len(health_status)} healthy")
        print(f"🔗 API Documentation: http://localhost:8000/docs")
        print(f"🔗 WebSocket: ws://localhost:8000/ws")
        print("="*60 + "\n")
        
        # Start server
        uvicorn.run(
            "backend.main:app",
            host="0.0.0.0",
            port=8000,
            reload=False,
            log_level="info"
        )
        
    except Exception as e:
        logger.error(f"❌ Failed to start system: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())