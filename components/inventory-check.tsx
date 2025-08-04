"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Package, CheckCircle, AlertTriangle, ShoppingCart } from "lucide-react"

interface InventoryCheckProps {
  currentOrder: any
  orders: any[]
  onInventoryChecked: (needsPurchase: boolean) => void
  onSelectOrder: (order: any) => void
}

export default function InventoryCheck({
  currentOrder,
  orders,
  onInventoryChecked,
  onSelectOrder,
}: InventoryCheckProps) {
  const [inventoryStatus, setInventoryStatus] = useState<any[]>([])
  const [overallStatus, setOverallStatus] = useState<"checking" | "available" | "insufficient">("checking")
  const [isChecking, setIsChecking] = useState(false)

  // Mock inventory database
  const currentInventory = {
    "FD-FRAME-001": { available: 15, reserved: 3, location: "A1-B2" },
    "FD-BLADE-001": { available: 45, reserved: 8, location: "A2-C1" },
    "FD-LINK-001": { available: 8, reserved: 2, location: "B1-A3" },
    "FD-SPRING-001": { available: 12, reserved: 1, location: "B2-D1" },
    "FD-MOUNT-001": { available: 150, reserved: 24, location: "C1-A2" },
    "CD-FRAME-001": { available: 20, reserved: 5, location: "A3-B1" },
    "CD-BLADE-001": { available: 30, reserved: 6, location: "A2-C2" },
    "CD-SMOKE-001": { available: 25, reserved: 4, location: "A2-C3" },
    "CD-LINK-001": { available: 10, reserved: 2, location: "B1-A4" },
    "CD-ACT-001": { available: 8, reserved: 1, location: "B3-D1" },
    "CD-CTRL-001": { available: 6, reserved: 0, location: "C2-A1" },
  }

  const getBOMComponents = (order: any) => {
    if (order.damperType === "Fire Damper - Standard") {
      return [
        { component: "Steel Frame", partNumber: "FD-FRAME-001", quantity: 1, material: "Galvanized Steel" },
        { component: "Fire Rated Blade", partNumber: "FD-BLADE-001", quantity: 4, material: "Steel" },
        { component: "Fusible Link", partNumber: "FD-LINK-001", quantity: 1, material: "Alloy" },
        { component: "Spring Assembly", partNumber: "FD-SPRING-001", quantity: 1, material: "Steel" },
        { component: "Mounting Hardware", partNumber: "FD-MOUNT-001", quantity: 8, material: "Steel" },
      ]
    } else if (order.damperType === "Combination Damper - Standard") {
      return [
        { component: "Steel Frame", partNumber: "CD-FRAME-001", quantity: 1, material: "Galvanized Steel" },
        { component: "Fire Rated Blade", partNumber: "CD-BLADE-001", quantity: 3, material: "Steel" },
        { component: "Smoke Blade", partNumber: "CD-SMOKE-001", quantity: 3, material: "Aluminum" },
        { component: "Fusible Link", partNumber: "CD-LINK-001", quantity: 1, material: "Alloy" },
        { component: "Actuator", partNumber: "CD-ACT-001", quantity: 1, material: "Steel" },
        { component: "Control Module", partNumber: "CD-CTRL-001", quantity: 1, material: "Electronic" },
      ]
    }
    return []
  }

  const checkInventory = () => {
    setIsChecking(true)

    setTimeout(() => {
      const bomComponents = getBOMComponents(currentOrder)
      const status = bomComponents.map((component) => {
        const inventory = currentInventory[component.partNumber]
        const availableStock = inventory ? inventory.available - inventory.reserved : 0
        const isAvailable = availableStock >= component.quantity
        const shortfall = isAvailable ? 0 : component.quantity - availableStock

        return {
          ...component,
          availableStock,
          required: component.quantity,
          isAvailable,
          shortfall,
          location: inventory?.location || "Unknown",
        }
      })

      setInventoryStatus(status)

      const allAvailable = status.every((s) => s.isAvailable)
      setOverallStatus(allAvailable ? "available" : "insufficient")
      setIsChecking(false)
    }, 2000)
  }

  const handleContinue = () => {
    const needsPurchase = overallStatus === "insufficient"
    onInventoryChecked(needsPurchase)
  }

  const reserveInventory = () => {
    alert("Inventory reserved for this order")
  }

  // Get orders that need inventory check
  const inventoryOrders = orders.filter((o) => o.currentStep === 4 && o.ulCompliant)

  return (
    <div className="space-y-6">
      {/* Orders Awaiting Inventory Verification */}
      <Card>
        <CardHeader>
          <CardTitle>Orders Awaiting Inventory Verification</CardTitle>
          <CardDescription>
            Orders ready for component availability verification - Click to select and work on
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {inventoryOrders.map((order) => (
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
                  <p className="text-sm text-green-600">✓ UL Compliant - Ready for inventory check</p>
                  {order.specialRequirements && (
                    <p className="text-xs text-gray-400 mt-1">Note: {order.specialRequirements.substring(0, 50)}...</p>
                  )}
                </div>
                <div className="text-right">
                  <Badge variant={order.inventoryReserved ? "default" : "outline"}>
                    {order.inventoryReserved ? "Inventory Reserved" : "Pending Check"}
                  </Badge>
                  <p className="text-xs text-gray-400 mt-1">BOM: ✓ Generated | UL: ✓ Compliant</p>
                  {currentOrder?.id === order.id && <p className="text-xs text-blue-600 mt-1">← Currently Selected</p>}
                </div>
              </div>
            ))}
            {inventoryOrders.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No orders currently awaiting inventory check</p>
                <p className="text-sm text-gray-400 mt-1">Orders will appear here after UL compliance validation</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Order Inventory Check */}
      {currentOrder && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Step 4: Component Availability Check
              </CardTitle>
              <CardDescription>
                Check inventory levels against BOM requirements for Order #{currentOrder.id}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Order: {currentOrder.customerName}</p>
                    <p className="text-sm text-gray-600">Damper Type: {currentOrder.damperType}</p>
                  </div>
                  <Badge
                    variant={
                      overallStatus === "available"
                        ? "default"
                        : overallStatus === "insufficient"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {overallStatus === "available"
                      ? "All Available"
                      : overallStatus === "insufficient"
                        ? "Purchase Required"
                        : "Checking..."}
                  </Badge>
                </div>

                {inventoryStatus.length === 0 && (
                  <Button onClick={checkInventory} disabled={isChecking} className="w-full">
                    {isChecking ? "Checking Inventory Levels..." : "Check Component Availability"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Current Inventory Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Current Inventory Levels</CardTitle>
              <CardDescription>Real-time stock levels across all warehouse locations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">847</div>
                  <div className="text-sm text-gray-600">Total Components</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">38</div>
                  <div className="text-sm text-gray-600">Reserved Items</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">5</div>
                  <div className="text-sm text-gray-600">Low Stock Alerts</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Check Results */}
          {inventoryStatus.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Inventory Check Results</CardTitle>
                <CardDescription>Component availability vs. BOM requirements</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Component</TableHead>
                      <TableHead>Part Number</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Shortfall</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryStatus.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.component}</TableCell>
                        <TableCell>{item.partNumber}</TableCell>
                        <TableCell>{item.required}</TableCell>
                        <TableCell>{item.availableStock}</TableCell>
                        <TableCell>{item.location}</TableCell>
                        <TableCell>
                          {item.isAvailable ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              Available
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-red-600">
                              <AlertTriangle className="h-4 w-4" />
                              Insufficient
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.shortfall > 0 ? (
                            <Badge variant="destructive">{item.shortfall}</Badge>
                          ) : (
                            <span className="text-green-600">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Status Summary */}
          {overallStatus !== "checking" && (
            <Card>
              <CardContent className="pt-6">
                {overallStatus === "available" ? (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>All Components Available</strong> - Sufficient inventory to fulfill this order. Ready to
                      proceed to production.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <strong>Insufficient Inventory</strong> - Some components need to be purchased. Purchase orders
                      will be generated.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-between items-center mt-4">
                  {overallStatus === "available" && (
                    <Button variant="outline" onClick={reserveInventory}>
                      Reserve Inventory
                    </Button>
                  )}
                  <div className="flex gap-3 ml-auto">
                    {overallStatus === "insufficient" && (
                      <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                        <ShoppingCart className="h-4 w-4" />
                        Generate Purchase Orders
                      </Button>
                    )}
                    <Button onClick={handleContinue}>
                      {overallStatus === "available" ? "Continue to Quality Check" : "Continue to Purchase Orders"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Low Stock Warnings */}
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-800">Low Stock Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p className="text-orange-700">• FD-LINK-001: Only 6 units remaining (reorder threshold: 10)</p>
                <p className="text-orange-700">• CD-CTRL-001: Only 6 units remaining (reorder threshold: 15)</p>
                <p className="text-orange-700">• CD-ACT-001: Only 7 units remaining (reorder threshold: 20)</p>
              </div>
              <Button variant="outline" size="sm" className="mt-3 bg-transparent">
                Create Reorder Alerts
              </Button>
            </CardContent>
          </Card>
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
