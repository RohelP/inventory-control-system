import * as ExcelJS from 'exceljs';
import * as path from 'path';

export interface BOMData {
  productName: string;
  components: {
    name: string;
    quantity: number;
    unit: string;
    costPerUnit: number;
    totalCost: number;
  }[];
  totalBOMCost: number;
}

export interface InventoryReportData {
  id: string;
  sku: string;
  name: string;
  category: string;
  current_stock: number;
  minimum_stock: number;
  reorder_level: number;
  cost_price: number;
  selling_price: number;
  stock_value: number;
  status: string;
}

export class ExcelService {
  
  async importBOM(filePath: string): Promise<BOMData[]> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        throw new Error('No worksheet found in the Excel file');
      }

      const bomData: BOMData[] = [];
      let currentProduct: BOMData | null = null;

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row

        const values = row.values as any[];
        
        // Assuming columns: Product Name, Component Name, Quantity, Unit, Cost Per Unit
        const productName = values[1]?.toString().trim();
        const componentName = values[2]?.toString().trim();
        const quantity = parseFloat(values[3]) || 0;
        const unit = values[4]?.toString().trim() || 'pcs';
        const costPerUnit = parseFloat(values[5]) || 0;

        if (productName && productName !== currentProduct?.productName) {
          // New product
          if (currentProduct) {
            bomData.push(currentProduct);
          }
          
          currentProduct = {
            productName,
            components: [],
            totalBOMCost: 0
          };
        }

        if (currentProduct && componentName) {
          const totalCost = quantity * costPerUnit;
          currentProduct.components.push({
            name: componentName,
            quantity,
            unit,
            costPerUnit,
            totalCost
          });
          currentProduct.totalBOMCost += totalCost;
        }
      });

      // Add the last product
      if (currentProduct) {
        bomData.push(currentProduct);
      }

      return bomData;
    } catch (error: any) {
      console.error('Error importing BOM from Excel:', error);
      throw new Error(`Failed to import BOM: ${error.message || 'Unknown error'}`);
    }
  }

  async exportInventoryReport(products: any[], filePath: string): Promise<boolean> {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Inventory Report');

      // Set up headers
      worksheet.columns = [
        { header: 'SKU', key: 'sku', width: 15 },
        { header: 'Product Name', key: 'name', width: 30 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Current Stock', key: 'current_stock', width: 15 },
        { header: 'Minimum Stock', key: 'minimum_stock', width: 15 },
        { header: 'Reorder Level', key: 'reorder_level', width: 15 },
        { header: 'Cost Price', key: 'cost_price', width: 15 },
        { header: 'Selling Price', key: 'selling_price', width: 15 },
        { header: 'Stock Value', key: 'stock_value', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Location', key: 'location', width: 20 }
      ];

      // Style the header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Add data rows
      products.forEach(product => {
        const stockValue = product.current_stock * product.cost_price;
        let status = 'OK';
        
        if (product.current_stock <= product.minimum_stock) {
          status = 'Low Stock';
        } else if (product.current_stock <= product.reorder_level) {
          status = 'Reorder Required';
        }

        const row = worksheet.addRow({
          sku: product.sku,
          name: product.name,
          category: product.category,
          current_stock: product.current_stock,
          minimum_stock: product.minimum_stock,
          reorder_level: product.reorder_level,
          cost_price: product.cost_price,
          selling_price: product.selling_price,
          stock_value: stockValue,
          status: status,
          location: product.location || ''
        });

        // Color code based on status
        if (status === 'Low Stock') {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFE0E0' }
          };
        } else if (status === 'Reorder Required') {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF0E0' }
          };
        }
      });

      // Add summary section
      const lastRow = worksheet.rowCount + 2;
      const totalValue = products.reduce((sum, product) => 
        sum + (product.current_stock * product.cost_price), 0
      );
      const lowStockCount = products.filter(p => p.current_stock <= p.minimum_stock).length;
      const reorderCount = products.filter(p => p.current_stock <= p.reorder_level).length;

      worksheet.getCell(`A${lastRow}`).value = 'Summary:';
      worksheet.getCell(`A${lastRow}`).font = { bold: true };
      worksheet.getCell(`A${lastRow + 1}`).value = `Total Products: ${products.length}`;
      worksheet.getCell(`A${lastRow + 2}`).value = `Total Inventory Value: $${totalValue.toFixed(2)}`;
      worksheet.getCell(`A${lastRow + 3}`).value = `Low Stock Items: ${lowStockCount}`;
      worksheet.getCell(`A${lastRow + 4}`).value = `Items Requiring Reorder: ${reorderCount}`;

      // Save the file
      await workbook.xlsx.writeFile(filePath);
      return true;
    } catch (error) {
      console.error('Error exporting inventory report:', error);
      return false;
    }
  }

  async calculateBOMCost(bomData: BOMData): Promise<{
    totalCost: number;
    componentBreakdown: any[];
    costAnalysis: any;
  }> {
    try {
      let totalCost = 0;
      const componentBreakdown = bomData.components.map(component => {
        const componentTotal = component.quantity * component.costPerUnit;
        totalCost += componentTotal;
        
        return {
          name: component.name,
          quantity: component.quantity,
          unit: component.unit,
          costPerUnit: component.costPerUnit,
          totalCost: componentTotal,
          percentage: 0 // Will be calculated after total is known
        };
      });

      // Calculate percentages
      componentBreakdown.forEach(component => {
        component.percentage = totalCost > 0 ? (component.totalCost / totalCost) * 100 : 0;
      });

      // Sort by cost (highest first)
      componentBreakdown.sort((a, b) => b.totalCost - a.totalCost);

      const costAnalysis = {
        totalComponents: componentBreakdown.length,
        averageCostPerComponent: totalCost / componentBreakdown.length,
        highestCostComponent: componentBreakdown[0],
        lowestCostComponent: componentBreakdown[componentBreakdown.length - 1],
        top3Components: componentBreakdown.slice(0, 3),
        costDistribution: {
          under10Percent: componentBreakdown.filter(c => c.percentage < 10).length,
          between10And25Percent: componentBreakdown.filter(c => c.percentage >= 10 && c.percentage < 25).length,
          over25Percent: componentBreakdown.filter(c => c.percentage >= 25).length
        }
      };

      return {
        totalCost,
        componentBreakdown,
        costAnalysis
      };
    } catch (error: any) {
      console.error('Error calculating BOM cost:', error);
      throw new Error(`Failed to calculate BOM cost: ${error.message || 'Unknown error'}`);
    }
  }

  async exportBOMTemplate(filePath: string): Promise<boolean> {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('BOM Template');

      // Set up headers
      worksheet.columns = [
        { header: 'Product Name', key: 'productName', width: 30 },
        { header: 'Component Name', key: 'componentName', width: 30 },
        { header: 'Quantity', key: 'quantity', width: 15 },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'Cost Per Unit', key: 'costPerUnit', width: 15 }
      ];

      // Style the header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Add sample data
      const sampleData = [
        { productName: 'Fire Damper Assembly', componentName: 'Steel Frame', quantity: 1, unit: 'pcs', costPerUnit: 25.00 },
        { productName: 'Fire Damper Assembly', componentName: 'Fire Damper Blade', quantity: 1, unit: 'pcs', costPerUnit: 35.00 },
        { productName: 'Fire Damper Assembly', componentName: 'Spring Mechanism', quantity: 1, unit: 'pcs', costPerUnit: 15.00 },
        { productName: 'Fire Damper Assembly', componentName: 'Mounting Brackets', quantity: 4, unit: 'pcs', costPerUnit: 3.50 },
      ];

      sampleData.forEach(data => {
        worksheet.addRow(data);
      });

      // Add instructions
      const instructionRow = worksheet.rowCount + 3;
      worksheet.getCell(`A${instructionRow}`).value = 'Instructions:';
      worksheet.getCell(`A${instructionRow}`).font = { bold: true };
      worksheet.getCell(`A${instructionRow + 1}`).value = '1. Replace sample data with your actual BOM data';
      worksheet.getCell(`A${instructionRow + 2}`).value = '2. Use the same Product Name for all components of the same product';
      worksheet.getCell(`A${instructionRow + 3}`).value = '3. Ensure all numeric values are properly formatted';
      worksheet.getCell(`A${instructionRow + 4}`).value = '4. Save and import this file back into the system';

      await workbook.xlsx.writeFile(filePath);
      return true;
    } catch (error) {
      console.error('Error creating BOM template:', error);
      return false;
    }
  }
}