"""Sales order models."""

from decimal import Decimal
from enum import Enum
from typing import Optional, List
from datetime import datetime, date
from sqlalchemy import String, Numeric, Integer, ForeignKey, DateTime, Date, Text, Boolean, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin


class OrderStatus(str, Enum):
    """Sales order status values."""
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    BACKORDERED = "backordered"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    RETURNED = "returned"


class LineStatus(str, Enum):
    """Sales order line status values."""
    PENDING = "pending"
    ALLOCATED = "allocated"
    SHIPPED = "shipped"
    BACKORDERED = "backordered"
    CANCELLED = "cancelled"


class SalesOrder(Base, TimestampMixin):
    """Sales order header."""
    
    __tablename__ = "sales_orders"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    order_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    
    # Customer information
    customer_id: Mapped[str] = mapped_column(String(50), nullable=False)
    customer_name: Mapped[str] = mapped_column(String(200), nullable=False)
    customer_po_number: Mapped[Optional[str]] = mapped_column(String(50))
    
    # Order details
    order_date: Mapped[date] = mapped_column(Date, nullable=False)
    requested_delivery_date: Mapped[Optional[date]] = mapped_column(Date)
    promised_delivery_date: Mapped[Optional[date]] = mapped_column(Date)
    
    # Status and priority
    status: Mapped[OrderStatus] = mapped_column(SQLEnum(OrderStatus), default=OrderStatus.DRAFT)
    priority: Mapped[str] = mapped_column(String(20), default="normal")
    
    # Shipping information
    ship_to_name: Mapped[Optional[str]] = mapped_column(String(200))
    ship_to_address1: Mapped[Optional[str]] = mapped_column(String(200))
    ship_to_address2: Mapped[Optional[str]] = mapped_column(String(200))
    ship_to_city: Mapped[Optional[str]] = mapped_column(String(100))
    ship_to_state: Mapped[Optional[str]] = mapped_column(String(50))
    ship_to_postal_code: Mapped[Optional[str]] = mapped_column(String(20))
    ship_to_country: Mapped[str] = mapped_column(String(50), default="US")
    
    # Financial totals
    subtotal: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    shipping_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    
    # Processing flags
    requires_bom_calculation: Mapped[bool] = mapped_column(Boolean, default=False)
    bom_calculated: Mapped[bool] = mapped_column(Boolean, default=False)
    bom_calculation_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    # Notes and references
    notes: Mapped[Optional[str]] = mapped_column(Text)
    internal_notes: Mapped[Optional[str]] = mapped_column(Text)
    
    # Relationships
    lines: Mapped[List["SalesOrderLine"]] = relationship(
        "SalesOrderLine", back_populates="order", cascade="all, delete-orphan"
    )
    bom: Mapped[Optional["BillOfMaterials"]] = relationship(
        "BillOfMaterials", back_populates="sales_order", uselist=False
    )
    
    def __repr__(self) -> str:
        return f"<SalesOrder(order_number='{self.order_number}', status='{self.status}')>"
    
    @property
    def is_bom_required(self) -> bool:
        """Check if any line items require BOM calculation."""
        return any(line.product.requires_bom_calculation for line in self.lines)
    
    @property
    def can_be_allocated(self) -> bool:
        """Check if order can be allocated inventory."""
        return self.status in [OrderStatus.CONFIRMED, OrderStatus.IN_PROGRESS] and self.bom_calculated
    
    def calculate_totals(self) -> None:
        """Recalculate order totals from line items."""
        self.subtotal = sum(line.extended_price for line in self.lines)
        # Tax and shipping would be calculated based on business rules
        self.total_amount = self.subtotal + self.tax_amount + self.shipping_amount - self.discount_amount


class SalesOrderLine(Base, TimestampMixin):
    """Sales order line items."""
    
    __tablename__ = "sales_order_lines"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("sales_orders.id"), nullable=False)
    line_number: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Product information
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    product_sku: Mapped[str] = mapped_column(String(50), nullable=False)  # Denormalized for performance
    product_name: Mapped[str] = mapped_column(String(200), nullable=False)  # Denormalized
    
    # Quantities
    quantity_ordered: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_allocated: Mapped[int] = mapped_column(Integer, default=0)
    quantity_shipped: Mapped[int] = mapped_column(Integer, default=0)
    quantity_backordered: Mapped[int] = mapped_column(Integer, default=0)
    
    # Pricing
    unit_price: Mapped[Decimal] = mapped_column(Numeric(15, 4), nullable=False)
    discount_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    extended_price: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    
    # Status and dates
    status: Mapped[LineStatus] = mapped_column(SQLEnum(LineStatus), default=LineStatus.PENDING)
    requested_date: Mapped[Optional[date]] = mapped_column(Date)
    promised_date: Mapped[Optional[date]] = mapped_column(Date)
    
    # Location and allocation
    ship_from_location_id: Mapped[Optional[int]] = mapped_column(ForeignKey("locations.id"))
    
    # MOQ compliance
    moq_compliant: Mapped[bool] = mapped_column(Boolean, default=True)
    original_quantity: Mapped[Optional[int]] = mapped_column(Integer)  # Before MOQ adjustment
    
    # Notes
    line_notes: Mapped[Optional[str]] = mapped_column(Text)
    
    # Relationships
    order: Mapped[SalesOrder] = relationship("SalesOrder", back_populates="lines")
    product: Mapped["Product"] = relationship("Product")
    ship_from_location: Mapped[Optional["Location"]] = relationship("Location")
    
    def __repr__(self) -> str:
        return f"<SalesOrderLine(order_id={self.order_id}, line={self.line_number}, sku='{self.product_sku}', qty={self.quantity_ordered})>"
    
    @property
    def quantity_remaining(self) -> int:
        """Quantity still to be shipped."""
        return self.quantity_ordered - self.quantity_shipped
    
    @property
    def is_fully_allocated(self) -> bool:
        """Check if line is fully allocated."""
        return self.quantity_allocated >= self.quantity_ordered
    
    @property
    def is_fully_shipped(self) -> bool:
        """Check if line is fully shipped."""
        return self.quantity_shipped >= self.quantity_ordered
    
    def calculate_extended_price(self) -> None:
        """Calculate extended price from unit price and discount."""
        gross_amount = self.unit_price * self.quantity_ordered
        if self.discount_percent > 0:
            self.discount_amount = gross_amount * (self.discount_percent / 100)
        self.extended_price = gross_amount - self.discount_amount