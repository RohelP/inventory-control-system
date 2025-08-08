from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date

# Order Schemas
class OrderBase(BaseModel):
    customer_name: str
    company: str
    phone: Optional[str] = None
    email: Optional[str] = None
    order_date: date
    damper_type: str
    special_requirements: Optional[str] = None

class OrderCreate(OrderBase):
    pass

class OrderUpdate(BaseModel):
    customer_name: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    order_date: Optional[date] = None
    damper_type: Optional[str] = None
    special_requirements: Optional[str] = None
    status: Optional[str] = None
    current_step: Optional[int] = None
    bom_generated: Optional[bool] = None
    ul_compliant: Optional[bool] = None
    inventory_reserved: Optional[bool] = None
    production_progress: Optional[int] = None
    dimensions_length: Optional[str] = None
    dimensions_width: Optional[str] = None
    dimensions_height: Optional[str] = None

class OrderResponse(OrderBase):
    id: str
    status: str
    current_step: int
    created_at: datetime
    bom_generated: bool
    ul_compliant: bool
    inventory_reserved: bool
    production_progress: int
    dimensions_length: Optional[str] = None
    dimensions_width: Optional[str] = None
    dimensions_height: Optional[str] = None

    class Config:
        from_attributes = True

# BOM Item Schemas
class BOMItemBase(BaseModel):
    part_number: str
    description: str
    quantity: int
    unit_cost: float
    supplier: Optional[str] = None
    lead_time_days: Optional[int] = None

class BOMItemCreate(BOMItemBase):
    pass

class BOMItemResponse(BOMItemBase):
    id: int
    order_id: str
    total_cost: float

    class Config:
        from_attributes = True

# Inventory Item Schemas
class InventoryItemBase(BaseModel):
    part_number: str
    description: str
    category: Optional[str] = None
    quantity_available: int = 0
    quantity_reserved: int = 0
    unit_cost: Optional[float] = None
    reorder_level: int = 10
    supplier: Optional[str] = None
    location: Optional[str] = None

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemUpdate(BaseModel):
    description: Optional[str] = None
    category: Optional[str] = None
    quantity_available: Optional[int] = None
    quantity_reserved: Optional[int] = None
    unit_cost: Optional[float] = None
    reorder_level: Optional[int] = None
    supplier: Optional[str] = None
    location: Optional[str] = None

class InventoryItemResponse(InventoryItemBase):
    id: int
    last_updated: datetime

    class Config:
        from_attributes = True

# Quality Check Schemas
class QualityCheckBase(BaseModel):
    check_type: str
    status: str = "Pending"
    inspector: Optional[str] = None
    notes: Optional[str] = None

class QualityCheckCreate(QualityCheckBase):
    pass

class QualityCheckResponse(QualityCheckBase):
    id: int
    order_id: str
    checked_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Purchase Order Schemas
class PurchaseOrderBase(BaseModel):
    supplier: str
    order_date: date
    expected_delivery: Optional[date] = None
    status: str = "Draft"
    total_amount: Optional[float] = None
    notes: Optional[str] = None

class PurchaseOrderCreate(PurchaseOrderBase):
    pass

class PurchaseOrderResponse(PurchaseOrderBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Dashboard Statistics Schema
class DashboardStats(BaseModel):
    total_orders: int
    in_production: int
    completed: int
    pending_ul: int
    needs_purchase: int
    quality_control: int


# Planning parameters and FIFO/LIFO policy
class ItemPlanningParamsBase(BaseModel):
    part_number: str
    demand_rate_per_day: float = 0.0
    lead_time_days: int = 0
    safety_stock: int = 0
    consumption_policy: str = "FIFO"  # FIFO or LIFO

class ItemPlanningParamsCreate(ItemPlanningParamsBase):
    pass

class ItemPlanningParamsUpdate(BaseModel):
    demand_rate_per_day: Optional[float] = None
    lead_time_days: Optional[int] = None
    safety_stock: Optional[int] = None
    consumption_policy: Optional[str] = None

class ItemPlanningParamsResponse(ItemPlanningParamsBase):
    id: int
    computed_reorder_level: int
    updated_at: datetime

    class Config:
        from_attributes = True


# Inventory lot receipts
class InventoryReceiptCreate(BaseModel):
    part_number: str
    quantity_received: int
    unit_cost: float
    received_at: Optional[datetime] = None
    expiration_date: Optional[datetime] = None

class InventoryReceiptResponse(BaseModel):
    id: int
    part_number: str
    quantity_received: int
    quantity_remaining: int
    unit_cost: float
    received_at: datetime
    expiration_date: Optional[datetime] = None

    class Config:
        from_attributes = True


# Inventory allocation response
class InventoryAllocationResponse(BaseModel):
    id: int
    order_id: str
    part_number: str
    receipt_id: int
    quantity_allocated: int
    allocated_at: datetime

    class Config:
        from_attributes = True


# ABC analysis schemas
class ItemABCBase(BaseModel):
    part_number: str
    annual_demand: int = 0

class ItemABCCreate(ItemABCBase):
    pass

class ItemABCUpdate(BaseModel):
    annual_demand: Optional[int] = None

class ItemABCResponse(BaseModel):
    id: int
    part_number: str
    annual_demand: int
    annual_consumption_value: float
    abc_class: Optional[str] = None
    computed_at: datetime

    class Config:
        from_attributes = True