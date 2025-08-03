import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { BOMData, BOMComponent } from '../../types';

interface BOMState {
  bomData: BOMData[];
  loading: boolean;
  error: string | null;
  selectedBOM: BOMData | null;
  costAnalysis: any | null;
}

const initialState: BOMState = {
  bomData: [],
  loading: false,
  error: null,
  selectedBOM: null,
  costAnalysis: null,
};

// Async thunks
export const importBOMFromExcel = createAsyncThunk(
  'bom/importFromExcel',
  async () => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    return await window.electronAPI.excel.importBOM();
  }
);

export const calculateBOMCost = createAsyncThunk(
  'bom/calculateCost',
  async (bomData: BOMData) => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    return await window.electronAPI.excel.calculateBOMCost(bomData);
  }
);

const bomSlice = createSlice({
  name: 'bom',
  initialState,
  reducers: {
    addBOM: (state, action: PayloadAction<BOMData>) => {
      const existingIndex = state.bomData.findIndex(
        bom => bom.productName === action.payload.productName
      );
      
      if (existingIndex !== -1) {
        state.bomData[existingIndex] = action.payload;
      } else {
        state.bomData.push(action.payload);
      }
    },
    updateBOM: (state, action: PayloadAction<{ productName: string; bom: BOMData }>) => {
      const index = state.bomData.findIndex(
        bom => bom.productName === action.payload.productName
      );
      
      if (index !== -1) {
        state.bomData[index] = action.payload.bom;
      }
    },
    removeBOM: (state, action: PayloadAction<string>) => {
      state.bomData = state.bomData.filter(
        bom => bom.productName !== action.payload
      );
    },
    setSelectedBOM: (state, action: PayloadAction<BOMData | null>) => {
      state.selectedBOM = action.payload;
    },
    addComponentToBOM: (state, action: PayloadAction<{ productName: string; component: BOMComponent }>) => {
      const bomIndex = state.bomData.findIndex(
        bom => bom.productName === action.payload.productName
      );
      
      if (bomIndex !== -1) {
        state.bomData[bomIndex].components.push(action.payload.component);
        state.bomData[bomIndex].totalBOMCost += action.payload.component.totalCost;
      }
    },
    updateComponent: (state, action: PayloadAction<{ 
      productName: string; 
      componentIndex: number; 
      component: BOMComponent 
    }>) => {
      const bomIndex = state.bomData.findIndex(
        bom => bom.productName === action.payload.productName
      );
      
      if (bomIndex !== -1) {
        const oldCost = state.bomData[bomIndex].components[action.payload.componentIndex].totalCost;
        state.bomData[bomIndex].components[action.payload.componentIndex] = action.payload.component;
        state.bomData[bomIndex].totalBOMCost = state.bomData[bomIndex].totalBOMCost - oldCost + action.payload.component.totalCost;
      }
    },
    removeComponent: (state, action: PayloadAction<{ productName: string; componentIndex: number }>) => {
      const bomIndex = state.bomData.findIndex(
        bom => bom.productName === action.payload.productName
      );
      
      if (bomIndex !== -1) {
        const removedComponent = state.bomData[bomIndex].components[action.payload.componentIndex];
        state.bomData[bomIndex].components.splice(action.payload.componentIndex, 1);
        state.bomData[bomIndex].totalBOMCost -= removedComponent.totalCost;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Import BOM from Excel
      .addCase(importBOMFromExcel.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(importBOMFromExcel.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          // Merge imported BOMs with existing ones
          action.payload.forEach((importedBOM: BOMData) => {
            const existingIndex = state.bomData.findIndex(
              bom => bom.productName === importedBOM.productName
            );
            
            if (existingIndex !== -1) {
              state.bomData[existingIndex] = importedBOM;
            } else {
              state.bomData.push(importedBOM);
            }
          });
        }
      })
      .addCase(importBOMFromExcel.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to import BOM from Excel';
      })
      // Calculate BOM cost
      .addCase(calculateBOMCost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(calculateBOMCost.fulfilled, (state, action) => {
        state.loading = false;
        state.costAnalysis = action.payload;
      })
      .addCase(calculateBOMCost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to calculate BOM cost';
      });
  },
});

export const {
  addBOM,
  updateBOM,
  removeBOM,
  setSelectedBOM,
  addComponentToBOM,
  updateComponent,
  removeComponent,
  clearError,
} = bomSlice.actions;

export default bomSlice.reducer;