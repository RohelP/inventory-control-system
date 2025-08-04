"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Package, Calculator, Database } from "lucide-react"

interface BOMManagementProps {
  currentOrder: any
  orders: any[]
  onBOMCreated: () => void
  onSelectOrder: (order: any) => void
}

export default function BOMManagement({ currentOrder, orders, onBOMCreated, onSelectOrder }: BOMManagementProps) {
  const [bomType, setBomType] = useState<"standard" | "custom" | null>(null)
  const [dimensions, setDimensions] = useState({ length: "", width: "", height: "" })
  const [bomComponents, setBomComponents] = useState<any[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  // Standard BOM database
  const standardBOMs = {
    "Fire Damper - Standard": [
      { component: "Steel Frame", partNumber: "FD-FRAME-001", quantity: 1, material: "Galvanized Steel" },
      { component: "Fire Rated Blade", partNumber: "FD-BLADE-001", quantity: 4, material: "Steel" },
      { component: "Fusible Link", partNumber: "FD-LINK-001", quantity: 1, material: "Alloy" },
      { component: "Spring Assembly", partNumber: "FD-SPRING-001", quantity: 1, material: "Steel" },
      { component: "Mounting Hardware", partNumber: "FD-MOUNT-001", quantity: 8, material: "Steel" },
    ],
    "Smoke Damper - Standard": [
      { component: "Aluminum Frame", partNumber: "SD-FRAME-001", quantity: 1, material: "Aluminum" },
      { component: "Smoke Blade", partNumber: "SD-BLADE-001", quantity: 6, material: "Aluminum" },
      { component: "Actuator", partNumber: "SD-ACT-001", quantity: 1, material: "Steel" },
      { component: "Control Module", partNumber: "SD-CTRL-001", quantity: 1, material: "Electronic" },
      { component: "Gasket Seal", partNumber: "SD-SEAL-001", quantity: 1, material: "Rubber" },
    ],
    "Combination Damper - Standard": [
      { component: "Steel Frame", partNumber: "CD-FRAME-001", quantity: 1, material: "Galvanized Steel" },
      { component: "Fire Rated Blade", partNumber: "CD-BLADE-001", quantity: 3, material: "Steel" },
      { component: "Smoke Blade", partNumber: "CD-SMOKE-001", quantity: 3, material: "Aluminum" },
      { component: "Fusible Link", partNumber: "CD-LINK-001", quantity: 1, material: "Alloy" },
      { component: "Actuator", partNumber: "CD-ACT-001", quantity: 1, material: "Steel" },
      { component: "Control Module", partNumber: "CD-CTRL-001", quantity: 1, material: "Electronic" },
    ],
  }

  useEffect(() => {
    if (currentOrder?.damperType) {
      const isStandard = currentOrder.damperType.includes("Standard")
      setBomType(isStandard ? "standard" : "custom")

      if (isStandard && standardBOMs[currentOrder.damperType]) {
        setBomComponents(standardBOMs[currentOrder.damperType])
      }

      // Pre-fill dimensions if available
      if (currentOrder.dimensions) {
        setDimensions(currentOrder.dimensions)
      }
    }
  }, [currentOrder])

  const generateCustomBOM = () => {
    setIsGenerating(true)

    // Simulate custom BOM calculation
    setTimeout(() => {
      const length = Number.parseFloat(dimensions.length)
      const width = Number.parseFloat(dimensions.width)
      const height = Number.parseFloat(dimensions.height)

      // Calculate frame size and blade count
      const framePerimeter = 2 * (length + width)
      const bladeCount = Math.ceil(height / 6) // 6" blade spacing
      const surfaceArea = length * width

      const customComponents = [
        {
          component: "Custom Steel Frame",
          partNumber: `CF-FRAME-${length}x${width}`,
          quantity: 1,
          material: "Galvanized Steel",
          size: `${length}" x ${width}" x 2"`,
        },
        {
          component: "Fire Rated Blade",
          partNumber: "FD-BLADE-CUSTOM",
          quantity: bladeCount,
          material: "Steel",
          size: `${length - 2}" x 4"`,
        },
        {
          component: "Frame Reinforcement",
          partNumber: "CF-REINF-001",
          quantity: Math.ceil(framePerimeter / 24),
          material: "Steel",
          size: '24" sections',
        },
        {
          component: "Mounting Hardware",
          partNumber: "CF-MOUNT-001",
          quantity: Math.ceil(framePerimeter / 12),
          material: "Steel",
          size: "Standard",
        },
      ]

      setBomComponents(customComponents)
      setIsGenerating(false)
    }, 2000)
  }

  const handleContinue = () => {
    onBOMCreated()
  }

  // Get orders that need BOM creation
  const bomOrders = orders.filter((o) => o.currentStep === 2 || (o.currentStep <= 2 && !o.bomGenerated))

  return (
    <div className="space-y-6">
      {/* Orders Requiring BOM Creation */}
      <Card>
        <CardHeader>
          <CardTitle>Orders Requiring BOM Creation</CardTitle>
          <CardDescription>Orders waiting for Bill of Materials creation - Click to select and work on</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {bomOrders.map((order) => (
              <div
                key={order.id}
                className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                  currentOrder?.id === order.id ? "border-blue-500 bg-blue-50" : ""
                }`}
                onClick={() => onSelectOrder(order)}
              >
                <div>
                  <p className="font-medium">
                    {order.id} - {order.customerName}
                  </p>
                  <p className="text-sm text-gray-600">{order.company}</p>
                  <p className="text-sm text-gray-500">{order.damperType}</p>
                  {order.dimensions && (
                    <p className="text-sm text-blue-600">
                      Custom Dimensions: {order.dimensions.length}" x {order.dimensions.width}" x{" "}
                      {order.dimensions.height}"
                    </p>
                  )}
                  {order.specialRequirements && (
                    <p className="text-xs text-gray-400 mt-1">
                      Special: {order.specialRequirements.substring(0, 50)}...
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <Badge variant={order.bomGenerated ? "default" : "outline"}>
                    {order.bomGenerated ? "BOM Generated" : "Pending BOM"}
                  </Badge>
                  <p className="text-xs text-gray-400 mt-1">
                    Created: {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                  {currentOrder?.id === order.id && <p className="text-xs text-blue-600 mt-1">← Currently Selected</p>}
                </div>
              </div>
            ))}
            {bomOrders.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No orders currently require BOM creation</p>
                <p className="text-sm text-gray-400 mt-1">
                  Orders will appear here when they reach the BOM creation stage
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Order BOM Management */}
      {currentOrder && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Step 2: BOM Management
              </CardTitle>
              <CardDescription>
                Determine BOM type and generate Bill of Materials for Order #{currentOrder.id}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium">Customer: {currentOrder.customerName}</p>
                    <p className="text-sm text-gray-600">Damper Type: {currentOrder.damperType}</p>
                  </div>
                  <Badge variant={bomType === "standard" ? "default" : "secondary"}>
                    {bomType === "standard" ? "Standard BOM" : "Custom BOM"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* BOM Type Determination */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                BOM Type: {bomType === "standard" ? "Standard" : "Custom"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bomType === "standard" ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 font-medium">Standard BOM Detected</p>
                    <p className="text-green-600 text-sm">
                      This damper type matches a predefined model. Retrieving standard BOM from database.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800 font-medium">Custom BOM Required</p>
                    <p className="text-blue-600 text-sm">
                      This is a made-to-order damper. Please enter dimensions for custom BOM calculation.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="length">Length (inches)</Label>
                      <Input
                        id="length"
                        type="number"
                        value={dimensions.length}
                        onChange={(e) => setDimensions((prev) => ({ ...prev, length: e.target.value }))}
                        placeholder="48"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="width">Width (inches)</Label>
                      <Input
                        id="width"
                        type="number"
                        value={dimensions.width}
                        onChange={(e) => setDimensions((prev) => ({ ...prev, width: e.target.value }))}
                        placeholder="30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="height">Height (inches)</Label>
                      <Input
                        id="height"
                        type="number"
                        value={dimensions.height}
                        onChange={(e) => setDimensions((prev) => ({ ...prev, height: e.target.value }))}
                        placeholder="12"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={generateCustomBOM}
                    disabled={!dimensions.length || !dimensions.width || !dimensions.height || isGenerating}
                    className="w-full"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    {isGenerating ? "Calculating Custom BOM..." : "Generate Custom BOM"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* BOM Components Table */}
          {bomComponents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Bill of Materials</CardTitle>
                <CardDescription>Components required for Order #{currentOrder.id}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Component</TableHead>
                      <TableHead>Part Number</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Material</TableHead>
                      {bomType === "custom" && <TableHead>Size</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bomComponents.map((component, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{component.component}</TableCell>
                        <TableCell>{component.partNumber}</TableCell>
                        <TableCell>{component.quantity}</TableCell>
                        <TableCell>{component.material}</TableCell>
                        {bomType === "custom" && <TableCell>{component.size || "Standard"}</TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex justify-between items-center mt-6 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Total Components: {bomComponents.reduce((sum, comp) => sum + comp.quantity, 0)}
                  </div>
                  <Button onClick={handleContinue}>Confirm BOM & Continue to UL Compliance</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!currentOrder && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No order selected. Please select an order from the list above to continue.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
