"""Inventory tracking and stock movement models."""

from decimal import Decimal
from enum import Enum
from typing import Optional, List
from datetime import datetime
from sqlalchemy import String, Numeric, Integer, ForeignKey, DateTime, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin


class MovementType(str, Enum):
    """Types of inventory movements."""
    RECEIPT = "receipt"           # Goods received
    SALE = "sale"                # Sale to customer
    ADJUSTMENT = "adjustment"     # Manual adjustment
    TRANSFER = "transfer"         # Between locations
    RETURN = "return"            # Customer return
    DAMAGE = "damage"            # Damaged goods write-off
    RESERVATION = "reservation"   # Reserved for order
    RELEASE = "release"          # Released from reservation


class CostingMethod(str, Enum):
    """Inventory costing methods."""
    FIFO = "fifo"                # First In, First Out
    LIFO = "lifo"                # Last In, First Out
    WEIGHTED_AVERAGE = "weighted_average"
    STANDARD = "standard"


class Location(Base, TimestampMixin):
    """Physical or logical inventory locations."""
    
    __tablename__ = "locations"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    location_type: Mapped[str] = mapped_column(String(20), default="warehouse")
    
    # Address information
    address_line1: Mapped[Optional[str]] = mapped_column(String(200))
    city: Mapped[Optional[str]] = mapped_column(String(100))
    state: Mapped[Optional[str]] = mapped_column(String(50))
    postal_code: Mapped[Optional[str]] = mapped_column(String(20))
    country: Mapped[str] = mapped_column(String(50), default="US")
    
    # Operational flags
    is_active: Mapped[bool] = mapped_column(default=True)
    is_selling_location: Mapped[bool] = mapped_column(default=True)
    is_receiving_location: Mapped[bool] = mapped_column(default=True)
    
    # Relationships
    inventory_items: Mapped[List["InventoryItem"]] = relationship(
        "InventoryItem", back_populates="location"
    )


class InventoryItem(Base, TimestampMixin):
    """Inventory tracking for products at specific locations."""
    
    __tablename__ = "inventory_items"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), nullable=False)
    
    # Quantities
    quantity_on_hand: Mapped[int] = mapped_column(Integer, default=0)
    quantity_reserved: Mapped[int] = mapped_column(Integer, default=0) 
    quantity_on_order: Mapped[int] = mapped_column(Integer, default=0)
    
    # Costing
    costing_method: Mapped[CostingMethod] = mapped_column(
        SQLEnum(CostingMethod), default=CostingMethod.WEIGHTED_AVERAGE
    )
    average_cost: Mapped[Decimal] = mapped_column(Numeric(15, 4), default=0)
    total_cost_value: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    
    # Reorder management
    reorder_point: Mapped[int] = mapped_column(Integer, default=0)
    reorder_quantity: Mapped[int] = mapped_column(Integer, default=0)
    maximum_stock_level: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Cycle counting
    last_counted: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    cycle_count_frequency_days: Mapped[int] = mapped_column(default=90)
    
    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="inventory_items")
    location: Mapped[Location] = relationship("Location", back_populates="inventory_items")
    stock_movements: Mapped[List["StockMovement"]] = relationship(
        "StockMovement", back_populates="inventory_item"
    )
    
    @property
    def quantity_available(self) -> int:
        """Available quantity = on hand - reserved."""
        return self.quantity_on_hand - self.quantity_reserved
    
    @property
    def is_below_reorder_point(self) -> bool:
        """Check if current stock is below reorder point."""
        return self.quantity_available <= self.reorder_point
    
    @property
    def turnover_ratio(self) -> Optional[Decimal]:
        """Calculate inventory turnover (would need sales data)."""
        # Placeholder - would calculate from historical sales data
        return None
    
    def __repr__(self) -> str:
        return f"<InventoryItem(product_id={self.product_id}, location_id={self.location_id}, qty={self.quantity_on_hand})>"


class StockMovement(Base, TimestampMixin):
    """Individual stock movement transactions."""
    
    __tablename__ = "stock_movements"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    inventory_item_id: Mapped[int] = mapped_column(
        ForeignKey("inventory_items.id"), nullable=False
    )
    
    # Movement details
    movement_type: Mapped[MovementType] = mapped_column(SQLEnum(MovementType))
    reference_number: Mapped[Optional[str]] = mapped_column(String(50))  # Order #, PO #, etc.
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_cost: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 4))
    
    # Balances after movement
    quantity_before: Mapped[int] = mapped_column(Integer)
    quantity_after: Mapped[int] = mapped_column(Integer)
    
    # Additional context
    notes: Mapped[Optional[str]] = mapped_column(Text)
    user_id: Mapped[Optional[str]] = mapped_column(String(50))  # Who made the movement
    
    # Relationships
    inventory_item: Mapped[InventoryItem] = relationship(
        "InventoryItem", back_populates="stock_movements"
    )
    
    def __repr__(self) -> str:
        return f"<StockMovement(type={self.movement_type}, qty={self.quantity})>"