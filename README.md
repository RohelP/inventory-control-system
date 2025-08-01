# Inventory Control System

A comprehensive inventory management system built with Python that handles sales orders, pricing, minimum order quantities, reorder levels, and Bill of Materials (BOM) calculations using Excel integration.

## Features

### Core Inventory Management
- ✅ **Multi-location inventory tracking** with real-time stock levels
- ✅ **FIFO/LIFO/Weighted Average costing** methods
- ✅ **ABC classification** for strategic inventory management
- ✅ **Stock movement tracking** with complete audit trail
- ✅ **Reservation system** for allocated inventory

### Sales Order Processing
- ✅ **Order lifecycle management** (draft → confirmed → shipped)
- ✅ **Automatic inventory allocation** with backorder handling
- ✅ **MOQ compliance** with automatic quantity adjustments
- ✅ **Customer-specific pricing** and volume discounts

### Dynamic Pricing Engine
- ✅ **Rule-based pricing** with priority management
- ✅ **Volume discount tiers** and promotional pricing
- ✅ **Cost-plus pricing** with configurable margins
- ✅ **Customer-specific contracts** and pricing agreements

### Reorder Management
- ✅ **Automated reorder point calculations** based on demand history
- ✅ **Economic Order Quantity (EOQ)** optimization
- ✅ **Seasonal demand adjustments** with customizable factors
- ✅ **Urgent reorder alerts** with priority scoring

### Excel BOM Integration
- ✅ **File-based Excel integration** for BOM calculations
- ✅ **Template-driven calculations** with customizable formulas
- ✅ **Component requirement tracking** with cost rollups
- ✅ **Cross-platform compatibility** (no Excel installation required)

## Technology Stack

- **Python 3.11+** - Core application language
- **SQLAlchemy 2.0** - Database ORM with relationship modeling
- **Pydantic** - Data validation and serialization
- **openpyxl** - Excel file processing for BOM calculations
- **pandas** - Data manipulation and analysis
- **Typer** - Modern CLI interface
- **Rich** - Beautiful terminal output and tables

## Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd inventory-control-system
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Initialize the database:**
```bash
python main.py init-db
```

## Quick Start

### 1. Check System Status
```bash
python main.py status
```

### 2. View Inventory
```bash
# List all inventory
python main.py inventory list

# Filter by location
python main.py inventory list --location-code WH001

# Filter by product
python main.py inventory list --product-sku RAW-001
```

### 3. Receive Inventory
```bash
python main.py inventory receive RAW-001 WH001 100 5.50 --reference "PO-12345"
```

### 4. Create Sales Order
```bash
python main.py orders create "CUST-001" "Acme Corporation"
```

### 5. Check Reorder Recommendations
```bash
# View items needing reorder
python main.py reorder recommendations

# Recalculate reorder points
python main.py reorder calculate-points --days 90
```

### 6. Price Checking
```bash
python main.py pricing check RAW-001 CUST-001 --quantity 50
```

### 7. BOM Calculations
```bash
# Create Excel template
python main.py bom create-template

# Calculate BOM for order
python main.py bom calculate SO-20241201120000
```

## Database Models

### Core Entities
- **Product** - Master product data with SKU, pricing, and MOQ
- **InventoryItem** - Stock levels by product and location
- **Location** - Warehouses and storage locations
- **StockMovement** - All inventory transactions with audit trail

### Sales Processing
- **SalesOrder** - Order headers with customer and shipping info
- **SalesOrderLine** - Individual line items with quantities and pricing
- **BillOfMaterials** - Excel-calculated component requirements
- **BOMLineItem** - Individual components with quantities and costs

### Pricing Management
- **PricingRule** - Configurable pricing rules by product/customer/volume
- **CustomerPricing** - Customer-specific pricing agreements

## Inventory Control Principles

### 1. **ABC Classification**
- **A Items (20%)**: High-value items requiring tight control
- **B Items (30%)**: Medium-value items with moderate control
- **C Items (50%)**: Low-value items with basic control

### 2. **Reorder Point Formula**
```
Reorder Point = (Lead Time × Average Daily Demand) + Safety Stock
```

### 3. **Economic Order Quantity (EOQ)**
```
EOQ = √(2DS/H)
where:
D = Annual demand
S = Ordering cost per order
H = Holding cost per unit per year
```

### 4. **Inventory Turnover**
```
Turnover Ratio = Cost of Goods Sold / Average Inventory Value
```

## Excel BOM Integration

### Template Structure
The system uses Excel templates with predefined sheets:

1. **Inputs Sheet** - Order data populated by the system
2. **Calculations Sheet** - Your custom BOM calculation logic
3. **BOM_Results Sheet** - Component requirements extracted by system

### Creating Custom Templates
```bash
# Generate base template
python main.py bom create-template my_custom_template.xlsx

# Edit template in Excel to add your formulas
# Use template for BOM calculations
python main.py bom calculate ORDER-123 --template my_custom_template.xlsx
```

## Configuration

### Database Configuration
```python
# Default: SQLite for development
DATABASE_URL = "sqlite:///inventory_control.db"

# PostgreSQL for production
DATABASE_URL = "postgresql://user:password@localhost/inventory_db"
```

### Excel Templates Location
```python
# Default template directory
EXCEL_TEMPLATES_PATH = "excel_templates/"
```

## API Architecture

### Service Layer
- **InventoryService** - Core inventory operations
- **SalesOrderService** - Order processing and allocation
- **PricingService** - Dynamic pricing calculations
- **ReorderService** - Reorder point management and EOQ
- **ExcelBOMService** - Excel-based BOM calculations

### Design Patterns
- **Repository Pattern** - Data access abstraction
- **Domain-Driven Design** - Business logic encapsulation
- **Event-Driven** - Audit trails and notifications
- **Strategy Pattern** - Pluggable pricing and costing methods

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src

# Test specific module
pytest tests/test_inventory_service.py
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Scalability and Maintainability Analysis

### Current Architecture Strengths
- **Modular Design**: Clear separation between models, services, and CLI layers
- **Database Abstraction**: SQLAlchemy ORM enables easy database switching
- **Service Pattern**: Business logic is encapsulated in dedicated service classes
- **Type Safety**: Pydantic models and Python type hints improve code reliability

### Potential Improvements
- **Caching Layer**: Add Redis for frequently accessed inventory data
- **Background Jobs**: Implement Celery for async BOM calculations and reporting
- **API Layer**: Add FastAPI REST endpoints for web frontend integration
- **Message Queue**: Use RabbitMQ for event-driven inventory updates
- **Monitoring**: Add application metrics and logging with Prometheus/Grafana

### Next Steps
- Add comprehensive unit and integration tests
- Implement role-based access control and user management
- Create web-based dashboard for real-time inventory monitoring
- Add supplier management and purchase order automation
- Implement demand forecasting with machine learning models