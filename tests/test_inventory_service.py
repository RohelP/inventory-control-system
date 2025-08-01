"""Tests for inventory service."""

import pytest
from decimal import Decimal
from datetime import datetime

from src.services.inventory_service import InventoryService
from src.models import MovementType


class TestInventoryService:
    """Test cases for InventoryService."""
    
    def test_get_available_quantity(self, db_session, sample_inventory_item):
        """Test getting available quantity calculation."""
        service = InventoryService(db_session)
        
        available = service.get_available_quantity(
            sample_inventory_item.product_id,
            sample_inventory_item.location_id
        )
        
        # 100 on hand - 10 reserved = 90 available
        assert available == 90
    
    def test_receive_inventory(self, db_session, sample_product, sample_location):
        """Test receiving inventory."""
        service = InventoryService(db_session)
        
        # Receive 50 units at $12.00 each
        success = service.receive_inventory(
            sample_product.id, 
            sample_location.id,
            50,
            Decimal("12.00"),
            "PO-12345"
        )
        
        assert success
        
        # Check inventory was created
        item = service.get_inventory_item(sample_product.id, sample_location.id)
        assert item is not None
        assert item.quantity_on_hand == 50
        assert item.average_cost == Decimal("12.00")
        assert item.total_cost_value == Decimal("600.00")
    
    def test_issue_inventory_success(self, db_session, sample_inventory_item):
        """Test successful inventory issue."""
        service = InventoryService(db_session)
        
        # Issue 30 units
        success = service.issue_inventory(
            sample_inventory_item.product_id,
            sample_inventory_item.location_id,
            30,
            "SO-12345"
        )
        
        assert success
        
        # Check quantities updated
        db_session.refresh(sample_inventory_item)
        assert sample_inventory_item.quantity_on_hand == 70  # 100 - 30
    
    def test_issue_inventory_insufficient_stock(self, db_session, sample_inventory_item):
        """Test inventory issue with insufficient stock."""
        service = InventoryService(db_session)
        
        # Try to issue more than available (90 available, try 95)
        success = service.issue_inventory(
            sample_inventory_item.product_id,
            sample_inventory_item.location_id,
            95,
            "SO-12345"
        )
        
        assert not success
        
        # Check quantities unchanged
        db_session.refresh(sample_inventory_item)
        assert sample_inventory_item.quantity_on_hand == 100
    
    def test_reserve_inventory(self, db_session, sample_inventory_item):
        """Test inventory reservation."""
        service = InventoryService(db_session)
        
        # Reserve 20 units
        success = service.reserve_inventory(
            sample_inventory_item.product_id,
            sample_inventory_item.location_id,
            20,
            "SO-67890"
        )
        
        assert success
        
        # Check reservation updated
        db_session.refresh(sample_inventory_item)
        assert sample_inventory_item.quantity_reserved == 30  # 10 + 20
    
    def test_release_reservation(self, db_session, sample_inventory_item):
        """Test releasing inventory reservation."""
        service = InventoryService(db_session)
        
        # Release 5 units from existing 10 reserved
        success = service.release_reservation(
            sample_inventory_item.product_id,
            sample_inventory_item.location_id,
            5,
            "SO-67890"
        )
        
        assert success
        
        # Check reservation updated
        db_session.refresh(sample_inventory_item)
        assert sample_inventory_item.quantity_reserved == 5  # 10 - 5
    
    def test_adjust_inventory(self, db_session, sample_inventory_item):
        """Test inventory adjustment."""
        service = InventoryService(db_session)
        
        # Adjust to 85 units (down from 100)
        success = service.adjust_inventory(
            sample_inventory_item.product_id,
            sample_inventory_item.location_id,
            85,
            "Cycle count adjustment",
            "test_user"
        )
        
        assert success
        
        # Check quantity updated
        db_session.refresh(sample_inventory_item)
        assert sample_inventory_item.quantity_on_hand == 85
        assert sample_inventory_item.last_counted is not None
    
    def test_get_inventory_valuation(self, db_session, sample_inventory_item):
        """Test inventory valuation calculation."""
        service = InventoryService(db_session)
        
        valuation = service.get_inventory_valuation()
        
        assert valuation['total_value'] == Decimal('1000.00')
        assert valuation['total_units'] == 100