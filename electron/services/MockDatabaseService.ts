import { v4 as uuidv4 } from 'uuid';

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

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email?: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  order_date: string;
  delivery_date?: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export class MockDatabaseService {
  private products: Product[] = [];
  private orders: Order[] = [];

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    // Sample products
    this.products = [
      {
        id: uuidv4(),
        sku: 'SKU001',
        name: 'Electronic Component A',
        description: 'High-quality electronic component for manufacturing',
        category: 'Electronics',
        unit: 'pieces',
        cost_price: 15.50,
        selling_price: 25.00,
        current_stock: 150,
        minimum_stock: 50,
        reorder_level: 75,
        reorder_quantity: 200,
        location: 'Warehouse A',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        sku: 'SKU002',
        name: 'Circuit Board B',
        description: 'Custom circuit board for industrial applications',
        category: 'Electronics',
        unit: 'pieces',
        cost_price: 45.00,
        selling_price: 75.00,
        current_stock: 25,
        minimum_stock: 30,
        reorder_level: 40,
        reorder_quantity: 100,
        location: 'Warehouse A',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        sku: 'SKU003',
        name: 'Connector Cable',
        description: 'Premium quality connector cable',
        category: 'Cables',
        unit: 'meters',
        cost_price: 8.75,
        selling_price: 15.00,
        current_stock: 500,
        minimum_stock: 100,
        reorder_level: 150,
        reorder_quantity: 1000,
        location: 'Warehouse B',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        sku: 'SKU004',
        name: 'Power Supply Unit',
        description: 'Industrial grade power supply unit',
        category: 'Power',
        unit: 'pieces',
        cost_price: 120.00,
        selling_price: 200.00,
        current_stock: 12,
        minimum_stock: 20,
        reorder_level: 25,
        reorder_quantity: 50,
        location: 'Warehouse C',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Sample orders
    this.orders = [
      {
        id: uuidv4(),
        order_number: 'ORD-001',
        customer_name: 'TechCorp Industries',
        customer_email: 'orders@techcorp.com',
        status: 'processing',
        order_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        delivery_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        total_amount: 1250.00,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        order_number: 'ORD-002',
        customer_name: 'Manufacturing Solutions Ltd',
        customer_email: 'procurement@mansol.com',
        status: 'delivered',
        order_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        delivery_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        total_amount: 850.00,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        order_number: 'ORD-003',
        customer_name: 'Electronic Systems Inc',
        customer_email: 'orders@elecsys.com',
        status: 'pending',
        order_date: new Date().toISOString(),
        total_amount: 2100.00,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }

  async initDb(): Promise<void> {
    // Mock initialization - no actual database needed
    console.log('Mock database initialized');
  }

  async getAllProducts(): Promise<Product[]> {
    return [...this.products];
  }

  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const newProduct: Product = {
      ...product,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.products.push(newProduct);
    return newProduct;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    this.products[index] = {
      ...this.products[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    return this.products[index];
  }

  async deleteProduct(id: string): Promise<boolean> {
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) return false;
    
    this.products.splice(index, 1);
    return true;
  }

  async getAllOrders(): Promise<Order[]> {
    return [...this.orders];
  }

  async createOrder(order: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<Order> {
    const newOrder: Order = {
      ...order,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.orders.push(newOrder);
    return newOrder;
  }

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<Order | null> {
    const index = this.orders.findIndex(o => o.id === orderId);
    if (index === -1) return null;
    
    this.orders[index] = {
      ...this.orders[index],
      status,
      updated_at: new Date().toISOString()
    };
    return this.orders[index];
  }
}