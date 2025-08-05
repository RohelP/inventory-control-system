import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export interface BOMExcelRow {
  component: string;
  partNumber: string;
  quantity: number;
  material: string;
  size?: string;
  unitCost?: number;
  totalCost?: number;
  supplier?: string;
  leadTimeDays?: number;
  notes?: string;
}

export interface CustomerOrderData {
  orderId: string;
  customerName: string;
  company: string;
  damperType: string;
  dimensions?: {
    length: string;
    width: string;
    height: string;
  };
  specialRequirements?: string;
}

export interface ExcelBOMTemplate {
  templateName: string;
  damperType: string;
  description: string;
  baseComponents: BOMExcelRow[];
  calculationRules: {
    [key: string]: string; // Component rules based on dimensions
  };
}

// Standard BOM templates for Excel export
export const excelBOMTemplates: ExcelBOMTemplate[] = [
  {
    templateName: "Fire Damper Standard",
    damperType: "Fire Damper - Standard",
    description: "Standard fire damper BOM template",
    baseComponents: [
      {
        component: "Steel Frame",
        partNumber: "FD-FRAME-001",
        quantity: 1,
        material: "Galvanized Steel",
        unitCost: 45.50,
        supplier: "MetalCorp",
        leadTimeDays: 7
      },
      {
        component: "Fire Rated Blade",
        partNumber: "FD-BLADE-001",
        quantity: 4,
        material: "Steel",
        unitCost: 12.30,
        supplier: "BladeWorks",
        leadTimeDays: 5
      },
      {
        component: "Fusible Link",
        partNumber: "FD-LINK-001",
        quantity: 1,
        material: "Alloy",
        unitCost: 8.75,
        supplier: "SafetyLink Inc",
        leadTimeDays: 3
      }
    ],
    calculationRules: {
      "mountingHardware": "Math.ceil(perimeter / 12) * 2", // 2 bolts per 12 inches
      "reinforcement": "Math.ceil(perimeter / 24)" // 1 reinforcement per 24 inches
    }
  },
  {
    templateName: "Custom Fire Damper",
    damperType: "Fire Damper - Custom",
    description: "Custom fire damper BOM template with dynamic calculations",
    baseComponents: [
      {
        component: "Custom Steel Frame",
        partNumber: "CF-FRAME-CUSTOM",
        quantity: 1,
        material: "Galvanized Steel",
        unitCost: 0, // Will be calculated based on dimensions
        supplier: "MetalCorp",
        leadTimeDays: 10
      }
    ],
    calculationRules: {
      "framePerimeter": "2 * (length + width)",
      "bladeCount": "Math.ceil(height / 6)",
      "surfaceArea": "length * width",
      "frameCost": "surfaceArea * 2.50 + framePerimeter * 1.25"
    }
  }
];

export class ExcelBOMProcessor {
  
  /**
   * Read BOM data from an uploaded Excel file
   */
  static async readBOMFromExcel(file: File): Promise<{
    orderData: Partial<CustomerOrderData>;
    bomComponents: BOMExcelRow[];
    errors: string[];
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const errors: string[] = [];
          let orderData: Partial<CustomerOrderData> = {};
          let bomComponents: BOMExcelRow[] = [];

          // Read order information from 'Order Info' sheet if it exists
          if (workbook.SheetNames.includes('Order Info')) {
            const orderSheet = workbook.Sheets['Order Info'];
            const orderJson = XLSX.utils.sheet_to_json(orderSheet, { header: 1 }) as any[][];
            
            orderData = ExcelBOMProcessor.parseOrderInfo(orderJson, errors);
          }

          // Read BOM data from 'BOM' sheet or first sheet
          const bomSheetName = workbook.SheetNames.includes('BOM') 
            ? 'BOM' 
            : workbook.SheetNames[0];
          
          if (bomSheetName) {
            const bomSheet = workbook.Sheets[bomSheetName];
            const bomJson = XLSX.utils.sheet_to_json(bomSheet) as any[];
            
            bomComponents = ExcelBOMProcessor.parseBOMData(bomJson, errors);
          } else {
            errors.push('No BOM data sheet found in Excel file');
          }

          resolve({ orderData, bomComponents, errors });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          reject(new Error(`Failed to read Excel file: ${errorMessage}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Export BOM data to Excel file
   */
  static exportBOMToExcel(
    orderData: CustomerOrderData,
    bomComponents: BOMExcelRow[],
    filename?: string
  ): void {
    const workbook = XLSX.utils.book_new();

    // Create Order Info worksheet
    const orderInfoData = [
      ['Order Information', ''],
      ['Order ID', orderData.orderId],
      ['Customer Name', orderData.customerName],
      ['Company', orderData.company],
      ['Damper Type', orderData.damperType],
      ['', ''],
      ['Dimensions', ''],
      ['Length (inches)', orderData.dimensions?.length || ''],
      ['Width (inches)', orderData.dimensions?.width || ''],
      ['Height (inches)', orderData.dimensions?.height || ''],
      ['', ''],
      ['Special Requirements', orderData.specialRequirements || ''],
      ['', ''],
      ['Generated Date', new Date().toLocaleDateString()],
      ['Generated Time', new Date().toLocaleTimeString()],
    ];

    const orderInfoWS = XLSX.utils.aoa_to_sheet(orderInfoData);
    XLSX.utils.book_append_sheet(workbook, orderInfoWS, 'Order Info');

    // Create BOM worksheet
    const bomData = bomComponents.map(component => ({
      'Component': component.component,
      'Part Number': component.partNumber,
      'Quantity': component.quantity,
      'Material': component.material,
      'Size': component.size || '',
      'Unit Cost': component.unitCost || 0,
      'Total Cost': component.totalCost || (component.unitCost || 0) * component.quantity,
      'Supplier': component.supplier || '',
      'Lead Time (Days)': component.leadTimeDays || '',
      'Notes': component.notes || ''
    }));

    const bomWS = XLSX.utils.json_to_sheet(bomData);
    
    // Set column widths
    bomWS['!cols'] = [
      { wch: 25 }, // Component
      { wch: 15 }, // Part Number
      { wch: 10 }, // Quantity
      { wch: 15 }, // Material
      { wch: 15 }, // Size
      { wch: 12 }, // Unit Cost
      { wch: 12 }, // Total Cost
      { wch: 15 }, // Supplier
      { wch: 12 }, // Lead Time
      { wch: 20 }  // Notes
    ];

    XLSX.utils.book_append_sheet(workbook, bomWS, 'BOM');

    // Create Summary worksheet
    const totalCost = bomComponents.reduce((sum, comp) => 
      sum + ((comp.unitCost || 0) * comp.quantity), 0
    );
    const totalComponents = bomComponents.reduce((sum, comp) => sum + comp.quantity, 0);

    const summaryData = [
      ['BOM Summary', ''],
      ['Total Components', totalComponents],
      ['Unique Parts', bomComponents.length],
      ['Total Estimated Cost', `$${totalCost.toFixed(2)}`],
      ['', ''],
      ['Cost Breakdown', ''],
      ...bomComponents.map(comp => [
        comp.component,
        `$${((comp.unitCost || 0) * comp.quantity).toFixed(2)}`
      ])
    ];

    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summaryWS, 'Summary');

    // Generate filename if not provided
    const finalFilename = filename || 
      `BOM_${orderData.orderId}_${orderData.customerName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Save file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, finalFilename);
  }

  /**
   * Create Excel template for custom BOM entry
   */
  static createBOMTemplate(templateType: string = 'custom'): void {
    const workbook = XLSX.utils.book_new();

    // Order Info template
    const orderInfoTemplate = [
      ['Order Information', 'Please fill in the following:'],
      ['Order ID', 'AUTO-GENERATED'],
      ['Customer Name', ''],
      ['Company', ''],
      ['Damper Type', 'Fire Damper - Custom'],
      ['', ''],
      ['Dimensions', ''],
      ['Length (inches)', ''],
      ['Width (inches)', ''],
      ['Height (inches)', ''],
      ['', ''],
      ['Special Requirements', ''],
      ['', ''],
      ['Instructions:', ''],
      ['1. Fill in customer and order information above'],
      ['2. Go to BOM sheet to enter component details'],
      ['3. Save file and upload to system'],
    ];

    const orderInfoWS = XLSX.utils.aoa_to_sheet(orderInfoTemplate);
    XLSX.utils.book_append_sheet(workbook, orderInfoWS, 'Order Info');

    // BOM template
    const bomTemplate = [
      ['Component', 'Part Number', 'Quantity', 'Material', 'Size', 'Unit Cost', 'Supplier', 'Lead Time (Days)', 'Notes'],
      ['Steel Frame', 'CF-FRAME-001', 1, 'Galvanized Steel', 'Custom', 45.50, 'MetalCorp', 7, 'Main frame structure'],
      ['Fire Rated Blade', 'FD-BLADE-001', 4, 'Steel', '4" x 24"', 12.30, 'BladeWorks', 5, 'Fire rated blades'],
      ['Fusible Link', 'FD-LINK-001', 1, 'Alloy', 'Standard', 8.75, 'SafetyLink Inc', 3, '165°F rating'],
      ['Mounting Hardware', 'MH-001', 8, 'Steel', 'M8 x 25mm', 2.50, 'FastenerPro', 2, 'Bolts and washers'],
      ['', '', '', '', '', '', '', '', ''],
      ['ADD MORE ROWS AS NEEDED', '', '', '', '', '', '', '', ''],
    ];

    const bomWS = XLSX.utils.aoa_to_sheet(bomTemplate);
    bomWS['!cols'] = [
      { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 },
      { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 25 }
    ];

    XLSX.utils.book_append_sheet(workbook, bomWS, 'BOM');

    // Instructions sheet
    const instructionsData = [
      ['Excel BOM Template Instructions', ''],
      ['', ''],
      ['How to use this template:', ''],
      ['', ''],
      ['1. Order Info Sheet:', ''],
      ['   - Fill in customer information', ''],
      ['   - Enter damper dimensions for custom orders', ''],
      ['   - Add any special requirements', ''],
      ['', ''],
      ['2. BOM Sheet:', ''],
      ['   - List all components needed', ''],
      ['   - Include part numbers and quantities', ''],
      ['   - Add material specifications', ''],
      ['   - Enter costs if known', ''],
      ['   - Specify supplier information', ''],
      ['', ''],
      ['3. Uploading:', ''],
      ['   - Save the completed file', ''],
      ['   - Upload through the BOM Management interface', ''],
      ['   - System will validate and import the data', ''],
      ['', ''],
      ['4. Data Validation:', ''],
      ['   - Component names should be descriptive', ''],
      ['   - Part numbers should be unique', ''],
      ['   - Quantities must be positive numbers', ''],
      ['   - Unit costs should be in USD', ''],
      ['', ''],
      ['For support, contact your system administrator.', ''],
    ];

    const instructionsWS = XLSX.utils.aoa_to_sheet(instructionsData);
    XLSX.utils.book_append_sheet(workbook, instructionsWS, 'Instructions');

    // Save template
    const templateFilename = `BOM_Template_${templateType}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, templateFilename);
  }

  /**
   * Parse order information from Excel data
   */
  private static parseOrderInfo(data: any[][], errors: string[]): Partial<CustomerOrderData> {
    const orderData: Partial<CustomerOrderData> = {};
    
    try {
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (row.length >= 2) {
          const key = String(row[0]).toLowerCase().trim();
          const value = String(row[1]).trim();
          
          if (value && value !== '') {
            switch (key) {
              case 'order id':
                orderData.orderId = value;
                break;
              case 'customer name':
                orderData.customerName = value;
                break;
              case 'company':
                orderData.company = value;
                break;
              case 'damper type':
                orderData.damperType = value;
                break;
              case 'length (inches)':
                if (!orderData.dimensions) orderData.dimensions = { length: '', width: '', height: '' };
                orderData.dimensions.length = value;
                break;
              case 'width (inches)':
                if (!orderData.dimensions) orderData.dimensions = { length: '', width: '', height: '' };
                orderData.dimensions.width = value;
                break;
              case 'height (inches)':
                if (!orderData.dimensions) orderData.dimensions = { length: '', width: '', height: '' };
                orderData.dimensions.height = value;
                break;
              case 'special requirements':
                orderData.specialRequirements = value;
                break;
            }
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      errors.push(`Error parsing order information: ${errorMessage}`);
    }

    return orderData;
  }

  /**
   * Parse BOM data from Excel JSON
   */
  private static parseBOMData(data: any[], errors: string[]): BOMExcelRow[] {
    const bomComponents: BOMExcelRow[] = [];
    
    data.forEach((row, index) => {
      try {
        // Skip empty rows
        if (!row.Component && !row.component) return;
        
        const component: BOMExcelRow = {
          component: row.Component || row.component || '',
          partNumber: row['Part Number'] || row.partNumber || '',
          quantity: Number(row.Quantity || row.quantity || 0),
          material: row.Material || row.material || '',
          size: row.Size || row.size,
          unitCost: row['Unit Cost'] ? Number(row['Unit Cost']) : undefined,
          totalCost: row['Total Cost'] ? Number(row['Total Cost']) : undefined,
          supplier: row.Supplier || row.supplier,
          leadTimeDays: row['Lead Time (Days)'] ? Number(row['Lead Time (Days)']) : undefined,
          notes: row.Notes || row.notes
        };

        // Validate required fields
        if (!component.component) {
          errors.push(`Row ${index + 2}: Component name is required`);
          return;
        }
        
        if (!component.partNumber) {
          errors.push(`Row ${index + 2}: Part number is required`);
          return;
        }
        
        if (!component.quantity || component.quantity <= 0) {
          errors.push(`Row ${index + 2}: Valid quantity is required`);
          return;
        }

        // Calculate total cost if not provided
        if (component.unitCost && !component.totalCost) {
          component.totalCost = component.unitCost * component.quantity;
        }

        bomComponents.push(component);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        errors.push(`Row ${index + 2}: Error parsing data - ${errorMessage}`);
      }
    });

    return bomComponents;
  }

  /**
   * Validate BOM data consistency
   */
  static validateBOMData(bomComponents: BOMExcelRow[]): string[] {
    const errors: string[] = [];
    const partNumbers = new Set<string>();

    bomComponents.forEach((component, index) => {
      // Check for duplicate part numbers
      if (partNumbers.has(component.partNumber)) {
        errors.push(`Duplicate part number: ${component.partNumber} (row ${index + 1})`);
      } else {
        partNumbers.add(component.partNumber);
      }

      // Validate cost calculations
      if (component.unitCost && component.totalCost) {
        const calculatedTotal = component.unitCost * component.quantity;
        if (Math.abs(calculatedTotal - component.totalCost) > 0.01) {
          errors.push(`Cost calculation mismatch for ${component.component}: expected ${calculatedTotal.toFixed(2)}, got ${component.totalCost.toFixed(2)}`);
        }
      }

      // Check for reasonable values
      if (component.quantity > 1000) {
        errors.push(`Unusually high quantity for ${component.component}: ${component.quantity}`);
      }

      if (component.unitCost && component.unitCost > 10000) {
        errors.push(`Unusually high unit cost for ${component.component}: $${component.unitCost}`);
      }
    });

    return errors;
  }
}

// Export utility functions for direct use
export const {
  readBOMFromExcel,
  exportBOMToExcel,
  createBOMTemplate,
  validateBOMData
} = ExcelBOMProcessor;