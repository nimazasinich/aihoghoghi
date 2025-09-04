"""
Personalization Engine for Legal API Platform
Provides user preference learning, personalized search results, and recommendation system
"""

import time
import json
import math
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import logging
import asyncio
import redis
from fastapi import Request
import numpy as np

logger = logging.getLogger(__name__)

@dataclass
class UserPreference:
    """User preference data structure"""
    user_id: str
    preferred_categories: Dict[str, float]
    preferred_document_types: Dict[str, float]
    preferred_sources: Dict[str, float]
    search_patterns: Dict[str, Any]
    click_behavior: Dict[str, float]
    time_preferences: Dict[str, float]
    last_updated: datetime

@dataclass
class PersonalizedResult:
    """Personalized search result"""
    document_id: str
    original_score: float
    personalized_score: float
    boost_factors: Dict[str, float]
    explanation: str

@dataclass
class Recommendation:
    """Recommendation data structure"""
    document_id: str
    title: str
    category: str
    confidence: float
    reason: str
    similarity_score: float

class UserBehaviorAnalyzer:
    """Analyzes user behavior patterns"""
    
    def __init__(self):
        self.click_patterns: Dict[str, List[Tuple[str, int, float]]] = defaultdict(list)  # user_id -> [(doc_id, position, time_spent)]
        self.search_patterns: Dict[str, List[str]] = defaultdict(list)  # user_id -> [queries]
        self.session_data: Dict[str, List[Dict]] = defaultdict(list)  # user_id -> [sessions]
    
    def analyze_click_behavior(self, user_id: str, document_id: str, position: int, time_spent: float):
        """Analyze user click behavior"""
        self.click_patterns[user_id].append((document_id, position, time_spent))
        
        # Keep only recent clicks
        if len(self.click_patterns[user_id]) > 1000:
            self.click_patterns[user_id] = self.click_patterns[user_id][-1000:]
    
    def analyze_search_patterns(self, user_id: str, query: str):
        """Analyze user search patterns"""
        self.search_patterns[user_id].append(query)
        
        # Keep only recent searches
        if len(self.search_patterns[user_id]) > 500:
            self.search_patterns[user_id] = self.search_patterns[user_id][-500:]
    
    def get_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """Extract user preferences from behavior"""
        preferences = {
            'preferred_positions': self._get_preferred_positions(user_id),
            'preferred_categories': self._get_preferred_categories(user_id),
            'search_complexity': self._get_search_complexity(user_id),
            'time_patterns': self._get_time_patterns(user_id)
        }
        return preferences
    
    def _get_preferred_positions(self, user_id: str) -> Dict[int, float]:
        """Get user's preferred click positions"""
        clicks = self.click_patterns.get(user_id, [])
        position_weights = defaultdict(float)
        
        for doc_id, position, time_spent in clicks:
            # Weight by time spent (more time = higher preference)
            position_weights[position] += time_spent
        
        # Normalize weights
        total_weight = sum(position_weights.values())
        if total_weight > 0:
            for position in position_weights:
                position_weights[position] /= total_weight
        
        return dict(position_weights)
    
    def _get_preferred_categories(self, user_id: str) -> Dict[str, float]:
        """Get user's preferred document categories"""
        # This would need to be connected to document metadata
        # For now, return empty dict
        return {}
    
    def _get_search_complexity(self, user_id: str) -> float:
        """Get user's preferred search complexity"""
        queries = self.search_patterns.get(user_id, [])
        if not queries:
            return 0.5  # Default complexity
        
        avg_length = sum(len(query.split()) for query in queries) / len(queries)
        # Normalize to 0-1 scale
        return min(1.0, avg_length / 10.0)
    
    def _get_time_patterns(self, user_id: str) -> Dict[str, float]:
        """Get user's time-based patterns"""
        # This would analyze when user is most active
        # For now, return empty dict
        return {}

class CollaborativeFiltering:
    """Collaborative filtering for recommendations"""
    
    def __init__(self):
        self.user_item_matrix: Dict[str, Dict[str, float]] = defaultdict(dict)
        self.item_similarity: Dict[str, Dict[str, float]] = defaultdict(dict)
        self.user_similarity: Dict[str, Dict[str, float]] = defaultdict(dict)
    
    def add_interaction(self, user_id: str, item_id: str, rating: float):
        """Add user-item interaction"""
        self.user_item_matrix[user_id][item_id] = rating
        
        # Update item similarity
        self._update_item_similarity(item_id)
        
        # Update user similarity
        self._update_user_similarity(user_id)
    
    def _update_item_similarity(self, item_id: str):
        """Update similarity between items"""
        if item_id not in self.item_similarity:
            self.item_similarity[item_id] = {}
        
        # Find users who interacted with this item
        users_for_item = set()
        for user_id, items in self.user_item_matrix.items():
            if item_id in items:
                users_for_item.add(user_id)
        
        # Calculate similarity with other items
        for other_item_id, other_users in self.user_item_matrix.items():
            if other_item_id != item_id:
                users_for_other = set(other_users.keys())
                
                # Jaccard similarity
                intersection = len(users_for_item.intersection(users_for_other))
                union = len(users_for_item.union(users_for_other))
                
                if union > 0:
                    similarity = intersection / union
                    self.item_similarity[item_id][other_item_id] = similarity
                    self.item_similarity[other_item_id][item_id] = similarity
    
    def _update_user_similarity(self, user_id: str):
        """Update similarity between users"""
        if user_id not in self.user_similarity:
            self.user_similarity[user_id] = {}
        
        user_items = set(self.user_item_matrix[user_id].keys())
        
        for other_user_id, other_items in self.user_item_matrix.items():
            if other_user_id != user_id:
                other_user_items = set(other_items.keys())
                
                # Jaccard similarity
                intersection = len(user_items.intersection(other_user_items))
                union = len(user_items.union(other_user_items))
                
                if union > 0:
                    similarity = intersection / union
                    self.user_similarity[user_id][other_user_id] = similarity
                    self.user_similarity[other_user_id][user_id] = similarity
    
    def get_item_recommendations(self, user_id: str, limit: int = 10) -> List[Tuple[str, float]]:
        """Get item-based recommendations for user"""
        user_items = self.user_item_matrix.get(user_id, {})
        recommendations = defaultdict(float)
        
        for item_id, rating in user_items.items():
            similar_items = self.item_similarity.get(item_id, {})
            
            for similar_item, similarity in similar_items.items():
                if similar_item not in user_items:
                    recommendations[similar_item] += rating * similarity
        
        # Sort by score and return top recommendations
        sorted_recommendations = sorted(recommendations.items(), key=lambda x: x[1], reverse=True)
        return sorted_recommendations[:limit]
    
    def get_user_recommendations(self, user_id: str, limit: int = 10) -> List[Tuple[str, float]]:
        """Get user-based recommendations"""
        similar_users = self.user_similarity.get(user_id, {})
        user_items = self.user_item_matrix.get(user_id, {})
        recommendations = defaultdict(float)
        
        for similar_user, similarity in similar_users.items():
            similar_user_items = self.user_item_matrix.get(similar_user, {})
            
            for item_id, rating in similar_user_items.items():
                if item_id not in user_items:
                    recommendations[item_id] += rating * similarity
        
        # Sort by score and return top recommendations
        sorted_recommendations = sorted(recommendations.items(), key=lambda x: x[1], reverse=True)
        return sorted_recommendations[:limit]

class PersonalizationEngine:
    """
    Advanced personalization engine for search results and recommendations
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis = redis_client
        self.user_preferences: Dict[str, UserPreference] = {}
        self.behavior_analyzer = UserBehaviorAnalyzer()
        self.collaborative_filtering = CollaborativeFiltering()
        
        # Personalization weights
        self.weights = {
            'click_behavior': 0.3,
            'search_history': 0.2,
            'category_preference': 0.2,
            'time_preference': 0.1,
            'collaborative': 0.2
        }
        
        # Learning parameters
        self.learning_rate = 0.1
        self.decay_factor = 0.95
        self.min_interactions = 5

    async def personalize_search_results(
        self,
        user_id: str,
        search_results: List[Dict[str, Any]],
        query: str,
        context: Optional[Dict[str, Any]] = None
    ) -> List[PersonalizedResult]:
        """Personalize search results for user"""
        try:
            # Get user preferences
            user_prefs = await self._get_user_preferences(user_id)
            
            personalized_results = []
            
            for result in search_results:
                # Calculate personalized score
                personalized_score, boost_factors = self._calculate_personalized_score(
                    user_id, result, user_prefs, query, context
                )
                
                # Create personalized result
                personalized_result = PersonalizedResult(
                    document_id=result.get('id', ''),
                    original_score=result.get('score', 0.0),
                    personalized_score=personalized_score,
                    boost_factors=boost_factors,
                    explanation=self._generate_explanation(boost_factors)
                )
                
                personalized_results.append(personalized_result)
            
            # Sort by personalized score
            personalized_results.sort(key=lambda x: x.personalized_score, reverse=True)
            
            return personalized_results
            
        except Exception as e:
            logger.error(f"Personalization failed: {e}")
            # Return original results with default scores
            return [
                PersonalizedResult(
                    document_id=result.get('id', ''),
                    original_score=result.get('score', 0.0),
                    personalized_score=result.get('score', 0.0),
                    boost_factors={},
                    explanation="Personalization unavailable"
                )
                for result in search_results
            ]

    def _calculate_personalized_score(
        self,
        user_id: str,
        result: Dict[str, Any],
        user_prefs: UserPreference,
        query: str,
        context: Optional[Dict[str, Any]]
    ) -> Tuple[float, Dict[str, float]]:
        """Calculate personalized score for a result"""
        original_score = result.get('score', 0.0)
        boost_factors = {}
        
        # Click behavior boost
        click_boost = self._calculate_click_behavior_boost(user_id, result)
        boost_factors['click_behavior'] = click_boost
        
        # Search history boost
        history_boost = self._calculate_search_history_boost(user_id, result, query)
        boost_factors['search_history'] = history_boost
        
        # Category preference boost
        category_boost = self._calculate_category_boost(user_prefs, result)
        boost_factors['category_preference'] = category_boost
        
        # Time preference boost
        time_boost = self._calculate_time_boost(user_prefs, context)
        boost_factors['time_preference'] = time_boost
        
        # Collaborative filtering boost
        collaborative_boost = self._calculate_collaborative_boost(user_id, result)
        boost_factors['collaborative'] = collaborative_boost
        
        # Calculate weighted personalized score
        personalized_score = original_score
        for factor, boost in boost_factors.items():
            weight = self.weights.get(factor, 0.0)
            personalized_score += boost * weight
        
        return personalized_score, boost_factors

    def _calculate_click_behavior_boost(self, user_id: str, result: Dict[str, Any]) -> float:
        """Calculate boost based on user's click behavior"""
        # This would analyze if user typically clicks on similar results
        # For now, return neutral boost
        return 0.0

    def _calculate_search_history_boost(self, user_id: str, result: Dict[str, Any], query: str) -> float:
        """Calculate boost based on search history"""
        # This would analyze if user has clicked on similar results for similar queries
        # For now, return neutral boost
        return 0.0

    def _calculate_category_boost(self, user_prefs: UserPreference, result: Dict[str, Any]) -> float:
        """Calculate boost based on category preferences"""
        result_category = result.get('category', '')
        if result_category in user_prefs.preferred_categories:
            return user_prefs.preferred_categories[result_category]
        return 0.0

    def _calculate_time_boost(self, user_prefs: UserPreference, context: Optional[Dict[str, Any]]) -> float:
        """Calculate boost based on time preferences"""
        if not context or 'timestamp' not in context:
            return 0.0
        
        # This would analyze if user is active at this time
        # For now, return neutral boost
        return 0.0

    def _calculate_collaborative_boost(self, user_id: str, result: Dict[str, Any]) -> float:
        """Calculate boost based on collaborative filtering"""
        result_id = result.get('id', '')
        recommendations = self.collaborative_filtering.get_item_recommendations(user_id, 100)
        
        for item_id, score in recommendations:
            if item_id == result_id:
                return score
        
        return 0.0

    def _generate_explanation(self, boost_factors: Dict[str, float]) -> str:
        """Generate explanation for personalization"""
        explanations = []
        
        for factor, boost in boost_factors.items():
            if boost > 0.1:
                if factor == 'click_behavior':
                    explanations.append("بر اساس رفتار کلیک شما")
                elif factor == 'search_history':
                    explanations.append("بر اساس تاریخچه جستجو")
                elif factor == 'category_preference':
                    explanations.append("بر اساس علایق شما")
                elif factor == 'collaborative':
                    explanations.append("بر اساس کاربران مشابه")
        
        if explanations:
            return "شخصی‌سازی شده: " + "، ".join(explanations)
        else:
            return "نتایج استاندارد"

    async def _get_user_preferences(self, user_id: str) -> UserPreference:
        """Get or create user preferences"""
        if user_id not in self.user_preferences:
            self.user_preferences[user_id] = UserPreference(
                user_id=user_id,
                preferred_categories={},
                preferred_document_types={},
                preferred_sources={},
                search_patterns={},
                click_behavior={},
                time_preferences={},
                last_updated=datetime.utcnow()
            )
        
        return self.user_preferences[user_id]

    async def learn_from_interaction(
        self,
        user_id: str,
        interaction_type: str,
        data: Dict[str, Any]
    ):
        """Learn from user interactions"""
        try:
            if interaction_type == 'click':
                await self._learn_from_click(user_id, data)
            elif interaction_type == 'search':
                await self._learn_from_search(user_id, data)
            elif interaction_type == 'view':
                await self._learn_from_view(user_id, data)
            
            # Update user preferences
            await self._update_user_preferences(user_id)
            
        except Exception as e:
            logger.error(f"Learning from interaction failed: {e}")

    async def _learn_from_click(self, user_id: str, data: Dict[str, Any]):
        """Learn from click interactions"""
        document_id = data.get('document_id')
        position = data.get('position', 0)
        time_spent = data.get('time_spent', 0.0)
        
        # Update behavior analyzer
        self.behavior_analyzer.analyze_click_behavior(user_id, document_id, position, time_spent)
        
        # Update collaborative filtering
        rating = min(1.0, time_spent / 60.0)  # Convert time to rating
        self.collaborative_filtering.add_interaction(user_id, document_id, rating)

    async def _learn_from_search(self, user_id: str, data: Dict[str, Any]):
        """Learn from search interactions"""
        query = data.get('query', '')
        
        # Update behavior analyzer
        self.behavior_analyzer.analyze_search_patterns(user_id, query)

    async def _learn_from_view(self, user_id: str, data: Dict[str, Any]):
        """Learn from view interactions"""
        document_id = data.get('document_id')
        category = data.get('category', '')
        document_type = data.get('type', '')
        
        # Update preferences
        user_prefs = await self._get_user_preferences(user_id)
        
        if category:
            current_pref = user_prefs.preferred_categories.get(category, 0.0)
            user_prefs.preferred_categories[category] = current_pref + self.learning_rate
        
        if document_type:
            current_pref = user_prefs.preferred_document_types.get(document_type, 0.0)
            user_prefs.preferred_document_types[document_type] = current_pref + self.learning_rate

    async def _update_user_preferences(self, user_id: str):
        """Update user preferences based on behavior analysis"""
        user_prefs = await self._get_user_preferences(user_id)
        behavior_prefs = self.behavior_analyzer.get_user_preferences(user_id)
        
        # Update search patterns
        user_prefs.search_patterns.update(behavior_prefs)
        
        # Apply decay to old preferences
        for category in user_prefs.preferred_categories:
            user_prefs.preferred_categories[category] *= self.decay_factor
        
        for doc_type in user_prefs.preferred_document_types:
            user_prefs.preferred_document_types[doc_type] *= self.decay_factor
        
        user_prefs.last_updated = datetime.utcnow()

    async def get_recommendations(
        self,
        user_id: str,
        limit: int = 10,
        category: Optional[str] = None
    ) -> List[Recommendation]:
        """Get personalized recommendations for user"""
        try:
            # Get collaborative filtering recommendations
            item_recs = self.collaborative_filtering.get_item_recommendations(user_id, limit * 2)
            user_recs = self.collaborative_filtering.get_user_recommendations(user_id, limit * 2)
            
            # Combine recommendations
            all_recs = {}
            for item_id, score in item_recs:
                all_recs[item_id] = all_recs.get(item_id, 0) + score * 0.6
            
            for item_id, score in user_recs:
                all_recs[item_id] = all_recs.get(item_id, 0) + score * 0.4
            
            # Sort by score
            sorted_recs = sorted(all_recs.items(), key=lambda x: x[1], reverse=True)
            
            # Create recommendation objects
            recommendations = []
            for item_id, score in sorted_recs[:limit]:
                recommendation = Recommendation(
                    document_id=item_id,
                    title=f"Document {item_id}",  # Would get from document service
                    category=category or "General",
                    confidence=score,
                    reason="بر اساس علایق شما و کاربران مشابه",
                    similarity_score=score
                )
                recommendations.append(recommendation)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to get recommendations: {e}")
            return []

    async def get_personalization_insights(self, user_id: str) -> Dict[str, Any]:
        """Get personalization insights for user"""
        try:
            user_prefs = await self._get_user_preferences(user_id)
            behavior_prefs = self.behavior_analyzer.get_user_preferences(user_id)
            
            return {
                'user_id': user_id,
                'preferred_categories': user_prefs.preferred_categories,
                'preferred_document_types': user_prefs.preferred_document_types,
                'search_complexity': behavior_prefs.get('search_complexity', 0.5),
                'total_interactions': len(self.behavior_analyzer.click_patterns.get(user_id, [])),
                'last_updated': user_prefs.last_updated.isoformat(),
                'personalization_active': len(user_prefs.preferred_categories) > 0
            }
            
        except Exception as e:
            logger.error(f"Failed to get personalization insights: {e}")
            return {}

    def get_engine_statistics(self) -> Dict[str, Any]:
        """Get personalization engine statistics"""
        return {
            'total_users': len(self.user_preferences),
            'total_interactions': sum(len(clicks) for clicks in self.behavior_analyzer.click_patterns.values()),
            'total_searches': sum(len(searches) for searches in self.behavior_analyzer.search_patterns.values()),
            'collaborative_items': len(self.collaborative_filtering.user_item_matrix),
            'active_users': len([user for user, prefs in self.user_preferences.items() 
                               if len(prefs.preferred_categories) > 0])
        }

# Global personalization engine instance
personalization_engine = PersonalizationEngine()