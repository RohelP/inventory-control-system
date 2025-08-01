"""Product and category models."""

from decimal import Decimal
from enum import Enum
from typing import Optional, List
from sqlalchemy import String, Numeric, Text, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin


class ABCCategory(str, Enum):
    """ABC classification for inventory management."""
    A = "A"  # High value/volume items
    B = "B"  # Medium value/volume items  
    C = "C"  # Low value/volume items


class ProductCategory(Base, TimestampMixin):
    """Product category for organization and reporting."""
    
    __tablename__ = "product_categories"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("product_categories.id"))
    
    # Relationships
    parent: Mapped[Optional["ProductCategory"]] = relationship(
        "ProductCategory", remote_side=[id], back_populates="children"
    )
    children: Mapped[List["ProductCategory"]] = relationship(
        "ProductCategory", back_populates="parent"
    )
    products: Mapped[List["Product"]] = relationship("Product", back_populates="category")


class Product(Base, TimestampMixin):
    """Product master data."""
    
    __tablename__ = "products"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    sku: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    # Categorization
    category_id: Mapped[Optional[int]] = mapped_column(ForeignKey("product_categories.id"))
    abc_category: Mapped[ABCCategory] = mapped_column(
        SQLEnum(ABCCategory), default=ABCCategory.C
    )
    
    # Physical properties
    unit_of_measure: Mapped[str] = mapped_column(String(20), default="EA")
    weight: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 3))
    volume: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 3))
    
    # Costing
    standard_cost: Mapped[Decimal] = mapped_column(Numeric(15, 4), default=0)
    list_price: Mapped[Decimal] = mapped_column(Numeric(15, 4), default=0)
    
    # Inventory management
    minimum_order_quantity: Mapped[int] = mapped_column(default=1)
    economic_order_quantity: Mapped[Optional[int]] = mapped_column()
    lead_time_days: Mapped[int] = mapped_column(default=7)
    safety_stock_days: Mapped[int] = mapped_column(default=3)
    
    # Flags
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_purchasable: Mapped[bool] = mapped_column(Boolean, default=True)
    is_saleable: Mapped[bool] = mapped_column(Boolean, default=True)
    requires_bom_calculation: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Relationships
    category: Mapped[Optional[ProductCategory]] = relationship(
        "ProductCategory", back_populates="products"
    )
    inventory_items: Mapped[List["InventoryItem"]] = relationship(
        "InventoryItem", back_populates="product"
    )
    
    def __repr__(self) -> str:
        return f"<Product(sku='{self.sku}', name='{self.name}')>"
    
    @property
    def reorder_point(self) -> int:
        """Calculate reorder point based on lead time and safety stock."""
        # This is a simplified calculation - in production you'd use demand forecasting
        daily_demand = 1  # Placeholder - would calculate from historical data
        return (self.lead_time_days + self.safety_stock_days) * daily_demand