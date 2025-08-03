import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Product, CreateProductData, ProductFilters } from '../../types';

interface ProductState {
  products: Product[];
  filteredProducts: Product[];
  loading: boolean;
  error: string | null;
  filters: ProductFilters;
  selectedProduct: Product | null;
}

const initialState: ProductState = {
  products: [],
  filteredProducts: [],
  loading: false,
  error: null,
  filters: {},
  selectedProduct: null,
};

// Async thunks
export const loadProducts = createAsyncThunk(
  'products/loadProducts',
  async () => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    return await window.electronAPI.database.getAllProducts();
  }
);

export const createProduct = createAsyncThunk(
  'products/createProduct',
  async (productData: CreateProductData) => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    return await window.electronAPI.database.createProduct(productData);
  }
);

export const updateProduct = createAsyncThunk(
  'products/updateProduct',
  async ({ id, updates }: { id: string; updates: Partial<Product> }) => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    return await window.electronAPI.database.updateProduct(id, updates);
  }
);

export const deleteProduct = createAsyncThunk(
  'products/deleteProduct',
  async (id: string) => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    const success = await window.electronAPI.database.deleteProduct(id);
    if (success) {
      return id;
    }
    throw new Error('Failed to delete product');
  }
);

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<ProductFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.filteredProducts = applyFilters(state.products, state.filters);
    },
    clearFilters: (state) => {
      state.filters = {};
      state.filteredProducts = state.products;
    },
    setSelectedProduct: (state, action: PayloadAction<Product | null>) => {
      state.selectedProduct = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Load products
      .addCase(loadProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
        state.filteredProducts = applyFilters(action.payload, state.filters);
      })
      .addCase(loadProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load products';
      })
      // Create product
      .addCase(createProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.products.push(action.payload);
        state.filteredProducts = applyFilters(state.products, state.filters);
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create product';
      })
      // Update product
      .addCase(updateProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.products.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.products[index] = action.payload;
          state.filteredProducts = applyFilters(state.products, state.filters);
        }
        if (state.selectedProduct?.id === action.payload.id) {
          state.selectedProduct = action.payload;
        }
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update product';
      })
      // Delete product
      .addCase(deleteProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.products = state.products.filter(p => p.id !== action.payload);
        state.filteredProducts = applyFilters(state.products, state.filters);
        if (state.selectedProduct?.id === action.payload) {
          state.selectedProduct = null;
        }
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete product';
      });
  },
});

// Helper function to apply filters
const applyFilters = (products: Product[], filters: ProductFilters): Product[] => {
  return products.filter(product => {
    // Category filter
    if (filters.category && product.category !== filters.category) {
      return false;
    }

    // Supplier filter
    if (filters.supplier && product.supplier_id !== filters.supplier) {
      return false;
    }

    // Stock status filter
    if (filters.stockStatus && filters.stockStatus !== 'all') {
      switch (filters.stockStatus) {
        case 'in_stock':
          if (product.current_stock <= 0) return false;
          break;
        case 'low_stock':
          if (product.current_stock > product.minimum_stock) return false;
          break;
        case 'out_of_stock':
          if (product.current_stock > 0) return false;
          break;
        case 'reorder_required':
          if (product.current_stock > product.reorder_level) return false;
          break;
      }
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const searchFields = [
        product.sku,
        product.name,
        product.description || '',
        product.category,
        product.location || ''
      ];
      
      if (!searchFields.some(field => 
        field.toLowerCase().includes(searchLower)
      )) {
        return false;
      }
    }

    return true;
  });
};

export const { setFilters, clearFilters, setSelectedProduct, clearError } = productSlice.actions;
export default productSlice.reducer;