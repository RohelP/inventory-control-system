"""Core inventory management service implementing inventory control principles."""

from decimal import Decimal
from typing import List, Optional, Dict, Tuple
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from ..models import (
    Product, InventoryItem, StockMovement, Location,
    MovementType, CostingMethod
)


class InventoryService:
    """Core inventory management service with FIFO/LIFO costing and ABC analysis."""
    
    def __init__(self, db_session: Session):
        self.db = db_session
    
    # === Stock Level Management ===
    
    def get_inventory_item(self, product_id: int, location_id: int) -> Optional[InventoryItem]:
        """Get inventory item for specific product and location."""
        return self.db.query(InventoryItem).filter(
            and_(
                InventoryItem.product_id == product_id,
                InventoryItem.location_id == location_id
            )
        ).first()
    
    def get_available_quantity(self, product_id: int, location_id: int) -> int:
        """Get available quantity (on hand - reserved) for a product at location."""
        item = self.get_inventory_item(product_id, location_id)
        return item.quantity_available if item else 0
    
    def get_total_available_quantity(self, product_id: int) -> int:
        """Get total available quantity across all locations."""
        total = self.db.query(func.sum(
            InventoryItem.quantity_on_hand - InventoryItem.quantity_reserved
        )).filter(InventoryItem.product_id == product_id).scalar()
        return int(total or 0)
    
    def reserve_inventory(self, product_id: int, location_id: int, quantity: int, 
                         reference_number: str = None) -> bool:
        """Reserve inventory for orders. Returns True if successful."""
        item = self.get_inventory_item(product_id, location_id)
        if not item or item.quantity_available < quantity:
            return False
        
        # Update reservation
        item.quantity_reserved += quantity
        
        # Create movement record
        self._create_stock_movement(
            item, MovementType.RESERVATION, -quantity, 
            reference_number=reference_number,
            notes=f"Reserved {quantity} units"
        )
        
        self.db.commit()
        return True
    
    def release_reservation(self, product_id: int, location_id: int, quantity: int,
                           reference_number: str = None) -> bool:
        """Release reserved inventory."""
        item = self.get_inventory_item(product_id, location_id)
        if not item or item.quantity_reserved < quantity:
            return False
        
        item.quantity_reserved -= quantity
        
        self._create_stock_movement(
            item, MovementType.RELEASE, quantity,
            reference_number=reference_number,
            notes=f"Released {quantity} units from reservation"
        )
        
        self.db.commit()
        return True
    
    # === Stock Movements ===
    
    def receive_inventory(self, product_id: int, location_id: int, quantity: int,
                         unit_cost: Decimal, reference_number: str = None,
                         notes: str = None) -> bool:
        """Receive inventory with proper costing."""
        item = self._get_or_create_inventory_item(product_id, location_id)
        
        # Update quantity
        old_quantity = item.quantity_on_hand
        item.quantity_on_hand += quantity
        
        # Update costing based on method
        self._update_costing(item, quantity, unit_cost)
        
        # Create movement record
        self._create_stock_movement(
            item, MovementType.RECEIPT, quantity, unit_cost,
            quantity_before=old_quantity,
            quantity_after=item.quantity_on_hand,
            reference_number=reference_number,
            notes=notes or f"Received {quantity} units at {unit_cost} each"
        )
        
        self.db.commit()
        return True
    
    def issue_inventory(self, product_id: int, location_id: int, quantity: int,
                       reference_number: str = None, notes: str = None) -> bool:
        """Issue inventory (sale, transfer, etc.) with FIFO/LIFO costing."""
        item = self.get_inventory_item(product_id, location_id)
        if not item or item.quantity_available < quantity:
            return False
        
        # Calculate cost of goods issued
        cost_per_unit = self._calculate_issue_cost(item, quantity)
        
        # Update quantities
        old_quantity = item.quantity_on_hand
        item.quantity_on_hand -= quantity
        
        # Update average cost and total value
        if item.quantity_on_hand > 0:
            item.total_cost_value -= (cost_per_unit * quantity)
            item.average_cost = item.total_cost_value / item.quantity_on_hand
        else:
            item.total_cost_value = Decimal('0')
            item.average_cost = Decimal('0')
        
        # Create movement record
        self._create_stock_movement(
            item, MovementType.SALE, -quantity, cost_per_unit,
            quantity_before=old_quantity,
            quantity_after=item.quantity_on_hand,
            reference_number=reference_number,
            notes=notes or f"Issued {quantity} units"
        )
        
        self.db.commit()
        return True
    
    def adjust_inventory(self, product_id: int, location_id: int, new_quantity: int,
                        reason: str, user_id: str = None) -> bool:
        """Perform inventory adjustment (cycle count, damage, etc.)."""
        item = self._get_or_create_inventory_item(product_id, location_id)
        
        old_quantity = item.quantity_on_hand
        adjustment = new_quantity - old_quantity
        
        if adjustment == 0:
            return True  # No adjustment needed
        
        item.quantity_on_hand = new_quantity
        item.last_counted = datetime.utcnow()
        
        # For positive adjustments, use current average cost
        unit_cost = item.average_cost if adjustment > 0 else None
        
        self._create_stock_movement(
            item, MovementType.ADJUSTMENT, adjustment, unit_cost,
            quantity_before=old_quantity,
            quantity_after=new_quantity,
            notes=f"Adjustment: {reason}",
            user_id=user_id
        )
        
        self.db.commit()
        return True
    
    # === Costing Methods ===
    
    def _update_costing(self, item: InventoryItem, received_qty: int, unit_cost: Decimal):
        """Update item costing based on configured method."""
        if item.costing_method == CostingMethod.WEIGHTED_AVERAGE:
            self._update_weighted_average_cost(item, received_qty, unit_cost)
        elif item.costing_method == CostingMethod.STANDARD:
            # Standard cost doesn't change with receipts
            item.total_cost_value += (received_qty * item.product.standard_cost)
        else:
            # FIFO/LIFO use weighted average for simplicity in this implementation
            # In production, you'd maintain detailed cost layers
            self._update_weighted_average_cost(item, received_qty, unit_cost)
    
    def _update_weighted_average_cost(self, item: InventoryItem, received_qty: int, unit_cost: Decimal):
        """Update weighted average cost."""
        old_total_value = item.total_cost_value
        old_quantity = item.quantity_on_hand - received_qty  # Quantity before this receipt
        
        new_value = received_qty * unit_cost
        total_value = old_total_value + new_value
        total_quantity = old_quantity + received_qty
        
        if total_quantity > 0:
            item.average_cost = total_value / total_quantity
            item.total_cost_value = total_value
    
    def _calculate_issue_cost(self, item: InventoryItem, quantity: int) -> Decimal:
        """Calculate cost per unit for inventory issues based on costing method."""
        if item.costing_method == CostingMethod.STANDARD:
            return item.product.standard_cost
        else:
            # For simplicity, use average cost for all methods
            # In production FIFO/LIFO would track cost layers
            return item.average_cost
    
    # === ABC Analysis ===
    
    def update_abc_classification(self, analysis_period_days: int = 365) -> Dict[str, int]:
        """Update ABC classification based on usage value."""
        # Get usage data for analysis period
        cutoff_date = datetime.utcnow().date() - timedelta(days=analysis_period_days)
        
        # Calculate annual usage value for each product
        usage_query = self.db.query(
            Product.id,
            func.sum(StockMovement.quantity * StockMovement.unit_cost).label('usage_value')
        ).join(InventoryItem).join(StockMovement).filter(
            and_(
                StockMovement.movement_type == MovementType.SALE,
                StockMovement.created_at >= cutoff_date
            )
        ).group_by(Product.id)
        
        usage_data = [(p_id, float(value or 0)) for p_id, value in usage_query.all()]
        usage_data.sort(key=lambda x: x[1], reverse=True)
        
        # Calculate ABC thresholds (80/15/5 rule)
        total_value = sum(value for _, value in usage_data)
        a_threshold = total_value * 0.8
        b_threshold = total_value * 0.95
        
        # Classify products
        classification_counts = {'A': 0, 'B': 0, 'C': 0}
        cumulative_value = 0
        
        for product_id, value in usage_data:
            cumulative_value += value
            
            if cumulative_value <= a_threshold:
                category = 'A'
            elif cumulative_value <= b_threshold:
                category = 'B'
            else:
                category = 'C'
            
            # Update product classification
            self.db.query(Product).filter(Product.id == product_id).update({
                'abc_category': category
            })
            classification_counts[category] += 1
        
        self.db.commit()
        return classification_counts
    
    # === Reorder Point Analysis ===
    
    def get_items_below_reorder_point(self, location_id: int = None) -> List[InventoryItem]:
        """Get inventory items below their reorder points."""
        query = self.db.query(InventoryItem).filter(
            (InventoryItem.quantity_on_hand - InventoryItem.quantity_reserved) <= InventoryItem.reorder_point
        )
        
        if location_id:
            query = query.filter(InventoryItem.location_id == location_id)
        
        return query.all()
    
    def calculate_economic_order_quantity(self, product_id: int, 
                                        annual_demand: int, 
                                        order_cost: Decimal,
                                        holding_cost_rate: Decimal) -> int:
        """Calculate EOQ: √(2DS/H) where D=demand, S=setup cost, H=holding cost."""
        import math
        
        product = self.db.query(Product).get(product_id)
        if not product:
            return 0
        
        holding_cost_per_unit = product.standard_cost * holding_cost_rate
        
        if holding_cost_per_unit <= 0:
            return product.minimum_order_quantity
        
        eoq = math.sqrt((2 * annual_demand * float(order_cost)) / float(holding_cost_per_unit))
        
        # Round to nearest whole number and ensure minimum MOQ
        eoq = max(int(round(eoq)), product.minimum_order_quantity)
        
        # Update product EOQ
        product.economic_order_quantity = eoq
        self.db.commit()
        
        return eoq
    
    # === Helper Methods ===
    
    def _get_or_create_inventory_item(self, product_id: int, location_id: int) -> InventoryItem:
        """Get existing inventory item or create new one."""
        item = self.get_inventory_item(product_id, location_id)
        if not item:
            product = self.db.query(Product).get(product_id)
            item = InventoryItem(
                product_id=product_id,
                location_id=location_id,
                quantity_on_hand=0,
                average_cost=product.standard_cost if product else Decimal('0'),
                reorder_point=product.reorder_point if product else 0
            )
            self.db.add(item)
            self.db.flush()  # Get ID without committing
        return item
    
    def _create_stock_movement(self, inventory_item: InventoryItem, movement_type: MovementType,
                              quantity: int, unit_cost: Decimal = None, **kwargs) -> StockMovement:
        """Create stock movement record."""
        movement = StockMovement(
            inventory_item_id=inventory_item.id,
            movement_type=movement_type,
            quantity=quantity,
            unit_cost=unit_cost,
            **kwargs
        )
        self.db.add(movement)
        return movement
    
    # === Reporting Methods ===
    
    def get_inventory_valuation(self, location_id: int = None, 
                               valuation_date: date = None) -> Dict[str, Decimal]:
        """Calculate total inventory valuation."""
        query = self.db.query(
            func.sum(InventoryItem.total_cost_value).label('total_value'),
            func.sum(InventoryItem.quantity_on_hand).label('total_units')
        )
        
        if location_id:
            query = query.filter(InventoryItem.location_id == location_id)
        
        result = query.first()
        
        return {
            'total_value': result.total_value or Decimal('0'),
            'total_units': result.total_units or 0
        }
    
    def get_slow_moving_items(self, days_without_movement: int = 90) -> List[Tuple[InventoryItem, int]]:
        """Get items with no movement in specified days."""
        cutoff_date = datetime.utcnow() - timedelta(days=days_without_movement)
        
        # Find items with no recent movements
        recent_movements = self.db.query(StockMovement.inventory_item_id).filter(
            StockMovement.created_at >= cutoff_date
        ).subquery()
        
        slow_items = self.db.query(InventoryItem).filter(
            and_(
                InventoryItem.quantity_on_hand > 0,
                ~InventoryItem.id.in_(recent_movements)
            )
        ).all()
        
        # Calculate days since last movement for each item
        result = []
        for item in slow_items:
            last_movement = self.db.query(StockMovement).filter(
                StockMovement.inventory_item_id == item.id
            ).order_by(StockMovement.created_at.desc()).first()
            
            if last_movement:
                days_since = (datetime.utcnow() - last_movement.created_at).days
            else:
                days_since = 999  # No movements found
            
            result.append((item, days_since))
        
        return sorted(result, key=lambda x: x[1], reverse=True)