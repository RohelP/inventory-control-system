"""Command-line interface for inventory control system."""

import typer
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

from .database import get_db_session, init_database
from .services import (
    InventoryService, SalesOrderService, PricingService, 
    ReorderService, ExcelBOMService
)

app = typer.Typer(help="Inventory Control System CLI")
console = Console()

# Sub-commands
inventory_app = typer.Typer(help="Inventory management commands")
orders_app = typer.Typer(help="Sales order management commands")
pricing_app = typer.Typer(help="Pricing management commands")
reorder_app = typer.Typer(help="Reorder management commands")
bom_app = typer.Typer(help="BOM calculation commands")

app.add_typer(inventory_app, name="inventory")
app.add_typer(orders_app, name="orders")
app.add_typer(pricing_app, name="pricing")
app.add_typer(reorder_app, name="reorder")
app.add_typer(bom_app, name="bom")


# === Main Commands ===

@app.command()
def init_db(
    database_url: Optional[str] = typer.Option(None, help="Database URL"),
    sample_data: bool = typer.Option(True, help="Load sample data")
):
    """Initialize database with tables and optional sample data."""
    with console.status("[bold green]Initializing database..."):
        init_database(database_url, sample_data)
    console.print("✅ Database initialized successfully!", style="bold green")


@app.command() 
def status():
    """Show system status and key metrics."""
    db = get_db_session()
    try:
        inventory_service = InventoryService(db)
        reorder_service = ReorderService(db)
        
        # Get key metrics
        valuation = inventory_service.get_inventory_valuation()
        reorder_items = reorder_service.get_reorder_recommendations()
        performance = reorder_service.get_reorder_performance_metrics()
        
        # Create status panel
        status_text = f"""
[bold]Inventory Overview[/bold]
• Total Inventory Value: ${valuation['total_value']:,.2f}
• Total Units on Hand: {valuation['total_units']:,}
• Items Below Reorder Point: {performance['items_below_reorder']}
• Stockout Items: {performance['items_stocked_out']} 
• Average Days of Stock: {performance['average_days_of_stock']:.1f}
• Reorder Accuracy: {performance['reorder_accuracy']:.1f}%

[bold]Action Required[/bold]
• Items Needing Reorder: {len(reorder_items)}
• High Priority Items: {len([item for item in reorder_items if item['urgency_score'] >= 75])}
        """
        
        console.print(Panel(status_text, title="📊 System Status", border_style="blue"))
        
    finally:
        db.close()


# === Inventory Commands ===

@inventory_app.command("list")
def list_inventory(
    location_code: Optional[str] = typer.Option(None, help="Filter by location"),
    product_sku: Optional[str] = typer.Option(None, help="Filter by product SKU")
):
    """List inventory items."""
    db = get_db_session()
    try:
        from .models import InventoryItem, Product, Location
        
        query = db.query(InventoryItem).join(Product).join(Location)
        
        if location_code:
            query = query.filter(Location.code == location_code)
        if product_sku:
            query = query.filter(Product.sku.like(f"%{product_sku}%"))
        
        items = query.all()
        
        table = Table(title="📦 Inventory Items")
        table.add_column("Product SKU", style="cyan")
        table.add_column("Product Name", style="white")
        table.add_column("Location", style="yellow")
        table.add_column("On Hand", justify="right", style="green")
        table.add_column("Available", justify="right", style="green")
        table.add_column("Reserved", justify="right", style="red")
        table.add_column("Reorder Point", justify="right", style="yellow")
        table.add_column("Avg Cost", justify="right", style="cyan")
        
        for item in items:
            table.add_row(
                item.product.sku,
                item.product.name[:30] + "..." if len(item.product.name) > 30 else item.product.name,
                item.location.code,
                str(item.quantity_on_hand),
                str(item.quantity_available),
                str(item.quantity_reserved),
                str(item.reorder_point),
                f"${item.average_cost:.2f}"
            )
        
        console.print(table)
        
    finally:
        db.close()


@inventory_app.command("receive")
def receive_inventory(
    product_sku: str = typer.Argument(help="Product SKU"),
    location_code: str = typer.Argument(help="Location code"),
    quantity: int = typer.Argument(help="Quantity to receive"),
    unit_cost: float = typer.Argument(help="Unit cost"),
    reference: Optional[str] = typer.Option(None, help="Reference number (PO, etc.)")
):
    """Receive inventory into specified location."""
    db = get_db_session()
    try:
        from .models import Product, Location
        
        # Get product and location
        product = db.query(Product).filter(Product.sku == product_sku).first()
        location = db.query(Location).filter(Location.code == location_code).first()
        
        if not product:
            console.print(f"❌ Product {product_sku} not found", style="bold red")
            return
        if not location:
            console.print(f"❌ Location {location_code} not found", style="bold red")
            return
        
        inventory_service = InventoryService(db)
        success = inventory_service.receive_inventory(
            product.id, location.id, quantity, Decimal(str(unit_cost)), reference
        )
        
        if success:
            console.print(
                f"✅ Received {quantity} units of {product_sku} at {location_code}", 
                style="bold green"
            )
        else:
            console.print("❌ Failed to receive inventory", style="bold red")
            
    finally:
        db.close()


@inventory_app.command("issue")  
def issue_inventory(
    product_sku: str = typer.Argument(help="Product SKU"),
    location_code: str = typer.Argument(help="Location code"),
    quantity: int = typer.Argument(help="Quantity to issue"),
    reference: Optional[str] = typer.Option(None, help="Reference number")
):
    """Issue inventory from specified location."""
    db = get_db_session()
    try:
        from .models import Product, Location
        
        product = db.query(Product).filter(Product.sku == product_sku).first()
        location = db.query(Location).filter(Location.code == location_code).first()
        
        if not product:
            console.print(f"❌ Product {product_sku} not found", style="bold red")
            return
        if not location:
            console.print(f"❌ Location {location_code} not found", style="bold red")
            return
        
        inventory_service = InventoryService(db)
        success = inventory_service.issue_inventory(
            product.id, location.id, quantity, reference
        )
        
        if success:
            console.print(
                f"✅ Issued {quantity} units of {product_sku} from {location_code}",
                style="bold green"
            )
        else:
            console.print("❌ Insufficient inventory or issue failed", style="bold red")
            
    finally:
        db.close()


# === Sales Order Commands ===

@orders_app.command("create")
def create_order(
    customer_id: str = typer.Argument(help="Customer ID"),
    customer_name: str = typer.Argument(help="Customer name")
):
    """Create a new sales order (interactive)."""
    db = get_db_session()
    try:
        order_data = {
            'customer_id': customer_id,
            'customer_name': customer_name,
            'lines': []
        }
        
        console.print(f"Creating order for {customer_name} ({customer_id})")
        
        # Add line items interactively
        while True:
            sku = typer.prompt("Product SKU (or 'done' to finish)")
            if sku.lower() == 'done':
                break
                
            # Validate product exists
            from .models import Product
            product = db.query(Product).filter(Product.sku == sku).first()
            if not product:
                console.print(f"❌ Product {sku} not found", style="red")
                continue
            
            quantity = typer.prompt("Quantity", type=int)
            unit_price = typer.prompt("Unit price (or press Enter for automatic pricing)", 
                                    default="", show_default=False)
            
            line_data = {
                'product_sku': sku,
                'quantity': quantity
            }
            
            if unit_price:
                line_data['unit_price'] = Decimal(unit_price)
            
            order_data['lines'].append(line_data)
        
        if not order_data['lines']:
            console.print("❌ No line items added", style="red")
            return
        
        # Create order
        order_service = SalesOrderService(db)
        order = order_service.create_sales_order(order_data)
        
        console.print(f"✅ Order {order.order_number} created successfully!", style="bold green")
        console.print(f"Total amount: ${order.total_amount:.2f}")
        
    finally:
        db.close()


@orders_app.command("list")
def list_orders(
    customer_id: Optional[str] = typer.Option(None, help="Filter by customer"),
    status: Optional[str] = typer.Option(None, help="Filter by status")
):
    """List sales orders."""
    db = get_db_session()
    try:
        from .models import SalesOrder
        
        query = db.query(SalesOrder).order_by(SalesOrder.created_at.desc())
        
        if customer_id:
            query = query.filter(SalesOrder.customer_id == customer_id)
        if status:
            query = query.filter(SalesOrder.status == status)
        
        orders = query.limit(20).all()
        
        table = Table(title="📋 Sales Orders")
        table.add_column("Order #", style="cyan")
        table.add_column("Customer", style="white")
        table.add_column("Date", style="yellow")
        table.add_column("Status", style="green")
        table.add_column("Total", justify="right", style="cyan")
        table.add_column("Lines", justify="right")
        
        for order in orders:
            table.add_row(
                order.order_number,
                order.customer_name[:20] + "..." if len(order.customer_name) > 20 else order.customer_name,
                order.order_date.strftime("%Y-%m-%d"),
                order.status.value,
                f"${order.total_amount:.2f}",
                str(len(order.lines))
            )
        
        console.print(table)
        
    finally:
        db.close()


# === Reorder Commands ===

@reorder_app.command("recommendations")
def reorder_recommendations(
    location_code: Optional[str] = typer.Option(None, help="Filter by location"),
    priority: Optional[str] = typer.Option(None, help="Priority filter (A/B/C)")
):
    """Show reorder recommendations."""
    db = get_db_session()
    try:
        from .models import Location
        
        location_id = None
        if location_code:
            location = db.query(Location).filter(Location.code == location_code).first()
            if location:
                location_id = location.id
        
        reorder_service = ReorderService(db)
        recommendations = reorder_service.get_reorder_recommendations(location_id, priority)
        
        if not recommendations:
            console.print("✅ No items need reordering!", style="bold green")
            return
        
        table = Table(title="⚠️  Reorder Recommendations")
        table.add_column("Product SKU", style="cyan")
        table.add_column("Product Name", style="white")
        table.add_column("Location", style="yellow")
        table.add_column("Current", justify="right", style="red")
        table.add_column("Reorder Point", justify="right", style="yellow")
        table.add_column("Suggested Qty", justify="right", style="green")
        table.add_column("Urgency", justify="right", style="red")
        table.add_column("Stockout Date", style="bright_yellow")
        
        for item in recommendations[:15]:  # Show top 15
            stockout_date = item['estimated_stockout_date']
            stockout_str = stockout_date.strftime("%m/%d") if stockout_date else "Unknown"
            
            table.add_row(
                item['product_sku'],
                item['product_name'][:25] + "..." if len(item['product_name']) > 25 else item['product_name'],
                item['location_code'],
                str(item['current_stock']),
                str(item['reorder_point']),
                str(item['suggested_order_quantity']),
                f"{item['urgency_score']:.0f}",
                stockout_str
            )
        
        console.print(table)
        
        if len(recommendations) > 15:
            console.print(f"... and {len(recommendations) - 15} more items", style="dim")
        
    finally:
        db.close()


@reorder_app.command("calculate-points")
def calculate_reorder_points(
    location_code: Optional[str] = typer.Option(None, help="Specific location"),
    days: int = typer.Option(90, help="Analysis period in days")
):
    """Recalculate reorder points based on demand history."""
    db = get_db_session()
    try:
        from .models import Location
        
        location_id = None
        if location_code:
            location = db.query(Location).filter(Location.code == location_code).first()
            if location:
                location_id = location.id
            else:
                console.print(f"❌ Location {location_code} not found", style="red")
                return
        
        reorder_service = ReorderService(db)
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            task = progress.add_task("Calculating reorder points...", total=None)
            results = reorder_service.calculate_reorder_points(location_id, days)
        
        console.print(f"✅ Analysis complete!", style="bold green")
        console.print(f"• Items analyzed: {results['items_analyzed']}")
        console.print(f"• Reorder points updated: {results['items_updated']}")
        
        if results['recommendations']:
            console.print("\n📊 Key Changes:")
            for rec in results['recommendations'][:5]:
                console.print(
                    f"  {rec['product_sku']}: {rec['old_reorder_point']} → {rec['new_reorder_point']} "
                    f"(demand: {rec['daily_demand']:.1f}/day)"
                )
        
    finally:
        db.close()


# === Pricing Commands ===

@pricing_app.command("check")
def check_pricing(
    product_sku: str = typer.Argument(help="Product SKU"),
    customer_id: str = typer.Argument(help="Customer ID"),
    quantity: int = typer.Option(1, help="Quantity")
):
    """Check pricing for product/customer combination."""
    db = get_db_session()
    try:
        from .models import Product
        
        product = db.query(Product).filter(Product.sku == product_sku).first()
        if not product:
            console.print(f"❌ Product {product_sku} not found", style="red")
            return
        
        pricing_service = PricingService(db)
        breakdown = pricing_service.calculate_price_breakdown(product.id, customer_id, quantity)
        
        # Display pricing breakdown
        pricing_text = f"""
[bold]Product:[/bold] {breakdown['product_name']} ({breakdown['product_sku']})
[bold]Customer:[/bold] {customer_id}
[bold]Quantity:[/bold] {quantity}

[bold]Pricing Details:[/bold]
• List Price: ${breakdown['list_price']:.2f}
• Standard Cost: ${breakdown['standard_cost']:.2f}
• [bold green]Final Price: ${breakdown['final_price']:.2f}[/bold green]
• Applied Rule: {breakdown['applied_rule'] or 'List Price'}

[bold]Extended Amount:[/bold] ${breakdown['final_price'] * quantity:.2f}
        """
        
        console.print(Panel(pricing_text, title="💰 Pricing Breakdown", border_style="green"))
        
        # Show available rules
        if breakdown['available_rules']:
            table = Table(title="Available Pricing Rules")
            table.add_column("Rule Name")
            table.add_column("Type")  
            table.add_column("Calculated Price", justify="right")
            table.add_column("Discount")
            
            for rule in breakdown['available_rules']:
                discount_info = ""
                if rule['discount_type'] and rule['discount_value']:
                    if rule['discount_type'] == 'percentage':
                        discount_info = f"{rule['discount_value']}%"
                    else:
                        discount_info = f"${rule['discount_value']}"
                
                table.add_row(
                    rule['rule_name'],
                    rule['pricing_type'].replace('_', ' ').title(),
                    f"${rule['calculated_price']:.2f}",
                    discount_info
                )
            
            console.print(table)
        
    finally:
        db.close()


# === BOM Commands ===

@bom_app.command("calculate")
def calculate_bom(
    order_number: str = typer.Argument(help="Sales order number"),
    template: str = typer.Option("default_bom_template.xlsx", help="Excel template name")
):
    """Calculate BOM for a sales order."""
    db = get_db_session()
    try:
        from .models import SalesOrder
        
        order = db.query(SalesOrder).filter(SalesOrder.order_number == order_number).first()
        if not order:
            console.print(f"❌ Order {order_number} not found", style="red")
            return
        
        bom_service = ExcelBOMService(db)
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            task = progress.add_task("Calculating BOM...", total=None)
            
            try:
                bom = bom_service.calculate_bom_for_order(order.id, template)
                
                if bom.status.value == 'completed':
                    console.print("✅ BOM calculation completed successfully!", style="bold green")
                    console.print(f"• BOM Number: {bom.bom_number}")
                    console.print(f"• Total Material Cost: ${bom.total_material_cost:.2f}")
                    console.print(f"• Total Labor Cost: ${bom.total_labor_cost:.2f}")
                    console.print(f"• Total BOM Cost: ${bom.total_bom_cost:.2f}")
                    console.print(f"• Line Items: {len(bom.line_items)}")
                else:
                    console.print(f"❌ BOM calculation failed: {bom.excel_calculation_errors}", style="red")
                    
            except FileNotFoundError:
                console.print(f"❌ Excel template '{template}' not found", style="red")
                console.print("Create template first using: bom create-template")
            except Exception as e:
                console.print(f"❌ BOM calculation error: {str(e)}", style="red")
        
    finally:
        db.close()


@bom_app.command("create-template")
def create_bom_template(
    template_name: str = typer.Option("default_bom_template.xlsx", help="Template filename")
):
    """Create a BOM calculation Excel template."""
    db = get_db_session()
    try:
        bom_service = ExcelBOMService(db)
        template_path = bom_service.create_bom_template(template_name)
        
        console.print(f"✅ BOM template created: {template_path}", style="bold green")
        console.print("Edit the template to add your BOM calculation formulas.")
        
    except Exception as e:
        console.print(f"❌ Failed to create template: {str(e)}", style="red")
    finally:
        db.close()


if __name__ == "__main__":
    app()