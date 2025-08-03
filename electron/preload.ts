import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  database: {
    getAllProducts: () => ipcRenderer.invoke('db:getAllProducts'),
    createProduct: (product: any) => ipcRenderer.invoke('db:createProduct', product),
    updateProduct: (id: string, updates: any) => ipcRenderer.invoke('db:updateProduct', id, updates),
    deleteProduct: (id: string) => ipcRenderer.invoke('db:deleteProduct', id),
    getAllOrders: () => ipcRenderer.invoke('db:getAllOrders'),
    createOrder: (order: any) => ipcRenderer.invoke('db:createOrder', order),
    updateOrderStatus: (orderId: string, status: string) => ipcRenderer.invoke('db:updateOrderStatus', orderId, status),
  },

  // Excel operations
  excel: {
    importBOM: () => ipcRenderer.invoke('excel:importBOM'),
    exportInventoryReport: () => ipcRenderer.invoke('excel:exportInventoryReport'),
    calculateBOMCost: (bomData: any) => ipcRenderer.invoke('excel:calculateBOMCost', bomData),
  },

  // Menu events
  onMenuAction: (callback: (action: string) => void) => {
    ipcRenderer.on('menu:import-bom', () => callback('import-bom'));
    ipcRenderer.on('menu:export-report', () => callback('export-report'));
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      database: {
        getAllProducts: () => Promise<any[]>;
        createProduct: (product: any) => Promise<any>;
        updateProduct: (id: string, updates: any) => Promise<any>;
        deleteProduct: (id: string) => Promise<boolean>;
        getAllOrders: () => Promise<any[]>;
        createOrder: (order: any) => Promise<any>;
        updateOrderStatus: (orderId: string, status: string) => Promise<any>;
      };
      excel: {
        importBOM: () => Promise<any>;
        exportInventoryReport: () => Promise<boolean>;
        calculateBOMCost: (bomData: any) => Promise<any>;
      };
      onMenuAction: (callback: (action: string) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}