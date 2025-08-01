"""Reorder management service with automated reorder point monitoring and EOQ calculations."""

from decimal import Decimal
from typing import List, Dict, Optional, Tuple
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, or_

from ..models import (
    Product, InventoryItem, StockMovement, Location, SalesOrderLine,
    MovementType, ABCCategory
)
from .inventory_service import InventoryService


class ReorderService:
    """Service for managing reorder points, EOQ calculations, and automated purchasing recommendations."""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.inventory_service = InventoryService(db_session)
    
    # === Reorder Point Management ===
    
    def calculate_reorder_points(self, location_id: int = None, 
                               analysis_days: int = 90) -> Dict[str, int]:
        """Calculate and update reorder points based on demand history."""
        
        # Get inventory items to analyze
        query = self.db.query(InventoryItem).join(Product).filter(
            Product.is_active == True
        )
        
        if location_id:
            query = query.filter(InventoryItem.location_id == location_id)
        
        inventory_items = query.all()
        
        updated_count = 0
        calculations = {
            'items_analyzed': len(inventory_items),
            'items_updated': 0,
            'average_lead_time': 0,
            'recommendations': []
        }
        
        for item in inventory_items:
            # Calculate demand statistics
            demand_stats = self._calculate_demand_statistics(
                item.product_id, item.location_id, analysis_days
            )
            
            if demand_stats['daily_demand'] > 0:
                # Calculate new reorder point
                lead_time = item.product.lead_time_days
                safety_stock_days = item.product.safety_stock_days
                
                # Reorder Point = (Lead Time × Average Daily Demand) + Safety Stock
                new_reorder_point = int(
                    (lead_time * demand_stats['daily_demand']) + 
                    (safety_stock_days * demand_stats['daily_demand'])
                )
                
                # Add variability buffer for high-variance items
                if demand_stats['coefficient_of_variation'] > 0.5:
                    variability_buffer = int(demand_stats['daily_demand'] * 0.2)
                    new_reorder_point += variability_buffer
                
                # Apply ABC category adjustments
                if item.product.abc_category == ABCCategory.A:
                    new_reorder_point = int(new_reorder_point * 1.2)  # 20% buffer for A items
                elif item.product.abc_category == ABCCategory.C:
                    new_reorder_point = int(new_reorder_point * 0.8)  # Reduce for C items
                
                # Update if significantly different
                if abs(item.reorder_point - new_reorder_point) > max(1, item.reorder_point * 0.1):
                    old_reorder_point = item.reorder_point
                    item.reorder_point = new_reorder_point
                    updated_count += 1
                    
                    calculations['recommendations'].append({
                        'product_sku': item.product.sku,
                        'location_code': item.location.code,
                        'old_reorder_point': old_reorder_point,
                        'new_reorder_point': new_reorder_point,
                        'daily_demand': demand_stats['daily_demand'],
                        'lead_time_days': lead_time,
                        'abc_category': item.product.abc_category.value
                    })
        
        calculations['items_updated'] = updated_count
        self.db.commit()
        
        return calculations
    
    def _calculate_demand_statistics(self, product_id: int, location_id: int, 
                                   analysis_days: int) -> Dict:
        """Calculate demand statistics for reorder point calculations."""
        
        cutoff_date = datetime.utcnow() - timedelta(days=analysis_days)
        
        # Get sales movements (negative quantities)
        sales_movements = self.db.query(StockMovement).join(InventoryItem).filter(
            and_(
                InventoryItem.product_id == product_id,
                InventoryItem.location_id == location_id,
                StockMovement.movement_type == MovementType.SALE,
                StockMovement.created_at >= cutoff_date
            )
        ).all()
        
        if not sales_movements:
            return {
                'daily_demand': 0,
                'total_demand': 0,
                'demand_variance': 0,
                'coefficient_of_variation': 0
            }
        
        # Calculate daily demand
        total_quantity = sum(abs(movement.quantity) for movement in sales_movements)
        total_demand = total_quantity
        daily_demand = total_demand / analysis_days
        
        # Calculate demand variance (simplified - would use more sophisticated methods in production)
        if len(sales_movements) > 1:
            # Group by day and calculate variance
            daily_quantities = {}
            for movement in sales_movements:
                day = movement.created_at.date()
                if day not in daily_quantities:
                    daily_quantities[day] = 0
                daily_quantities[day] += abs(movement.quantity)
            
            daily_values = list(daily_quantities.values())
            mean_daily = sum(daily_values) / len(daily_values)
            variance = sum((x - mean_daily) ** 2 for x in daily_values) / len(daily_values)
            
            coefficient_of_variation = (variance ** 0.5) / mean_daily if mean_daily > 0 else 0
        else:
            variance = 0
            coefficient_of_variation = 0
        
        return {
            'daily_demand': daily_demand,
            'total_demand': total_demand,
            'demand_variance': variance,
            'coefficient_of_variation': coefficient_of_variation
        }
    
    # === Economic Order Quantity (EOQ) ===
    
    def calculate_eoq_for_product(self, product_id: int, annual_demand: int = None,
                                 ordering_cost: Decimal = Decimal('50'),
                                 holding_cost_rate: Decimal = Decimal('0.25')) -> Dict:
        """Calculate Economic Order Quantity for a product."""
        
        product = self.db.query(Product).get(product_id)
        if not product:
            raise ValueError(f"Product {product_id} not found")
        
        # Use provided annual demand or calculate from history
        if annual_demand is None:
            annual_demand = self._estimate_annual_demand(product_id)
        
        # Calculate EOQ: √(2DS/H)
        # D = Annual demand, S = Ordering cost, H = Holding cost per unit per year
        holding_cost_per_unit = product.standard_cost * holding_cost_rate
        
        if holding_cost_per_unit <= 0 or annual_demand <= 0:
            eoq = product.minimum_order_quantity
            total_cost = Decimal('0')
            ordering_cost_annual = Decimal('0')
            holding_cost_annual = Decimal('0')
        else:
            # EOQ calculation
            import math
            eoq_calc = math.sqrt(
                (2 * annual_demand * float(ordering_cost)) / float(holding_cost_per_unit)
            )
            eoq = max(int(round(eoq_calc)), product.minimum_order_quantity)
            
            # Calculate total annual costs
            ordering_cost_annual = (annual_demand / eoq) * ordering_cost
            holding_cost_annual = (eoq / 2) * holding_cost_per_unit
            total_cost = ordering_cost_annual + holding_cost_annual
        
        # Update product EOQ
        product.economic_order_quantity = eoq
        self.db.commit()
        
        return {
            'product_sku': product.sku,
            'annual_demand': annual_demand,
            'economic_order_quantity': eoq,
            'ordering_cost': ordering_cost,
            'holding_cost_rate': holding_cost_rate,
            'holding_cost_per_unit': holding_cost_per_unit,
            'total_annual_cost': total_cost,
            'ordering_cost_annual': ordering_cost_annual,
            'holding_cost_annual': holding_cost_annual,
            'orders_per_year': annual_demand / eoq if eoq > 0 else 0
        }
    
    def _estimate_annual_demand(self, product_id: int) -> int:
        """Estimate annual demand based on historical sales data."""
        
        # Look at last 12 months of sales
        cutoff_date = datetime.utcnow() - timedelta(days=365)
        
        total_sales = self.db.query(func.sum(func.abs(StockMovement.quantity))).join(
            InventoryItem
        ).filter(
            and_(
                InventoryItem.product_id == product_id,
                StockMovement.movement_type == MovementType.SALE,
                StockMovement.created_at >= cutoff_date
            )
        ).scalar()
        
        return int(total_sales or 0)
    
    # === Reorder Recommendations ===
    
    def get_reorder_recommendations(self, location_id: int = None, 
                                  priority_filter: str = None) -> List[Dict]:
        """Get list of items that need reordering."""
        
        # Base query for items below reorder point
        query = self.db.query(InventoryItem).join(Product).filter(
            and_(
                Product.is_active == True,
                Product.is_purchasable == True,
                InventoryItem.quantity_available <= InventoryItem.reorder_point
            )
        )
        
        if location_id:
            query = query.filter(InventoryItem.location_id == location_id)
        
        if priority_filter:
            if priority_filter.upper() == 'A':
                query = query.filter(Product.abc_category == ABCCategory.A)
            elif priority_filter.upper() == 'B':
                query = query.filter(Product.abc_category == ABCCategory.B)
            elif priority_filter.upper() == 'C':
                query = query.filter(Product.abc_category == ABCCategory.C)
        
        items_to_reorder = query.all()
        
        recommendations = []
        
        for item in items_to_reorder:
            # Calculate suggested order quantity
            suggested_qty = self._calculate_suggested_order_quantity(item)
            
            # Get open purchase orders for this item
            pending_qty = self._get_pending_purchase_quantity(item.product_id, item.location_id)
            
            # Calculate urgency score
            urgency_score = self._calculate_urgency_score(item)
            
            # Estimate stockout date
            stockout_date = self._estimate_stockout_date(item)
            
            recommendation = {
                'product_id': item.product_id,
                'product_sku': item.product.sku,
                'product_name': item.product.name,
                'location_id': item.location_id,
                'location_code': item.location.code,
                'abc_category': item.product.abc_category.value,
                'current_stock': item.quantity_on_hand,
                'available_stock': item.quantity_available,
                'reserved_stock': item.quantity_reserved,
                'reorder_point': item.reorder_point,
                'suggested_order_quantity': suggested_qty,
                'minimum_order_quantity': item.product.minimum_order_quantity,
                'economic_order_quantity': item.product.economic_order_quantity,
                'pending_orders': pending_qty,
                'lead_time_days': item.product.lead_time_days,
                'urgency_score': urgency_score,
                'estimated_stockout_date': stockout_date,
                'unit_cost': item.average_cost,
                'total_order_value': suggested_qty * item.average_cost
            }
            
            recommendations.append(recommendation)
        
        # Sort by urgency score (highest first)
        return sorted(recommendations, key=lambda x: x['urgency_score'], reverse=True)
    
    def _calculate_suggested_order_quantity(self, item: InventoryItem) -> int:
        """Calculate suggested order quantity considering EOQ, MOQ, and current stock."""
        
        # Start with EOQ if available
        if item.product.economic_order_quantity:
            suggested_qty = item.product.economic_order_quantity
        else:
            # Fall back to minimum order quantity
            suggested_qty = item.product.minimum_order_quantity
        
        # Adjust for current shortage
        shortage = item.reorder_point - item.quantity_available
        if shortage > suggested_qty:
            # Order enough to cover shortage plus normal EOQ
            suggested_qty = shortage + suggested_qty
        
        # Ensure minimum order quantity
        suggested_qty = max(suggested_qty, item.product.minimum_order_quantity)
        
        return suggested_qty
    
    def _get_pending_purchase_quantity(self, product_id: int, location_id: int) -> int:
        """Get quantity on open purchase orders (placeholder - would integrate with PO system)."""
        
        # This would typically query a purchase orders table
        # For now, return the quantity_on_order from inventory item
        item = self.db.query(InventoryItem).filter(
            and_(
                InventoryItem.product_id == product_id,
                InventoryItem.location_id == location_id
            )
        ).first()
        
        return item.quantity_on_order if item else 0
    
    def _calculate_urgency_score(self, item: InventoryItem) -> float:
        """Calculate urgency score for reorder priority (0-100, higher = more urgent)."""
        
        # Base score on how far below reorder point
        if item.reorder_point > 0:
            shortage_ratio = max(0, (item.reorder_point - item.quantity_available) / item.reorder_point)
        else:
            shortage_ratio = 1 if item.quantity_available <= 0 else 0
        
        base_score = shortage_ratio * 50
        
        # ABC category multiplier
        if item.product.abc_category == ABCCategory.A:
            base_score *= 1.5
        elif item.product.abc_category == ABCCategory.B:
            base_score *= 1.2
        # C items keep base score
        
        # Lead time factor (longer lead time = higher urgency)
        lead_time_factor = min(item.product.lead_time_days / 30, 1.0)  # Cap at 30 days
        base_score += lead_time_factor * 20
        
        # Pending orders reduce urgency
        if item.quantity_on_order > 0:
            pending_factor = min(item.quantity_on_order / item.reorder_point, 0.5)
            base_score *= (1 - pending_factor)
        
        return min(base_score, 100)
    
    def _estimate_stockout_date(self, item: InventoryItem) -> Optional[date]:
        """Estimate when item will stock out based on demand patterns."""
        
        if item.quantity_available <= 0:
            return date.today()
        
        # Get recent demand rate
        demand_stats = self._calculate_demand_statistics(
            item.product_id, item.location_id, 30
        )
        
        if demand_stats['daily_demand'] <= 0:
            return None  # No demand pattern
        
        days_until_stockout = item.quantity_available / demand_stats['daily_demand']
        stockout_date = date.today() + timedelta(days=int(days_until_stockout))
        
        return stockout_date
    
    # === Automated Reorder Management ===
    
    def generate_purchase_recommendations(self, location_id: int = None,
                                        max_recommendations: int = 50) -> Dict:
        """Generate consolidated purchase recommendations by supplier."""
        
        reorder_items = self.get_reorder_recommendations(location_id)[:max_recommendations]
        
        # Group by supplier (placeholder - would use actual supplier data)
        supplier_recommendations = {}
        
        for item in reorder_items:
            # For now, use ABC category as pseudo-supplier grouping
            supplier_key = f"Supplier_{item['abc_category']}"
            
            if supplier_key not in supplier_recommendations:
                supplier_recommendations[supplier_key] = {
                    'supplier_name': supplier_key,
                    'total_order_value': Decimal('0'),
                    'item_count': 0,
                    'items': []
                }
            
            supplier_recommendations[supplier_key]['items'].append(item)
            supplier_recommendations[supplier_key]['total_order_value'] += item['total_order_value']
            supplier_recommendations[supplier_key]['item_count'] += 1
        
        # Calculate summary statistics
        summary = {
            'total_suppliers': len(supplier_recommendations),
            'total_items': len(reorder_items),
            'total_value': sum(item['total_order_value'] for item in reorder_items),
            'high_priority_items': len([item for item in reorder_items if item['urgency_score'] >= 75]),
            'suppliers': list(supplier_recommendations.values())
        }
        
        return summary
    
    # === Reporting and Analytics ===
    
    def get_reorder_performance_metrics(self, days_back: int = 30) -> Dict:
        """Get metrics on reorder point accuracy and stockout incidents."""
        
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        
        # Get all inventory items
        all_items = self.db.query(InventoryItem).join(Product).filter(
            Product.is_active == True
        ).all()
        
        metrics = {
            'total_items': len(all_items),
            'items_below_reorder': 0,
            'items_stocked_out': 0,
            'average_days_of_stock': 0,
            'stockout_incidents': [],
            'reorder_accuracy': 0
        }
        
        total_days_of_stock = 0
        items_with_demand = 0
        
        for item in all_items:
            # Check current status
            if item.quantity_available <= item.reorder_point:
                metrics['items_below_reorder'] += 1
            
            if item.quantity_available <= 0:
                metrics['items_stocked_out'] += 1
                metrics['stockout_incidents'].append({
                    'product_sku': item.product.sku,
                    'location_code': item.location.code,
                    'current_stock': item.quantity_available
                })
            
            # Calculate days of stock
            demand_stats = self._calculate_demand_statistics(
                item.product_id, item.location_id, 30
            )
            
            if demand_stats['daily_demand'] > 0:
                days_of_stock = item.quantity_available / demand_stats['daily_demand']
                total_days_of_stock += days_of_stock
                items_with_demand += 1
        
        if items_with_demand > 0:
            metrics['average_days_of_stock'] = total_days_of_stock / items_with_demand
        
        # Calculate reorder accuracy (simplified)
        if metrics['total_items'] > 0:
            metrics['reorder_accuracy'] = (
                (metrics['total_items'] - metrics['items_stocked_out']) / 
                metrics['total_items'] * 100
            )
        
        return metrics
    
    # === Seasonal Adjustments ===
    
    def apply_seasonal_adjustments(self, seasonality_factors: Dict[int, float]) -> int:
        """Apply seasonal demand factors to reorder points."""
        
        current_month = datetime.now().month
        seasonal_factor = seasonality_factors.get(current_month, 1.0)
        
        if seasonal_factor == 1.0:
            return 0  # No adjustment needed
        
        # Update reorder points for all active items
        updated_count = 0
        
        inventory_items = self.db.query(InventoryItem).join(Product).filter(
            Product.is_active == True
        ).all()
        
        for item in inventory_items:
            original_reorder_point = item.reorder_point
            adjusted_reorder_point = int(original_reorder_point * seasonal_factor)
            
            if adjusted_reorder_point != original_reorder_point:
                item.reorder_point = adjusted_reorder_point
                updated_count += 1
        
        self.db.commit()
        return updated_count