"""Database setup and initialization."""

import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from .models.base import Base


class DatabaseManager:
    """Manages database connections and initialization."""
    
    def __init__(self, database_url: str = None):
        if database_url is None:
            # Default to SQLite for development
            database_url = "sqlite:///inventory_control.db"
        
        self.database_url = database_url
        
        # Configure engine based on database type
        if database_url.startswith("sqlite"):
            self.engine = create_engine(
                database_url,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
                echo=False  # Set to True for SQL debugging
            )
            # Enable foreign key constraints for SQLite
            @event.listens_for(self.engine, "connect")
            def set_sqlite_pragma(dbapi_connection, connection_record):
                cursor = dbapi_connection.cursor()
                cursor.execute("PRAGMA foreign_keys=ON")
                cursor.close()
        else:
            self.engine = create_engine(database_url, echo=False)
        
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    def create_tables(self, drop_existing: bool = False):
        """Create all database tables."""
        if drop_existing:
            Base.metadata.drop_all(bind=self.engine)
        
        Base.metadata.create_all(bind=self.engine)
    
    def get_session(self) -> Session:
        """Get database session."""
        return self.SessionLocal()
    
    def initialize_sample_data(self):
        """Initialize database with sample data for testing."""
        from datetime import date, datetime
        from decimal import Decimal
        
        from .models import (
            ProductCategory, Product, Location, InventoryItem,
            PricingRule, ABCCategory, PricingType, DiscountType
        )
        
        session = self.get_session()
        
        try:
            # Create product categories
            categories = [
                ProductCategory(name="Raw Materials", description="Basic raw materials"),
                ProductCategory(name="Components", description="Manufactured components"),
                ProductCategory(name="Finished Goods", description="Completed products"),
                ProductCategory(name="Packaging", description="Packaging materials")
            ]
            
            for category in categories:
                session.add(category)
            session.flush()
            
            # Create locations
            locations = [
                Location(
                    code="WH001", 
                    name="Main Warehouse",
                    description="Primary distribution center",
                    address_line1="123 Industrial Blvd",
                    city="Manufacturing City",
                    state="CA",
                    postal_code="90210"
                ),
                Location(
                    code="WH002",
                    name="Secondary Warehouse", 
                    description="Overflow and staging area",
                    address_line1="456 Storage Ave",
                    city="Manufacturing City",
                    state="CA",
                    postal_code="90211"
                )
            ]
            
            for location in locations:
                session.add(location)
            session.flush()
            
            # Create sample products
            products = [
                Product(
                    sku="RAW-001",
                    name="Steel Rod 1/2 inch",
                    description="High grade steel rod for manufacturing",
                    category_id=categories[0].id,
                    abc_category=ABCCategory.A,
                    unit_of_measure="FT",
                    standard_cost=Decimal("5.50"),
                    list_price=Decimal("8.25"),
                    minimum_order_quantity=100,
                    lead_time_days=14,
                    safety_stock_days=7,
                    requires_bom_calculation=False
                ),
                Product(
                    sku="COMP-001",
                    name="Precision Bearing",
                    description="High precision ball bearing",
                    category_id=categories[1].id,
                    abc_category=ABCCategory.B,
                    unit_of_measure="EA",
                    standard_cost=Decimal("25.00"),
                    list_price=Decimal("45.00"),
                    minimum_order_quantity=50,
                    lead_time_days=21,
                    safety_stock_days=10,
                    requires_bom_calculation=False
                ),
                Product(
                    sku="FG-001",
                    name="Custom Assembly Unit",
                    description="Complex custom assembly requiring BOM calculation",
                    category_id=categories[2].id,
                    abc_category=ABCCategory.A,
                    unit_of_measure="EA",
                    standard_cost=Decimal("150.00"),
                    list_price=Decimal("275.00"),
                    minimum_order_quantity=10,
                    lead_time_days=30,
                    safety_stock_days=5,
                    requires_bom_calculation=True
                ),
                Product(
                    sku="PKG-001",
                    name="Shipping Box Large",
                    description="Large corrugated shipping box",
                    category_id=categories[3].id,
                    abc_category=ABCCategory.C,
                    unit_of_measure="EA",
                    standard_cost=Decimal("2.50"),
                    list_price=Decimal("4.00"),
                    minimum_order_quantity=250,
                    lead_time_days=7,
                    safety_stock_days=3,
                    requires_bom_calculation=False
                )
            ]
            
            for product in products:
                session.add(product)
            session.flush()
            
            # Create inventory items
            for product in products:
                for location in locations:
                    # Calculate initial stock based on product type
                    if product.abc_category == ABCCategory.A:
                        initial_stock = product.minimum_order_quantity * 3
                    elif product.abc_category == ABCCategory.B:
                        initial_stock = product.minimum_order_quantity * 2
                    else:
                        initial_stock = product.minimum_order_quantity
                    
                    reorder_point = (product.lead_time_days + product.safety_stock_days) * 2
                    
                    inventory_item = InventoryItem(
                        product_id=product.id,
                        location_id=location.id,
                        quantity_on_hand=initial_stock,
                        quantity_reserved=0,
                        quantity_on_order=0,
                        average_cost=product.standard_cost,
                        total_cost_value=product.standard_cost * initial_stock,
                        reorder_point=reorder_point,
                        reorder_quantity=product.minimum_order_quantity
                    )
                    session.add(inventory_item)
            
            # Create sample pricing rules
            pricing_rules = [
                PricingRule(
                    rule_name="Standard List Price",
                    rule_code="LIST-001",
                    pricing_type=PricingType.LIST_PRICE,
                    effective_date=date.today(),
                    priority=100,
                    description="Default list pricing for all products"
                ),
                PricingRule(
                    rule_name="Volume Discount - 100+ units",
                    rule_code="VOL-100",
                    pricing_type=PricingType.VOLUME_DISCOUNT,
                    effective_date=date.today(),
                    discount_type=DiscountType.PERCENTAGE,
                    discount_value=Decimal("10.00"),
                    minimum_quantity=100,
                    priority=50,
                    description="10% discount for orders of 100+ units"
                ),
                PricingRule(
                    rule_name="A-Category Cost Plus",
                    rule_code="COST-A",
                    pricing_type=PricingType.COST_PLUS,
                    product_category_id=categories[0].id,
                    effective_date=date.today(),
                    markup_percentage=Decimal("50.00"),
                    priority=75,
                    description="50% markup on A-category items"
                )
            ]
            
            for rule in pricing_rules:
                session.add(rule)
            
            session.commit()
            print("Sample data initialized successfully!")
            
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()


# Global database manager instance
db_manager = DatabaseManager()

def get_db_session() -> Session:
    """Dependency to get database session."""
    return db_manager.get_session()

def init_database(database_url: str = None, with_sample_data: bool = True):
    """Initialize database with tables and optional sample data."""
    global db_manager
    
    if database_url:
        db_manager = DatabaseManager(database_url)
    
    print("Creating database tables...")
    db_manager.create_tables()
    print("Database tables created successfully!")
    
    if with_sample_data:
        print("Initializing sample data...")
        db_manager.initialize_sample_data()
        print("Database initialization complete!")
    else:
        print("Database ready (no sample data loaded)")

if __name__ == "__main__":
    # Command line database initialization
    import sys
    
    if len(sys.argv) > 1:
        database_url = sys.argv[1]
    else:
        database_url = None
    
    init_database(database_url, with_sample_data=True)