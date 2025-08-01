"""Sales order processing service with inventory allocation and MOQ validation."""

from decimal import Decimal
from typing import List, Optional, Dict, Tuple
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..models import (
    SalesOrder, SalesOrderLine, Product, InventoryItem, Location,
    OrderStatus, LineStatus, PricingRule, CustomerPricing
)
from .inventory_service import InventoryService
from .pricing_service import PricingService
from .excel_bom_service import ExcelBOMService


class SalesOrderService:
    """Sales order processing with inventory allocation and MOQ compliance."""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.inventory_service = InventoryService(db_session)
        self.pricing_service = PricingService(db_session)
        self.bom_service = ExcelBOMService(db_session)
    
    # === Order Creation and Management ===
    
    def create_sales_order(self, order_data: Dict) -> SalesOrder:
        """Create new sales order with validation."""
        
        # Generate order number if not provided
        if not order_data.get('order_number'):
            order_data['order_number'] = self._generate_order_number()
        
        # Create order header
        order = SalesOrder(
            order_number=order_data['order_number'],
            customer_id=order_data['customer_id'],
            customer_name=order_data['customer_name'],
            customer_po_number=order_data.get('customer_po_number'),
            order_date=order_data.get('order_date', date.today()),
            requested_delivery_date=order_data.get('requested_delivery_date'),
            ship_to_name=order_data.get('ship_to_name'),
            ship_to_address1=order_data.get('ship_to_address1'),
            ship_to_city=order_data.get('ship_to_city'),
            ship_to_state=order_data.get('ship_to_state'),
            ship_to_postal_code=order_data.get('ship_to_postal_code'),
            ship_to_country=order_data.get('ship_to_country', 'US'),
            notes=order_data.get('notes'),
            status=OrderStatus.DRAFT
        )
        
        self.db.add(order)
        self.db.flush()  # Get order ID
        
        # Add line items
        for line_data in order_data.get('lines', []):
            self.add_order_line(order.id, line_data)
        
        # Calculate totals
        order.calculate_totals()
        
        self.db.commit()
        return order
    
    def add_order_line(self, order_id: int, line_data: Dict) -> SalesOrderLine:
        """Add line item to sales order with pricing and MOQ validation."""
        
        order = self.db.query(SalesOrder).get(order_id)
        if not order:
            raise ValueError(f"Sales order {order_id} not found")
        
        product = self.db.query(Product).filter(
            Product.sku == line_data['product_sku']
        ).first()
        if not product:
            raise ValueError(f"Product {line_data['product_sku']} not found")
        
        # Get next line number
        line_number = len(order.lines) + 1
        
        # Validate and adjust quantity for MOQ
        requested_qty = line_data['quantity']
        adjusted_qty, moq_compliant = self._validate_moq(product, requested_qty)
        
        # Get pricing
        unit_price = line_data.get('unit_price')
        if not unit_price:
            unit_price = self.pricing_service.get_customer_price(
                product.id, order.customer_id, adjusted_qty
            )
        
        # Create line item
        line = SalesOrderLine(
            order_id=order_id,
            line_number=line_number,
            product_id=product.id,
            product_sku=product.sku,
            product_name=product.name,
            quantity_ordered=adjusted_qty,
            unit_price=unit_price,
            discount_percent=line_data.get('discount_percent', 0),
            requested_date=line_data.get('requested_date'),
            line_notes=line_data.get('notes'),
            moq_compliant=moq_compliant,
            original_quantity=requested_qty if not moq_compliant else None
        )
        
        # Calculate extended price
        line.calculate_extended_price()
        
        self.db.add(line)
        
        # Check if BOM calculation is required
        if product.requires_bom_calculation:
            order.requires_bom_calculation = True
        
        return line
    
    def _validate_moq(self, product: Product, requested_qty: int) -> Tuple[int, bool]:
        """Validate and adjust quantity against MOQ."""
        if requested_qty >= product.minimum_order_quantity:
            return requested_qty, True
        else:
            return product.minimum_order_quantity, False
    
    # === Order Processing Workflow ===
    
    def confirm_order(self, order_id: int, user_id: str = None) -> bool:
        """Confirm order and trigger BOM calculation if needed."""
        
        order = self.db.query(SalesOrder).get(order_id)
        if not order or order.status != OrderStatus.DRAFT:
            return False
        
        # Validate all lines have valid pricing
        for line in order.lines:
            if line.unit_price <= 0:
                raise ValueError(f"Line {line.line_number} missing valid price")
        
        # Update status
        order.status = OrderStatus.CONFIRMED
        
        # Trigger BOM calculation if required
        if order.requires_bom_calculation:
            try:
                self.bom_service.calculate_bom_for_order(order_id, user_id=user_id)
            except Exception as e:
                # Don't fail confirmation if BOM calculation fails
                order.internal_notes = f"BOM calculation failed: {str(e)}"
        else:
            order.bom_calculated = True
            order.bom_calculation_date = datetime.utcnow()
        
        self.db.commit()
        return True
    
    def allocate_inventory(self, order_id: int, location_id: int = None) -> Dict[str, any]:
        """Allocate available inventory to order lines."""
        
        order = self.db.query(SalesOrder).get(order_id)
        if not order or not order.can_be_allocated:
            return {'success': False, 'message': 'Order cannot be allocated'}
        
        allocation_results = {
            'fully_allocated': [],
            'partially_allocated': [],
            'not_allocated': [],
            'total_lines': len(order.lines)
        }
        
        for line in order.lines:
            if line.status != LineStatus.PENDING:
                continue
            
            # Try to allocate from specific location or find best location
            if location_id:
                allocated_qty = self._allocate_line_from_location(line, location_id)
            else:
                allocated_qty = self._allocate_line_best_fit(line)
            
            # Update line status
            if allocated_qty == line.quantity_ordered:
                line.status = LineStatus.ALLOCATED
                allocation_results['fully_allocated'].append(line.line_number)
            elif allocated_qty > 0:
                line.status = LineStatus.ALLOCATED
                line.quantity_backordered = line.quantity_ordered - allocated_qty
                allocation_results['partially_allocated'].append({
                    'line': line.line_number,
                    'allocated': allocated_qty,
                    'backordered': line.quantity_backordered
                })
            else:
                line.status = LineStatus.BACKORDERED
                line.quantity_backordered = line.quantity_ordered
                allocation_results['not_allocated'].append(line.line_number)
        
        # Update order status
        if all(line.is_fully_allocated for line in order.lines):
            order.status = OrderStatus.IN_PROGRESS
        elif any(line.quantity_allocated > 0 for line in order.lines):
            order.status = OrderStatus.BACKORDERED
        else:
            order.status = OrderStatus.BACKORDERED
        
        self.db.commit()
        allocation_results['success'] = True
        return allocation_results
    
    def _allocate_line_from_location(self, line: SalesOrderLine, location_id: int) -> int:
        """Allocate inventory for a line from specific location."""
        
        available_qty = self.inventory_service.get_available_quantity(
            line.product_id, location_id
        )
        
        qty_to_allocate = min(available_qty, line.quantity_remaining)
        
        if qty_to_allocate > 0:
            # Reserve inventory
            success = self.inventory_service.reserve_inventory(
                line.product_id, location_id, qty_to_allocate,
                reference_number=f"SO-{line.order.order_number}-{line.line_number}"
            )
            
            if success:
                line.quantity_allocated += qty_to_allocate
                line.ship_from_location_id = location_id
                return qty_to_allocate
        
        return 0
    
    def _allocate_line_best_fit(self, line: SalesOrderLine) -> int:
        """Allocate inventory for a line from best available location."""
        
        # Get all locations with available inventory for this product
        available_locations = self.db.query(InventoryItem).filter(
            and_(
                InventoryItem.product_id == line.product_id,
                InventoryItem.quantity_on_hand > InventoryItem.quantity_reserved
            )
        ).all()
        
        # Sort by available quantity (highest first)
        available_locations.sort(
            key=lambda x: x.quantity_available, reverse=True
        )
        
        total_allocated = 0
        qty_remaining = line.quantity_remaining
        
        for inventory_item in available_locations:
            if qty_remaining <= 0:
                break
            
            qty_to_allocate = min(inventory_item.quantity_available, qty_remaining)
            
            if qty_to_allocate > 0:
                allocated = self._allocate_line_from_location(line, inventory_item.location_id)
                total_allocated += allocated
                qty_remaining -= allocated
        
        return total_allocated
    
    # === Order Fulfillment ===
    
    def ship_order(self, order_id: int, shipment_data: Dict) -> bool:
        """Process order shipment and update inventory."""
        
        order = self.db.query(SalesOrder).get(order_id)
        if not order or order.status not in [OrderStatus.IN_PROGRESS, OrderStatus.BACKORDERED]:
            return False
        
        shipped_lines = 0
        
        for line in order.lines:
            if line.quantity_allocated <= 0:
                continue
            
            # Ship allocated quantity
            qty_to_ship = line.quantity_allocated
            
            # Issue inventory
            success = self.inventory_service.issue_inventory(
                line.product_id, line.ship_from_location_id, qty_to_ship,
                reference_number=f"SO-{order.order_number}-{line.line_number}",
                notes=f"Shipped to {order.customer_name}"
            )
            
            if success:
                line.quantity_shipped += qty_to_ship
                line.quantity_allocated -= qty_to_ship
                
                if line.is_fully_shipped:
                    line.status = LineStatus.SHIPPED
                    shipped_lines += 1
        
        # Update order status
        if all(line.is_fully_shipped for line in order.lines):
            order.status = OrderStatus.SHIPPED
        
        # Record shipment information
        order.internal_notes = f"Shipped {shipped_lines} lines on {datetime.now().date()}"
        
        self.db.commit()
        return True
    
    # === Order Modifications ===
    
    def cancel_order(self, order_id: int, reason: str = None) -> bool:
        """Cancel order and release reserved inventory."""
        
        order = self.db.query(SalesOrder).get(order_id)
        if not order or order.status in [OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.CANCELLED]:
            return False
        
        # Release all reservations
        for line in order.lines:
            if line.quantity_allocated > 0:
                self.inventory_service.release_reservation(
                    line.product_id, line.ship_from_location_id, line.quantity_allocated,
                    reference_number=f"CANCEL-{order.order_number}-{line.line_number}"
                )
                line.quantity_allocated = 0
                line.status = LineStatus.CANCELLED
        
        order.status = OrderStatus.CANCELLED
        if reason:
            order.internal_notes = f"Cancelled: {reason}"
        
        self.db.commit()
        return True
    
    def modify_order_line(self, order_id: int, line_number: int, 
                         new_quantity: int = None, new_price: Decimal = None) -> bool:
        """Modify order line quantity or price."""
        
        order = self.db.query(SalesOrder).get(order_id)
        if not order or order.status not in [OrderStatus.DRAFT, OrderStatus.CONFIRMED]:
            return False
        
        line = next((l for l in order.lines if l.line_number == line_number), None)
        if not line:
            return False
        
        # Handle quantity change
        if new_quantity is not None and new_quantity != line.quantity_ordered:
            # Release current allocation
            if line.quantity_allocated > 0:
                self.inventory_service.release_reservation(
                    line.product_id, line.ship_from_location_id, line.quantity_allocated
                )
                line.quantity_allocated = 0
            
            # Validate MOQ for new quantity
            adjusted_qty, moq_compliant = self._validate_moq(line.product, new_quantity)
            line.quantity_ordered = adjusted_qty
            line.moq_compliant = moq_compliant
            line.original_quantity = new_quantity if not moq_compliant else None
            
            # Reset status
            line.status = LineStatus.PENDING
        
        # Handle price change
        if new_price is not None:
            line.unit_price = new_price
        
        # Recalculate extended price
        line.calculate_extended_price()
        order.calculate_totals()
        
        self.db.commit()
        return True
    
    # === Reporting and Analytics ===
    
    def get_order_status_summary(self, customer_id: str = None, 
                                date_from: date = None, date_to: date = None) -> Dict:
        """Get summary of order statuses."""
        
        query = self.db.query(SalesOrder)
        
        if customer_id:
            query = query.filter(SalesOrder.customer_id == customer_id)
        if date_from:
            query = query.filter(SalesOrder.order_date >= date_from)
        if date_to:
            query = query.filter(SalesOrder.order_date <= date_to)
        
        orders = query.all()
        
        summary = {
            'total_orders': len(orders),
            'total_value': sum(order.total_amount for order in orders),
            'by_status': {}
        }
        
        for status in OrderStatus:
            status_orders = [o for o in orders if o.status == status]
            summary['by_status'][status.value] = {
                'count': len(status_orders),
                'value': sum(o.total_amount for o in status_orders)
            }
        
        return summary
    
    def get_backorder_report(self) -> List[Dict]:
        """Get report of all backordered items."""
        
        backordered_lines = self.db.query(SalesOrderLine).filter(
            SalesOrderLine.quantity_backordered > 0
        ).all()
        
        report = []
        for line in backordered_lines:
            report.append({
                'order_number': line.order.order_number,
                'customer_name': line.order.customer_name,
                'product_sku': line.product_sku,
                'product_name': line.product_name,
                'quantity_backordered': line.quantity_backordered,
                'order_date': line.order.order_date,
                'requested_date': line.requested_date,
                'line_value': line.unit_price * line.quantity_backordered
            })
        
        return sorted(report, key=lambda x: x['order_date'])
    
    # === Utility Methods ===
    
    def _generate_order_number(self) -> str:
        """Generate unique order number."""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        
        # Check for duplicates and add suffix if needed
        base_number = f"SO-{timestamp}"
        order_number = base_number
        suffix = 1
        
        while self.db.query(SalesOrder).filter(
            SalesOrder.order_number == order_number
        ).first():
            order_number = f"{base_number}-{suffix}"
            suffix += 1
        
        return order_number
    
    def get_order_by_number(self, order_number: str) -> Optional[SalesOrder]:
        """Get order by order number."""
        return self.db.query(SalesOrder).filter(
            SalesOrder.order_number == order_number
        ).first()
    
    def get_orders_by_customer(self, customer_id: str) -> List[SalesOrder]:
        """Get all orders for a customer."""
        return self.db.query(SalesOrder).filter(
            SalesOrder.customer_id == customer_id
        ).order_by(SalesOrder.order_date.desc()).all()