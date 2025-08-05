from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import uvicorn
from datetime import datetime, date

from models import Order, BOMItem, InventoryItem, QualityCheck, SessionLocal, engine, Base
from schemas import OrderCreate, OrderUpdate, OrderResponse, BOMItemCreate, InventoryItemResponse

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