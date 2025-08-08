from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import uvicorn
from datetime import datetime, date

from models import (
    Order,
    BOMItem,
    InventoryItem,
    QualityCheck,
    SessionLocal,
    engine,
    Base,
    ItemPlanningParams,
    InventoryReceipt,
    InventoryAllocation,
    ItemABC,
)
from schemas import (
    OrderCreate,
    OrderUpdate,
    OrderResponse,
    BOMItemCreate,
    InventoryItemResponse,
    InventoryItemCreate,
    InventoryItemUpdate,
    ItemPlanningParamsCreate,
    ItemPlanningParamsUpdate,
    ItemPlanningParamsResponse,
    InventoryReceiptCreate,
    InventoryReceiptResponse,
    InventoryAllocationResponse,
    ItemABCCreate,
    ItemABCUpdate,
    ItemABCResponse,
)

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Inventory Control System API",
    description="Backend API for Damper Manufacturing & UL Compliance Management",
    version="1.0.0"
)

# Configure CORS for Electron frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "file://"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
async def root():
    return {"message": "Inventory Control System API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

# Order Management Endpoints
@app.get("/api/orders", response_model=List[OrderResponse])
async def get_orders(db: Session = Depends(get_db)):
    """Get all orders"""
    orders = db.query(Order).all()
    return orders

@app.get("/api/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str, db: Session = Depends(get_db)):
    """Get a specific order by ID"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@app.post("/api/orders", response_model=OrderResponse)
async def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    """Create a new order"""
    # Generate order ID
    order_count = db.query(Order).count()
    order_id = f"ORD-{order_count + 1:03d}"
    
    db_order = Order(
        id=order_id,
        customer_name=order.customer_name,
        company=order.company,
        phone=order.phone,
        email=order.email,
        order_date=order.order_date,
        damper_type=order.damper_type,
        special_requirements=order.special_requirements,
        status="Created",
        current_step=1,
        created_at=datetime.now(),
        bom_generated=False,
        ul_compliant=False,
        inventory_reserved=False,
        production_progress=0
    )
    
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    
    return db_order

@app.put("/api/orders/{order_id}", response_model=OrderResponse)
async def update_order(order_id: str, order_update: OrderUpdate, db: Session = Depends(get_db)):
    """Update an existing order"""
    db_order = db.query(Order).filter(Order.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Update fields if provided
    for field, value in order_update.dict(exclude_unset=True).items():
        setattr(db_order, field, value)
    
    db.commit()
    db.refresh(db_order)
    return db_order

@app.delete("/api/orders/{order_id}")
async def delete_order(order_id: str, db: Session = Depends(get_db)):
    """Delete an order"""
    db_order = db.query(Order).filter(Order.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    db.delete(db_order)
    db.commit()
    return {"message": "Order deleted successfully"}

# BOM Management Endpoints
@app.get("/api/orders/{order_id}/bom")
async def get_order_bom(order_id: str, db: Session = Depends(get_db)):
    """Get BOM items for an order"""
    bom_items = db.query(BOMItem).filter(BOMItem.order_id == order_id).all()
    return bom_items

@app.post("/api/orders/{order_id}/bom")
async def create_bom_item(order_id: str, bom_item: BOMItemCreate, db: Session = Depends(get_db)):
    """Add a BOM item to an order"""
    db_bom_item = BOMItem(
        order_id=order_id,
        part_number=bom_item.part_number,
        description=bom_item.description,
        quantity=bom_item.quantity,
        unit_cost=bom_item.unit_cost,
        total_cost=bom_item.quantity * bom_item.unit_cost,
        supplier=bom_item.supplier,
        lead_time_days=bom_item.lead_time_days
    )
    
    db.add(db_bom_item)
    db.commit()
    db.refresh(db_bom_item)
    
    # Update order BOM status
    order = db.query(Order).filter(Order.id == order_id).first()
    if order:
        order.bom_generated = True
        db.commit()
    
    return db_bom_item

@app.post("/api/orders/{order_id}/bom/batch")
async def create_bom_batch(order_id: str, request: dict, db: Session = Depends(get_db)):
    """Add multiple BOM items to an order (for Excel imports)"""
    bom_items = request.get("items", [])
    
    if not bom_items:
        raise HTTPException(status_code=400, detail="No BOM items provided")
    
    created_items = []
    
    for bom_data in bom_items:
        db_bom_item = BOMItem(
            order_id=order_id,
            part_number=bom_data.get("part_number"),
            description=bom_data.get("description"),
            quantity=bom_data.get("quantity", 0),
            unit_cost=bom_data.get("unit_cost", 0.0),
            total_cost=bom_data.get("quantity", 0) * bom_data.get("unit_cost", 0.0),
            supplier=bom_data.get("supplier"),
            lead_time_days=bom_data.get("lead_time_days")
        )
        
        db.add(db_bom_item)
        created_items.append(db_bom_item)
    
    db.commit()
    
    # Refresh all items to get IDs
    for item in created_items:
        db.refresh(item)
    
    # Update order BOM status
    order = db.query(Order).filter(Order.id == order_id).first()
    if order:
        order.bom_generated = True
        db.commit()
    
    return created_items

@app.put("/api/orders/{order_id}/bom/batch")
async def update_bom_batch(order_id: str, request: dict, db: Session = Depends(get_db)):
    """Replace all BOM items for an order (for Excel updates)"""
    bom_items = request.get("items", [])
    
    # Delete existing BOM items
    db.query(BOMItem).filter(BOMItem.order_id == order_id).delete()
    
    created_items = []
    
    for bom_data in bom_items:
        db_bom_item = BOMItem(
            order_id=order_id,
            part_number=bom_data.get("part_number"),
            description=bom_data.get("description"),
            quantity=bom_data.get("quantity", 0),
            unit_cost=bom_data.get("unit_cost", 0.0),
            total_cost=bom_data.get("quantity", 0) * bom_data.get("unit_cost", 0.0),
            supplier=bom_data.get("supplier"),
            lead_time_days=bom_data.get("lead_time_days")
        )
        
        db.add(db_bom_item)
        created_items.append(db_bom_item)
    
    db.commit()
    
    # Refresh all items to get IDs
    for item in created_items:
        db.refresh(item)
    
    # Update order BOM status
    order = db.query(Order).filter(Order.id == order_id).first()
    if order:
        order.bom_generated = True
        db.commit()
    
    return created_items

@app.delete("/api/orders/{order_id}/bom/{bom_item_id}")
async def delete_bom_item(order_id: str, bom_item_id: int, db: Session = Depends(get_db)):
    """Delete a specific BOM item"""
    bom_item = db.query(BOMItem).filter(
        BOMItem.id == bom_item_id,
        BOMItem.order_id == order_id
    ).first()
    
    if not bom_item:
        raise HTTPException(status_code=404, detail="BOM item not found")
    
    db.delete(bom_item)
    db.commit()
    
    return {"message": "BOM item deleted successfully"}

# Inventory Management Endpoints
@app.get("/api/inventory", response_model=List[InventoryItemResponse])
async def get_inventory(db: Session = Depends(get_db)):
    """Get all inventory items"""
    items = db.query(InventoryItem).all()
    return items

@app.get("/api/inventory/{part_number}", response_model=InventoryItemResponse)
async def get_inventory_item(part_number: str, db: Session = Depends(get_db)):
    """Get a specific inventory item by part number"""
    item = db.query(InventoryItem).filter(InventoryItem.part_number == part_number).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return item

@app.post("/api/inventory", response_model=InventoryItemResponse)
async def create_inventory_item(item: InventoryItemCreate, db: Session = Depends(get_db)):
    """Create a new inventory item"""
    # Check if part number already exists
    existing_item = db.query(InventoryItem).filter(InventoryItem.part_number == item.part_number).first()
    if existing_item:
        raise HTTPException(status_code=400, detail="Part number already exists")
    
    db_item = InventoryItem(
        part_number=item.part_number,
        description=item.description,
        category=item.category,
        quantity_available=item.quantity_available,
        quantity_reserved=item.quantity_reserved,
        unit_cost=item.unit_cost,
        reorder_level=item.reorder_level,
        supplier=item.supplier,
        location=item.location,
        last_updated=datetime.now()
    )
    
    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    # Initialize planning params row if absent
    existing_params = db.query(ItemPlanningParams).filter(ItemPlanningParams.part_number == item.part_number).first()
    if not existing_params:
        params = ItemPlanningParams(
            part_number=item.part_number,
            demand_rate_per_day=0.0,
            lead_time_days=0,
            safety_stock=0,
            consumption_policy="FIFO",
            computed_reorder_level=item.reorder_level,
            updated_at=datetime.now(),
        )
        db.add(params)
        db.commit()

    # Seed an opening balance receipt if quantity_available > 0
    if item.quantity_available and item.quantity_available > 0:
        opening_receipt = InventoryReceipt(
            part_number=item.part_number,
            quantity_received=item.quantity_available,
            quantity_remaining=item.quantity_available,
            unit_cost=item.unit_cost or 0.0,
            received_at=datetime.now(),
        )
        db.add(opening_receipt)
        db.commit()

    return db_item

@app.put("/api/inventory/{part_number}", response_model=InventoryItemResponse)
async def update_inventory_item(part_number: str, item_update: InventoryItemUpdate, db: Session = Depends(get_db)):
    """Update an existing inventory item"""
    db_item = db.query(InventoryItem).filter(InventoryItem.part_number == part_number).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    # Update fields if provided
    for field, value in item_update.dict(exclude_unset=True).items():
        setattr(db_item, field, value)
    
    db_item.last_updated = datetime.now()
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/api/inventory/{part_number}")
async def delete_inventory_item(part_number: str, db: Session = Depends(get_db)):
    """Delete an inventory item"""
    db_item = db.query(InventoryItem).filter(InventoryItem.part_number == part_number).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    db.delete(db_item)
    db.commit()
    return {"message": "Inventory item deleted successfully"}

@app.post("/api/inventory/batch")
async def create_inventory_batch(request: dict, db: Session = Depends(get_db)):
    """Add multiple inventory items (for bulk imports)"""
    items = request.get("items", [])
    
    if not items:
        raise HTTPException(status_code=400, detail="No inventory items provided")
    
    created_items = []
    
    for item_data in items:
        # Check if part number already exists
        existing_item = db.query(InventoryItem).filter(InventoryItem.part_number == item_data.get("part_number")).first()
        if existing_item:
            continue  # Skip existing items
        
        db_item = InventoryItem(
            part_number=item_data.get("part_number"),
            description=item_data.get("description"),
            category=item_data.get("category"),
            quantity_available=item_data.get("quantity_available", 0),
            quantity_reserved=item_data.get("quantity_reserved", 0),
            unit_cost=item_data.get("unit_cost"),
            reorder_level=item_data.get("reorder_level", 10),
            supplier=item_data.get("supplier"),
            location=item_data.get("location"),
            last_updated=datetime.now()
        )
        
        db.add(db_item)
        created_items.append(db_item)
    
    db.commit()
    
    # Refresh all items to get IDs and seed planning/receipts
    for item in created_items:
        db.refresh(item)
        # Initialize planning params if absent
        existing_params = db.query(ItemPlanningParams).filter(ItemPlanningParams.part_number == item.part_number).first()
        if not existing_params:
            params = ItemPlanningParams(
                part_number=item.part_number,
                demand_rate_per_day=0.0,
                lead_time_days=0,
                safety_stock=0,
                consumption_policy="FIFO",
                computed_reorder_level=item.reorder_level or 10,
                updated_at=datetime.now(),
            )
            db.add(params)
            db.commit()
        # Seed opening balance receipt if quantity > 0
        if item.quantity_available and item.quantity_available > 0:
            opening_receipt = InventoryReceipt(
                part_number=item.part_number,
                quantity_received=item.quantity_available,
                quantity_remaining=item.quantity_available,
                unit_cost=item.unit_cost or 0.0,
                received_at=datetime.now(),
            )
            db.add(opening_receipt)
            db.commit()

    return created_items


# Helper: allocate from receipts according to policy
def _allocate_from_receipts(db: Session, order_id: str, part_number: str, quantity_required: int) -> list[InventoryAllocation]:
    params = db.query(ItemPlanningParams).filter(ItemPlanningParams.part_number == part_number).first()
    policy = (params.consumption_policy if params and params.consumption_policy in ("FIFO", "LIFO") else "FIFO")
    order_by_clause = InventoryReceipt.received_at.asc() if policy == "FIFO" else InventoryReceipt.received_at.desc()

    available_receipts = (
        db.query(InventoryReceipt)
        .filter(
            InventoryReceipt.part_number == part_number,
            InventoryReceipt.quantity_remaining > 0,
        )
        .order_by(order_by_clause)
        .all()
    )

    remaining_to_allocate = quantity_required
    created_allocations: list[InventoryAllocation] = []
    for receipt in available_receipts:
        if remaining_to_allocate <= 0:
            break
        take_qty = min(receipt.quantity_remaining, remaining_to_allocate)
        if take_qty <= 0:
            continue
        receipt.quantity_remaining -= take_qty
        allocation = InventoryAllocation(
            order_id=order_id,
            part_number=part_number,
            receipt_id=receipt.id,
            quantity_allocated=take_qty,
            allocated_at=datetime.now(),
        )
        db.add(allocation)
        created_allocations.append(allocation)
        remaining_to_allocate -= take_qty

    if remaining_to_allocate > 0:
        # Not enough lots to support allocation; revert and raise
        for allocation in created_allocations:
            receipt = db.query(InventoryReceipt).filter(InventoryReceipt.id == allocation.receipt_id).first()
            if receipt:
                receipt.quantity_remaining += allocation.quantity_allocated
            db.delete(allocation)
        raise HTTPException(status_code=400, detail=f"Insufficient lot-level inventory for {part_number}")

    return created_allocations

@app.get("/api/inventory/check/{order_id}")
async def check_inventory_for_order(order_id: str, db: Session = Depends(get_db)):
    """Check if inventory is sufficient for an order"""
    bom_items = db.query(BOMItem).filter(BOMItem.order_id == order_id).all()
    
    insufficient_items = []
    for bom_item in bom_items:
        inventory_item = db.query(InventoryItem).filter(
            InventoryItem.part_number == bom_item.part_number
        ).first()
        
        if not inventory_item or inventory_item.quantity_available < bom_item.quantity:
            insufficient_items.append({
                "part_number": bom_item.part_number,
                "required": bom_item.quantity,
                "available": inventory_item.quantity_available if inventory_item else 0,
                "shortfall": bom_item.quantity - (inventory_item.quantity_available if inventory_item else 0)
            })
    
    return {
        "order_id": order_id,
        "can_fulfill": len(insufficient_items) == 0,
        "insufficient_items": insufficient_items
    }

@app.post("/api/inventory/reserve/{order_id}")
async def reserve_inventory_for_order(order_id: str, db: Session = Depends(get_db)):
    """Reserve inventory for an order"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    bom_items = db.query(BOMItem).filter(BOMItem.order_id == order_id).all()
    
    if not bom_items:
        raise HTTPException(status_code=400, detail="No BOM items found for this order")
    
    # Check if we can reserve all items
    insufficient_items = []
    for bom_item in bom_items:
        inventory_item = db.query(InventoryItem).filter(
            InventoryItem.part_number == bom_item.part_number
        ).first()
        
        if not inventory_item or inventory_item.quantity_available < bom_item.quantity:
            insufficient_items.append({
                "part_number": bom_item.part_number,
                "required": bom_item.quantity,
                "available": inventory_item.quantity_available if inventory_item else 0
            })
    
    if insufficient_items:
        raise HTTPException(status_code=400, detail="Insufficient inventory", extra={"insufficient_items": insufficient_items})
    
    # Reserve inventory with FIFO/LIFO allocations
    for bom_item in bom_items:
        inventory_item = db.query(InventoryItem).filter(InventoryItem.part_number == bom_item.part_number).first()
        # Seed an opening receipt if this legacy item has on-hand qty but no receipts
        has_receipts = db.query(InventoryReceipt).filter(InventoryReceipt.part_number == bom_item.part_number).first()
        if not has_receipts and (inventory_item.quantity_available or 0) > 0:
            opening_receipt = InventoryReceipt(
                part_number=bom_item.part_number,
                quantity_received=inventory_item.quantity_available,
                quantity_remaining=inventory_item.quantity_available,
                unit_cost=inventory_item.unit_cost or 0.0,
                received_at=datetime.now(),
            )
            db.add(opening_receipt)
            db.commit()
        _allocate_from_receipts(db, order_id, bom_item.part_number, bom_item.quantity)
        inventory_item.quantity_available -= bom_item.quantity
        inventory_item.quantity_reserved += bom_item.quantity
        inventory_item.last_updated = datetime.now()
    
    # Update order status
    order.inventory_reserved = True
    order.current_step = 4  # Move to next step
    
    db.commit()
    
    return {"message": "Inventory reserved successfully", "order_id": order_id}

@app.post("/api/inventory/release/{order_id}")
async def release_inventory_for_order(order_id: str, db: Session = Depends(get_db)):
    """Release reserved inventory for an order (e.g., if order is cancelled)"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    bom_items = db.query(BOMItem).filter(BOMItem.order_id == order_id).all()
    
    # Release inventory using recorded allocations
    allocations = db.query(InventoryAllocation).filter(InventoryAllocation.order_id == order_id).all()
    for allocation in allocations:
        receipt = db.query(InventoryReceipt).filter(InventoryReceipt.id == allocation.receipt_id).first()
        if receipt:
            receipt.quantity_remaining += allocation.quantity_allocated
        inventory_item = db.query(InventoryItem).filter(InventoryItem.part_number == allocation.part_number).first()
        if inventory_item:
            inventory_item.quantity_available += allocation.quantity_allocated
            inventory_item.quantity_reserved -= allocation.quantity_allocated
            inventory_item.last_updated = datetime.now()
        db.delete(allocation)
    
    # Update order status
    order.inventory_reserved = False
    
    db.commit()
    
    return {"message": "Inventory released successfully", "order_id": order_id}


# Receiving inventory lots
@app.post("/api/inventory/receipts", response_model=InventoryReceiptResponse)
async def create_inventory_receipt(receipt: InventoryReceiptCreate, db: Session = Depends(get_db)):
    item = db.query(InventoryItem).filter(InventoryItem.part_number == receipt.part_number).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    db_receipt = InventoryReceipt(
        part_number=receipt.part_number,
        quantity_received=receipt.quantity_received,
        quantity_remaining=receipt.quantity_received,
        unit_cost=receipt.unit_cost,
        received_at=receipt.received_at or datetime.now(),
        expiration_date=receipt.expiration_date,
    )
    db.add(db_receipt)

    # Update on-hand
    item.quantity_available += receipt.quantity_received
    if receipt.unit_cost is not None:
        item.unit_cost = receipt.unit_cost
    item.last_updated = datetime.now()

    db.commit()
    db.refresh(db_receipt)
    return db_receipt


@app.get("/api/inventory/receipts/{part_number}", response_model=List[InventoryReceiptResponse])
async def list_inventory_receipts(part_number: str, db: Session = Depends(get_db)):
    receipts = (
        db.query(InventoryReceipt)
        .filter(InventoryReceipt.part_number == part_number)
        .order_by(InventoryReceipt.received_at.desc())
        .all()
    )
    return receipts


# Planning parameters and reorder computation
def _compute_reorder_level(demand_rate_per_day: float, lead_time_days: int, safety_stock: int) -> int:
    if demand_rate_per_day < 0:
        demand_rate_per_day = 0
    if lead_time_days < 0:
        lead_time_days = 0
    if safety_stock < 0:
        safety_stock = 0
    reorder_point = int(round(demand_rate_per_day * lead_time_days + safety_stock))
    return max(reorder_point, 0)


@app.post("/api/inventory/{part_number}/planning", response_model=ItemPlanningParamsResponse)
async def upsert_planning_params(part_number: str, params: ItemPlanningParamsCreate, db: Session = Depends(get_db)):
    item = db.query(InventoryItem).filter(InventoryItem.part_number == part_number).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    existing = db.query(ItemPlanningParams).filter(ItemPlanningParams.part_number == part_number).first()
    computed = _compute_reorder_level(params.demand_rate_per_day, params.lead_time_days, params.safety_stock)
    if existing:
        existing.demand_rate_per_day = params.demand_rate_per_day
        existing.lead_time_days = params.lead_time_days
        existing.safety_stock = params.safety_stock
        existing.consumption_policy = params.consumption_policy
        existing.computed_reorder_level = computed
        existing.updated_at = datetime.now()
        planning = existing
    else:
        planning = ItemPlanningParams(
            part_number=part_number,
            demand_rate_per_day=params.demand_rate_per_day,
            lead_time_days=params.lead_time_days,
            safety_stock=params.safety_stock,
            consumption_policy=params.consumption_policy,
            computed_reorder_level=computed,
            updated_at=datetime.now(),
        )
        db.add(planning)

    # Sync item.reorder_level with computed value
    item.reorder_level = computed
    item.last_updated = datetime.now()
    db.commit()
    db.refresh(planning)
    return planning


@app.patch("/api/inventory/{part_number}/planning", response_model=ItemPlanningParamsResponse)
async def update_planning_params(part_number: str, updates: ItemPlanningParamsUpdate, db: Session = Depends(get_db)):
    planning = db.query(ItemPlanningParams).filter(ItemPlanningParams.part_number == part_number).first()
    if not planning:
        raise HTTPException(status_code=404, detail="Planning params not found for item")

    for field, value in updates.dict(exclude_unset=True).items():
        setattr(planning, field, value)

    computed = _compute_reorder_level(planning.demand_rate_per_day, planning.lead_time_days, planning.safety_stock)
    planning.computed_reorder_level = computed
    planning.updated_at = datetime.now()

    # Sync item.reorder_level
    item = db.query(InventoryItem).filter(InventoryItem.part_number == part_number).first()
    if item:
        item.reorder_level = computed
        item.last_updated = datetime.now()

    db.commit()
    db.refresh(planning)
    return planning


# ABC analysis endpoints
@app.post("/api/inventory/abc/{part_number}", response_model=ItemABCResponse)
async def upsert_item_abc(part_number: str, payload: ItemABCCreate, db: Session = Depends(get_db)):
    item = db.query(InventoryItem).filter(InventoryItem.part_number == part_number).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    acv = float(payload.annual_demand) * float(item.unit_cost or 0.0)
    existing = db.query(ItemABC).filter(ItemABC.part_number == part_number).first()
    if existing:
        existing.annual_demand = payload.annual_demand
        existing.annual_consumption_value = acv
        existing.computed_at = datetime.now()
        result = existing
    else:
        result = ItemABC(
            part_number=part_number,
            annual_demand=payload.annual_demand,
            annual_consumption_value=acv,
            abc_class=None,
            computed_at=datetime.now(),
        )
        db.add(result)
    db.commit()
    db.refresh(result)
    return result


@app.post("/api/inventory/abc/recompute")
async def recompute_abc_classes(db: Session = Depends(get_db)):
    items = db.query(ItemABC).all()
    if not items:
        return {"updated": 0}

    # Refresh ACV from current unit_cost
    part_to_cost = {}
    for i in items:
        inv = db.query(InventoryItem).filter(InventoryItem.part_number == i.part_number).first()
        part_to_cost[i.part_number] = (inv.unit_cost if inv and inv.unit_cost is not None else 0.0)
    for i in items:
        unit_cost = float(part_to_cost.get(i.part_number) or 0.0)
        i.annual_consumption_value = float(i.annual_demand or 0) * unit_cost

    # Rank by ACV desc and assign A/B/C with 80/15/5 cumulative rule
    items_sorted = sorted(items, key=lambda x: x.annual_consumption_value, reverse=True)
    total_acv = sum(i.annual_consumption_value for i in items_sorted) or 1.0
    cumulative = 0.0
    for i in items_sorted:
        share = (i.annual_consumption_value / total_acv)
        cumulative += share
        if cumulative <= 0.80:
            i.abc_class = "A"
        elif cumulative <= 0.95:
            i.abc_class = "B"
        else:
            i.abc_class = "C"

    db.commit()
    return {"updated": len(items_sorted)}


@app.get("/api/inventory/abc", response_model=List[ItemABCResponse])
async def list_item_abc(db: Session = Depends(get_db)):
    return db.query(ItemABC).all()

@app.get("/api/inventory/low-stock")
async def get_low_stock_items(db: Session = Depends(get_db)):
    """Get inventory items that are below reorder level"""
    low_stock_items = db.query(InventoryItem).filter(
        InventoryItem.quantity_available <= InventoryItem.reorder_level
    ).all()
    
    return low_stock_items

@app.get("/api/inventory/out-of-stock")
async def get_out_of_stock_items(db: Session = Depends(get_db)):
    """Get inventory items that are completely out of stock"""
    out_of_stock_items = db.query(InventoryItem).filter(
        InventoryItem.quantity_available == 0
    ).all()
    
    return out_of_stock_items

# Production Tracking Endpoints
@app.put("/api/orders/{order_id}/production")
async def update_production_progress(order_id: str, progress: int, db: Session = Depends(get_db)):
    """Update production progress for an order"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.production_progress = progress
    if progress >= 100:
        order.status = "Completed"
        order.current_step = 8
    
    db.commit()
    db.refresh(order)
    return order

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )