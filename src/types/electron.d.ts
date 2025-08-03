// Type definitions for Electron API exposed via preload script
import { ElectronAPI } from './index';

// Extend the global Window interface
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// This empty export statement is required to make this file a module
export {};