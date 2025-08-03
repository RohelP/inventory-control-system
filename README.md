# Inventory Control System

A comprehensive desktop application for managing inventory, sales orders, pricing, and Bill of Materials (BOM) calculations for damper manufacturing and UL compliance management.

## Features

- **Dashboard**: Overview of workflow progress, orders, and recent activity
- **Inventory Management**: Track stock levels, manage reorder points, and monitor inventory value
- **Sales Orders**: Create and manage customer orders with status tracking
- **Bill of Materials (BOM)**: Import from Excel, manage components, and calculate costs
- **UL Compliance**: Track compliance status and documentation
- **Purchase Management**: Handle purchase orders and supplier relationships
- **Quality Control**: Manage quality inspections and testing protocols
- **Production Management**: Schedule and track manufacturing processes

## Technology Stack

- **Frontend**: React 18 + TypeScript + Ant Design
- **Desktop Framework**: Electron
- **State Management**: Redux Toolkit
- **Database**: SQLite (via better-sqlite3)
- **Excel Integration**: ExcelJS
- **Charts**: Recharts
- **Build Tools**: React Scripts + Electron Builder

## Prerequisites

- Node.js 18 or higher
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd inventory-control-system
```

2. Install dependencies:
```bash
npm install
```

## Development

To run the application in development mode:

```bash
npm start
```

This will:
- Start the React development server on http://localhost:3000
- Launch the Electron application
- Enable hot reloading for both React and Electron

## Building for Production

### Build the application:
```bash
npm run build
```

### Create distributable packages:

For Windows:
```bash
npm run dist:win
```

For macOS:
```bash
npm run dist:mac
```

For Linux:
```bash
npm run dist:linux
```

For all platforms:
```bash
npm run dist
```

## Project Structure

```
inventory-control-system/
├── electron/                 # Electron main process
│   ├── main.ts              # Main Electron process
│   ├── preload.ts           # Preload script for IPC
│   └── services/            # Backend services
│       ├── DatabaseService.ts
│       └── ExcelService.ts
├── src/                     # React frontend
│   ├── components/          # Reusable components
│   ├── pages/              # Page components
│   ├── store/              # Redux store and slices
│   ├── types/              # TypeScript type definitions
│   ├── App.tsx
│   └── index.tsx
├── public/                 # Static assets
├── build/                  # Built React app (generated)
├── dist/                   # Built Electron app (generated)
└── release/                # Distribution packages (generated)
```

## Database Schema

The application uses SQLite with the following main tables:

- **products**: Product inventory information
- **suppliers**: Supplier contact information
- **sales_orders**: Customer orders
- **order_items**: Order line items
- **bom_items**: Bill of materials components
- **inventory_transactions**: Audit trail for stock changes

## Excel Integration

### BOM Import Format

The application can import Bill of Materials from Excel files with the following format:

| Product Name | Component Name | Quantity | Unit | Cost Per Unit |
|-------------|----------------|----------|------|---------------|
| Fire Damper Assembly | Steel Frame | 1 | pcs | 25.00 |
| Fire Damper Assembly | Fire Damper Blade | 1 | pcs | 35.00 |

### Inventory Export

Export inventory reports to Excel with:
- Product details and stock levels
- Stock valuation
- Reorder recommendations
- Color-coded status indicators

## Key Features Implementation

### Inventory Control Principles

- **FIFO/LIFO**: Inventory valuation methods
- **Reorder Points**: Automatic reorder level tracking
- **Stock Alerts**: Low stock and out-of-stock notifications
- **Audit Trail**: Complete transaction history
- **Multi-location**: Support for multiple warehouse locations

### Sales Order Management

- **Order Workflow**: Complete order lifecycle tracking
- **Status Management**: Pending, Processing, Shipped, Delivered
- **Customer Management**: Customer information and order history
- **Pricing**: Dynamic pricing with cost calculations

### BOM Management

- **Component Tracking**: Detailed component requirements
- **Cost Calculation**: Automatic BOM cost calculation
- **Excel Integration**: Import/export BOM data
- **Cost Analysis**: Component cost breakdown and analysis

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```
# Database settings
DB_PATH=./data/inventory.db

# Excel settings
EXCEL_TEMP_DIR=./temp

# Application settings
APP_NAME=Inventory Control System
APP_VERSION=1.0.0
```

### Electron Builder Configuration

The application is configured to build for:
- Windows (NSIS installer)
- macOS (DMG)
- Linux (AppImage)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the GitHub repository.