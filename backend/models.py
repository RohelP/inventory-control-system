from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, Date, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime, date

DATABASE_URL = "sqlite:///./inventory_control.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(String, primary_key=True, index=True)
    customer_name = Column(String, nullable=False)
    company = Column(String, nullable=False)
    phone = Column(String)
    email = Column(String)
    order_date = Column(Date, nullable=False)
    damper_type = Column(String, nullable=False)
    special_requirements = Column(Text)
    status = Column(String, default="Created")
    current_step = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Workflow flags
    bom_generated = Column(Boolean, default=False)
    ul_compliant = Column(Boolean, default=False)
    inventory_reserved = Column(Boolean, default=False)
    production_progress = Column(Integer, default=0)
    
    # Custom dimensions (JSON-like storage as string)
    dimensions_length = Column(String)
    dimensions_width = Column(String)
    dimensions_height = Column(String)
    
    # Relationships
    bom_items = relationship("BOMItem", back_populates="order", cascade="all, delete-orphan")
    quality_checks = relationship("QualityCheck", back_populates="order", cascade="all, delete-orphan")

class BOMItem(Base):
    __tablename__ = "bom_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String, ForeignKey("orders.id"), nullable=False)
    part_number = Column(String, nullable=False)
    description = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_cost = Column(Float, nullable=False)
    total_cost = Column(Float, nullable=False)
    supplier = Column(String)
    lead_time_days = Column(Integer)
    
    # Relationship
    order = relationship("Order", back_populates="bom_items")

class InventoryItem(Base):
    __tablename__ = "inventory_items"
    
    id = Column(Integer, primary_key=True, index=True)
    part_number = Column(String, unique=True, nullable=False, index=True)
    description = Column(String, nullable=False)
    category = Column(String)
    quantity_available = Column(Integer, default=0)
    quantity_reserved = Column(Integer, default=0)
    unit_cost = Column(Float)
    reorder_level = Column(Integer, default=10)
    supplier = Column(String)
    location = Column(String)
    last_updated = Column(DateTime, default=datetime.utcnow)

class QualityCheck(Base):
    __tablename__ = "quality_checks"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String, ForeignKey("orders.id"), nullable=False)
    check_type = Column(String, nullable=False)  # "UL Compliance", "Dimensional", "Material", etc.
    status = Column(String, default="Pending")  # "Pending", "Passed", "Failed"
    inspector = Column(String)
    notes = Column(Text)
    checked_at = Column(DateTime)
    
    # Relationship
    order = relationship("Order", back_populates="quality_checks")

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    
    id = Column(String, primary_key=True, index=True)
    supplier = Column(String, nullable=False)
    order_date = Column(Date, nullable=False)
    expected_delivery = Column(Date)
    status = Column(String, default="Draft")  # "Draft", "Sent", "Acknowledged", "Delivered"
    total_amount = Column(Float)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(String, ForeignKey("purchase_orders.id"), nullable=False)
    part_number = Column(String, nullable=False)
    description = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_cost = Column(Float, nullable=False)
    total_cost = Column(Float, nullable=False)