# Inventory Control System

A desktop application for damper manufacturing and inventory management with UL compliance tracking.

## Features

- Order creation and management
- Bill of Materials (BOM) generation
- UL compliance validation
- Inventory tracking and management
- Purchase order management
- Quality control workflows
- Production tracking
- Excel integration for BOM data

## Launch Methods

### Method 1: Development Mode
```bash
npm run electron-dev
```

### Method 2: Windows Batch File
```bash
launch-desktop.bat
```

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Desktop**: Electron
- **Backend**: Python FastAPI
- **UI**: Radix UI, Tailwind CSS
- **Database**: SQLite

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Start the development server:
   ```bash
   npm run electron-dev
   ```

## Building for Production

```bash
npm run build-desktop-win
```

## Project Structure

- `app/` - Next.js application pages
- `components/` - React components and UI library
- `backend/` - Python FastAPI backend
- `lib/` - Utility functions and API client
- `main.js` - Electron main process 