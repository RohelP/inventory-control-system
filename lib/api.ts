// API client for the Python FastAPI backend
const API_BASE_URL = 'http://localhost:8000/api';

export interface Order {
  id: string;
  customer_name: string;
  company: string;
  phone?: string;
  email?: string;
  order_date: string;
  damper_type: string;
  special_requirements?: string;
  status: string;
  current_step: number;
  created_at: string;
  bom_generated: boolean;
  ul_compliant: boolean;
  inventory_reserved: boolean;
  production_progress: number;
  dimensions_length?: string;
  dimensions_width?: string;
  dimensions_height?: string;
}

export interface OrderCreate {
  customer_name: string;
  company: string;
  phone?: string;
  email?: string;
  order_date: string;
  damper_type: string;
  special_requirements?: string;
}

export interface BOMItem {
  id: number;
  order_id: string;
  part_number: string;
  description: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  supplier?: string;
  lead_time_days?: number;
}

export interface InventoryItem {
  id: number;
  part_number: string;
  description: string;
  category?: string;
  quantity_available: number;
  quantity_reserved: number;
  unit_cost?: number;
  reorder_level: number;
  supplier?: string;
  location?: string;
  last_updated: string;
}

export interface InventoryItemCreate {
  part_number: string;
  description: string;
  category?: string;
  quantity_available: number;
  quantity_reserved: number;
  unit_cost?: number;
  reorder_level: number;
  supplier?: string;
  location?: string;
}

export interface InventoryItemUpdate {
  description?: string;
  category?: string;
  quantity_available?: number;
  quantity_reserved?: number;
  unit_cost?: number;
  reorder_level?: number;
  supplier?: string;
  location?: string;
}

// Planning params and FIFO/LIFO policy
export interface ItemPlanningParams {
  id: number;
  part_number: string;
  demand_rate_per_day: number;
  lead_time_days: number;
  safety_stock: number;
  consumption_policy: 'FIFO' | 'LIFO';
  computed_reorder_level: number;
  updated_at: string;
}

export interface ItemPlanningParamsCreate {
  part_number: string;
  demand_rate_per_day: number;
  lead_time_days: number;
  safety_stock: number;
  consumption_policy: 'FIFO' | 'LIFO';
}

export interface ItemPlanningParamsUpdate {
  demand_rate_per_day?: number;
  lead_time_days?: number;
  safety_stock?: number;
  consumption_policy?: 'FIFO' | 'LIFO';
}

// Inventory receipts (lot tracking)
export interface InventoryReceiptCreate {
  part_number: string;
  quantity_received: number;
  unit_cost: number;
  received_at?: string;
  expiration_date?: string | null;
}

export interface InventoryReceipt {
  id: number;
  part_number: string;
  quantity_received: number;
  quantity_remaining: number;
  unit_cost: number;
  received_at: string;
  expiration_date?: string | null;
}

// ABC analysis
export interface ItemABC {
  id: number;
  part_number: string;
  annual_demand: number;
  annual_consumption_value: number;
  abc_class?: 'A' | 'B' | 'C' | null;
  computed_at: string;
}

export interface ItemABCCreate {
  part_number: string;
  annual_demand: number;
}

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Order Management
  async getOrders(): Promise<Order[]> {
    return this.request<Order[]>('/orders');
  }

  async getOrder(orderId: string): Promise<Order> {
    return this.request<Order>(`/orders/${orderId}`);
  }

  async createOrder(order: OrderCreate): Promise<Order> {
    return this.request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  }

  async updateOrder(orderId: string, updates: Partial<Order>): Promise<Order> {
    return this.request<Order>(`/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteOrder(orderId: string): Promise<void> {
    return this.request<void>(`/orders/${orderId}`, {
      method: 'DELETE',
    });
  }

  // BOM Management
  async getBOMItems(orderId: string): Promise<BOMItem[]> {
    return this.request<BOMItem[]>(`/orders/${orderId}/bom`);
  }

  async createBOMItem(orderId: string, bomItem: Omit<BOMItem, 'id' | 'order_id' | 'total_cost'>): Promise<BOMItem> {
    return this.request<BOMItem>(`/orders/${orderId}/bom`, {
      method: 'POST',
      body: JSON.stringify(bomItem),
    });
  }

  async createBOMBatch(orderId: string, bomItems: Omit<BOMItem, 'id' | 'order_id' | 'total_cost'>[]): Promise<BOMItem[]> {
    return this.request<BOMItem[]>(`/orders/${orderId}/bom/batch`, {
      method: 'POST',
      body: JSON.stringify({ items: bomItems }),
    });
  }

  async updateBOMBatch(orderId: string, bomItems: Omit<BOMItem, 'id' | 'order_id' | 'total_cost'>[]): Promise<BOMItem[]> {
    return this.request<BOMItem[]>(`/orders/${orderId}/bom/batch`, {
      method: 'PUT',
      body: JSON.stringify({ items: bomItems }),
    });
  }

  async deleteBOMItem(orderId: string, bomItemId: number): Promise<void> {
    return this.request<void>(`/orders/${orderId}/bom/${bomItemId}`, {
      method: 'DELETE',
    });
  }

  // Inventory Management
  async getInventory(): Promise<InventoryItem[]> {
    return this.request<InventoryItem[]>('/inventory');
  }

  async getInventoryItem(partNumber: string): Promise<InventoryItem> {
    return this.request<InventoryItem>(`/inventory/${partNumber}`);
  }

  async createInventoryItem(item: InventoryItemCreate): Promise<InventoryItem> {
    return this.request<InventoryItem>('/inventory', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async updateInventoryItem(partNumber: string, updates: InventoryItemUpdate): Promise<InventoryItem> {
    return this.request<InventoryItem>(`/inventory/${partNumber}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteInventoryItem(partNumber: string): Promise<void> {
    return this.request<void>(`/inventory/${partNumber}`, {
      method: 'DELETE',
    });
  }

  async createInventoryBatch(items: InventoryItemCreate[]): Promise<InventoryItem[]> {
    return this.request<InventoryItem[]>('/inventory/batch', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  async reserveInventoryForOrder(orderId: string): Promise<{ message: string; order_id: string }> {
    return this.request(`/inventory/reserve/${orderId}`, {
      method: 'POST',
    });
  }

  async releaseInventoryForOrder(orderId: string): Promise<{ message: string; order_id: string }> {
    return this.request(`/inventory/release/${orderId}`, {
      method: 'POST',
    });
  }

  async getLowStockItems(): Promise<InventoryItem[]> {
    return this.request<InventoryItem[]>('/inventory/low-stock');
  }

  async getOutOfStockItems(): Promise<InventoryItem[]> {
    return this.request<InventoryItem[]>('/inventory/out-of-stock');
  }

  async checkInventoryForOrder(orderId: string): Promise<{
    order_id: string;
    can_fulfill: boolean;
    insufficient_items: Array<{
      part_number: string;
      required: number;
      available: number;
      shortfall: number;
    }>;
  }> {
    return this.request(`/inventory/check/${orderId}`);
  }

  // Production Tracking
  async updateProductionProgress(orderId: string, progress: number): Promise<Order> {
    return this.request<Order>(`/orders/${orderId}/production`, {
      method: 'PUT',
      body: JSON.stringify({ progress }),
    });
  }

  // Inventory Receipts (lot tracking)
  async createInventoryReceipt(payload: InventoryReceiptCreate): Promise<InventoryReceipt> {
    return this.request<InventoryReceipt>('/inventory/receipts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listInventoryReceipts(partNumber: string): Promise<InventoryReceipt[]> {
    return this.request<InventoryReceipt[]>(`/inventory/receipts/${partNumber}`);
  }

  // Planning parameters and reorder computation
  async upsertPlanningParams(partNumber: string, params: ItemPlanningParamsCreate): Promise<ItemPlanningParams> {
    return this.request<ItemPlanningParams>(`/inventory/${partNumber}/planning`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async updatePlanningParams(partNumber: string, updates: ItemPlanningParamsUpdate): Promise<ItemPlanningParams> {
    return this.request<ItemPlanningParams>(`/inventory/${partNumber}/planning`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // ABC analysis
  async upsertItemABC(partNumber: string, annualDemand: number): Promise<ItemABC> {
    return this.request<ItemABC>(`/inventory/abc/${partNumber}`, {
      method: 'POST',
      body: JSON.stringify({ part_number: partNumber, annual_demand: annualDemand }),
    });
  }

  async recomputeABC(): Promise<{ updated: number }> {
    return this.request<{ updated: number }>(`/inventory/abc/recompute`, {
      method: 'POST',
    });
  }

  async listItemABC(): Promise<ItemABC[]> {
    return this.request<ItemABC[]>(`/inventory/abc`);
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request('/health');
  }
}

export const apiClient = new ApiClient();

// Utility function to transform backend data to frontend format
export function transformOrderForFrontend(order: Order): any {
  return {
    id: order.id,
    customerName: order.customer_name,
    company: order.company,
    phone: order.phone,
    email: order.email,
    orderDate: order.order_date,
    damperType: order.damper_type,
    specialRequirements: order.special_requirements,
    status: order.status,
    currentStep: order.current_step,
    createdAt: order.created_at,
    bomGenerated: order.bom_generated,
    ulCompliant: order.ul_compliant,
    inventoryReserved: order.inventory_reserved,
    productionProgress: order.production_progress,
    dimensions: order.dimensions_length ? {
      length: order.dimensions_length,
      width: order.dimensions_width,
      height: order.dimensions_height,
    } : undefined,
  };
}

// Utility function to transform frontend data to backend format
export function transformOrderForBackend(order: any): OrderCreate {
  return {
    customer_name: order.customerName,
    company: order.company,
    phone: order.phone,
    email: order.email,
    order_date: order.orderDate,
    damper_type: order.damperType,
    special_requirements: order.specialRequirements,
  };
}