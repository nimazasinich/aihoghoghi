import asyncio
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import json
import re
import torch
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import warnings
warnings.filterwarnings("ignore")

@dataclass
class EntityResult:
    text: str
    label: str
    start: int
    end: int
    confidence: float

class PersianBERTClassifier:
    """Persian BERT-based document classifier and NER"""
    
    def __init__(self):
        self.models = {
            "classification": "HooshvareLab/bert-fa-base-uncased",
            "ner": "HooshvareLab/bert-fa-base-uncased-ner-peyma", 
            "sentiment": "HooshvareLab/bert-fa-base-uncased-sentiment-digikala"
        }
        self.classifiers = {}
        self._load_models()
        
        self.categories = {
            "قانون اساسی": ["اساسی", "قانون اساسی", "اصول", "مبانی"],
            "قوانین عادی": ["قانون", "مقررات", "ضوابط"],
            "آیین‌نامه": ["آیین‌نامه", "دستورالعمل", "روش‌نامه"],
            "مصوبات": ["مصوبه", "تصمیم", "قطعنامه"],
            "رأی قضایی": ["رأی", "حکم", "دادنامه", "قضاوت"],
            "نظریه مشورتی": ["نظریه", "مشورت", "پاسخ", "استعلام"],
            "بخشنامه": ["بخشنامه", "اطلاعیه", "ابلاغ"],
            "قرارداد": ["قرارداد", "موافقتنامه", "پیمان"]
        }
        
        self.entity_patterns = {
            "PERSON": [
                r"آقای\s+[\u0600-\u06FF]+(?:\s+[\u0600-\u06FF]+)*",
                r"خانم\s+[\u0600-\u06FF]+(?:\s+[\u0600-\u06FF]+)*",
                r"جناب\s+[\u0600-\u06FF]+(?:\s+[\u0600-\u06FF]+)*"
            ],
            "ORG": [
                r"وزارت[\u0600-\u06FF\s]+",
                r"سازمان[\u0600-\u06FF\s]+",
                r"شرکت[\u0600-\u06FF\s]+",
                r"دانشگاه[\u0600-\u06FF\s]+",
                r"مرکز[\u0600-\u06FF\s]+",
                r"شورای[\u0600-\u06FF\s]+"
            ],
            "LAW": [
                r"ماده\s+\d+",
                r"بند\s+\d+",
                r"قانون[\u0600-\u06FF\s]+",
                r"آیین‌نامه[\u0600-\u06FF\s]+",
                r"مصوبه[\u0600-\u06FF\s]+"
            ],
            "DATE": [
                r"\d{4}/\d{1,2}/\d{1,2}",
                r"\d{1,2}/\d{1,2}/\d{4}",
                r"[\u0600-\u06FF]+\s+\d{4}"
            ],
            "MONEY": [
                r"\d+(?:\.\d+)?\s*ریال",
                r"\d+(?:\.\d+)?\s*تومان",
                r"\d+(?:\.\d+)?\s*دلار"
            ]
        }
        
        self.logger = logging.getLogger(__name__)
        self.logger.info("Persian BERT classifier initialized")
    
    def _load_models(self):
        """Load actual transformers models"""
        try:
            # Load classification model
            self.classifiers["classification"] = pipeline(
                "text-classification",
                model=self.models["classification"],
                tokenizer=self.models["classification"],
                device=0 if torch.cuda.is_available() else -1
            )
            
            # Load NER model
            self.classifiers["ner"] = pipeline(
                "ner",
                model=self.models["ner"],
                tokenizer=self.models["ner"],
                device=0 if torch.cuda.is_available() else -1
            )
            
            # Load sentiment model
            self.classifiers["sentiment"] = pipeline(
                "text-classification",
                model=self.models["sentiment"],
                tokenizer=self.models["sentiment"],
                device=0 if torch.cuda.is_available() else -1
            )
            
            self.logger.info("All Persian BERT models loaded successfully")
            
        except Exception as e:
            self.logger.warning(f"Failed to load transformers models: {str(e)}")
            self.logger.info("Falling back to rule-based classification")
            self.classifiers = {}
    
    async def classify_category(self, text: str) -> tuple[str, float]:
        """Classify document category using BERT model or fallback to keyword matching"""
        # Try BERT model first
        if "classification" in self.classifiers:
            try:
                # Truncate text to model's max length
                result = self.classifiers["classification"](text[:512])
                category = self._map_to_legal_categories(result)
                confidence = result[0]["score"]
                return category, confidence
            except Exception as e:
                self.logger.warning(f"BERT classification failed: {str(e)}")
        
        # Fallback to rule-based classification
        text_lower = text.lower()
        
        # Score each category based on keyword presence
        category_scores = {}
        
        for category, keywords in self.categories.items():
            score = 0
            for keyword in keywords:
                # Count occurrences, giving more weight to title/beginning
                title_matches = text_lower[:500].count(keyword.lower()) * 3
                content_matches = text_lower[500:].count(keyword.lower())
                score += title_matches + content_matches
            
            if score > 0:
                category_scores[category] = score
        
        if category_scores:
            best_category = max(category_scores, key=category_scores.get)
            max_score = category_scores[best_category]
            
            # Normalize confidence score
            total_score = sum(category_scores.values())
            confidence = min(max_score / total_score, 1.0) if total_score > 0 else 0.5
            
            return best_category, confidence
        
        return "عمومی", 0.3  # Default category with low confidence
    
    def _map_to_legal_categories(self, bert_result: List[Dict]) -> str:
        """Map BERT classification result to legal categories"""
        # Map BERT labels to our legal categories
        label_mapping = {
            "LAW": "قوانین عادی",
            "REGULATION": "آیین‌نامه", 
            "VERDICT": "رأی قضایی",
            "CONSTITUTION": "قانون اساسی",
            "DECISION": "مصوبات",
            "CONTRACT": "قرارداد"
        }
        
        predicted_label = bert_result[0]["label"]
        return label_mapping.get(predicted_label, "عمومی")
    
    async def extract_entities(self, text: str) -> List[EntityResult]:
        """Extract named entities using BERT NER model or fallback to regex patterns"""
        entities = []
        
        # Try BERT NER model first
        if "ner" in self.classifiers:
            try:
                ner_results = self.classifiers["ner"](text[:512])
                for entity in ner_results:
                    if entity["score"] > 0.5:  # Filter low confidence entities
                        entities.append(EntityResult(
                            text=entity["word"],
                            label=entity["entity"],
                            start=entity["start"],
                            end=entity["end"],
                            confidence=entity["score"]
                        ))
                return entities
            except Exception as e:
                self.logger.warning(f"BERT NER failed: {str(e)}")
        
        # Fallback to regex patterns
        for entity_type, patterns in self.entity_patterns.items():
            for pattern in patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                for match in matches:
                    entity = EntityResult(
                        text=match.group().strip(),
                        label=entity_type,
                        start=match.start(),
                        end=match.end(),
                        confidence=0.8  # Fixed confidence for regex matches
                    )
                    entities.append(entity)
        
        # Remove duplicates and overlapping entities
        entities = self.remove_overlapping_entities(entities)
        
        return entities
    
    def remove_overlapping_entities(self, entities: List[EntityResult]) -> List[EntityResult]:
        """Remove overlapping entities, keeping the longer ones"""
        if not entities:
            return []
        
        # Sort by start position
        entities.sort(key=lambda x: x.start)
        
        non_overlapping = []
        for entity in entities:
            if not non_overlapping:
                non_overlapping.append(entity)
                continue
            
            last_entity = non_overlapping[-1]
            
            # Check for overlap
            if entity.start < last_entity.end:
                # Keep the longer entity
                if len(entity.text) > len(last_entity.text):
                    non_overlapping[-1] = entity
            else:
                non_overlapping.append(entity)
        
        return non_overlapping
    
    async def analyze_sentiment(self, text: str) -> Dict[str, float]:
        """Analyze document sentiment using BERT model or fallback to rule-based"""
        # Try BERT sentiment model first
        if "sentiment" in self.classifiers:
            try:
                result = self.classifiers["sentiment"](text[:512])
                sentiment_label = result[0]["label"]
                confidence = result[0]["score"]
                
                # Map to our sentiment format
                if sentiment_label == "POSITIVE":
                    return {"positive": confidence, "negative": 0.0, "neutral": 1-confidence}
                elif sentiment_label == "NEGATIVE":
                    return {"positive": 0.0, "negative": confidence, "neutral": 1-confidence}
                else:
                    return {"positive": 0.0, "negative": 0.0, "neutral": confidence}
            except Exception as e:
                self.logger.warning(f"BERT sentiment analysis failed: {str(e)}")
        
        # Fallback to rule-based sentiment for Persian legal texts
        positive_words = ["موافق", "تأیید", "پذیرش", "موفق", "مثبت", "بهبود"]
        negative_words = ["مخالف", "رد", "منع", "محکومیت", "نفی", "اعتراض"]
        
        text_lower = text.lower()
        
        positive_score = sum(text_lower.count(word) for word in positive_words)
        negative_score = sum(text_lower.count(word) for word in negative_words)
        total_score = positive_score + negative_score
        
        if total_score == 0:
            return {"positive": 0.1, "negative": 0.1, "neutral": 0.8}
        
        return {
            "positive": positive_score / total_score,
            "negative": negative_score / total_score,
            "neutral": max(0, 1 - (positive_score + negative_score) / total_score)
        }
    
    async def classify_document(self, content: str) -> Dict[str, Any]:
        """Complete document analysis: category, entities, sentiment"""
        
        # Classify category
        category, category_confidence = await self.classify_category(content)
        
        # Extract entities
        entities = await self.extract_entities(content)
        
        # Analyze sentiment
        sentiment = await self.analyze_sentiment(content)
        
        # Convert entities to dict format
        entity_dicts = [
            {
                "text": entity.text,
                "label": entity.label,
                "start": entity.start,
                "end": entity.end,
                "confidence": entity.confidence
            }
            for entity in entities
        ]
        
        result = {
            "category": category,
            "confidence": category_confidence,
            "entities": entity_dicts,
            "sentiment": sentiment,
            "processed_at": asyncio.get_event_loop().time()
        }
        
        self.logger.info(f"Classified document: {category} (confidence: {category_confidence:.2f})")
        return result
    
    async def batch_classify(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Classify multiple documents in batch"""
        results = []
        
        for doc in documents:
            try:
                classification = await self.classify_document(doc['content'])
                results.append({
                    "doc_id": doc.get('id'),
                    "classification": classification
                })
            except Exception as e:
                self.logger.error(f"Classification failed for doc {doc.get('id')}: {str(e)}")
                results.append({
                    "doc_id": doc.get('id'),
                    "classification": None,
                    "error": str(e)
                })
        
        return results