import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import * as path from 'path';
import isDev from 'electron-is-dev';
import { MockDatabaseService } from './services/MockDatabaseService';
import { ExcelService } from './services/ExcelService';

class InventoryControlApp {
  private mainWindow: BrowserWindow | null = null;
  private databaseService: MockDatabaseService;
  private excelService: ExcelService;

  constructor() {
    this.databaseService = new MockDatabaseService();
    this.excelService = new ExcelService();
    this.initializeApp();
  }

  private initializeApp(): void {
    app.whenReady().then(() => {
      this.createMainWindow();
      this.setupIpcHandlers();
      this.createMenu();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });
  }

  private createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: path.join(__dirname, 'assets/icon.png'),
      titleBarStyle: 'default',
      show: false
    });

    // Load the app
    const startUrl = isDev 
      ? 'http://localhost:3000' 
      : `file://${path.join(__dirname, '../build/index.html')}`;
    
    this.mainWindow.loadURL(startUrl);

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      
      if (isDev) {
        this.mainWindow?.webContents.openDevTools();
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupIpcHandlers(): void {
    // Database operations
    ipcMain.handle('db:getAllProducts', async () => {
      return await this.databaseService.getAllProducts();
    });

    ipcMain.handle('db:createProduct', async (_, product) => {
      return await this.databaseService.createProduct(product);
    });

    ipcMain.handle('db:updateProduct', async (_, id, updates) => {
      return await this.databaseService.updateProduct(id, updates);
    });

    ipcMain.handle('db:deleteProduct', async (_, id) => {
      return await this.databaseService.deleteProduct(id);
    });

    ipcMain.handle('db:getAllOrders', async () => {
      return await this.databaseService.getAllOrders();
    });

    ipcMain.handle('db:createOrder', async (_, order) => {
      return await this.databaseService.createOrder(order);
    });

    ipcMain.handle('db:updateOrderStatus', async (_, orderId, status) => {
      return await this.databaseService.updateOrderStatus(orderId, status);
    });

    // Excel operations
    ipcMain.handle('excel:importBOM', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }],
        properties: ['openFile']
      });

      if (!result.canceled && result.filePaths.length > 0) {
        return await this.excelService.importBOM(result.filePaths[0]);
      }
      return null;
    });

    ipcMain.handle('excel:exportInventoryReport', async () => {
      const result = await dialog.showSaveDialog(this.mainWindow!, {
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
        defaultPath: 'inventory-report.xlsx'
      });

      if (!result.canceled && result.filePath) {
        const products = await this.databaseService.getAllProducts();
        return await this.excelService.exportInventoryReport(products, result.filePath);
      }
      return false;
    });

    ipcMain.handle('excel:calculateBOMCost', async (_, bomData) => {
      return await this.excelService.calculateBOMCost(bomData);
    });
  }

  private createMenu(): void {
    const template: any[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Import BOM from Excel',
            accelerator: 'CmdOrCtrl+I',
            click: () => {
              this.mainWindow?.webContents.send('menu:import-bom');
            }
          },
          {
            label: 'Export Inventory Report',
            accelerator: 'CmdOrCtrl+E',
            click: () => {
              this.mainWindow?.webContents.send('menu:export-report');
            }
          },
          { type: 'separator' },
          {
            label: 'Exit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              app.quit();
            }
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
}

// Initialize the application
new InventoryControlApp();