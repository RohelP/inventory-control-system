import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { SalesOrder, CreateOrderData, OrderFilters, OrderStatus } from '../../types';

interface OrderState {
  orders: SalesOrder[];
  filteredOrders: SalesOrder[];
  loading: boolean;
  error: string | null;
  filters: OrderFilters;
  selectedOrder: SalesOrder | null;
}

const initialState: OrderState = {
  orders: [],
  filteredOrders: [],
  loading: false,
  error: null,
  filters: {},
  selectedOrder: null,
};

// Async thunks
export const loadOrders = createAsyncThunk(
  'orders/loadOrders',
  async () => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    return await window.electronAPI.database.getAllOrders();
  }
);

export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async (orderData: CreateOrderData) => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    return await window.electronAPI.database.createOrder(orderData);
  }
);

export const updateOrderStatus = createAsyncThunk(
  'orders/updateOrderStatus',
  async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    return await window.electronAPI.database.updateOrderStatus(orderId, status);
  }
);

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<OrderFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.filteredOrders = applyFilters(state.orders, state.filters);
    },
    clearFilters: (state) => {
      state.filters = {};
      state.filteredOrders = state.orders;
    },
    setSelectedOrder: (state, action: PayloadAction<SalesOrder | null>) => {
      state.selectedOrder = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Load orders
      .addCase(loadOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
        state.filteredOrders = applyFilters(action.payload, state.filters);
      })
      .addCase(loadOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load orders';
      })
      // Create order
      .addCase(createOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.orders.unshift(action.payload); // Add to beginning for newest first
        state.filteredOrders = applyFilters(state.orders, state.filters);
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create order';
      })
      // Update order status
      .addCase(updateOrderStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.orders.findIndex(o => o.id === action.payload.id);
        if (index !== -1) {
          state.orders[index] = action.payload;
          state.filteredOrders = applyFilters(state.orders, state.filters);
        }
        if (state.selectedOrder?.id === action.payload.id) {
          state.selectedOrder = action.payload;
        }
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update order status';
      });
  },
});

// Helper function to apply filters
const applyFilters = (orders: SalesOrder[], filters: OrderFilters): SalesOrder[] => {
  return orders.filter(order => {
    // Status filter
    if (filters.status && filters.status !== 'all' && order.status !== filters.status) {
      return false;
    }

    // Date range filter
    if (filters.dateRange && filters.dateRange.length === 2) {
      const orderDate = new Date(order.order_date);
      const startDate = new Date(filters.dateRange[0]);
      const endDate = new Date(filters.dateRange[1]);
      
      if (orderDate < startDate || orderDate > endDate) {
        return false;
      }
    }

    // Customer filter
    if (filters.customer && !order.customer_name.toLowerCase().includes(filters.customer.toLowerCase())) {
      return false;
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const searchFields = [
        order.order_number,
        order.customer_name,
        order.customer_email || '',
        order.status
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

export const { setFilters, clearFilters, setSelectedOrder, clearError } = orderSlice.actions;
export default orderSlice.reducer;