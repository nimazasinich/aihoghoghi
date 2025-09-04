"""
Search Analytics System for Legal API Platform
Provides comprehensive search analytics, user behavior tracking, and performance metrics
"""

import time
import json
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import logging
import asyncio
import redis
from fastapi import Request
import hashlib

logger = logging.getLogger(__name__)

@dataclass
class SearchEvent:
    """Search event data structure"""
    event_id: str
    user_id: Optional[str]
    session_id: str
    query: str
    timestamp: datetime
    response_time: float
    result_count: int
    clicked_results: List[str]
    filters_used: Dict[str, Any]
    user_agent: str
    ip_address: str
    referrer: Optional[str]

@dataclass
class SearchMetrics:
    """Search performance metrics"""
    total_searches: int
    unique_users: int
    avg_response_time: float
    avg_result_count: float
    click_through_rate: float
    zero_result_rate: float
    popular_queries: List[Tuple[str, int]]
    search_trends: List[Dict[str, Any]]
    user_behavior: Dict[str, Any]

@dataclass
class UserSearchProfile:
    """User search behavior profile"""
    user_id: str
    total_searches: int
    avg_session_length: float
    preferred_categories: List[str]
    search_patterns: Dict[str, Any]
    last_search: datetime
    search_frequency: str  # daily, weekly, monthly

class SearchAnalytics:
    """
    Comprehensive search analytics system
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis = redis_client
        self.search_events: List[SearchEvent] = []
        self.user_profiles: Dict[str, UserSearchProfile] = {}
        self.query_performance: Dict[str, Dict[str, Any]] = defaultdict(dict)
        
        # Analytics data
        self.daily_stats: Dict[str, Dict[str, Any]] = defaultdict(dict)
        self.hourly_stats: Dict[str, Dict[str, Any]] = defaultdict(dict)
        self.query_stats: Dict[str, int] = defaultdict(int)
        self.user_stats: Dict[str, int] = defaultdict(int)
        
        # Performance tracking
        self.response_times: List[float] = []
        self.result_counts: List[int] = []
        self.click_through_rates: Dict[str, float] = {}

    def _generate_event_id(self) -> str:
        """Generate unique event ID"""
        return f"search_{int(time.time())}_{hashlib.md5(str(time.time()).encode()).hexdigest()[:8]}"

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address"""
        forwarded_for = request.headers.get('x-forwarded-for')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        real_ip = request.headers.get('x-real-ip')
        if real_ip:
            return real_ip
        
        return request.client.host

    async def track_search_event(
        self,
        request: Request,
        query: str,
        response_time: float,
        result_count: int,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        filters_used: Optional[Dict[str, Any]] = None,
        clicked_results: Optional[List[str]] = None
    ) -> str:
        """Track a search event"""
        try:
            event_id = self._generate_event_id()
            
            # Extract request information
            ip_address = self._get_client_ip(request)
            user_agent = request.headers.get('user-agent', '')
            referrer = request.headers.get('referer')
            
            # Create search event
            search_event = SearchEvent(
                event_id=event_id,
                user_id=user_id,
                session_id=session_id or self._generate_session_id(request),
                query=query,
                timestamp=datetime.utcnow(),
                response_time=response_time,
                result_count=result_count,
                clicked_results=clicked_results or [],
                filters_used=filters_used or {},
                user_agent=user_agent,
                ip_address=ip_address,
                referrer=referrer
            )
            
            # Store event
            await self._store_search_event(search_event)
            
            # Update analytics
            await self._update_analytics(search_event)
            
            # Update user profile
            if user_id:
                await self._update_user_profile(user_id, search_event)
            
            logger.info(f"Search event tracked: {event_id}")
            return event_id
            
        except Exception as e:
            logger.error(f"Failed to track search event: {e}")
            return ""

    def _generate_session_id(self, request: Request) -> str:
        """Generate session ID from request"""
        ip = self._get_client_ip(request)
        user_agent = request.headers.get('user-agent', '')
        return hashlib.md5(f"{ip}_{user_agent}_{int(time.time() / 3600)}".encode()).hexdigest()

    async def _store_search_event(self, event: SearchEvent):
        """Store search event in memory and Redis"""
        # Store in memory
        self.search_events.append(event)
        
        # Keep only recent events in memory
        if len(self.search_events) > 10000:
            self.search_events = self.search_events[-10000:]
        
        # Store in Redis if available
        if self.redis:
            try:
                event_data = asdict(event)
                event_data['timestamp'] = event.timestamp.isoformat()
                
                # Store event
                await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: self.redis.setex(
                        f"search_event:{event.event_id}",
                        86400,  # 24 hours
                        json.dumps(event_data, ensure_ascii=False)
                    )
                )
                
                # Add to time-based index
                score = event.timestamp.timestamp()
                await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: self.redis.zadd(
                        "search_events_by_time",
                        {event.event_id: score}
                    )
                )
                
                # Add to user index
                if event.user_id:
                    await asyncio.get_event_loop().run_in_executor(
                        None,
                        lambda: self.redis.zadd(
                            f"search_events_by_user:{event.user_id}",
                            {event.event_id: score}
                        )
                    )
                
            except Exception as e:
                logger.error(f"Failed to store search event in Redis: {e}")

    async def _update_analytics(self, event: SearchEvent):
        """Update analytics data"""
        try:
            # Update daily stats
            date_key = event.timestamp.strftime('%Y-%m-%d')
            if date_key not in self.daily_stats:
                self.daily_stats[date_key] = {
                    'total_searches': 0,
                    'unique_users': set(),
                    'total_response_time': 0,
                    'total_results': 0,
                    'queries': Counter(),
                    'zero_result_searches': 0
                }
            
            daily_stat = self.daily_stats[date_key]
            daily_stat['total_searches'] += 1
            daily_stat['total_response_time'] += event.response_time
            daily_stat['total_results'] += event.result_count
            daily_stat['queries'][event.query] += 1
            
            if event.user_id:
                daily_stat['unique_users'].add(event.user_id)
            
            if event.result_count == 0:
                daily_stat['zero_result_searches'] += 1
            
            # Update hourly stats
            hour_key = event.timestamp.strftime('%Y-%m-%d-%H')
            if hour_key not in self.hourly_stats:
                self.hourly_stats[hour_key] = {
                    'total_searches': 0,
                    'avg_response_time': 0,
                    'total_response_time': 0
                }
            
            hourly_stat = self.hourly_stats[hour_key]
            hourly_stat['total_searches'] += 1
            hourly_stat['total_response_time'] += event.response_time
            hourly_stat['avg_response_time'] = hourly_stat['total_response_time'] / hourly_stat['total_searches']
            
            # Update query stats
            self.query_stats[event.query] += 1
            
            # Update user stats
            if event.user_id:
                self.user_stats[event.user_id] += 1
            
            # Update performance metrics
            self.response_times.append(event.response_time)
            self.result_counts.append(event.result_count)
            
            # Keep only recent performance data
            if len(self.response_times) > 1000:
                self.response_times = self.response_times[-1000:]
            if len(self.result_counts) > 1000:
                self.result_counts = self.result_counts[-1000:]
            
        except Exception as e:
            logger.error(f"Failed to update analytics: {e}")

    async def _update_user_profile(self, user_id: str, event: SearchEvent):
        """Update user search profile"""
        try:
            if user_id not in self.user_profiles:
                self.user_profiles[user_id] = UserSearchProfile(
                    user_id=user_id,
                    total_searches=0,
                    avg_session_length=0,
                    preferred_categories=[],
                    search_patterns={},
                    last_search=event.timestamp,
                    search_frequency='unknown'
                )
            
            profile = self.user_profiles[user_id]
            profile.total_searches += 1
            profile.last_search = event.timestamp
            
            # Update search patterns
            if 'query_length' not in profile.search_patterns:
                profile.search_patterns['query_length'] = []
            profile.search_patterns['query_length'].append(len(event.query.split()))
            
            if 'response_time' not in profile.search_patterns:
                profile.search_patterns['response_time'] = []
            profile.search_patterns['response_time'].append(event.response_time)
            
            # Calculate search frequency
            if profile.total_searches > 1:
                time_diff = (event.timestamp - profile.last_search).total_seconds()
                if time_diff < 86400:  # Less than 1 day
                    profile.search_frequency = 'daily'
                elif time_diff < 604800:  # Less than 1 week
                    profile.search_frequency = 'weekly'
                else:
                    profile.search_frequency = 'monthly'
            
        except Exception as e:
            logger.error(f"Failed to update user profile: {e}")

    async def track_click_event(
        self,
        event_id: str,
        result_id: str,
        position: int,
        user_id: Optional[str] = None
    ):
        """Track click on search result"""
        try:
            click_data = {
                'event_id': event_id,
                'result_id': result_id,
                'position': position,
                'user_id': user_id,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            if self.redis:
                await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: self.redis.lpush(
                        f"search_clicks:{event_id}",
                        json.dumps(click_data, ensure_ascii=False)
                    )
                )
            
            # Update click-through rate
            if event_id in self.click_through_rates:
                self.click_through_rates[event_id] += 1
            else:
                self.click_through_rates[event_id] = 1
            
        except Exception as e:
            logger.error(f"Failed to track click event: {e}")

    async def get_search_metrics(self, days: int = 7) -> SearchMetrics:
        """Get comprehensive search metrics"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            # Filter recent events
            recent_events = [
                event for event in self.search_events
                if event.timestamp >= cutoff_date
            ]
            
            if not recent_events:
                return SearchMetrics(
                    total_searches=0,
                    unique_users=0,
                    avg_response_time=0,
                    avg_result_count=0,
                    click_through_rate=0,
                    zero_result_rate=0,
                    popular_queries=[],
                    search_trends=[],
                    user_behavior={}
                )
            
            # Calculate metrics
            total_searches = len(recent_events)
            unique_users = len(set(event.user_id for event in recent_events if event.user_id))
            avg_response_time = sum(event.response_time for event in recent_events) / total_searches
            avg_result_count = sum(event.result_count for event in recent_events) / total_searches
            
            # Calculate click-through rate
            total_clicks = sum(self.click_through_rates.values())
            click_through_rate = (total_clicks / total_searches) * 100 if total_searches > 0 else 0
            
            # Calculate zero result rate
            zero_result_searches = len([e for e in recent_events if e.result_count == 0])
            zero_result_rate = (zero_result_searches / total_searches) * 100 if total_searches > 0 else 0
            
            # Get popular queries
            query_counts = Counter(event.query for event in recent_events)
            popular_queries = query_counts.most_common(10)
            
            # Get search trends
            search_trends = self._get_search_trends(days)
            
            # Get user behavior
            user_behavior = self._get_user_behavior_metrics(recent_events)
            
            return SearchMetrics(
                total_searches=total_searches,
                unique_users=unique_users,
                avg_response_time=avg_response_time,
                avg_result_count=avg_result_count,
                click_through_rate=click_through_rate,
                zero_result_rate=zero_result_rate,
                popular_queries=popular_queries,
                search_trends=search_trends,
                user_behavior=user_behavior
            )
            
        except Exception as e:
            logger.error(f"Failed to get search metrics: {e}")
            return SearchMetrics(
                total_searches=0,
                unique_users=0,
                avg_response_time=0,
                avg_result_count=0,
                click_through_rate=0,
                zero_result_rate=0,
                popular_queries=[],
                search_trends=[],
                user_behavior={}
            )

    def _get_search_trends(self, days: int) -> List[Dict[str, Any]]:
        """Get search trends over time"""
        trends = []
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        for i in range(days):
            date = cutoff_date + timedelta(days=i)
            date_key = date.strftime('%Y-%m-%d')
            
            if date_key in self.daily_stats:
                daily_stat = self.daily_stats[date_key]
                trends.append({
                    'date': date_key,
                    'searches': daily_stat['total_searches'],
                    'unique_users': len(daily_stat['unique_users']),
                    'avg_response_time': daily_stat['total_response_time'] / daily_stat['total_searches'] if daily_stat['total_searches'] > 0 else 0,
                    'zero_result_rate': (daily_stat['zero_result_searches'] / daily_stat['total_searches']) * 100 if daily_stat['total_searches'] > 0 else 0
                })
            else:
                trends.append({
                    'date': date_key,
                    'searches': 0,
                    'unique_users': 0,
                    'avg_response_time': 0,
                    'zero_result_rate': 0
                })
        
        return trends

    def _get_user_behavior_metrics(self, events: List[SearchEvent]) -> Dict[str, Any]:
        """Get user behavior metrics"""
        if not events:
            return {}
        
        # Query length distribution
        query_lengths = [len(event.query.split()) for event in events]
        avg_query_length = sum(query_lengths) / len(query_lengths)
        
        # Session analysis
        sessions = defaultdict(list)
        for event in events:
            sessions[event.session_id].append(event)
        
        session_lengths = [len(session_events) for session_events in sessions.values()]
        avg_session_length = sum(session_lengths) / len(session_lengths) if session_lengths else 0
        
        # Filter usage
        filter_usage = defaultdict(int)
        for event in events:
            for filter_name in event.filters_used.keys():
                filter_usage[filter_name] += 1
        
        # Time-based patterns
        hourly_searches = defaultdict(int)
        for event in events:
            hour = event.timestamp.hour
            hourly_searches[hour] += 1
        
        return {
            'avg_query_length': avg_query_length,
            'avg_session_length': avg_session_length,
            'filter_usage': dict(filter_usage),
            'hourly_distribution': dict(hourly_searches),
            'total_sessions': len(sessions)
        }

    async def get_popular_queries(self, limit: int = 20, days: int = 7) -> List[Tuple[str, int]]:
        """Get popular search queries"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            recent_events = [
                event for event in self.search_events
                if event.timestamp >= cutoff_date
            ]
            
            query_counts = Counter(event.query for event in recent_events)
            return query_counts.most_common(limit)
            
        except Exception as e:
            logger.error(f"Failed to get popular queries: {e}")
            return []

    async def get_user_search_history(self, user_id: str, limit: int = 50) -> List[SearchEvent]:
        """Get user search history"""
        try:
            user_events = [
                event for event in self.search_events
                if event.user_id == user_id
            ]
            
            # Sort by timestamp descending
            user_events.sort(key=lambda x: x.timestamp, reverse=True)
            return user_events[:limit]
            
        except Exception as e:
            logger.error(f"Failed to get user search history: {e}")
            return []

    async def get_search_performance_report(self, days: int = 7) -> Dict[str, Any]:
        """Get comprehensive search performance report"""
        try:
            metrics = await self.get_search_metrics(days)
            popular_queries = await self.get_popular_queries(10, days)
            
            return {
                'period_days': days,
                'metrics': asdict(metrics),
                'popular_queries': popular_queries,
                'performance_summary': {
                    'total_searches': metrics.total_searches,
                    'avg_response_time': f"{metrics.avg_response_time:.2f}ms",
                    'click_through_rate': f"{metrics.click_through_rate:.1f}%",
                    'zero_result_rate': f"{metrics.zero_result_rate:.1f}%"
                },
                'recommendations': self._generate_recommendations(metrics)
            }
            
        except Exception as e:
            logger.error(f"Failed to generate performance report: {e}")
            return {}

    def _generate_recommendations(self, metrics: SearchMetrics) -> List[str]:
        """Generate recommendations based on metrics"""
        recommendations = []
        
        if metrics.avg_response_time > 1000:
            recommendations.append("زمان پاسخ بالا است. بهینه‌سازی جستجو را در نظر بگیرید.")
        
        if metrics.zero_result_rate > 20:
            recommendations.append("نرخ جستجوهای بدون نتیجه بالا است. بهبود الگوریتم جستجو را در نظر بگیرید.")
        
        if metrics.click_through_rate < 10:
            recommendations.append("نرخ کلیک پایین است. بهبود رتبه‌بندی نتایج را در نظر بگیرید.")
        
        if metrics.unique_users < metrics.total_searches * 0.1:
            recommendations.append("کاربران محدودی از سیستم استفاده می‌کنند. بهبود تجربه کاربری را در نظر بگیرید.")
        
        return recommendations

    def get_analytics_summary(self) -> Dict[str, Any]:
        """Get analytics system summary"""
        return {
            'total_events_tracked': len(self.search_events),
            'total_users': len(self.user_profiles),
            'total_unique_queries': len(self.query_stats),
            'avg_response_time': sum(self.response_times) / len(self.response_times) if self.response_times else 0,
            'avg_result_count': sum(self.result_counts) / len(self.result_counts) if self.result_counts else 0,
            'daily_stats_count': len(self.daily_stats),
            'hourly_stats_count': len(self.hourly_stats)
        }

# Global search analytics instance
search_analytics = SearchAnalytics()