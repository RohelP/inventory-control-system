"""Pricing service with dynamic pricing rules and customer-specific pricing."""

from decimal import Decimal
from typing import List, Optional, Dict, Tuple
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from ..models import (
    Product, PricingRule, CustomerPricing, ProductCategory,
    PricingType, DiscountType
)


class PricingService:
    """Service for calculating dynamic pricing based on rules and customer agreements."""
    
    def __init__(self, db_session: Session):
        self.db = db_session
    
    # === Price Calculation ===
    
    def get_customer_price(self, product_id: int, customer_id: str, 
                          quantity: int = 1, order_value: Decimal = None) -> Decimal:
        """Get final price for customer considering all applicable rules."""
        
        product = self.db.query(Product).get(product_id)
        if not product:
            raise ValueError(f"Product {product_id} not found")
        
        # Check for customer-specific pricing first (highest priority)
        customer_price = self._get_customer_specific_price(product_id, customer_id)
        if customer_price and customer_price.minimum_quantity <= quantity:
            return customer_price.unit_price
        
        # Get applicable pricing rules
        applicable_rules = self._get_applicable_pricing_rules(
            product_id, customer_id, quantity, order_value
        )
        
        if not applicable_rules:
            # Fall back to list price
            return product.list_price
        
        # Apply best rule (lowest price)
        best_price = product.list_price
        
        for rule in applicable_rules:
            rule_price = rule.calculate_price(product.standard_cost, quantity)
            if rule_price < best_price:
                best_price = rule_price
        
        return best_price
    
    def calculate_price_breakdown(self, product_id: int, customer_id: str, 
                                 quantity: int = 1) -> Dict:
        """Get detailed price breakdown showing all applicable rules."""
        
        product = self.db.query(Product).get(product_id)
        if not product:
            raise ValueError(f"Product {product_id} not found")
        
        breakdown = {
            'product_sku': product.sku,
            'product_name': product.name,
            'quantity': quantity,
            'list_price': product.list_price,
            'standard_cost': product.standard_cost,
            'final_price': None,
            'applied_rule': None,
            'customer_pricing': None,
            'available_rules': []
        }
        
        # Check customer-specific pricing
        customer_price = self._get_customer_specific_price(product_id, customer_id)
        if customer_price and customer_price.minimum_quantity <= quantity:
            breakdown['customer_pricing'] = {
                'price': customer_price.unit_price,
                'contract_number': customer_price.contract_number,
                'effective_date': customer_price.effective_date,
                'minimum_quantity': customer_price.minimum_quantity
            }
            breakdown['final_price'] = customer_price.unit_price
            breakdown['applied_rule'] = 'Customer-specific pricing'
        else:
            # Get all applicable rules
            applicable_rules = self._get_applicable_pricing_rules(
                product_id, customer_id, quantity
            )
            
            best_price = product.list_price
            best_rule = None
            
            for rule in applicable_rules:
                rule_price = rule.calculate_price(product.standard_cost, quantity)
                
                rule_info = {
                    'rule_name': rule.rule_name,
                    'rule_code': rule.rule_code,
                    'pricing_type': rule.pricing_type.value,
                    'calculated_price': rule_price,
                    'discount_type': rule.discount_type.value if rule.discount_type else None,
                    'discount_value': rule.discount_value
                }
                breakdown['available_rules'].append(rule_info)
                
                if rule_price < best_price:
                    best_price = rule_price
                    best_rule = rule_info
            
            breakdown['final_price'] = best_price
            breakdown['applied_rule'] = best_rule
        
        return breakdown
    
    # === Pricing Rule Management ===
    
    def create_pricing_rule(self, rule_data: Dict) -> PricingRule:
        """Create new pricing rule."""
        
        rule = PricingRule(
            rule_name=rule_data['rule_name'],
            rule_code=rule_data['rule_code'],
            pricing_type=PricingType(rule_data['pricing_type']),
            product_id=rule_data.get('product_id'),
            product_category_id=rule_data.get('product_category_id'),
            customer_id=rule_data.get('customer_id'),
            customer_group=rule_data.get('customer_group'),
            effective_date=rule_data['effective_date'],
            expiration_date=rule_data.get('expiration_date'),
            base_price=rule_data.get('base_price'),
            markup_percentage=rule_data.get('markup_percentage'),
            discount_type=DiscountType(rule_data['discount_type']) if rule_data.get('discount_type') else None,
            discount_value=rule_data.get('discount_value'),
            minimum_quantity=rule_data.get('minimum_quantity'),
            maximum_quantity=rule_data.get('maximum_quantity'),
            minimum_order_value=rule_data.get('minimum_order_value'),
            priority=rule_data.get('priority', 100),
            is_active=rule_data.get('is_active', True),
            allow_manual_override=rule_data.get('allow_manual_override', True),
            requires_approval=rule_data.get('requires_approval', False),
            description=rule_data.get('description'),
            terms_and_conditions=rule_data.get('terms_and_conditions')
        )
        
        self.db.add(rule)
        self.db.commit()
        return rule
    
    def create_customer_pricing(self, pricing_data: Dict) -> CustomerPricing:
        """Create customer-specific pricing agreement."""
        
        pricing = CustomerPricing(
            customer_id=pricing_data['customer_id'],
            product_id=pricing_data['product_id'],
            unit_price=pricing_data['unit_price'],
            minimum_quantity=pricing_data.get('minimum_quantity', 1),
            effective_date=pricing_data['effective_date'],
            expiration_date=pricing_data.get('expiration_date'),
            contract_number=pricing_data.get('contract_number'),
            contract_terms=pricing_data.get('contract_terms'),
            is_active=pricing_data.get('is_active', True),
            auto_renew=pricing_data.get('auto_renew', False),
            notes=pricing_data.get('notes')
        )
        
        self.db.add(pricing)
        self.db.commit()
        return pricing
    
    # === Volume-Based Pricing ===
    
    def create_volume_pricing_tiers(self, product_id: int, tiers: List[Dict]) -> List[PricingRule]:
        """Create tiered volume pricing rules for a product."""
        
        rules = []
        for i, tier in enumerate(tiers):
            rule_data = {
                'rule_name': f"Volume Tier {i+1} - {tier['min_quantity']}+ units",
                'rule_code': f"VOL-{product_id}-TIER{i+1}",
                'pricing_type': 'volume_discount',
                'product_id': product_id,
                'effective_date': tier.get('effective_date', date.today()),
                'expiration_date': tier.get('expiration_date'),
                'discount_type': tier['discount_type'],
                'discount_value': tier['discount_value'],
                'minimum_quantity': tier['min_quantity'],
                'maximum_quantity': tier.get('max_quantity'),
                'priority': 50 + i,  # Lower tier number = higher priority
                'description': f"Volume discount for {tier['min_quantity']}+ units"
            }
            
            rule = self.create_pricing_rule(rule_data)
            rules.append(rule)
        
        return rules
    
    # === Promotional Pricing ===
    
    def create_promotional_pricing(self, promotion_data: Dict) -> PricingRule:
        """Create time-limited promotional pricing."""
        
        rule_data = {
            'rule_name': promotion_data['promotion_name'],
            'rule_code': f"PROMO-{promotion_data['promotion_code']}",
            'pricing_type': 'promotional',
            'product_id': promotion_data.get('product_id'),
            'product_category_id': promotion_data.get('product_category_id'),
            'customer_id': promotion_data.get('customer_id'),
            'customer_group': promotion_data.get('customer_group'),
            'effective_date': promotion_data['start_date'],
            'expiration_date': promotion_data['end_date'],
            'discount_type': promotion_data['discount_type'],
            'discount_value': promotion_data['discount_value'],
            'minimum_quantity': promotion_data.get('minimum_quantity'),
            'minimum_order_value': promotion_data.get('minimum_order_value'),
            'priority': 10,  # High priority for promotions
            'description': promotion_data['description'],
            'terms_and_conditions': promotion_data.get('terms_and_conditions')
        }
        
        return self.create_pricing_rule(rule_data)
    
    # === Price Analysis and Reporting ===
    
    def analyze_pricing_effectiveness(self, days_back: int = 30) -> Dict:
        """Analyze pricing rule effectiveness over specified period."""
        
        # This would typically analyze sales data to see which rules are being applied
        # and their impact on sales volume and margins
        
        active_rules = self.db.query(PricingRule).filter(
            PricingRule.is_active == True
        ).all()
        
        analysis = {
            'total_active_rules': len(active_rules),
            'rules_by_type': {},
            'expiring_soon': [],
            'unused_rules': []
        }
        
        # Group by pricing type
        for rule in active_rules:
            rule_type = rule.pricing_type.value
            if rule_type not in analysis['rules_by_type']:
                analysis['rules_by_type'][rule_type] = 0
            analysis['rules_by_type'][rule_type] += 1
            
            # Check for expiring rules (within 30 days)
            if rule.expiration_date:
                days_until_expiry = (rule.expiration_date - date.today()).days
                if 0 <= days_until_expiry <= 30:
                    analysis['expiring_soon'].append({
                        'rule_code': rule.rule_code,
                        'rule_name': rule.rule_name,
                        'days_until_expiry': days_until_expiry
                    })
        
        return analysis
    
    def get_pricing_exceptions_report(self) -> List[Dict]:
        """Get report of manual pricing overrides and exceptions."""
        
        # This would typically query sales order lines for manual price overrides
        # For now, return placeholder structure
        
        return []
    
    # === Helper Methods ===
    
    def _get_customer_specific_price(self, product_id: int, customer_id: str) -> Optional[CustomerPricing]:
        """Get effective customer-specific pricing."""
        
        today = date.today()
        
        return self.db.query(CustomerPricing).filter(
            and_(
                CustomerPricing.product_id == product_id,
                CustomerPricing.customer_id == customer_id,
                CustomerPricing.is_active == True,
                CustomerPricing.effective_date <= today,
                or_(
                    CustomerPricing.expiration_date.is_(None),
                    CustomerPricing.expiration_date >= today
                )
            )
        ).first()
    
    def _get_applicable_pricing_rules(self, product_id: int, customer_id: str,
                                    quantity: int = 1, order_value: Decimal = None) -> List[PricingRule]:
        """Get all pricing rules applicable to this product/customer/quantity combination."""
        
        product = self.db.query(Product).get(product_id)
        today = date.today()
        
        # Base query for active, effective rules
        query = self.db.query(PricingRule).filter(
            and_(
                PricingRule.is_active == True,
                PricingRule.effective_date <= today,
                or_(
                    PricingRule.expiration_date.is_(None),
                    PricingRule.expiration_date >= today
                )
            )
        )
        
        # Product scope filters
        product_filter = or_(
            PricingRule.product_id.is_(None),  # Global rules
            PricingRule.product_id == product_id,  # Product-specific
            and_(
                PricingRule.product_category_id == product.category_id,
                product.category_id.isnot(None)
            )  # Category-specific
        )
        
        # Customer scope filters  
        customer_filter = or_(
            PricingRule.customer_id.is_(None),  # General rules
            PricingRule.customer_id == customer_id  # Customer-specific
            # Could add customer_group logic here
        )
        
        query = query.filter(and_(product_filter, customer_filter))
        
        # Quantity filters
        if quantity:
            query = query.filter(
                or_(
                    PricingRule.minimum_quantity.is_(None),
                    PricingRule.minimum_quantity <= quantity
                )
            ).filter(
                or_(
                    PricingRule.maximum_quantity.is_(None),
                    PricingRule.maximum_quantity >= quantity
                )
            )
        
        # Order value filters
        if order_value:
            query = query.filter(
                or_(
                    PricingRule.minimum_order_value.is_(None),
                    PricingRule.minimum_order_value <= order_value
                )
            )
        
        # Order by priority (lower number = higher priority)
        rules = query.order_by(PricingRule.priority.asc()).all()
        
        return rules
    
    # === Bulk Operations ===
    
    def update_cost_plus_pricing(self, category_id: int = None, 
                                markup_percentage: Decimal = None) -> int:
        """Update cost-plus pricing rules with new markup percentage."""
        
        query = self.db.query(PricingRule).filter(
            PricingRule.pricing_type == PricingType.COST_PLUS
        )
        
        if category_id:
            query = query.filter(PricingRule.product_category_id == category_id)
        
        if markup_percentage is not None:
            updated_count = query.update({
                'markup_percentage': markup_percentage
            })
            self.db.commit()
            return updated_count
        
        return 0
    
    def expire_promotional_pricing(self, promotion_code: str = None) -> int:
        """Expire promotional pricing rules."""
        
        query = self.db.query(PricingRule).filter(
            PricingRule.pricing_type == PricingType.PROMOTIONAL
        )
        
        if promotion_code:
            query = query.filter(PricingRule.rule_code.like(f"%{promotion_code}%"))
        
        updated_count = query.update({
            'expiration_date': date.today(),
            'is_active': False
        })
        
        self.db.commit()
        return updated_count