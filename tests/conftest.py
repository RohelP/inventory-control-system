"""Pytest configuration and fixtures."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from decimal import Decimal
from datetime import date, datetime

from src.models.base import Base
from src.models import (
    Product, ProductCategory, Location, InventoryItem, 
    PricingRule, ABCCategory, PricingType, DiscountType
)


@pytest.fixture(scope="function")
def db_session():
    """Create a test database session."""
    # Use in-memory SQLite for tests
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False}
    )
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    yield session
    
    session.close()


@pytest.fixture
def sample_category(db_session):
    """Create a sample product category."""
    category = ProductCategory(
        name="Test Category",
        description="Test category for unit tests"
    )
    db_session.add(category)
    db_session.commit()
    return category


@pytest.fixture  
def sample_location(db_session):
    """Create a sample location."""
    location = Location(
        code="TEST01",
        name="Test Warehouse",
        description="Test warehouse for unit tests",
        city="Test City",
        state="TS",
        postal_code="12345"
    )
    db_session.add(location)
    db_session.commit()
    return location


@pytest.fixture
def sample_product(db_session, sample_category):
    """Create a sample product."""
    product = Product(
        sku="TEST-001",
        name="Test Product",
        description="Test product for unit tests",
        category_id=sample_category.id,
        abc_category=ABCCategory.B,
        unit_of_measure="EA",
        standard_cost=Decimal("10.00"),
        list_price=Decimal("15.00"),
        minimum_order_quantity=10,
        lead_time_days=7,
        safety_stock_days=3
    )
    db_session.add(product)
    db_session.commit()
    return product


@pytest.fixture
def sample_inventory_item(db_session, sample_product, sample_location):
    """Create a sample inventory item."""
    item = InventoryItem(
        product_id=sample_product.id,
        location_id=sample_location.id,
        quantity_on_hand=100,
        quantity_reserved=10,
        average_cost=Decimal("10.00"),
        total_cost_value=Decimal("1000.00"),
        reorder_point=20,
        reorder_quantity=50
    )
    db_session.add(item)
    db_session.commit()
    return item


@pytest.fixture
def sample_pricing_rule(db_session, sample_product):
    """Create a sample pricing rule."""
    rule = PricingRule(
        rule_name="Test Volume Discount",
        rule_code="TEST-VOL-001",
        pricing_type=PricingType.VOLUME_DISCOUNT,
        product_id=sample_product.id,
        effective_date=date.today(),
        discount_type=DiscountType.PERCENTAGE,
        discount_value=Decimal("10.00"),
        minimum_quantity=50,
        priority=50
    )
    db_session.add(rule)
    db_session.commit()
    return rule