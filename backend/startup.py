#!/usr/bin/env python3
"""
Startup script for Iranian Legal Archive System
Initializes database, loads AI models, and starts the server
"""

import asyncio
import logging
import sys
import os
from pathlib import Path

# Add backend to Python path
sys.path.insert(0, str(Path(__file__).parent))

from database import DocumentDatabase
from ai_classifier import PersianBERTClassifier
from proxy_manager import AdvancedProxyManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('backend/startup.log')
    ]
)

logger = logging.getLogger(__name__)

async def initialize_system():
    """Initialize all system components"""
    logger.info("Starting Iranian Legal Archive System initialization...")
    
    try:
        # Initialize database
        logger.info("Initializing database...")
        database = DocumentDatabase()
        logger.info("Database initialized successfully")
        
        # Initialize AI classifier
        logger.info("Loading AI models...")
        ai_classifier = PersianBERTClassifier()
        logger.info("AI models loaded successfully")
        
        # Initialize proxy manager
        logger.info("Initializing proxy manager...")
        proxy_manager = AdvancedProxyManager()
        
        # Test proxy health
        health_status = await proxy_manager.health_check()
        healthy_proxies = sum(1 for status in health_status.values() if status.get('status') == 'healthy')
        logger.info(f"Proxy health check: {healthy_proxies}/{len(health_status)} proxies healthy")
        
        # Get initial database stats
        stats = await database.get_database_stats()
        logger.info(f"Database contains {stats['total_documents']} documents")
        
        logger.info("System initialization completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"System initialization failed: {str(e)}")
        return False

async def main():
    """Main startup function"""
    success = await initialize_system()
    
    if success:
        logger.info("Starting FastAPI server...")
        import uvicorn
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=False,
            log_level="info"
        )
    else:
        logger.error("Failed to initialize system. Exiting.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())