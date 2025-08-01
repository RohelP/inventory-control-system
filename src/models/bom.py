"""Bill of Materials models for Excel-calculated BOMs."""

from decimal import Decimal
from enum import Enum
from typing import Optional, List
from datetime import datetime
from sqlalchemy import String, Numeric, Integer, ForeignKey, DateTime, Text, Boolean, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin


class BOMStatus(str, Enum):
    """BOM calculation status."""
    PENDING = "pending"
    CALCULATING = "calculating"
    COMPLETED = "completed"
    ERROR = "error"
    CANCELLED = "cancelled"


class ComponentType(str, Enum):
    """Type of BOM component."""
    RAW_MATERIAL = "raw_material"
    COMPONENT = "component"
    ASSEMBLY = "assembly"
    PACKAGING = "packaging"
    LABOR = "labor"
    OVERHEAD = "overhead"


class BillOfMaterials(Base, TimestampMixin):
    """Bill of Materials header linked to sales orders."""
    
    __tablename__ = "bill_of_materials"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    sales_order_id: Mapped[int] = mapped_column(
        ForeignKey("sales_orders.id"), nullable=False, unique=True
    )
    bom_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    
    # Calculation details
    status: Mapped[BOMStatus] = mapped_column(SQLEnum(BOMStatus), default=BOMStatus.PENDING)
    calculation_started: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    calculation_completed: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    calculation_duration_seconds: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Excel integration
    excel_template_used: Mapped[Optional[str]] = mapped_column(String(200))
    excel_file_path: Mapped[Optional[str]] = mapped_column(String(500))
    excel_calculation_errors: Mapped[Optional[str]] = mapped_column(Text)
    
    # BOM totals
    total_material_cost: Mapped[Decimal] = mapped_column(Numeric(15, 4), default=0)
    total_labor_cost: Mapped[Decimal] = mapped_column(Numeric(15, 4), default=0)
    total_overhead_cost: Mapped[Decimal] = mapped_column(Numeric(15, 4), default=0)
    total_bom_cost: Mapped[Decimal] = mapped_column(Numeric(15, 4), default=0)
    
    # Calculation metadata
    calculation_version: Mapped[str] = mapped_column(String(20), default="1.0")
    calculated_by: Mapped[Optional[str]] = mapped_column(String(100))
    
    # Approval workflow
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=False)
    approved: Mapped[bool] = mapped_column(Boolean, default=False)
    approved_by: Mapped[Optional[str]] = mapped_column(String(100))
    approved_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    # Notes and comments
    calculation_notes: Mapped[Optional[str]] = mapped_column(Text)
    approval_notes: Mapped[Optional[str]] = mapped_column(Text)
    
    # Relationships
    sales_order: Mapped["SalesOrder"] = relationship("SalesOrder", back_populates="bom")
    line_items: Mapped[List["BOMLineItem"]] = relationship(
        "BOMLineItem", back_populates="bom", cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<BillOfMaterials(bom_number='{self.bom_number}', status='{self.status}')>"
    
    @property
    def is_calculation_complete(self) -> bool:
        """Check if BOM calculation is complete and successful."""
        return self.status == BOMStatus.COMPLETED and self.approved
    
    @property
    def has_errors(self) -> bool:
        """Check if BOM calculation had errors."""
        return self.status == BOMStatus.ERROR or bool(self.excel_calculation_errors)
    
    def calculate_totals(self) -> None:
        """Recalculate BOM totals from line items."""
        material_cost = sum(
            item.extended_cost for item in self.line_items 
            if item.component_type == ComponentType.RAW_MATERIAL
        )
        component_cost = sum(
            item.extended_cost for item in self.line_items 
            if item.component_type == ComponentType.COMPONENT
        )
        self.total_material_cost = material_cost + component_cost
        
        self.total_labor_cost = sum(
            item.extended_cost for item in self.line_items 
            if item.component_type == ComponentType.LABOR
        )
        
        self.total_overhead_cost = sum(
            item.extended_cost for item in self.line_items 
            if item.component_type == ComponentType.OVERHEAD
        )
        
        self.total_bom_cost = self.total_material_cost + self.total_labor_cost + self.total_overhead_cost


class BOMLineItem(Base, TimestampMixin):
    """Individual BOM line items calculated from Excel."""
    
    __tablename__ = "bom_line_items"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    bom_id: Mapped[int] = mapped_column(ForeignKey("bill_of_materials.id"), nullable=False)
    line_number: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Component identification
    component_sku: Mapped[Optional[str]] = mapped_column(String(50))  # May not exist in products
    component_name: Mapped[str] = mapped_column(String(200), nullable=False)
    component_description: Mapped[Optional[str]] = mapped_column(Text)
    component_type: Mapped[ComponentType] = mapped_column(SQLEnum(ComponentType))
    
    # Quantities
    quantity_required: Mapped[Decimal] = mapped_column(Numeric(15, 6), nullable=False)
    unit_of_measure: Mapped[str] = mapped_column(String(20), default="EA")
    
    # Costing
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(15, 4), nullable=False)
    extended_cost: Mapped[Decimal] = mapped_column(Numeric(15, 4), nullable=False)
    cost_source: Mapped[str] = mapped_column(String(50))  # "excel", "product_master", "manual"
    
    # Excel source tracking
    excel_row_reference: Mapped[Optional[str]] = mapped_column(String(20))  # Excel row/cell reference
    excel_formula: Mapped[Optional[str]] = mapped_column(Text)  # Original Excel formula
    
    # Inventory tracking
    product_id: Mapped[Optional[int]] = mapped_column(ForeignKey("products.id"))  # Link if exists
    requires_procurement: Mapped[bool] = mapped_column(Boolean, default=True)
    lead_time_days: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Notes
    line_notes: Mapped[Optional[str]] = mapped_column(Text)
    
    # Relationships
    bom: Mapped[BillOfMaterials] = relationship("BillOfMaterials", back_populates="line_items")
    product: Mapped[Optional["Product"]] = relationship("Product")
    
    def __repr__(self) -> str:
        return f"<BOMLineItem(bom_id={self.bom_id}, line={self.line_number}, component='{self.component_name}')>"
    
    @property
    def is_inventory_item(self) -> bool:
        """Check if component exists in inventory system."""
        return self.product_id is not None
    
    @property
    def availability_status(self) -> str:
        """Get availability status for inventory items."""
        if not self.is_inventory_item:
            return "not_tracked"
        
        # Would check inventory levels here
        return "available"  # Placeholder
    
    def calculate_extended_cost(self) -> None:
        """Calculate extended cost from quantity and unit cost."""
        self.extended_cost = self.quantity_required * self.unit_cost