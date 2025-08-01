"""Pricing models for dynamic pricing rules."""

from decimal import Decimal
from enum import Enum
from typing import Optional, List
from datetime import date
from sqlalchemy import String, Numeric, Integer, ForeignKey, Date, Boolean, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin


class PricingType(str, Enum):
    """Types of pricing rules."""
    LIST_PRICE = "list_price"
    COST_PLUS = "cost_plus"
    VOLUME_DISCOUNT = "volume_discount"
    CUSTOMER_SPECIFIC = "customer_specific"
    PROMOTIONAL = "promotional"
    CONTRACT = "contract"


class DiscountType(str, Enum):
    """Types of discounts."""
    PERCENTAGE = "percentage"
    FIXED_AMOUNT = "fixed_amount"
    TIERED = "tiered"


class PricingRule(Base, TimestampMixin):
    """Configurable pricing rules for products."""
    
    __tablename__ = "pricing_rules"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    rule_name: Mapped[str] = mapped_column(String(100), nullable=False)
    rule_code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    
    # Rule scope
    pricing_type: Mapped[PricingType] = mapped_column(SQLEnum(PricingType))
    product_id: Mapped[Optional[int]] = mapped_column(ForeignKey("products.id"))
    product_category_id: Mapped[Optional[int]] = mapped_column(ForeignKey("product_categories.id"))
    customer_id: Mapped[Optional[str]] = mapped_column(String(50))
    customer_group: Mapped[Optional[str]] = mapped_column(String(50))
    
    # Effective dates
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    expiration_date: Mapped[Optional[date]] = mapped_column(Date)
    
    # Pricing parameters
    base_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 4))
    markup_percentage: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2))
    discount_type: Mapped[Optional[DiscountType]] = mapped_column(SQLEnum(DiscountType))
    discount_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 4))
    
    # Volume thresholds
    minimum_quantity: Mapped[Optional[int]] = mapped_column(Integer)
    maximum_quantity: Mapped[Optional[int]] = mapped_column(Integer)
    minimum_order_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    
    # Rule priority and flags
    priority: Mapped[int] = mapped_column(Integer, default=100)  # Lower = higher priority
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_manual_override: Mapped[bool] = mapped_column(Boolean, default=True)
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Notes
    description: Mapped[Optional[str]] = mapped_column(Text)
    terms_and_conditions: Mapped[Optional[str]] = mapped_column(Text)
    
    # Relationships
    product: Mapped[Optional["Product"]] = relationship("Product")
    product_category: Mapped[Optional["ProductCategory"]] = relationship("ProductCategory")
    
    def __repr__(self) -> str:
        return f"<PricingRule(code='{self.rule_code}', type='{self.pricing_type}')>"
    
    @property
    def is_effective(self) -> bool:
        """Check if rule is currently effective."""
        today = date.today()
        return (
            self.is_active and 
            self.effective_date <= today and 
            (self.expiration_date is None or self.expiration_date >= today)
        )
    
    def applies_to_product(self, product_id: int, product_category_id: Optional[int] = None) -> bool:
        """Check if rule applies to specific product."""
        if self.product_id and self.product_id != product_id:
            return False
        if self.product_category_id and self.product_category_id != product_category_id:
            return False
        return True
    
    def applies_to_customer(self, customer_id: str, customer_group: Optional[str] = None) -> bool:
        """Check if rule applies to specific customer."""
        if self.customer_id and self.customer_id != customer_id:
            return False
        if self.customer_group and self.customer_group != customer_group:
            return False
        return True
    
    def calculate_price(self, base_cost: Decimal, quantity: int = 1) -> Decimal:
        """Calculate price based on rule parameters."""
        if self.pricing_type == PricingType.LIST_PRICE and self.base_price:
            return self.base_price
        
        if self.pricing_type == PricingType.COST_PLUS and self.markup_percentage:
            price = base_cost * (1 + self.markup_percentage / 100)
        else:
            price = self.base_price or base_cost
        
        # Apply discount if applicable
        if self.discount_type and self.discount_value:
            if self.discount_type == DiscountType.PERCENTAGE:
                price = price * (1 - self.discount_value / 100)
            elif self.discount_type == DiscountType.FIXED_AMOUNT:
                price = max(price - self.discount_value, Decimal('0'))
        
        return price


class CustomerPricing(Base, TimestampMixin):
    """Customer-specific pricing overrides."""
    
    __tablename__ = "customer_pricing"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[str] = mapped_column(String(50), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    
    # Pricing details
    unit_price: Mapped[Decimal] = mapped_column(Numeric(15, 4), nullable=False)
    minimum_quantity: Mapped[int] = mapped_column(Integer, default=1)
    
    # Effective dates
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    expiration_date: Mapped[Optional[date]] = mapped_column(Date)
    
    # Contract details
    contract_number: Mapped[Optional[str]] = mapped_column(String(50))
    contract_terms: Mapped[Optional[str]] = mapped_column(Text)
    
    # Flags
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text)
    
    # Relationships
    product: Mapped["Product"] = relationship("Product")
    
    def __repr__(self) -> str:
        return f"<CustomerPricing(customer_id='{self.customer_id}', product_id={self.product_id}, price={self.unit_price})>"
    
    @property
    def is_effective(self) -> bool:
        """Check if pricing is currently effective."""
        today = date.today()
        return (
            self.is_active and 
            self.effective_date <= today and 
            (self.expiration_date is None or self.expiration_date >= today)
        )