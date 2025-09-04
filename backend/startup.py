#!/usr/bin/env python3
"""
Iranian Legal Archive System Startup Script
Run this to initialize the complete system with sample data
"""

import asyncio
import logging
from database import DocumentDatabase
from scraper import LegalDocumentScraper  
from ai_classifier import PersianBERTClassifier

async def initialize_system():
    """Initialize the complete system"""
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    logger.info("Initializing Iranian Legal Archive System...")
    
    # Initialize database
    logger.info("Setting up database...")
    database = DocumentDatabase()
    
    # Initialize AI classifier
    logger.info("Loading Persian BERT models...")
    ai_classifier = PersianBERTClassifier()
    
    # Initialize scraper
    logger.info("Setting up document scraper...")
    scraper = LegalDocumentScraper(database, ai_classifier)
    
    # Insert sample documents for demonstration
    sample_documents = [
        {
            "url": "https://rc.majlis.ir/fa/law/show/94202",
            "title": "قانون اساسی جمهوری اسلامی ایران - اصل اول",
            "content": """اصل اول: حکومت ایران، جمهوری اسلامی است که ملت ایران بر اساس ایمان دیرینه‌اش به حاکمیت حق و عدالت قرآن، در انقلاب اسلامی سال ۱۳۵۷ تحت رهبری امام خمینی (ره) به رأی قاطع ۹۸/۲ درصدی آن را تعیین نمود.
            
این قانون اساسی بر اساس عقاید دینی و اجتماعی ملت ایران که در جریان نهضت انقلاب اسلامی بار دیگر تجلی یافت و نیز بر پایه تجربیات تلخ و شیرین تاریخی ملت ایران در راه رسیدن به استقلال، آزادی و حکومت اسلامی تدوین گردیده است.""",
            "source": "مرکز پژوهش‌های مجلس",
            "category": "قانون اساسی"
        },
        {
            "url": "https://divan-edalat.ir/verdict/12345",
            "title": "رأی شماره ۱۲۳۴۵ - حقوق اداری",
            "content": """دیوان عدالت اداری با بررسی پرونده و مطالعه اوراق و مدارک ارائه شده، نظر به اینکه تصمیم مرجع اداری مخالف قانون تشخیص داده شده، بدین شرح رأی می‌دهد:

۱- تصمیم مرجع اداری مذکور نقض و باطل اعلام می‌شود.
۲- مرجع مربوطه موظف است طبق ضوابط قانونی نسبت به بررسی مجدد موضوع اقدام نماید.
۳- هزینه دادرسی بر عهده مرجع اداری می‌باشد.""",
            "source": "دیوان عدالت اداری",
            "category": "رأی قضایی"
        },
        {
            "url": "https://ijudiciary.ir/regulation/567",
            "title": "آیین‌نامه اجرایی قانون مدنی - بخش قراردادها",
            "content": """این آیین‌نامه به منظور تسهیل اجرای مقررات مربوط به قراردادها در قانون مدنی تدوین شده است.

ماده ۱- تمامی قراردادهای منعقده باید دارای ارکان اساسی زیر باشند:
الف) رضایت طرفین
ب) محل قرارداد
ج) سبب مشروع

ماده ۲- قراردادهای فاقد هر یک از ارکان مذکور باطل محسوب می‌شوند.

ماده ۳- نحوه اثبات قراردادها طبق مقررات قانون آیین دادرسی مدنی خواهد بود.""",
            "source": "قوه قضائیه",
            "category": "آیین‌نامه"
        }
    ]
    
    # Insert sample documents
    for doc in sample_documents:
        try:
            # Classify document
            classification = await ai_classifier.classify_document(doc['content'])
            
            # Insert into database
            success = await database.insert_document(
                url=doc['url'],
                title=doc['title'],
                content=doc['content'],
                source=doc['source'],
                category=doc['category'],
                classification=classification
            )
            
            if success:
                logger.info(f"Inserted sample document: {doc['title'][:50]}...")
            else:
                logger.info(f"Document already exists: {doc['title'][:50]}...")
                
        except Exception as e:
            logger.error(f"Error inserting sample document: {str(e)}")
    
    logger.info("System initialization complete!")
    logger.info("You can now:")
    logger.info("1. Run 'uvicorn main:app --reload' to start the API server")
    logger.info("2. Run 'npm run dev' in the frontend to start the web interface")
    logger.info("3. Access the web interface at http://localhost:5173")

if __name__ == "__main__":
    asyncio.run(initialize_system())