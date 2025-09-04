"""
Query Enhancement Engine for Legal API Platform
Provides Persian synonyms expansion, legal term disambiguation, and context-aware suggestions
"""

import re
import json
import time
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import logging
import asyncio
from collections import defaultdict, Counter
import redis
from fastapi import HTTPException

logger = logging.getLogger(__name__)

@dataclass
class QueryEnhancement:
    """Query enhancement result"""
    original_query: str
    enhanced_query: str
    synonyms: List[str]
    legal_terms: List[str]
    suggestions: List[str]
    confidence: float
    processing_time: float

@dataclass
class LegalTerm:
    """Legal term definition"""
    term: str
    definition: str
    synonyms: List[str]
    related_terms: List[str]
    category: str
    frequency: int

class PersianTextProcessor:
    """Persian text processing utilities"""
    
    # Persian stop words
    STOP_WORDS = {
        'از', 'در', 'به', 'با', 'که', 'این', 'آن', 'را', 'است', 'بود', 'شد',
        'می', 'خواهد', 'کرد', 'کرده', 'می‌شود', 'می‌کند', 'می‌باشد',
        'برای', 'تا', 'یا', 'اما', 'ولی', 'چون', 'زیرا', 'اگر', 'چنانچه'
    }
    
    # Persian diacritics normalization
    DIACRITICS_MAP = {
        'َ': '', 'ِ': '', 'ُ': '', 'ً': '', 'ٍ': '', 'ٌ': '',
        'ْ': '', 'ّ': '', 'ٰ': '', 'ٓ': '', 'ٔ': '', 'ٕ': ''
    }
    
    @staticmethod
    def normalize_text(text: str) -> str:
        """Normalize Persian text"""
        # Remove diacritics
        for diacritic, replacement in PersianTextProcessor.DIACRITICS_MAP.items():
            text = text.replace(diacritic, replacement)
        
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Remove extra characters
        text = re.sub(r'[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]', '', text)
        
        return text
    
    @staticmethod
    def tokenize(text: str) -> List[str]:
        """Tokenize Persian text"""
        # Simple tokenization - can be enhanced with more sophisticated methods
        tokens = re.findall(r'\b\w+\b', text)
        return [token for token in tokens if token not in PersianTextProcessor.STOP_WORDS]
    
    @staticmethod
    def calculate_similarity(text1: str, text2: str) -> float:
        """Calculate similarity between two Persian texts"""
        tokens1 = set(PersianTextProcessor.tokenize(text1))
        tokens2 = set(PersianTextProcessor.tokenize(text2))
        
        if not tokens1 and not tokens2:
            return 1.0
        if not tokens1 or not tokens2:
            return 0.0
        
        intersection = len(tokens1.intersection(tokens2))
        union = len(tokens1.union(tokens2))
        
        return intersection / union if union > 0 else 0.0

class LegalTermDictionary:
    """Legal term dictionary and management"""
    
    def __init__(self):
        self.terms: Dict[str, LegalTerm] = {}
        self.synonym_map: Dict[str, List[str]] = defaultdict(list)
        self.category_map: Dict[str, List[str]] = defaultdict(list)
        self._load_legal_terms()
    
    def _load_legal_terms(self):
        """Load legal terms from database or file"""
        # Sample legal terms - in production, load from database
        sample_terms = [
            {
                'term': 'قرارداد',
                'definition': 'توافق بین دو یا چند طرف که حقوق و تعهدات آنها را مشخص می‌کند',
                'synonyms': ['عقد', 'پیمان', 'توافقنامه', 'مقاوله'],
                'related_terms': ['اجاره', 'خرید', 'فروش', 'شراکت'],
                'category': 'قانون مدنی',
                'frequency': 1000
            },
            {
                'term': 'اجاره',
                'definition': 'عقدی که به موجب آن مستأجر مالک منافع عین مستأجره می‌شود',
                'synonyms': ['کرایه', 'استیجار'],
                'related_terms': ['قرارداد', 'مستأجر', 'موجر', 'اجاره‌نامه'],
                'category': 'قانون مدنی',
                'frequency': 800
            },
            {
                'term': 'طلاق',
                'definition': 'انحلال عقد نکاح به وسیله مرد یا نماینده او',
                'synonyms': ['فسخ نکاح', 'انحلال ازدواج'],
                'related_terms': ['نکاح', 'مهریه', 'نفقه', 'حضانت'],
                'category': 'قانون خانواده',
                'frequency': 600
            },
            {
                'term': 'جریمه',
                'definition': 'مجازات مالی که به عنوان تنبیه برای نقض قانون تعیین می‌شود',
                'synonyms': ['کیفر', 'مجازات مالی', 'پنالتی'],
                'related_terms': ['جرم', 'مجازات', 'دادگاه', 'قاضی'],
                'category': 'قانون جزا',
                'frequency': 700
            }
        ]
        
        for term_data in sample_terms:
            term = LegalTerm(**term_data)
            self.terms[term.term] = term
            
            # Build synonym map
            for synonym in term.synonyms:
                self.synonym_map[synonym].append(term.term)
            
            # Build category map
            self.category_map[term.category].append(term.term)
    
    def find_legal_terms(self, query: str) -> List[LegalTerm]:
        """Find legal terms in query"""
        found_terms = []
        normalized_query = PersianTextProcessor.normalize_text(query)
        
        for term, legal_term in self.terms.items():
            if term in normalized_query or any(syn in normalized_query for syn in legal_term.synonyms):
                found_terms.append(legal_term)
        
        return found_terms
    
    def get_synonyms(self, term: str) -> List[str]:
        """Get synonyms for a term"""
        if term in self.terms:
            return self.terms[term].synonyms
        elif term in self.synonym_map:
            return self.synonym_map[term]
        return []
    
    def get_related_terms(self, term: str) -> List[str]:
        """Get related terms"""
        if term in self.terms:
            return self.terms[term].related_terms
        return []

class QueryEnhancer:
    """
    Advanced query enhancement engine for Persian legal text
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis = redis_client
        self.legal_dictionary = LegalTermDictionary()
        self.query_cache: Dict[str, QueryEnhancement] = {}
        self.search_history: List[str] = []
        self.popular_queries: Dict[str, int] = defaultdict(int)
        
        # Persian synonyms database
        self.synonyms_db = self._load_synonyms_database()
        
        # Typo correction patterns
        self.typo_patterns = self._load_typo_patterns()
        
        # Search intent patterns
        self.intent_patterns = {
            'definition': [r'چیست', r'معنی', r'تعریف', r'منظور'],
            'procedure': [r'چگونه', r'روش', r'مراحل', r'فرآیند'],
            'requirement': [r'نیاز', r'لازم', r'ضروری', r'مورد نیاز'],
            'penalty': [r'مجازات', r'جریمه', r'تنبیه', r'کیفر'],
            'right': [r'حق', r'حقوق', r'امتیاز', r'اختیار']
        }

    def _load_synonyms_database(self) -> Dict[str, List[str]]:
        """Load Persian synonyms database"""
        # Sample synonyms - in production, load from comprehensive database
        return {
            'قرارداد': ['عقد', 'پیمان', 'توافقنامه', 'مقاوله', 'معاهده'],
            'اجاره': ['کرایه', 'استیجار', 'اجاره‌نامه'],
            'طلاق': ['فسخ نکاح', 'انحلال ازدواج', 'جدایی'],
            'جریمه': ['کیفر', 'مجازات مالی', 'پنالتی', 'تنبیه مالی'],
            'دادگاه': ['محکمه', 'دیوان', 'مرجع قضایی'],
            'قاضی': ['دادرس', 'حاکم', 'قضات'],
            'وکیل': ['مشاور حقوقی', 'نماینده قانونی', 'دفاع'],
            'شاهد': ['گواه', 'مطلع', 'ناظر'],
            'سند': ['مدرک', 'اسناد', 'مستندات'],
            'قانون': ['مقررات', 'دستورالعمل', 'آیین‌نامه']
        }

    def _load_typo_patterns(self) -> Dict[str, str]:
        """Load typo correction patterns"""
        return {
            'قرارداد': ['قرار داد', 'قرارداد', 'قرارداد'],
            'اجاره': ['اجاره', 'اجاره', 'اجاره'],
            'طلاق': ['طلاق', 'طلاق', 'طلاق'],
            'دادگاه': ['دادگاه', 'دادگاه', 'دادگاه'],
            'وکیل': ['وکیل', 'وکیل', 'وکیل']
        }

    async def enhance_query(self, query: str, user_context: Optional[Dict] = None) -> QueryEnhancement:
        """
        Enhance search query with synonyms, legal terms, and suggestions
        """
        start_time = time.time()
        
        try:
            # Check cache first
            cache_key = f"query_enhancement:{hash(query)}"
            if self.redis:
                cached_result = await self._get_from_cache(cache_key)
                if cached_result:
                    return cached_result
            
            # Normalize query
            normalized_query = PersianTextProcessor.normalize_text(query)
            
            # Extract legal terms
            legal_terms = self.legal_dictionary.find_legal_terms(normalized_query)
            
            # Expand synonyms
            synonyms = self._expand_synonyms(normalized_query)
            
            # Generate enhanced query
            enhanced_query = self._generate_enhanced_query(normalized_query, synonyms, legal_terms)
            
            # Generate suggestions
            suggestions = await self._generate_suggestions(normalized_query, user_context)
            
            # Calculate confidence
            confidence = self._calculate_confidence(normalized_query, legal_terms, synonyms)
            
            # Create result
            result = QueryEnhancement(
                original_query=query,
                enhanced_query=enhanced_query,
                synonyms=synonyms,
                legal_terms=[term.term for term in legal_terms],
                suggestions=suggestions,
                confidence=confidence,
                processing_time=time.time() - start_time
            )
            
            # Cache result
            if self.redis:
                await self._cache_result(cache_key, result)
            
            # Update search history
            self._update_search_history(query)
            
            return result
            
        except Exception as e:
            logger.error(f"Query enhancement failed: {e}")
            # Return basic enhancement on error
            return QueryEnhancement(
                original_query=query,
                enhanced_query=query,
                synonyms=[],
                legal_terms=[],
                suggestions=[],
                confidence=0.5,
                processing_time=time.time() - start_time
            )

    def _expand_synonyms(self, query: str) -> List[str]:
        """Expand query with synonyms"""
        synonyms = []
        tokens = PersianTextProcessor.tokenize(query)
        
        for token in tokens:
            if token in self.synonyms_db:
                synonyms.extend(self.synonyms_db[token])
        
        return list(set(synonyms))

    def _generate_enhanced_query(self, query: str, synonyms: List[str], legal_terms: List[LegalTerm]) -> str:
        """Generate enhanced query with synonyms and legal terms"""
        enhanced_parts = [query]
        
        # Add synonyms
        if synonyms:
            enhanced_parts.append(' '.join(synonyms[:3]))  # Limit to 3 synonyms
        
        # Add related terms from legal terms
        for term in legal_terms[:2]:  # Limit to 2 legal terms
            related = term.related_terms[:2]  # Limit to 2 related terms per legal term
            enhanced_parts.extend(related)
        
        return ' '.join(enhanced_parts)

    async def _generate_suggestions(self, query: str, user_context: Optional[Dict]) -> List[str]:
        """Generate context-aware suggestions"""
        suggestions = []
        
        # Intent-based suggestions
        intent = self._detect_search_intent(query)
        if intent:
            suggestions.extend(self._get_intent_suggestions(intent))
        
        # Legal term suggestions
        legal_terms = self.legal_dictionary.find_legal_terms(query)
        for term in legal_terms[:3]:
            suggestions.extend(term.related_terms[:2])
        
        # Popular query suggestions
        popular = self._get_popular_suggestions(query)
        suggestions.extend(popular)
        
        # User history suggestions
        if user_context and 'user_id' in user_context:
            history_suggestions = await self._get_user_history_suggestions(user_context['user_id'], query)
            suggestions.extend(history_suggestions)
        
        # Remove duplicates and limit
        return list(set(suggestions))[:10]

    def _detect_search_intent(self, query: str) -> Optional[str]:
        """Detect search intent from query"""
        for intent, patterns in self.intent_patterns.items():
            for pattern in patterns:
                if re.search(pattern, query, re.IGNORECASE):
                    return intent
        return None

    def _get_intent_suggestions(self, intent: str) -> List[str]:
        """Get suggestions based on search intent"""
        intent_suggestions = {
            'definition': ['تعریف قانونی', 'معنی حقوقی', 'مفهوم قانونی'],
            'procedure': ['مراحل قانونی', 'روش انجام', 'فرآیند حقوقی'],
            'requirement': ['مدارک مورد نیاز', 'شرایط قانونی', 'پیش‌نیازها'],
            'penalty': ['مجازات قانونی', 'جریمه', 'تنبیهات'],
            'right': ['حقوق قانونی', 'امتیازات', 'اختیارات']
        }
        return intent_suggestions.get(intent, [])

    def _get_popular_suggestions(self, query: str) -> List[str]:
        """Get popular query suggestions"""
        # Find similar popular queries
        similar_queries = []
        for popular_query, count in self.popular_queries.items():
            similarity = PersianTextProcessor.calculate_similarity(query, popular_query)
            if similarity > 0.3:
                similar_queries.append((popular_query, count, similarity))
        
        # Sort by similarity and popularity
        similar_queries.sort(key=lambda x: (x[2], x[1]), reverse=True)
        return [q[0] for q in similar_queries[:5]]

    async def _get_user_history_suggestions(self, user_id: str, query: str) -> List[str]:
        """Get suggestions based on user search history"""
        try:
            if self.redis:
                # Get user search history from Redis
                history_key = f"user_search_history:{user_id}"
                history = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: self.redis.lrange(history_key, 0, 20)
                )
                
                # Find similar queries in history
                similar_queries = []
                for historical_query in history:
                    historical_query = historical_query.decode('utf-8')
                    similarity = PersianTextProcessor.calculate_similarity(query, historical_query)
                    if similarity > 0.4:
                        similar_queries.append(historical_query)
                
                return similar_queries[:3]
        except Exception as e:
            logger.error(f"Failed to get user history suggestions: {e}")
        
        return []

    def _calculate_confidence(self, query: str, legal_terms: List[LegalTerm], synonyms: List[str]) -> float:
        """Calculate confidence score for enhancement"""
        confidence = 0.5  # Base confidence
        
        # Boost confidence for legal terms
        if legal_terms:
            confidence += min(0.3, len(legal_terms) * 0.1)
        
        # Boost confidence for synonyms
        if synonyms:
            confidence += min(0.2, len(synonyms) * 0.05)
        
        # Boost confidence for query length
        if len(query.split()) > 2:
            confidence += 0.1
        
        return min(1.0, confidence)

    def _update_search_history(self, query: str):
        """Update search history and popular queries"""
        self.search_history.append(query)
        self.popular_queries[query] += 1
        
        # Keep only recent history
        if len(self.search_history) > 1000:
            self.search_history = self.search_history[-1000:]

    async def _get_from_cache(self, cache_key: str) -> Optional[QueryEnhancement]:
        """Get enhancement result from cache"""
        try:
            cached_data = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.redis.get(cache_key)
            )
            
            if cached_data:
                data = json.loads(cached_data)
                return QueryEnhancement(**data)
        except Exception as e:
            logger.error(f"Cache retrieval failed: {e}")
        
        return None

    async def _cache_result(self, cache_key: str, result: QueryEnhancement):
        """Cache enhancement result"""
        try:
            data = asdict(result)
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.redis.setex(cache_key, 3600, json.dumps(data, ensure_ascii=False))
            )
        except Exception as e:
            logger.error(f"Cache storage failed: {e}")

    async def get_autocomplete_suggestions(self, partial_query: str, limit: int = 10) -> List[str]:
        """Get autocomplete suggestions for partial query"""
        try:
            suggestions = []
            
            # Get suggestions from legal terms
            for term in self.legal_dictionary.terms.values():
                if term.term.startswith(partial_query):
                    suggestions.append(term.term)
            
            # Get suggestions from synonyms
            for term, synonyms in self.synonyms_db.items():
                if term.startswith(partial_query):
                    suggestions.append(term)
                for synonym in synonyms:
                    if synonym.startswith(partial_query):
                        suggestions.append(synonym)
            
            # Get suggestions from popular queries
            for query in self.popular_queries.keys():
                if query.startswith(partial_query):
                    suggestions.append(query)
            
            # Remove duplicates and sort by frequency
            unique_suggestions = list(set(suggestions))
            unique_suggestions.sort(key=lambda x: self.popular_queries.get(x, 0), reverse=True)
            
            return unique_suggestions[:limit]
            
        except Exception as e:
            logger.error(f"Autocomplete suggestions failed: {e}")
            return []

    def correct_typos(self, query: str) -> str:
        """Correct common Persian typos in query"""
        corrected_query = query
        
        for correct, typos in self.typo_patterns.items():
            for typo in typos:
                corrected_query = corrected_query.replace(typo, correct)
        
        return corrected_query

    def get_enhancement_statistics(self) -> Dict[str, Any]:
        """Get query enhancement statistics"""
        return {
            'total_terms': len(self.legal_dictionary.terms),
            'total_synonyms': len(self.synonyms_db),
            'search_history_size': len(self.search_history),
            'popular_queries_count': len(self.popular_queries),
            'cache_hit_rate': 'N/A'  # Would need to track this
        }

# Global query enhancer instance
query_enhancer = QueryEnhancer()