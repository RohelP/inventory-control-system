import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';
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

export interface SalesOrder {
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

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

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

export interface BOMItem {
  id: string;
  product_id: string;
  component_id: string;
  quantity_required: number;
  unit: string;
  cost_per_unit: number;
  notes?: string;
}

export class DatabaseService {
  private db: Database.Database;

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'inventory.db');
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    // Create tables
    this.createTables();
    this.seedInitialData();
  }

  private createTables(): void {
    // Products table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        sku TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        unit TEXT NOT NULL,
        cost_price REAL NOT NULL DEFAULT 0,
        selling_price REAL NOT NULL DEFAULT 0,
        current_stock INTEGER NOT NULL DEFAULT 0,
        minimum_stock INTEGER NOT NULL DEFAULT 0,
        reorder_level INTEGER NOT NULL DEFAULT 0,
        reorder_quantity INTEGER NOT NULL DEFAULT 0,
        supplier_id TEXT,
        location TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
      )
    `);

    // Suppliers table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        contact_person TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Sales orders table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sales_orders (
        id TEXT PRIMARY KEY,
        order_number TEXT UNIQUE NOT NULL,
        customer_name TEXT NOT NULL,
        customer_email TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        order_date TEXT NOT NULL,
        delivery_date TEXT,
        total_amount REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Order items table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES sales_orders (id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products (id)
      )
    `);

    // Bill of Materials table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bom_items (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        component_id TEXT NOT NULL,
        quantity_required REAL NOT NULL,
        unit TEXT NOT NULL,
        cost_per_unit REAL NOT NULL DEFAULT 0,
        notes TEXT,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
        FOREIGN KEY (component_id) REFERENCES products (id)
      )
    `);

    // Inventory transactions table for audit trail
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        transaction_type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        reference_id TEXT,
        reference_type TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products (id)
      )
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_products_sku ON products (sku);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON sales_orders (status);
      CREATE INDEX IF NOT EXISTS idx_orders_date ON sales_orders (order_date);
      CREATE INDEX IF NOT EXISTS idx_transactions_product ON inventory_transactions (product_id);
    `);
  }

  private seedInitialData(): void {
    // Check if we have any data
    const productCount = this.db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
    
    if (productCount.count === 0) {
      // Add sample suppliers
      const supplierId1 = uuidv4();
      const supplierId2 = uuidv4();
      
      this.db.prepare(`
        INSERT INTO suppliers (id, name, contact_person, email, phone, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(supplierId1, 'Industrial Components Ltd', 'John Smith', 'john@industrial.com', '+1-555-0123', new Date().toISOString(), new Date().toISOString());

      this.db.prepare(`
        INSERT INTO suppliers (id, name, contact_person, email, phone, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(supplierId2, 'Fire Safety Solutions', 'Sarah Johnson', 'sarah@firesafety.com', '+1-555-0456', new Date().toISOString(), new Date().toISOString());

      // Add sample products
      const sampleProducts = [
        {
          id: uuidv4(),
          sku: 'FD-STD-001',
          name: 'Standard Fire Damper',
          description: 'Standard fire damper for HVAC systems',
          category: 'Fire Dampers',
          unit: 'pcs',
          cost_price: 75.00,
          selling_price: 120.00,
          current_stock: 150,
          minimum_stock: 25,
          reorder_level: 50,
          reorder_quantity: 100,
          supplier_id: supplierId1,
          location: 'Warehouse A-1'
        },
        {
          id: uuidv4(),
          sku: 'FD-SMK-002',
          name: 'Smoke Damper',
          description: 'Combination fire/smoke damper',
          category: 'Fire Dampers',
          unit: 'pcs',
          cost_price: 95.00,
          selling_price: 155.00,
          current_stock: 80,
          minimum_stock: 15,
          reorder_level: 30,
          reorder_quantity: 75,
          supplier_id: supplierId1,
          location: 'Warehouse A-2'
        },
        {
          id: uuidv4(),
          sku: 'ACT-ELEC-001',
          name: 'Electric Actuator',
          description: '24V electric actuator for dampers',
          category: 'Actuators',
          unit: 'pcs',
          cost_price: 125.00,
          selling_price: 200.00,
          current_stock: 45,
          minimum_stock: 10,
          reorder_level: 20,
          reorder_quantity: 50,
          supplier_id: supplierId2,
          location: 'Warehouse B-1'
        }
      ];

      const insertProduct = this.db.prepare(`
        INSERT INTO products (
          id, sku, name, description, category, unit, cost_price, selling_price,
          current_stock, minimum_stock, reorder_level, reorder_quantity,
          supplier_id, location, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const product of sampleProducts) {
        insertProduct.run(
          product.id, product.sku, product.name, product.description,
          product.category, product.unit, product.cost_price, product.selling_price,
          product.current_stock, product.minimum_stock, product.reorder_level,
          product.reorder_quantity, product.supplier_id, product.location,
          new Date().toISOString(), new Date().toISOString()
        );
      }
    }
  }

  // Product operations
  async getAllProducts(): Promise<Product[]> {
    return this.db.prepare('SELECT * FROM products ORDER BY name').all() as Product[];
  }

  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    this.db.prepare(`
      INSERT INTO products (
        id, sku, name, description, category, unit, cost_price, selling_price,
        current_stock, minimum_stock, reorder_level, reorder_quantity,
        supplier_id, location, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, product.sku, product.name, product.description, product.category,
      product.unit, product.cost_price, product.selling_price, product.current_stock,
      product.minimum_stock, product.reorder_level, product.reorder_quantity,
      product.supplier_id, product.location, now, now
    );

    return this.db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Product;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const now = new Date().toISOString();
    updates.updated_at = now;

    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);

    this.db.prepare(`UPDATE products SET ${fields} WHERE id = ?`).run(...values);
    
    return this.db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Product;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // Sales order operations
  async getAllOrders(): Promise<SalesOrder[]> {
    return this.db.prepare('SELECT * FROM sales_orders ORDER BY order_date DESC').all() as SalesOrder[];
  }

  async createOrder(order: Omit<SalesOrder, 'id' | 'created_at' | 'updated_at'>): Promise<SalesOrder> {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    this.db.prepare(`
      INSERT INTO sales_orders (
        id, order_number, customer_name, customer_email, status,
        order_date, delivery_date, total_amount, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, order.order_number, order.customer_name, order.customer_email,
      order.status, order.order_date, order.delivery_date, order.total_amount,
      now, now
    );

    return this.db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(id) as SalesOrder;
  }

  async updateOrderStatus(orderId: string, status: string): Promise<SalesOrder> {
    const now = new Date().toISOString();
    
    this.db.prepare('UPDATE sales_orders SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, now, orderId);
    
    return this.db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(orderId) as SalesOrder;
  }

  // Get low stock products
  async getLowStockProducts(): Promise<Product[]> {
    return this.db.prepare(`
      SELECT * FROM products 
      WHERE current_stock <= minimum_stock 
      ORDER BY current_stock ASC
    `).all() as Product[];
  }

  // Get products requiring reorder
  async getProductsRequiringReorder(): Promise<Product[]> {
    return this.db.prepare(`
      SELECT * FROM products 
      WHERE current_stock <= reorder_level 
      ORDER BY current_stock ASC
    `).all() as Product[];
  }

  // Close database connection
  close(): void {
    this.db.close();
  }
}