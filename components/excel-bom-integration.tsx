"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw,
  FileDown
} from "lucide-react"
import { 
  ExcelBOMProcessor, 
  BOMExcelRow, 
  CustomerOrderData 
} from "@/lib/excel-utils"

interface ExcelBOMIntegrationProps {
  currentOrder?: any
  onBOMImported?: (bomData: BOMExcelRow[], orderData: Partial<CustomerOrderData>) => void
  onBOMExported?: () => void
  existingBOM?: BOMExcelRow[]
}

export default function ExcelBOMIntegration({ 
  currentOrder, 
  onBOMImported, 
  onBOMExported,
  existingBOM = []
}: ExcelBOMIntegrationProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [previewData, setPreviewData] = useState<{
    orderData: Partial<CustomerOrderData>
    bomComponents: BOMExcelRow[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadErrors([])
    setUploadSuccess(false)
    setPreviewData(null)

    try {
      const result = await ExcelBOMProcessor.readBOMFromExcel(file)
      
      if (result.errors.length > 0) {
        setUploadErrors(result.errors)
      } else {
        setUploadSuccess(true)
        setPreviewData({
          orderData: result.orderData,
          bomComponents: result.bomComponents
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setUploadErrors([`Failed to process file: ${errorMessage}`])
    } finally {
      setIsUploading(false)
    }
  }

  const handleConfirmImport = () => {
    if (previewData && onBOMImported) {
      onBOMImported(previewData.bomComponents, previewData.orderData)
      setPreviewData(null)
      setUploadSuccess(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleExportBOM = () => {
    if (!currentOrder) return

    setIsExporting(true)

    try {
      const orderData: CustomerOrderData = {
        orderId: currentOrder.id,
        customerName: currentOrder.customerName,
        company: currentOrder.company,
        damperType: currentOrder.damperType,
        dimensions: currentOrder.dimensions,
        specialRequirements: currentOrder.specialRequirements
      }

      ExcelBOMProcessor.exportBOMToExcel(orderData, existingBOM)
      
      if (onBOMExported) {
        onBOMExported()
      }
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownloadTemplate = (templateType: string = 'custom') => {
    try {
      ExcelBOMProcessor.createBOMTemplate(templateType)
    } catch (error) {
      console.error('Template download failed:', error)
    }
  }

  const resetUpload = () => {
    setUploadErrors([])
    setUploadSuccess(false)
    setPreviewData(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Excel Integration Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Excel BOM Integration
          </CardTitle>
          <CardDescription>
            Import BOM data from Excel files or export generated BOMs for customer review
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Template Downloads */}
      <Card>
        <CardHeader>
          <CardTitle>Excel Templates</CardTitle>
          <CardDescription>
            Download standardized templates for different damper types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => handleDownloadTemplate('custom')}
              className="h-20 flex flex-col items-center gap-2"
            >
              <FileDown className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Custom BOM Template</div>
                <div className="text-xs text-muted-foreground">For made-to-order dampers</div>
              </div>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => handleDownloadTemplate('fire')}
              className="h-20 flex flex-col items-center gap-2"
            >
              <FileDown className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Fire Damper Template</div>
                <div className="text-xs text-muted-foreground">Standard fire damper BOM</div>
              </div>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => handleDownloadTemplate('smoke')}
              className="h-20 flex flex-col items-center gap-2"
            >
              <FileDown className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Smoke Damper Template</div>
                <div className="text-xs text-muted-foreground">Standard smoke damper BOM</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Excel BOM */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import BOM from Excel
          </CardTitle>
          <CardDescription>
            Upload an Excel file containing BOM data for custom customer orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="excel-upload">Select Excel File</Label>
            <Input
              id="excel-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={isUploading}
              ref={fileInputRef}
            />
          </div>

          {isUploading && (
            <div className="flex items-center gap-2 text-blue-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Processing Excel file...
            </div>
          )}

          {uploadErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-medium">Upload Errors:</div>
                  {uploadErrors.map((error, index) => (
                    <div key={index} className="text-sm">• {error}</div>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetUpload}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {uploadSuccess && previewData && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">File processed successfully!</div>
                  <div className="text-sm">
                    Found {previewData.bomComponents.length} BOM components
                    {previewData.orderData.customerName && 
                      ` for customer: ${previewData.orderData.customerName}`
                    }
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Preview Imported Data */}
      {previewData && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Import Data</CardTitle>
            <CardDescription>
              Review the data before importing to the system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Order Information Preview */}
            {(previewData.orderData.customerName || previewData.orderData.company) && (
              <div className="space-y-2">
                <h4 className="font-medium">Order Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {previewData.orderData.customerName && (
                    <div>
                      <span className="text-muted-foreground">Customer:</span>{" "}
                      {previewData.orderData.customerName}
                    </div>
                  )}
                  {previewData.orderData.company && (
                    <div>
                      <span className="text-muted-foreground">Company:</span>{" "}
                      {previewData.orderData.company}
                    </div>
                  )}
                  {previewData.orderData.damperType && (
                    <div>
                      <span className="text-muted-foreground">Damper Type:</span>{" "}
                      {previewData.orderData.damperType}
                    </div>
                  )}
                  {previewData.orderData.dimensions && (
                    <div>
                      <span className="text-muted-foreground">Dimensions:</span>{" "}
                      {previewData.orderData.dimensions.length}" x{" "}
                      {previewData.orderData.dimensions.width}" x{" "}
                      {previewData.orderData.dimensions.height}"
                    </div>
                  )}
                </div>
                <Separator />
              </div>
            )}

            {/* BOM Preview */}
            <div className="space-y-2">
              <h4 className="font-medium">
                BOM Components ({previewData.bomComponents.length} items)
              </h4>
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Component</TableHead>
                      <TableHead>Part Number</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.bomComponents.map((component, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {component.component}
                        </TableCell>
                        <TableCell>{component.partNumber}</TableCell>
                        <TableCell>{component.quantity}</TableCell>
                        <TableCell>{component.material}</TableCell>
                        <TableCell>
                          {component.unitCost ? `$${component.unitCost.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>
                          {component.totalCost ? 
                            `$${component.totalCost.toFixed(2)}` : 
                            component.unitCost ? 
                              `$${(component.unitCost * component.quantity).toFixed(2)}` : 
                              '-'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={resetUpload}>
                Cancel Import
              </Button>
              <Button onClick={handleConfirmImport}>
                Import BOM Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Current BOM */}
      {currentOrder && existingBOM.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Current BOM
            </CardTitle>
            <CardDescription>
              Export the current BOM to Excel for customer review or documentation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Order:</span> {currentOrder.id}
                </div>
                <div>
                  <span className="text-muted-foreground">Customer:</span> {currentOrder.customerName}
                </div>
                <div>
                  <span className="text-muted-foreground">Components:</span> {existingBOM.length} items
                </div>
                <div>
                  <span className="text-muted-foreground">Total Qty:</span>{" "}
                  {existingBOM.reduce((sum, item) => sum + item.quantity, 0)} parts
                </div>
              </div>

              <Button 
                onClick={handleExportBOM}
                disabled={isExporting}
                className="w-full"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export to Excel
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Excel Integration Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Excel Integration Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Badge variant="secondary">Template</Badge>
              <div>
                Download templates for standardized BOM entry. Templates include validation and formatting.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="secondary">Import</Badge>
              <div>
                Excel files should have 'Order Info' and 'BOM' sheets. The system will validate data during import.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="secondary">Export</Badge>
              <div>
                Exported files include order details, BOM data, and cost summaries for easy customer sharing.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="secondary">Validation</Badge>
              <div>
                The system checks for duplicate parts, validates calculations, and ensures data consistency.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}