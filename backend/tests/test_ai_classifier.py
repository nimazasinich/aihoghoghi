import pytest
import asyncio
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from ai_classifier import PersianBERTClassifier, EntityResult

class TestPersianBERTClassifier:
    @pytest.fixture
    def classifier(self):
        """Create classifier instance for testing"""
        return PersianBERTClassifier()
    
    @pytest.mark.asyncio
    async def test_classify_category_fallback(self, classifier):
        """Test category classification with fallback to rule-based"""
        test_text = "این یک قانون اساسی است که شامل اصول مهم می‌باشد"
        
        # Mock the classifiers to be empty (fallback mode)
        classifier.classifiers = {}
        
        category, confidence = await classifier.classify_category(test_text)
        
        assert category == "قانون اساسی"
        assert confidence > 0
    
    @pytest.mark.asyncio
    async def test_extract_entities_fallback(self, classifier):
        """Test entity extraction with fallback to regex"""
        test_text = "آقای احمدی از وزارت دادگستری در تاریخ 1402/01/01"
        
        # Mock the classifiers to be empty (fallback mode)
        classifier.classifiers = {}
        
        entities = await classifier.extract_entities(test_text)
        
        assert len(entities) > 0
        assert any(entity.label == "PERSON" for entity in entities)
        assert any(entity.label == "ORG" for entity in entities)
        assert any(entity.label == "DATE" for entity in entities)
    
    @pytest.mark.asyncio
    async def test_analyze_sentiment_fallback(self, classifier):
        """Test sentiment analysis with fallback to rule-based"""
        positive_text = "این تصمیم مثبت و موافق است"
        negative_text = "این تصمیم منفی و مخالف است"
        
        # Mock the classifiers to be empty (fallback mode)
        classifier.classifiers = {}
        
        positive_sentiment = await classifier.analyze_sentiment(positive_text)
        negative_sentiment = await classifier.analyze_sentiment(negative_text)
        
        assert positive_sentiment['positive'] > negative_sentiment['positive']
        assert negative_sentiment['negative'] > positive_sentiment['negative']
    
    @pytest.mark.asyncio
    async def test_classify_document_complete(self, classifier):
        """Test complete document classification"""
        test_content = """
        قانون اساسی جمهوری اسلامی ایران
        ماده 1: نظام جمهوری اسلامی ایران
        این قانون در تاریخ 1358/11/12 به تصویب رسید.
        آقای خمینی رهبر انقلاب اسلامی بود.
        """
        
        # Mock the classifiers to be empty (fallback mode)
        classifier.classifiers = {}
        
        result = await classifier.classify_document(test_content)
        
        assert 'category' in result
        assert 'confidence' in result
        assert 'entities' in result
        assert 'sentiment' in result
        assert 'processed_at' in result
        
        assert result['category'] == "قانون اساسی"
        assert len(result['entities']) > 0
        assert 'positive' in result['sentiment']
        assert 'negative' in result['sentiment']
        assert 'neutral' in result['sentiment']
    
    def test_remove_overlapping_entities(self, classifier):
        """Test overlapping entity removal"""
        entities = [
            EntityResult("آقای احمدی", "PERSON", 0, 10, 0.9),
            EntityResult("احمدی", "PERSON", 4, 10, 0.8),  # Overlapping
            EntityResult("وزارت دادگستری", "ORG", 15, 30, 0.9)
        ]
        
        result = classifier.remove_overlapping_entities(entities)
        
        # Should keep the longer entity and remove overlapping ones
        assert len(result) == 2
        assert result[0].text == "آقای احمدی"  # Longer entity
        assert result[1].text == "وزارت دادگستری"
    
    def test_map_to_legal_categories(self, classifier):
        """Test BERT result mapping to legal categories"""
        # Test various BERT labels
        test_cases = [
            ({"label": "LAW"}, "قوانین عادی"),
            ({"label": "REGULATION"}, "آیین‌نامه"),
            ({"label": "VERDICT"}, "رأی قضایی"),
            ({"label": "UNKNOWN"}, "عمومی")
        ]
        
        for bert_result, expected_category in test_cases:
            result = classifier._map_to_legal_categories([bert_result])
            assert result == expected_category
    
    @pytest.mark.asyncio
    async def test_batch_classify(self, classifier):
        """Test batch document classification"""
        documents = [
            {"id": 1, "content": "قانون اساسی جمهوری اسلامی"},
            {"id": 2, "content": "آیین‌نامه اجرایی قانون کار"},
            {"id": 3, "content": "رأی دادگاه در مورد دعوی"}
        ]
        
        # Mock the classifiers to be empty (fallback mode)
        classifier.classifiers = {}
        
        results = await classifier.batch_classify(documents)
        
        assert len(results) == 3
        for result in results:
            assert 'doc_id' in result
            assert 'classification' in result
            assert result['classification'] is not None
    
    @patch('ai_classifier.pipeline')
    def test_model_loading_success(self, mock_pipeline, classifier):
        """Test successful model loading"""
        # Mock successful pipeline creation
        mock_pipeline.return_value = MagicMock()
        
        # Re-initialize to test model loading
        new_classifier = PersianBERTClassifier()
        
        # Should have loaded models
        assert len(new_classifier.classifiers) > 0
        mock_pipeline.assert_called()
    
    @patch('ai_classifier.pipeline')
    def test_model_loading_failure(self, mock_pipeline, classifier):
        """Test model loading failure and fallback"""
        # Mock pipeline failure
        mock_pipeline.side_effect = Exception("Model loading failed")
        
        # Re-initialize to test model loading failure
        new_classifier = PersianBERTClassifier()
        
        # Should fall back to empty classifiers
        assert len(new_classifier.classifiers) == 0