"""Tests for sales order service."""

import pytest
from decimal import Decimal
from datetime import date

from src.services.sales_order_service import SalesOrderService
from src.models import OrderStatus, LineStatus


class TestSalesOrderService:
    """Test cases for SalesOrderService."""
    
    def test_create_sales_order(self, db_session, sample_product):
        """Test creating a sales order."""
        service = SalesOrderService(db_session)
        
        order_data = {
            'customer_id': 'CUST-001',
            'customer_name': 'Test Customer',
            'order_date': date.today(),
            'lines': [
                {
                    'product_sku': sample_product.sku,
                    'quantity': 25,
                    'unit_price': Decimal('15.00')
                }
            ]
        }
        
        order = service.create_sales_order(order_data)
        
        assert order.customer_id == 'CUST-001'
        assert order.status == OrderStatus.DRAFT
        assert len(order.lines) == 1
        
        line = order.lines[0]
        assert line.product_sku == sample_product.sku
        assert line.quantity_ordered == 25  # Should be adjusted to MOQ if needed
        assert line.unit_price == Decimal('15.00')
    
    def test_moq_adjustment(self, db_session, sample_product):
        """Test minimum order quantity adjustment."""
        service = SalesOrderService(db_session)
        
        # Product has MOQ of 10, order only 5
        order_data = {
            'customer_id': 'CUST-001',
            'customer_name': 'Test Customer',
            'lines': [
                {
                    'product_sku': sample_product.sku,
                    'quantity': 5  # Below MOQ of 10
                }
            ]
        }
        
        order = service.create_sales_order(order_data)
        line = order.lines[0]
        
        assert line.quantity_ordered == 10  # Adjusted to MOQ
        assert not line.moq_compliant  # Flag that it was adjusted
        assert line.original_quantity == 5
    
    def test_confirm_order(self, db_session, sample_product):
        """Test order confirmation."""
        service = SalesOrderService(db_session)
        
        # Create order
        order_data = {
            'customer_id': 'CUST-001',
            'customer_name': 'Test Customer',
            'lines': [
                {
                    'product_sku': sample_product.sku,
                    'quantity': 20,
                    'unit_price': Decimal('15.00')
                }
            ]
        }
        
        order = service.create_sales_order(order_data)
        
        # Confirm order
        success = service.confirm_order(order.id)
        
        assert success
        db_session.refresh(order)
        assert order.status == OrderStatus.CONFIRMED
    
    def test_allocate_inventory(self, db_session, sample_product, sample_location, sample_inventory_item):
        """Test inventory allocation."""
        service = SalesOrderService(db_session)
        
        # Create confirmed order
        order_data = {
            'customer_id': 'CUST-001', 
            'customer_name': 'Test Customer',
            'lines': [
                {
                    'product_sku': sample_product.sku,
                    'quantity': 30,
                    'unit_price': Decimal('15.00')
                }
            ]
        }
        
        order = service.create_sales_order(order_data)
        service.confirm_order(order.id)
        
        # Allocate inventory
        result = service.allocate_inventory(order.id, sample_location.id)
        
        assert result['success']
        assert len(result['fully_allocated']) == 1
        
        # Check allocation
        db_session.refresh(order)
        line = order.lines[0]
        assert line.quantity_allocated == 30
        assert line.status == LineStatus.ALLOCATED