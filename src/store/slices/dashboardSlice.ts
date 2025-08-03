import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { DashboardStats, ActivityItem, ChartData, LineChartData, Product, SalesOrder } from '../../types';

interface DashboardState {
  stats: DashboardStats | null;
  chartData: ChartData[];
  lineChartData: LineChartData[];
  loading: boolean;
  error: string | null;
  refreshInterval: number;
  lastUpdated: string | null;
}

const initialState: DashboardState = {
  stats: null,
  chartData: [],
  lineChartData: [],
  loading: false,
  error: null,
  refreshInterval: 300000, // 5 minutes
  lastUpdated: null,
};

// Async thunks
export const loadDashboardData = createAsyncThunk(
  'dashboard/loadData',
  async (_, { getState, rejectWithValue }) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      // Load products and orders data
      const [products, orders] = await Promise.all([
        window.electronAPI.database.getAllProducts(),
        window.electronAPI.database.getAllOrders()
      ]) as [Product[], SalesOrder[]];

      // Calculate dashboard statistics
      const totalProducts = products.length;
      const totalOrders = orders.length;
      const lowStockItems = products.filter((p: Product) => p.current_stock <= p.minimum_stock).length;
      const reorderRequired = products.filter((p: Product) => p.current_stock <= p.reorder_level).length;
      const totalInventoryValue = products.reduce((sum: number, p: Product) => sum + (p.current_stock * p.cost_price), 0);
      const pendingOrders = orders.filter((o: SalesOrder) => o.status === 'pending').length;
      const completedOrders = orders.filter((o: SalesOrder) => o.status === 'delivered').length;

      // Generate recent activity
      const recentActivity: ActivityItem[] = [
        ...orders.slice(0, 3).map((order: SalesOrder) => ({
          id: order.id,
          type: 'order' as const,
          title: `Order ${order.order_number}`,
          description: `${order.status} - ${order.customer_name}`,
          timestamp: order.updated_at,
          status: getOrderStatusType(order.status)
        })),
        ...products.filter((p: Product) => p.current_stock <= p.minimum_stock).slice(0, 2).map((product: Product) => ({
          id: product.id,
          type: 'stock' as const,
          title: `Low Stock Alert`,
          description: `${product.name} (${product.current_stock} remaining)`,
          timestamp: product.updated_at,
          status: 'warning' as const
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const stats: DashboardStats = {
        totalProducts,
        totalOrders,
        lowStockItems,
        reorderRequired,
        totalInventoryValue,
        pendingOrders,
        completedOrders,
        recentActivity
      };

      // Generate chart data
      const categoryData: ChartData[] = products.reduce((acc: ChartData[], product: Product) => {
        const existing = acc.find((item: ChartData) => item.name === product.category);
        if (existing) {
          existing.value += 1;
        } else {
          acc.push({
            name: product.category,
            value: 1,
            fill: getCategoryColor(product.category)
          });
        }
        return acc;
      }, [] as ChartData[]);

      // Generate line chart data (last 30 days)
      const lineData: LineChartData[] = generateLineChartData(orders);

      return {
        stats,
        chartData: categoryData,
        lineChartData: lineData
      };

    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load dashboard data');
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setRefreshInterval: (state, action: PayloadAction<number>) => {
      state.refreshInterval = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    addActivity: (state, action: PayloadAction<ActivityItem>) => {
      if (state.stats) {
        state.stats.recentActivity.unshift(action.payload);
        // Keep only last 10 activities
        state.stats.recentActivity = state.stats.recentActivity.slice(0, 10);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload.stats;
        state.chartData = action.payload.chartData;
        state.lineChartData = action.payload.lineChartData;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(loadDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// Helper functions
function getOrderStatusType(status: string): 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'delivered':
      return 'success';
    case 'cancelled':
      return 'error';
    case 'pending':
      return 'warning';
    default:
      return 'info';
  }
}

function getCategoryColor(category: string): string {
  const colors = [
    '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
    '#13c2c2', '#eb2f96', '#fa541c', '#a0d911', '#2f54eb'
  ];
  const index = category.length % colors.length;
  return colors[index];
}

function generateLineChartData(orders: any[]): LineChartData[] {
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date.toISOString().split('T')[0];
  });

  return last30Days.map(date => {
    const dayOrders = orders.filter(order => 
      order.order_date.startsWith(date)
    );
    
    const ordersCount = dayOrders.length;
    const revenue = dayOrders.reduce((sum, order) => sum + order.total_amount, 0);
    
    return {
      date,
      orders: ordersCount,
      revenue,
      inventory: 0 // This could be calculated based on inventory transactions
    };
  });
}

export const { setRefreshInterval, clearError, addActivity } = dashboardSlice.actions;
export default dashboardSlice.reducer;