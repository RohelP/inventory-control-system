# Excel BOM Integration - User Guide

## Overview

The Inventory Control System now supports Excel integration for Bill of Materials (BOM) management, allowing you to:

- **Import BOM data from Excel files** for custom customer orders
- **Export generated BOMs to Excel** for customer review and documentation
- **Use standardized Excel templates** for consistent data entry
- **Validate and process** complex BOM calculations

## Features

### 📊 Excel Import
- Upload Excel files with order information and BOM data
- Automatic data validation and error reporting
- Support for custom dimensions and special requirements
- Preview data before importing to the system

### 📈 Excel Export
- Export current BOMs to formatted Excel files
- Include order details, cost calculations, and summaries
- Professional formatting for customer presentations
- Multiple worksheets for comprehensive documentation

### 📋 Templates
- Download pre-configured Excel templates
- Standardized formats for different damper types
- Built-in validation and calculation formulas
- Instructions and examples included

## How to Use

### 1. Download a Template

1. Navigate to **BOM Management** → **Excel Integration** tab
2. Choose from available templates:
   - **Custom BOM Template**: For made-to-order dampers
   - **Fire Damper Template**: Standard fire damper BOM
   - **Smoke Damper Template**: Standard smoke damper BOM
3. Click the template button to download

### 2. Fill Out the Template

#### Order Info Sheet:
```
Order Information          | Please fill in:
Order ID                  | AUTO-GENERATED
Customer Name             | John Smith
Company                   | ABC Manufacturing
Damper Type               | Fire Damper - Custom
Length (inches)           | 48
Width (inches)            | 30
Height (inches)           | 12
Special Requirements      | UL Listed, Galvanized finish
```

#### BOM Sheet:
| Component | Part Number | Quantity | Material | Size | Unit Cost | Supplier | Lead Time | Notes |
|-----------|-------------|----------|----------|------|-----------|----------|-----------|-------|
| Steel Frame | CF-FRAME-001 | 1 | Galvanized Steel | Custom | 45.50 | MetalCorp | 7 | Main structure |
| Fire Blade | FD-BLADE-001 | 4 | Steel | 4" x 24" | 12.30 | BladeWorks | 5 | Fire rated |

### 3. Import the Excel File

1. Save your completed Excel file
2. Go to **BOM Management** → **Excel Integration** tab
3. Click **Select Excel File** and choose your file
4. Review the preview data for accuracy
5. Click **Import BOM Data** to add to the system

### 4. Export Existing BOMs

1. Select an order with an existing BOM
2. Go to **Excel Integration** tab
3. Click **Export to Excel**
4. The file will download with:
   - Order information
   - Complete BOM data
   - Cost summaries
   - Professional formatting

## Excel File Structure

### Required Sheets

#### 1. Order Info Sheet
- Contains customer and order details
- Dimensions for custom orders
- Special requirements and notes

#### 2. BOM Sheet
- Component listings with specifications
- Quantities and costs
- Supplier information
- Lead times and notes

#### 3. Instructions Sheet (in templates)
- Usage guidelines
- Data validation rules
- Best practices

### Generated Export Sheets

#### 1. Order Info
- Customer details
- Order specifications
- Generation timestamp

#### 2. BOM
- Complete component list
- Calculated costs
- Material specifications

#### 3. Summary
- Total component count
- Cost breakdown
- Summary statistics

## Data Validation

The system automatically validates:

### ✅ Required Fields
- Component name
- Part number
- Quantity (must be > 0)
- Material specification

### ✅ Data Consistency
- Cost calculations (unit × quantity = total)
- Duplicate part number detection
- Reasonable value ranges

### ✅ Format Compliance
- Numeric fields are properly formatted
- Text fields meet length requirements
- Date/time stamps are valid

## Error Handling

### Common Import Errors

1. **Missing Required Fields**
   ```
   Error: Row 3: Component name is required
   Error: Row 5: Part number is required
   ```

2. **Invalid Data Types**
   ```
   Error: Row 4: Valid quantity is required
   Error: Row 7: Unit cost must be a number
   ```

3. **Duplicate Part Numbers**
   ```
   Error: Duplicate part number: FD-FRAME-001 (row 3)
   ```

4. **Cost Calculation Mismatches**
   ```
   Error: Cost calculation mismatch for Steel Frame: expected 45.50, got 40.00
   ```

### Error Resolution

1. **Download Error Report**: Errors are displayed with specific row numbers
2. **Fix Excel File**: Correct the identified issues
3. **Re-upload**: Import the corrected file
4. **Validate**: System re-checks all data

## Best Practices

### 📝 Excel File Preparation
- Use the provided templates as starting points
- Fill out all required fields completely
- Double-check calculations before import
- Save files in .xlsx format

### 🔍 Data Entry Guidelines
- Use consistent naming conventions
- Include detailed component descriptions
- Specify exact material grades
- Add supplier contact information

### 💰 Cost Management
- Enter unit costs in USD
- Verify total cost calculations
- Include freight and handling costs
- Update costs regularly for accuracy

### 📋 Documentation
- Add detailed notes for special components
- Include installation requirements
- Specify quality standards
- Reference drawing numbers

## Advanced Features

### Template Customization
- Modify templates for specific workflows
- Add company-specific part numbers
- Include additional validation rules
- Create department-specific versions

### Batch Processing
- Import multiple orders from single Excel file
- Process large BOMs efficiently
- Bulk update existing orders
- Generate batch reports

### Integration Benefits
- Seamless workflow with existing Excel processes
- Familiar interface for non-technical users
- Offline BOM preparation capability
- Easy collaboration with customers and suppliers

## Troubleshooting

### File Upload Issues
1. Ensure file is in .xlsx or .xls format
2. Check file size (should be < 10MB)
3. Verify sheets are named correctly
4. Ensure no protected/locked cells

### Data Import Problems
1. Review error messages carefully
2. Check for hidden characters in text fields
3. Verify numeric formats (no commas, currency symbols)
4. Ensure date formats are consistent

### Export Problems
1. Check browser download settings
2. Ensure sufficient disk space
3. Close any open Excel files with same name
4. Try different browser if issues persist

## Support

For additional help with Excel integration:

1. **Check Error Messages**: Most issues are clearly explained
2. **Use Templates**: Start with provided templates
3. **Validate Data**: Use Excel's data validation features
4. **Contact Support**: For complex import/export issues

## Technical Notes

### Supported Excel Versions
- Excel 2016 and later
- Office 365
- Compatible spreadsheet applications (LibreOffice, Google Sheets)

### File Size Limits
- Maximum file size: 10MB
- Maximum rows: 1000 BOM items per order
- Maximum columns: All standard BOM fields supported

### Browser Compatibility
- Chrome (recommended)
- Firefox
- Safari
- Edge

