"""
Search Manager - Main integration point for all search features
Provides unified search management for the Legal API Platform
"""

from typing import Dict, List, Optional, Any
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
import logging
import time
import asyncio

from .query_enhancer import query_enhancer, QueryEnhancement
from .search_analytics import search_analytics, SearchEvent
from .personalization_engine import personalization_engine, PersonalizedResult

logger = logging.getLogger(__name__)

class SearchManager:
    """
    Unified search management system
    """
    
    def __init__(self, app: FastAPI):
        self.app = app
        self.search_config = self._get_search_config()
        
        # Initialize search components
        self._setup_search_routes()
        
        logger.info("Search Manager initialized successfully")

    def _get_search_config(self) -> Dict[str, Any]:
        """Get search configuration"""
        return {
            'query_enhancement': {
                'enabled': True,
                'confidence_threshold': 0.7,
                'max_suggestions': 10
            },
            'personalization': {
                'enabled': True,
                'min_interactions': 5,
                'learning_rate': 0.1
            },
            'analytics': {
                'enabled': True,
                'track_clicks': True,
                'track_views': True
            },
            'performance': {
                'max_response_time': 1000,  # ms
                'cache_ttl': 3600,  # seconds
                'max_results': 1000
            }
        }

    def _setup_search_routes(self):
        """Setup search-related API routes"""
        
        @self.app.post("/api/search/advanced")
        async def advanced_search(request: Request):
            """Advanced search endpoint with all features"""
            try:
                data = await request.json()
                query = data.get('query', '')
                filters = data.get('filters', {})
                page = data.get('page', 1)
                limit = data.get('limit', 20)
                user_id = getattr(request.state, 'user_id', None)
                
                if not query.strip():
                    raise HTTPException(status_code=400, detail="Query is required")
                
                # Start timing
                start_time = time.time()
                
                # Enhance query
                enhancement = await query_enhancer.enhance_query(query, {'user_id': user_id})
                
                # Perform search (this would integrate with your actual search engine)
                search_results = await self._perform_search(enhancement.enhanced_query, filters, page, limit)
                
                # Personalize results if user is logged in
                if user_id and self.search_config['personalization']['enabled']:
                    personalized_results = await personalization_engine.personalize_search_results(
                        user_id, search_results, query
                    )
                    search_results = [
                        {
                            'id': result.document_id,
                            'title': f"Document {result.document_id}",
                            'content': f"Content for document {result.document_id}",
                            'score': result.personalized_score,
                            'boost_factors': result.boost_factors,
                            'explanation': result.explanation
                        }
                        for result in personalized_results
                    ]
                
                # Calculate response time
                response_time = (time.time() - start_time) * 1000
                
                # Track search event
                if self.search_config['analytics']['enabled']:
                    await search_analytics.track_search_event(
                        request=request,
                        query=query,
                        response_time=response_time,
                        result_count=len(search_results),
                        user_id=user_id,
                        filters_used=filters
                    )
                
                return {
                    'query': query,
                    'enhanced_query': enhancement.enhanced_query,
                    'suggestions': enhancement.suggestions,
                    'results': search_results,
                    'total': len(search_results),
                    'page': page,
                    'limit': limit,
                    'response_time': response_time,
                    'personalized': user_id is not None
                }
                
            except Exception as e:
                logger.error(f"Advanced search failed: {e}")
                raise HTTPException(status_code=500, detail="Search failed")

        @self.app.get("/api/search/suggestions")
        async def get_suggestions(q: str, limit: int = 10):
            """Get search suggestions"""
            try:
                if len(q) < 2:
                    return []
                
                suggestions = await query_enhancer.get_autocomplete_suggestions(q, limit)
                return suggestions
                
            except Exception as e:
                logger.error(f"Suggestions failed: {e}")
                return []

        @self.app.get("/api/search/history")
        async def get_search_history(user_id: Optional[str] = None):
            """Get search history"""
            try:
                if not user_id:
                    return []
                
                history = await search_analytics.get_user_search_history(user_id, 50)
                return [
                    {
                        'query': event.query,
                        'timestamp': event.timestamp.isoformat(),
                        'result_count': event.result_count
                    }
                    for event in history
                ]
                
            except Exception as e:
                logger.error(f"Search history failed: {e}")
                return []

        @self.app.post("/api/search/history")
        async def add_to_history(request: Request):
            """Add query to search history"""
            try:
                data = await request.json()
                query = data.get('query', '')
                user_id = getattr(request.state, 'user_id', None)
                
                if user_id and query:
                    # This would be handled by the analytics system
                    pass
                
                return {"status": "success"}
                
            except Exception as e:
                logger.error(f"Add to history failed: {e}")
                return {"status": "error"}

        @self.app.get("/api/search/saved")
        async def get_saved_searches(user_id: Optional[str] = None):
            """Get saved searches"""
            try:
                if not user_id:
                    return []
                
                # This would fetch from database
                return []
                
            except Exception as e:
                logger.error(f"Saved searches failed: {e}")
                return []

        @self.app.post("/api/search/saved")
        async def save_search(request: Request):
            """Save a search"""
            try:
                data = await request.json()
                name = data.get('name', '')
                query = data.get('query', '')
                filters = data.get('filters', {})
                user_id = getattr(request.state, 'user_id', None)
                
                if not user_id or not name or not query:
                    raise HTTPException(status_code=400, detail="Missing required fields")
                
                # This would save to database
                return {"status": "success", "id": "saved_search_id"}
                
            except Exception as e:
                logger.error(f"Save search failed: {e}")
                raise HTTPException(status_code=500, detail="Save failed")

        @self.app.get("/api/search/templates")
        async def get_search_templates():
            """Get search templates"""
            try:
                # Sample templates
                templates = [
                    {
                        'id': 'contract_search',
                        'name': 'جستجوی قرارداد',
                        'description': 'جستجو در قراردادها و توافق‌نامه‌ها',
                        'query': 'قرارداد',
                        'filters': {'category': 'contracts'},
                        'category': 'قانون مدنی'
                    },
                    {
                        'id': 'family_law',
                        'name': 'قانون خانواده',
                        'description': 'جستجو در مسائل حقوق خانواده',
                        'query': 'طلاق نکاح مهریه',
                        'filters': {'category': 'family'},
                        'category': 'قانون خانواده'
                    },
                    {
                        'id': 'criminal_law',
                        'name': 'قانون جزا',
                        'description': 'جستجو در مسائل کیفری',
                        'query': 'جرم مجازات',
                        'filters': {'category': 'criminal'},
                        'category': 'قانون جزا'
                    }
                ]
                
                return templates
                
            except Exception as e:
                logger.error(f"Search templates failed: {e}")
                return []

        @self.app.get("/api/search/filters")
        async def get_search_filters():
            """Get available search filters"""
            try:
                filters = [
                    {
                        'id': 'date_range',
                        'name': 'بازه زمانی',
                        'type': 'date',
                        'options': []
                    },
                    {
                        'id': 'document_type',
                        'name': 'نوع سند',
                        'type': 'select',
                        'options': [
                            {'value': 'contract', 'label': 'قرارداد', 'count': 150},
                            {'value': 'law', 'label': 'قانون', 'count': 200},
                            {'value': 'regulation', 'label': 'آیین‌نامه', 'count': 100},
                            {'value': 'judgment', 'label': 'رأی', 'count': 300}
                        ]
                    },
                    {
                        'id': 'category',
                        'name': 'دسته‌بندی',
                        'type': 'multiselect',
                        'options': [
                            {'value': 'civil', 'label': 'قانون مدنی', 'count': 250},
                            {'value': 'family', 'label': 'قانون خانواده', 'count': 180},
                            {'value': 'criminal', 'label': 'قانون جزا', 'count': 220},
                            {'value': 'commercial', 'label': 'قانون تجارت', 'count': 150}
                        ]
                    },
                    {
                        'id': 'source',
                        'name': 'منبع',
                        'type': 'select',
                        'options': [
                            {'value': 'official', 'label': 'رسمی', 'count': 400},
                            {'value': 'court', 'label': 'دادگاه', 'count': 200},
                            {'value': 'ministry', 'label': 'وزارتخانه', 'count': 100}
                        ]
                    }
                ]
                
                return filters
                
            except Exception as e:
                logger.error(f"Search filters failed: {e}")
                return []

        @self.app.post("/api/search/click")
        async def track_click(request: Request):
            """Track click on search result"""
            try:
                data = await request.json()
                event_id = data.get('event_id', '')
                result_id = data.get('result_id', '')
                position = data.get('position', 0)
                user_id = getattr(request.state, 'user_id', None)
                
                if event_id and result_id:
                    await search_analytics.track_click_event(event_id, result_id, position, user_id)
                    
                    # Learn from interaction
                    if user_id:
                        await personalization_engine.learn_from_interaction(
                            user_id, 'click', {
                                'document_id': result_id,
                                'position': position,
                                'time_spent': 30.0  # Default time
                            }
                        )
                
                return {"status": "success"}
                
            except Exception as e:
                logger.error(f"Click tracking failed: {e}")
                return {"status": "error"}

        @self.app.get("/api/search/analytics")
        async def get_search_analytics(days: int = 7):
            """Get search analytics"""
            try:
                metrics = await search_analytics.get_search_metrics(days)
                return {
                    'metrics': {
                        'total_searches': metrics.total_searches,
                        'unique_users': metrics.unique_users,
                        'avg_response_time': metrics.avg_response_time,
                        'avg_result_count': metrics.avg_result_count,
                        'click_through_rate': metrics.click_through_rate,
                        'zero_result_rate': metrics.zero_result_rate
                    },
                    'popular_queries': metrics.popular_queries,
                    'search_trends': metrics.search_trends,
                    'user_behavior': metrics.user_behavior
                }
                
            except Exception as e:
                logger.error(f"Search analytics failed: {e}")
                return {}

        @self.app.get("/api/search/recommendations")
        async def get_recommendations(user_id: Optional[str] = None, limit: int = 10):
            """Get personalized recommendations"""
            try:
                if not user_id:
                    return []
                
                recommendations = await personalization_engine.get_recommendations(user_id, limit)
                return [
                    {
                        'document_id': rec.document_id,
                        'title': rec.title,
                        'category': rec.category,
                        'confidence': rec.confidence,
                        'reason': rec.reason
                    }
                    for rec in recommendations
                ]
                
            except Exception as e:
                logger.error(f"Recommendations failed: {e}")
                return []

    async def _perform_search(self, query: str, filters: Dict[str, Any], page: int, limit: int) -> List[Dict[str, Any]]:
        """Perform actual search (placeholder - integrate with your search engine)"""
        # This is a placeholder - integrate with your actual search engine
        # For now, return mock results
        
        mock_results = []
        for i in range(min(limit, 20)):
            mock_results.append({
                'id': f'doc_{i+1}',
                'title': f'Document {i+1} - {query}',
                'content': f'This is the content of document {i+1} related to {query}',
                'score': 1.0 - (i * 0.05),
                'category': 'General',
                'date': '2024-01-01',
                'author': 'System'
            })
        
        return mock_results

    def get_search_statistics(self) -> Dict[str, Any]:
        """Get search system statistics"""
        return {
            'query_enhancer': query_enhancer.get_enhancement_statistics(),
            'analytics': search_analytics.get_analytics_summary(),
            'personalization': personalization_engine.get_engine_statistics(),
            'config': self.search_config
        }

# Search decorators for easy use
def search_endpoint(enhance_query: bool = True, track_analytics: bool = True):
    """Decorator for search endpoints"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Add search-specific functionality
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def personalized_search(func):
    """Decorator for personalized search endpoints"""
    async def wrapper(*args, **kwargs):
        # Add personalization functionality
        return await func(*args, **kwargs)
    return wrapper