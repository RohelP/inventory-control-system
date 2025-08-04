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

  // Inventory Management
  async getInventory(): Promise<InventoryItem[]> {
    return this.request<InventoryItem[]>('/inventory');
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