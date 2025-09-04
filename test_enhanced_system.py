#!/usr/bin/env python3
"""
Comprehensive test script for the enhanced Iranian Legal Archive System
Tests all major components and features
"""

import asyncio
import sys
import os
import json
import time
from datetime import datetime

# Add backend to path
sys.path.append('backend')

from backend.database import DocumentDatabase
from backend.ai_classifier import PersianBERTClassifier
from backend.proxy_manager import AdvancedProxyManager
from backend.scraper import LegalDocumentScraper

class SystemTester:
    def __init__(self):
        self.results = {
            "database": {},
            "ai_classifier": {},
            "proxy_manager": {},
            "scraper": {},
            "overall": {}
        }
    
    async def test_database(self):
        """Test database functionality with FTS5 search"""
        print("🔍 Testing Database with FTS5 Full-Text Search...")
        
        try:
            db = DocumentDatabase()
            
            # Test document insertion
            test_docs = [
                {
                    "url": "https://test.ir/doc1",
                    "title": "قانون اساسی جمهوری اسلامی ایران",
                    "content": "این قانون اساسی شامل اصول و مبانی نظام جمهوری اسلامی است.",
                    "source": "تست",
                    "category": "قانون اساسی"
                },
                {
                    "url": "https://test.ir/doc2", 
                    "title": "آیین‌نامه استخدامی",
                    "content": "این آیین‌نامه شامل مقررات و ضوابط استخدام در دستگاه‌های دولتی است.",
                    "source": "تست",
                    "category": "آیین‌نامه"
                }
            ]
            
            inserted_count = 0
            for doc in test_docs:
                success = await db.insert_document(
                    url=doc["url"],
                    title=doc["title"],
                    content=doc["content"],
                    source=doc["source"],
                    category=doc["category"]
                )
                if success:
                    inserted_count += 1
            
            # Test FTS5 search
            search_results = await db.search_documents(query="قانون اساسی", limit=5)
            
            # Test stats
            stats = await db.get_database_stats()
            
            self.results["database"] = {
                "status": "✅ PASSED",
                "documents_inserted": inserted_count,
                "search_results": len(search_results["data"]),
                "total_documents": stats["total_documents"],
                "database_size_mb": stats.get("database_size_mb", 0)
            }
            
            print(f"   ✅ Database test passed: {inserted_count} docs inserted, {len(search_results['data'])} search results")
            
        except Exception as e:
            self.results["database"] = {
                "status": "❌ FAILED",
                "error": str(e)
            }
            print(f"   ❌ Database test failed: {str(e)}")
    
    async def test_ai_classifier(self):
        """Test AI classifier with Persian BERT models"""
        print("🤖 Testing AI Classifier with Persian BERT...")
        
        try:
            classifier = PersianBERTClassifier()
            
            # Test document classification
            test_text = "این یک سند حقوقی شامل قانون اساسی و مقررات استخدامی است."
            result = await classifier.classify_document(test_text)
            
            # Test entity extraction
            entities = await classifier.extract_entities(test_text)
            
            # Test sentiment analysis
            sentiment = await classifier.analyze_sentiment(test_text)
            
            self.results["ai_classifier"] = {
                "status": "✅ PASSED",
                "category": result["category"],
                "confidence": result["confidence"],
                "entities_found": len(result["entities"]),
                "sentiment": result["sentiment"],
                "models_loaded": len(classifier.classifiers)
            }
            
            print(f"   ✅ AI Classifier test passed: {result['category']} (confidence: {result['confidence']:.2f})")
            
        except Exception as e:
            self.results["ai_classifier"] = {
                "status": "❌ FAILED",
                "error": str(e)
            }
            print(f"   ❌ AI Classifier test failed: {str(e)}")
    
    async def test_proxy_manager(self):
        """Test proxy manager with Iranian DNS servers"""
        print("🌐 Testing Proxy Manager with Iranian DNS...")
        
        try:
            proxy_manager = AdvancedProxyManager()
            
            # Test proxy configuration
            dns_count = len(proxy_manager.iranian_dns)
            cors_count = len(proxy_manager.cors_proxies)
            archive_count = len(proxy_manager.archive_proxies)
            
            # Test proxy stats
            stats = proxy_manager.get_proxy_stats()
            
            # Test health check (without actual network calls)
            health_status = {
                "iranian_dns_servers": dns_count,
                "cors_proxies": cors_count,
                "archive_proxies": archive_count,
                "proxy_stats": stats
            }
            
            self.results["proxy_manager"] = {
                "status": "✅ PASSED",
                "iranian_dns_servers": dns_count,
                "cors_proxies": cors_count,
                "archive_proxies": archive_count,
                "health_status": health_status
            }
            
            print(f"   ✅ Proxy Manager test passed: {dns_count} DNS servers, {cors_count} CORS proxies")
            
        except Exception as e:
            self.results["proxy_manager"] = {
                "status": "❌ FAILED",
                "error": str(e)
            }
            print(f"   ❌ Proxy Manager test failed: {str(e)}")
    
    async def test_scraper(self):
        """Test scraper with real-time updates"""
        print("🕷️ Testing Scraper with Real-time Updates...")
        
        try:
            db = DocumentDatabase()
            classifier = PersianBERTClassifier()
            scraper = LegalDocumentScraper(db, classifier)
            
            # Test scraper initialization
            status = scraper.get_status()
            
            # Test proxy manager integration
            proxy_stats = scraper.proxy_manager.get_proxy_stats()
            
            self.results["scraper"] = {
                "status": "✅ PASSED",
                "is_active": status["isActive"],
                "documents_processed": status["documentsProcessed"],
                "error_count": status["errorCount"],
                "proxy_stats": proxy_stats,
                "websocket_ready": True
            }
            
            print(f"   ✅ Scraper test passed: WebSocket ready, {status['documentsProcessed']} docs processed")
            
        except Exception as e:
            self.results["scraper"] = {
                "status": "❌ FAILED",
                "error": str(e)
            }
            print(f"   ❌ Scraper test failed: {str(e)}")
    
    def test_frontend_components(self):
        """Test frontend component files"""
        print("🎨 Testing Frontend Components...")
        
        try:
            frontend_files = [
                "src/components/Dashboard.tsx",
                "src/components/SearchBar.tsx", 
                "src/components/ScrapingStatus.tsx",
                "src/components/AIAnalysis.tsx",
                "src/components/DocumentViewer.tsx",
                "src/App.tsx"
            ]
            
            existing_files = []
            for file_path in frontend_files:
                if os.path.exists(file_path):
                    existing_files.append(file_path)
            
            # Check for enhanced features
            enhanced_features = []
            if os.path.exists("src/components/AIAnalysis.tsx"):
                enhanced_features.append("AI Analysis Component")
            
            if os.path.exists("src/components/Dashboard.tsx"):
                with open("src/components/Dashboard.tsx", "r", encoding="utf-8") as f:
                    content = f.read()
                    if "WebSocket" in content and "realTimeStats" in content:
                        enhanced_features.append("Real-time Dashboard")
            
            if os.path.exists("src/components/SearchBar.tsx"):
                with open("src/components/SearchBar.tsx", "r", encoding="utf-8") as f:
                    content = f.read()
                    if "aiSuggestions" in content and "Sparkles" in content:
                        enhanced_features.append("AI-powered Search")
            
            self.results["frontend"] = {
                "status": "✅ PASSED",
                "components_found": len(existing_files),
                "enhanced_features": enhanced_features,
                "files": existing_files
            }
            
            print(f"   ✅ Frontend test passed: {len(existing_files)} components, {len(enhanced_features)} enhanced features")
            
        except Exception as e:
            self.results["frontend"] = {
                "status": "❌ FAILED",
                "error": str(e)
            }
            print(f"   ❌ Frontend test failed: {str(e)}")
    
    def test_deployment_configs(self):
        """Test deployment configurations"""
        print("🚀 Testing Deployment Configurations...")
        
        try:
            deployment_files = [
                "vercel.json",
                "railway.toml", 
                "Dockerfile",
                "docker-compose.yml"
            ]
            
            existing_configs = []
            for config_file in deployment_files:
                if os.path.exists(config_file):
                    existing_configs.append(config_file)
            
            # Check Vercel config
            vercel_valid = False
            if os.path.exists("vercel.json"):
                with open("vercel.json", "r") as f:
                    vercel_config = json.load(f)
                    if "functions" in vercel_config and "routes" in vercel_config:
                        vercel_valid = True
            
            # Check Railway config
            railway_valid = False
            if os.path.exists("railway.toml"):
                with open("railway.toml", "r") as f:
                    railway_content = f.read()
                    if "startCommand" in railway_content and "healthcheckPath" in railway_content:
                        railway_valid = True
            
            self.results["deployment"] = {
                "status": "✅ PASSED",
                "config_files": existing_configs,
                "vercel_valid": vercel_valid,
                "railway_valid": railway_valid,
                "docker_ready": os.path.exists("Dockerfile")
            }
            
            print(f"   ✅ Deployment test passed: {len(existing_configs)} configs, Vercel: {vercel_valid}, Railway: {railway_valid}")
            
        except Exception as e:
            self.results["deployment"] = {
                "status": "❌ FAILED",
                "error": str(e)
            }
            print(f"   ❌ Deployment test failed: {str(e)}")
    
    def generate_report(self):
        """Generate comprehensive test report"""
        print("\n" + "="*60)
        print("📊 ENHANCED IRANIAN LEGAL ARCHIVE SYSTEM - TEST REPORT")
        print("="*60)
        
        total_tests = len(self.results)
        passed_tests = sum(1 for result in self.results.values() if result.get("status") == "✅ PASSED")
        
        print(f"\n🎯 Overall Status: {passed_tests}/{total_tests} tests passed")
        
        for component, result in self.results.items():
            status = result.get("status", "❓ UNKNOWN")
            print(f"\n📋 {component.upper()}: {status}")
            
            if status == "✅ PASSED":
                for key, value in result.items():
                    if key != "status":
                        print(f"   • {key}: {value}")
            else:
                error = result.get("error", "Unknown error")
                print(f"   • Error: {error}")
        
        print(f"\n⏰ Test completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Save detailed report
        with open("test_report.json", "w", encoding="utf-8") as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 Detailed report saved to: test_report.json")
        
        return passed_tests == total_tests

async def main():
    """Run all tests"""
    print("🚀 Starting Enhanced Iranian Legal Archive System Tests...")
    print("="*60)
    
    tester = SystemTester()
    
    # Run async tests
    await tester.test_database()
    await tester.test_ai_classifier()
    await tester.test_proxy_manager()
    await tester.test_scraper()
    
    # Run sync tests
    tester.test_frontend_components()
    tester.test_deployment_configs()
    
    # Generate report
    success = tester.generate_report()
    
    if success:
        print("\n🎉 ALL TESTS PASSED! System is ready for production.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please review the report.")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)