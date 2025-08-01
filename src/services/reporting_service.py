"""Inventory reporting and analytics service."""

from decimal import Decimal
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, or_, case, desc

from ..models import (
    Product, InventoryItem, StockMovement, Location, SalesOrder, SalesOrderLine,
    BillOfMaterials, BOMLineItem, PricingRule, CustomerPricing,
    MovementType, OrderStatus, ABCCategory, ProductCategory
)


class ReportingService:
    """Service for generating inventory reports and analytics."""
    
    def __init__(self, db_session: Session):
        self.db = db_session
    
    # === Inventory Valuation Reports ===
    
    def get_inventory_valuation_report(self, location_id: int = None, 
                                     category_id: int = None, 
                                     valuation_date: date = None) -> Dict[str, Any]:
        """Generate comprehensive inventory valuation report."""
        
        if valuation_date is None:
            valuation_date = date.today()
        
        # Base query
        query = self.db.query(
            Product.sku,
            Product.name,
            Product.abc_category,
            ProductCategory.name.label('category_name'),
            Location.code.label('location_code'),
            InventoryItem.quantity_on_hand,
            InventoryItem.quantity_reserved,
            InventoryItem.average_cost,
            InventoryItem.total_cost_value,
            (InventoryItem.quantity_on_hand * Product.list_price).label('list_value'),
            Product.standard_cost
        ).join(InventoryItem, Product.id == InventoryItem.product_id
        ).join(Location, InventoryItem.location_id == Location.id
        ).outerjoin(ProductCategory, Product.category_id == ProductCategory.id
        ).filter(InventoryItem.quantity_on_hand > 0)
        
        # Apply filters
        if location_id:
            query = query.filter(InventoryItem.location_id == location_id)
        if category_id:
            query = query.filter(Product.category_id == category_id)
        
        items = query.all()
        
        # Calculate summary statistics
        total_cost_value = sum(item.total_cost_value for item in items)
        total_list_value = sum(item.list_value for item in items)
        total_units = sum(item.quantity_on_hand for item in items)
        
        # Group by ABC category
        abc_summary = {'A': {'items': 0, 'value': Decimal('0'), 'units': 0},
                      'B': {'items': 0, 'value': Decimal('0'), 'units': 0},
                      'C': {'items': 0, 'value': Decimal('0'), 'units': 0}}
        
        # Group by location
        location_summary = {}
        
        # Group by category
        category_summary = {}
        
        for item in items:
            # ABC grouping
            abc_cat = item.abc_category.value
            abc_summary[abc_cat]['items'] += 1
            abc_summary[abc_cat]['value'] += item.total_cost_value
            abc_summary[abc_cat]['units'] += item.quantity_on_hand
            
            # Location grouping
            loc_code = item.location_code
            if loc_code not in location_summary:
                location_summary[loc_code] = {'items': 0, 'value': Decimal('0'), 'units': 0}
            location_summary[loc_code]['items'] += 1
            location_summary[loc_code]['value'] += item.total_cost_value
            location_summary[loc_code]['units'] += item.quantity_on_hand
            
            # Category grouping
            cat_name = item.category_name or 'Uncategorized'
            if cat_name not in category_summary:
                category_summary[cat_name] = {'items': 0, 'value': Decimal('0'), 'units': 0}
            category_summary[cat_name]['items'] += 1
            category_summary[cat_name]['value'] += item.total_cost_value
            category_summary[cat_name]['units'] += item.quantity_on_hand
        
        return {
            'report_date': valuation_date,
            'summary': {
                'total_items': len(items),
                'total_cost_value': total_cost_value,
                'total_list_value': total_list_value,
                'total_units': total_units,
                'average_cost_per_unit': total_cost_value / total_units if total_units > 0 else Decimal('0'),
                'markup_percentage': ((total_list_value - total_cost_value) / total_cost_value * 100) if total_cost_value > 0 else Decimal('0')
            },
            'abc_analysis': abc_summary,
            'location_breakdown': location_summary,
            'category_breakdown': category_summary,
            'details': [
                {
                    'sku': item.sku,
                    'name': item.name,
                    'category': item.category_name,
                    'location': item.location_code,
                    'abc_category': item.abc_category.value,
                    'quantity': item.quantity_on_hand,
                    'available': item.quantity_on_hand - item.quantity_reserved,
                    'avg_cost': float(item.average_cost),
                    'total_cost': float(item.total_cost_value),
                    'list_value': float(item.list_value)
                }
                for item in items
            ]
        }
    
    # === Inventory Movement Reports ===
    
    def get_movement_report(self, start_date: date, end_date: date,
                           location_id: int = None, product_id: int = None,
                           movement_types: List[MovementType] = None) -> Dict[str, Any]:
        """Generate inventory movement report for date range."""
        
        # Base query
        query = self.db.query(
            StockMovement.created_at,
            StockMovement.movement_type,
            StockMovement.quantity,
            StockMovement.unit_cost,
            StockMovement.reference_number,
            StockMovement.notes,
            Product.sku,
            Product.name.label('product_name'),
            Location.code.label('location_code')
        ).join(InventoryItem, StockMovement.inventory_item_id == InventoryItem.id
        ).join(Product, InventoryItem.product_id == Product.id
        ).join(Location, InventoryItem.location_id == Location.id
        ).filter(
            and_(
                StockMovement.created_at >= datetime.combine(start_date, datetime.min.time()),
                StockMovement.created_at <= datetime.combine(end_date, datetime.max.time())
            )
        )
        
        # Apply filters
        if location_id:
            query = query.filter(InventoryItem.location_id == location_id)
        if product_id:
            query = query.filter(InventoryItem.product_id == product_id)
        if movement_types:
            query = query.filter(StockMovement.movement_type.in_(movement_types))
        
        movements = query.order_by(StockMovement.created_at.desc()).all()
        
        # Calculate summary statistics
        movement_summary = {}
        total_value_in = Decimal('0')
        total_value_out = Decimal('0')
        
        for movement in movements:
            mov_type = movement.movement_type.value
            if mov_type not in movement_summary:
                movement_summary[mov_type] = {'count': 0, 'total_quantity': 0, 'total_value': Decimal('0')}
            
            movement_summary[mov_type]['count'] += 1
            movement_summary[mov_type]['total_quantity'] += abs(movement.quantity)
            
            if movement.unit_cost:
                value = abs(movement.quantity) * movement.unit_cost
                movement_summary[mov_type]['total_value'] += value
                
                if movement.quantity > 0:  # Inbound
                    total_value_in += value
                else:  # Outbound
                    total_value_out += value
        
        return {
            'period': {'start_date': start_date, 'end_date': end_date},
            'summary': {
                'total_movements': len(movements),
                'total_value_in': total_value_in,
                'total_value_out': total_value_out,
                'net_value_change': total_value_in - total_value_out
            },
            'movement_types': movement_summary,
            'details': [
                {
                    'date': movement.created_at.strftime('%Y-%m-%d %H:%M'),
                    'type': movement.movement_type.value,
                    'product_sku': movement.sku,
                    'product_name': movement.product_name,
                    'location': movement.location_code,
                    'quantity': movement.quantity,
                    'unit_cost': float(movement.unit_cost) if movement.unit_cost else None,
                    'total_value': float(movement.quantity * movement.unit_cost) if movement.unit_cost else None,
                    'reference': movement.reference_number,
                    'notes': movement.notes
                }
                for movement in movements
            ]
        }
    
    # === Turnover Analysis ===
    
    def get_inventory_turnover_report(self, analysis_days: int = 365) -> Dict[str, Any]:
        """Calculate inventory turnover ratios and identify slow-moving items."""
        
        cutoff_date = datetime.utcnow() - timedelta(days=analysis_days)
        
        # Get current inventory values
        current_inventory = self.db.query(
            Product.id,
            Product.sku,
            Product.name,
            Product.abc_category,
            func.sum(InventoryItem.quantity_on_hand).label('total_quantity'),
            func.sum(InventoryItem.total_cost_value).label('total_value')
        ).join(InventoryItem, Product.id == InventoryItem.product_id
        ).filter(InventoryItem.quantity_on_hand > 0
        ).group_by(Product.id, Product.sku, Product.name, Product.abc_category).all()
        
        # Calculate cost of goods sold (COGS) for each product
        cogs_data = self.db.query(
            Product.id,
            func.sum(func.abs(StockMovement.quantity) * StockMovement.unit_cost).label('cogs')
        ).join(InventoryItem, Product.id == InventoryItem.product_id
        ).join(StockMovement, InventoryItem.id == StockMovement.inventory_item_id
        ).filter(
            and_(
                StockMovement.movement_type == MovementType.SALE,
                StockMovement.created_at >= cutoff_date,
                StockMovement.unit_cost.isnot(None)
            )
        ).group_by(Product.id).all()
        
        # Create COGS lookup
        cogs_lookup = {item.id: item.cogs for item in cogs_data}
        
        # Calculate turnover ratios
        turnover_analysis = []
        total_inventory_value = Decimal('0')
        total_cogs = Decimal('0')
        
        for item in current_inventory:
            cogs = cogs_lookup.get(item.id, Decimal('0'))
            avg_inventory_value = item.total_value  # Simplified - could use average over period
            
            if avg_inventory_value > 0:
                turnover_ratio = cogs / avg_inventory_value
                days_on_hand = analysis_days / turnover_ratio if turnover_ratio > 0 else analysis_days
            else:
                turnover_ratio = Decimal('0')
                days_on_hand = analysis_days
            
            turnover_analysis.append({
                'product_id': item.id,
                'sku': item.sku,
                'name': item.name,
                'abc_category': item.abc_category.value,
                'current_quantity': item.total_quantity,
                'current_value': float(item.total_value),
                'cogs': float(cogs),
                'turnover_ratio': float(turnover_ratio),
                'days_on_hand': int(days_on_hand),
                'status': self._classify_turnover_status(turnover_ratio, item.abc_category)
            })
            
            total_inventory_value += item.total_value
            total_cogs += cogs
        
        # Sort by turnover ratio (ascending - lowest turnover first)
        turnover_analysis.sort(key=lambda x: x['turnover_ratio'])
        
        # Calculate overall metrics
        overall_turnover = total_cogs / total_inventory_value if total_inventory_value > 0 else Decimal('0')
        
        # Identify slow-moving items (bottom 20% turnover)
        slow_moving_threshold = len(turnover_analysis) // 5
        slow_moving_items = turnover_analysis[:slow_moving_threshold]
        
        return {
            'analysis_period_days': analysis_days,
            'overall_metrics': {
                'total_inventory_value': float(total_inventory_value),
                'total_cogs': float(total_cogs),
                'overall_turnover_ratio': float(overall_turnover),
                'average_days_on_hand': int(analysis_days / overall_turnover) if overall_turnover > 0 else analysis_days
            },
            'slow_moving_items': slow_moving_items,
            'all_items': turnover_analysis
        }
    
    def _classify_turnover_status(self, turnover_ratio: Decimal, abc_category: ABCCategory) -> str:
        """Classify turnover status based on ratio and ABC category."""
        
        # Define thresholds by ABC category
        thresholds = {
            ABCCategory.A: {'excellent': 12, 'good': 6, 'fair': 3},
            ABCCategory.B: {'excellent': 8, 'good': 4, 'fair': 2},
            ABCCategory.C: {'excellent': 4, 'good': 2, 'fair': 1}
        }
        
        category_thresholds = thresholds.get(abc_category, thresholds[ABCCategory.C])
        
        if turnover_ratio >= category_thresholds['excellent']:
            return 'excellent'
        elif turnover_ratio >= category_thresholds['good']:
            return 'good'
        elif turnover_ratio >= category_thresholds['fair']:
            return 'fair'
        else:
            return 'poor'
    
    # === Sales Performance Reports ===
    
    def get_sales_performance_report(self, start_date: date, end_date: date,
                                   customer_id: str = None) -> Dict[str, Any]:
        """Generate sales performance report."""
        
        # Base query for completed orders
        query = self.db.query(SalesOrder).filter(
            and_(
                SalesOrder.order_date >= start_date,
                SalesOrder.order_date <= end_date,
                SalesOrder.status.in_([OrderStatus.SHIPPED, OrderStatus.DELIVERED])
            )
        )
        
        if customer_id:
            query = query.filter(SalesOrder.customer_id == customer_id)
        
        orders = query.all()
        
        # Calculate metrics
        total_orders = len(orders)
        total_revenue = sum(order.total_amount for order in orders)
        average_order_value = total_revenue / total_orders if total_orders > 0 else Decimal('0')
        
        # Product performance
        product_performance = self.db.query(
            Product.sku,
            Product.name,
            func.sum(SalesOrderLine.quantity_ordered).label('total_quantity'),
            func.sum(SalesOrderLine.extended_price).label('total_revenue'),
            func.count(SalesOrderLine.id).label('order_lines')
        ).join(SalesOrderLine, Product.id == SalesOrderLine.product_id
        ).join(SalesOrder, SalesOrderLine.order_id == SalesOrder.id
        ).filter(
            and_(
                SalesOrder.order_date >= start_date,
                SalesOrder.order_date <= end_date,
                SalesOrder.status.in_([OrderStatus.SHIPPED, OrderStatus.DELIVERED])
            )
        ).group_by(Product.id, Product.sku, Product.name
        ).order_by(desc('total_revenue')).all()
        
        # Customer performance (if not filtered)
        customer_performance = []
        if not customer_id:
            customer_performance = self.db.query(
                SalesOrder.customer_id,
                SalesOrder.customer_name,
                func.count(SalesOrder.id).label('order_count'),
                func.sum(SalesOrder.total_amount).label('total_revenue'),
                func.avg(SalesOrder.total_amount).label('avg_order_value')
            ).filter(
                and_(
                    SalesOrder.order_date >= start_date,
                    SalesOrder.order_date <= end_date,
                    SalesOrder.status.in_([OrderStatus.SHIPPED, OrderStatus.DELIVERED])
                )
            ).group_by(SalesOrder.customer_id, SalesOrder.customer_name
            ).order_by(desc('total_revenue')).limit(20).all()
        
        return {
            'period': {'start_date': start_date, 'end_date': end_date},
            'summary': {
                'total_orders': total_orders,
                'total_revenue': float(total_revenue),
                'average_order_value': float(average_order_value),
                'days_in_period': (end_date - start_date).days + 1,
                'average_daily_revenue': float(total_revenue) / ((end_date - start_date).days + 1)
            },
            'top_products': [
                {
                    'sku': item.sku,
                    'name': item.name,
                    'quantity_sold': item.total_quantity,
                    'revenue': float(item.total_revenue),
                    'order_lines': item.order_lines
                }
                for item in product_performance[:15]
            ],
            'top_customers': [
                {
                    'customer_id': item.customer_id,
                    'customer_name': item.customer_name,
                    'order_count': item.order_count,
                    'total_revenue': float(item.total_revenue),
                    'avg_order_value': float(item.avg_order_value)
                }
                for item in customer_performance
            ] if not customer_id else []
        }
    
    # === BOM Cost Analysis ===
    
    def get_bom_cost_analysis(self, days_back: int = 30) -> Dict[str, Any]:
        """Analyze BOM calculation costs and trends."""
        
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        
        # Get recent BOMs
        boms = self.db.query(BillOfMaterials).filter(
            BillOfMaterials.calculation_completed >= cutoff_date
        ).all()
        
        if not boms:
            return {
                'period_days': days_back,
                'summary': {'total_boms': 0},
                'cost_trends': [],
                'component_analysis': []
            }
        
        # Calculate summary statistics
        total_boms = len(boms)
        total_material_cost = sum(bom.total_material_cost for bom in boms)
        total_labor_cost = sum(bom.total_labor_cost for bom in boms)
        total_overhead_cost = sum(bom.total_overhead_cost for bom in boms)
        total_bom_cost = sum(bom.total_bom_cost for bom in boms)
        
        # Component analysis
        component_costs = self.db.query(
            BOMLineItem.component_name,
            BOMLineItem.component_type,
            func.sum(BOMLineItem.extended_cost).label('total_cost'),
            func.sum(BOMLineItem.quantity_required).label('total_quantity'),
            func.count(BOMLineItem.id).label('usage_count')
        ).join(BillOfMaterials, BOMLineItem.bom_id == BillOfMaterials.id
        ).filter(
            BillOfMaterials.calculation_completed >= cutoff_date
        ).group_by(BOMLineItem.component_name, BOMLineItem.component_type
        ).order_by(desc('total_cost')).limit(20).all()
        
        return {
            'period_days': days_back,
            'summary': {
                'total_boms': total_boms,
                'total_material_cost': float(total_material_cost),
                'total_labor_cost': float(total_labor_cost),
                'total_overhead_cost': float(total_overhead_cost),
                'total_bom_cost': float(total_bom_cost),
                'avg_bom_cost': float(total_bom_cost / total_boms),
                'material_percentage': float((total_material_cost / total_bom_cost * 100)) if total_bom_cost > 0 else 0,
                'labor_percentage': float((total_labor_cost / total_bom_cost * 100)) if total_bom_cost > 0 else 0,
                'overhead_percentage': float((total_overhead_cost / total_bom_cost * 100)) if total_bom_cost > 0 else 0
            },
            'recent_boms': [
                {
                    'bom_number': bom.bom_number,
                    'order_number': bom.sales_order.order_number,
                    'customer': bom.sales_order.customer_name,
                    'calculation_date': bom.calculation_completed.strftime('%Y-%m-%d'),
                    'total_cost': float(bom.total_bom_cost),
                    'line_items': len(bom.line_items)
                }
                for bom in sorted(boms, key=lambda x: x.calculation_completed, reverse=True)[:10]
            ],
            'top_components': [
                {
                    'component_name': item.component_name,
                    'component_type': item.component_type.value,
                    'total_cost': float(item.total_cost),
                    'total_quantity': float(item.total_quantity),
                    'usage_count': item.usage_count,
                    'avg_cost_per_use': float(item.total_cost / item.usage_count)
                }
                for item in component_costs
            ]
        }
    
    # === Dashboard Metrics ===
    
    def get_dashboard_metrics(self) -> Dict[str, Any]:
        """Get key metrics for dashboard display."""
        
        today = date.today()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        # Inventory metrics
        inventory_value = self.db.query(
            func.sum(InventoryItem.total_cost_value)
        ).scalar() or Decimal('0')
        
        items_below_reorder = self.db.query(InventoryItem).filter(
            InventoryItem.quantity_available <= InventoryItem.reorder_point
        ).count()
        
        stockout_items = self.db.query(InventoryItem).filter(
            InventoryItem.quantity_on_hand <= 0
        ).count()
        
        # Sales metrics
        recent_orders = self.db.query(SalesOrder).filter(
            SalesOrder.order_date >= week_ago
        ).count()
        
        recent_revenue = self.db.query(
            func.sum(SalesOrder.total_amount)
        ).filter(
            and_(
                SalesOrder.order_date >= week_ago,
                SalesOrder.status.in_([OrderStatus.SHIPPED, OrderStatus.DELIVERED])
            )
        ).scalar() or Decimal('0')
        
        # Movement metrics
        recent_movements = self.db.query(StockMovement).filter(
            StockMovement.created_at >= datetime.combine(week_ago, datetime.min.time())
        ).count()
        
        return {
            'inventory': {
                'total_value': float(inventory_value),
                'items_below_reorder': items_below_reorder,
                'stockout_items': stockout_items
            },
            'sales': {
                'recent_orders_7d': recent_orders,
                'recent_revenue_7d': float(recent_revenue)
            },
            'activity': {
                'movements_7d': recent_movements
            },
            'updated_at': datetime.utcnow().isoformat()
        }