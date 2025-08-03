// Product Types
export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  cost_price: number;
  selling_price: number;
  current_stock: number;
  minimum_stock: number;
  reorder_level: number;
  reorder_quantity: number;
  supplier_id?: string;
  location?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductData {
  sku: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  cost_price: number;
  selling_price: number;
  current_stock: number;
  minimum_stock: number;
  reorder_level: number;
  reorder_quantity: number;
  supplier_id?: string;
  location?: string;
}

// Order Types
export interface SalesOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email?: string;
  status: OrderStatus;
  order_date: string;
  delivery_date?: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product?: Product;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface CreateOrderData {
  order_number: string;
  customer_name: string;
  customer_email?: string;
  status: OrderStatus;
  order_date: string;
  delivery_date?: string;
  total_amount: number;
  items: Omit<OrderItem, 'id' | 'order_id'>[];
}

// Supplier Types
export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

// BOM Types
export interface BOMItem {
  id: string;
  product_id: string;
  component_id: string;
  quantity_required: number;
  unit: string;
  cost_per_unit: number;
  notes?: string;
  product?: Product;
  component?: Product;
}

export interface BOMData {
  productName: string;
  components: BOMComponent[];
  totalBOMCost: number;
}

export interface BOMComponent {
  name: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
}

// Inventory Transaction Types
export interface InventoryTransaction {
  id: string;
  product_id: string;
  transaction_type: TransactionType;
  quantity: number;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  created_at: string;
  product?: Product;
}

export type TransactionType = 
  | 'stock_in' 
  | 'stock_out' 
  | 'adjustment' 
  | 'transfer' 
  | 'return' 
  | 'damage' 
  | 'loss';

// Dashboard Types
export interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  lowStockItems: number;
  reorderRequired: number;
  totalInventoryValue: number;
  pendingOrders: number;
  completedOrders: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'order' | 'product' | 'stock' | 'bom';
  title: string;
  description: string;
  timestamp: string;
  status?: 'success' | 'warning' | 'error' | 'info';
}

// Chart Data Types
export interface ChartData {
  name: string;
  value: number;
  fill?: string;
}

export interface LineChartData {
  date: string;
  orders: number;
  revenue: number;
  inventory: number;
}

// Filter and Search Types
export interface ProductFilters {
  category?: string;
  supplier?: string;
  stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'reorder_required';
  search?: string;
}

export interface OrderFilters {
  status?: OrderStatus | 'all';
  dateRange?: [string, string];
  customer?: string;
  search?: string;
}

// Form Types
export interface ProductFormData extends CreateProductData {}

export interface OrderFormData extends CreateOrderData {}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Pagination Types
export interface PaginationConfig {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
}

// Table Column Types
export interface TableColumn {
  title: string;
  dataIndex: string;
  key: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  sorter?: boolean;
  render?: (value: any, record: any, index: number) => React.ReactNode;
}

// Menu Types
export interface MenuItem {
  key: string;
  icon?: React.ReactNode;
  label: string;
  path?: string;
  children?: MenuItem[];
}

// Notification Types
export interface NotificationConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  description?: string;
  duration?: number;
}

// Export Types
export interface ExportConfig {
  format: 'excel' | 'csv' | 'pdf';
  filename: string;
  data: any[];
  columns?: string[];
}

// Quality Control Types
export interface QualityCheck {
  id: string;
  product_id: string;
  order_id?: string;
  inspector: string;
  check_date: string;
  status: 'passed' | 'failed' | 'pending';
  notes?: string;
  defects?: string[];
  created_at: string;
}

// UL Compliance Types
export interface ULCompliance {
  id: string;
  product_id: string;
  ul_category: string;
  ul_file_number?: string;
  certification_date?: string;
  expiry_date?: string;
  status: 'compliant' | 'non_compliant' | 'pending' | 'expired';
  documents?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Production Types
export interface ProductionOrder {
  id: string;
  order_number: string;
  product_id: string;
  quantity: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Electron API Types
export interface ElectronAPI {
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
}