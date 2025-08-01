"""Tests for pricing service."""

import pytest
from decimal import Decimal

from src.services.pricing_service import PricingService


class TestPricingService:
    """Test cases for PricingService."""
    
    def test_get_customer_price_list_price(self, db_session, sample_product):
        """Test getting list price when no rules apply."""
        service = PricingService(db_session)
        
        price = service.get_customer_price(
            sample_product.id,
            "CUSTOMER-001",
            1
        )
        
        assert price == sample_product.list_price
    
    def test_get_customer_price_with_volume_discount(self, db_session, sample_product, sample_pricing_rule):
        """Test pricing with volume discount rule."""
        service = PricingService(db_session)
        
        # Get price for 50+ units (should trigger 10% discount)
        price = service.get_customer_price(
            sample_product.id,
            "CUSTOMER-001", 
            50
        )
        
        # Should be list price minus 10%
        expected_price = sample_product.list_price * Decimal("0.9")  # 15.00 * 0.9 = 13.50
        assert price == expected_price
    
    def test_get_customer_price_below_minimum_quantity(self, db_session, sample_product, sample_pricing_rule):
        """Test pricing below minimum quantity for discount."""
        service = PricingService(db_session)
        
        # Get price for 25 units (below 50 minimum for discount)
        price = service.get_customer_price(
            sample_product.id,
            "CUSTOMER-001",
            25
        )
        
        # Should be full list price
        assert price == sample_product.list_price
    
    def test_calculate_price_breakdown(self, db_session, sample_product, sample_pricing_rule):
        """Test detailed price breakdown calculation."""
        service = PricingService(db_session)
        
        breakdown = service.calculate_price_breakdown(
            sample_product.id,
            "CUSTOMER-001",
            50
        )
        
        assert breakdown['product_sku'] == sample_product.sku
        assert breakdown['quantity'] == 50
        assert breakdown['list_price'] == sample_product.list_price
        assert breakdown['final_price'] < breakdown['list_price']  # Should have discount
        assert len(breakdown['available_rules']) > 0