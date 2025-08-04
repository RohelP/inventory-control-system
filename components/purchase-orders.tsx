"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ShoppingCart, Send, FileText, CheckCircle } from "lucide-react"

interface PurchaseOrdersProps {
  currentOrder: any
  orders: any[]
  onPurchaseCompleted: () => void
  onSelectOrder: (order: any) => void
}

export default function PurchaseOrders({
  currentOrder,
  orders,
  onPurchaseCompleted,
  onSelectOrder,
}: PurchaseOrdersProps) {
  const [purchaseRequisitions, setPurchaseRequisitions] = useState<any[]>([])
  const [requiredDate, setRequiredDate] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPOs, setGeneratedPOs] = useState<any[]>([])

  // Mock shortage data based on order
  const getShortageItems = (order: any) => {
    if (order?.id === "ORD-003") {
      return [
        { component: "Fusible Link", partNumber: "CD-LINK-001", shortfall: 2, unitCost: 18.5 },
        { component: "Control Module", partNumber: "CD-CTRL-001", shortfall: 1, unitCost: 125.0 },
      ]
    }
    return [
      { component: "Fusible Link", partNumber: "FD-LINK-001", shortfall: 3, unitCost: 15.5 },
      { component: "Spring Assembly", partNumber: "FD-SPRING-001", shortfall: 2, unitCost: 22.75 },
    ]
  }

  // Mock supplier database
  const suppliers = {
    "FD-LINK-001": [
      { name: "Industrial Components Inc", email: "orders@indcomp.com", leadTime: 5, rating: 4.8 },
      { name: "Safety Parts Supply", email: "purchasing@safetyparts.com", leadTime: 7, rating: 4.5 },
    ],
    "FD-SPRING-001": [
      { name: "Mechanical Solutions Ltd", email: "orders@mechsol.com", leadTime: 3, rating: 4.9 },
      { name: "Spring Works Co", email: "sales@springworks.com", leadTime: 4, rating: 4.6 },
    ],
    "CD-LINK-001": [
      { name: "Industrial Components Inc", email: "orders@indcomp.com", leadTime: 4, rating: 4.8 },
      { name: "Precision Parts Co", email: "sales@precisionparts.com", leadTime: 6, rating: 4.7 },
    ],
    "CD-CTRL-001": [
      { name: "Control Systems Ltd", email: "orders@controlsys.com", leadTime: 7, rating: 4.9 },
      { name: "Electronic Solutions Inc", email: "purchasing@elecsol.com", leadTime: 5, rating: 4.6 },
    ],
  }

  const generatePurchaseRequisitions = () => {
    setIsGenerating(true)
    const shortageItems = getShortageItems(currentOrder)

    setTimeout(() => {
      const prs = shortageItems.map((item) => ({
        prNumber: `PR-${Date.now().toString().slice(-6)}-${item.partNumber.slice(-3)}`,
        component: item.component,
        partNumber: item.partNumber,
        quantity: item.shortfall + 5, // Order extra for buffer
        unitCost: item.unitCost,
        totalCost: (item.shortfall + 5) * item.unitCost,
        suppliers: suppliers[item.partNumber] || [],
        status: "Generated",
        requiredDate: requiredDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      }))

      setPurchaseRequisitions(prs)
      setIsGenerating(false)
    }, 2000)
  }

  const approvePR = (prNumber: string, supplierName: string) => {
    const pr = purchaseRequisitions.find((p) => p.prNumber === prNumber)
    if (!pr) return

    const supplier = pr.suppliers.find((s: any) => s.name === supplierName)
    if (!supplier) return

    const po = {
      poNumber: `PO-${Date.now().toString().slice(-6)}`,
      prNumber: prNumber,
      supplier: supplier,
      component: pr.component,
      partNumber: pr.partNumber,
      quantity: pr.quantity,
      unitCost: pr.unitCost,
      totalCost: pr.totalCost,
      requiredDate: pr.requiredDate,
      status: "Approved",
      generatedDate: new Date().toISOString(),
    }

    setGeneratedPOs((prev) => [...prev, po])

    // Update PR status
    setPurchaseRequisitions((prev) =>
      prev.map((p) => (p.prNumber === prNumber ? { ...p, status: "Approved", selectedSupplier: supplierName } : p)),
    )
  }

  const sendPO = (poNumber: string) => {
    setGeneratedPOs((prev) => prev.map((po) => (po.poNumber === poNumber ? { ...po, status: "Sent" } : po)))
    alert("Purchase Order sent to supplier via email")
  }

  const handleContinue = () => {
    onPurchaseCompleted()
  }

  // Get orders that need purchases
  const purchaseOrders = orders.filter((o) => o.currentStep === 5 || o.status === "Purchase Orders")

  return (
    <div className="space-y-6">
      {/* Orders Requiring Component Purchases */}
      <Card>
        <CardHeader>
          <CardTitle>Orders Requiring Component Purchases</CardTitle>
          <CardDescription>
            Orders with insufficient inventory requiring purchase orders - Click to select and work on
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {purchaseOrders.map((order) => (
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
                  <p className="text-sm text-orange-600">
                    {order.id === "ORD-003"
                      ? "2 components short - Fusible Links & Control Modules"
                      : "Inventory check needed"}
                  </p>
                  {order.specialRequirements && (
                    <p className="text-xs text-gray-400 mt-1">Note: {order.specialRequirements.substring(0, 50)}...</p>
                  )}
                </div>
                <div className="text-right">
                  <Badge variant="destructive">Purchase Required</Badge>
                  <p className="text-xs text-gray-400 mt-1">
                    UL Status: {order.ulCompliant ? "✓ Compliant" : "Pending"}
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    Est. Cost: ${order.id === "ORD-003" ? "162.00" : "TBD"}
                  </p>
                  {currentOrder?.id === order.id && <p className="text-xs text-blue-600 mt-1">← Currently Selected</p>}
                </div>
              </div>
            ))}
            {purchaseOrders.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No orders currently require component purchases</p>
                <p className="text-sm text-gray-400 mt-1">Orders will appear here when inventory is insufficient</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Order Purchase Management */}
      {currentOrder && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Step 5: Purchase Additional Components
              </CardTitle>
              <CardDescription>
                Generate purchase orders for insufficient inventory items for Order #{currentOrder.id}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Order: {currentOrder.customerName}</p>
                    <p className="text-sm text-gray-600">Components needed for production</p>
                  </div>
                  <Badge variant="destructive">{getShortageItems(currentOrder).length} Items Short</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shortage Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Component Shortages</CardTitle>
              <CardDescription>Items that need to be purchased to fulfill this order</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Shortfall</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getShortageItems(currentOrder).map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.component}</TableCell>
                      <TableCell>{item.partNumber}</TableCell>
                      <TableCell>{item.shortfall}</TableCell>
                      <TableCell>${item.unitCost.toFixed(2)}</TableCell>
                      <TableCell>${(item.shortfall * item.unitCost).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="requiredDate">Required Delivery Date</Label>
                  <Input
                    id="requiredDate"
                    type="date"
                    value={requiredDate}
                    onChange={(e) => setRequiredDate(e.target.value)}
                    className="w-48"
                  />
                </div>
                <Button
                  onClick={generatePurchaseRequisitions}
                  disabled={isGenerating || purchaseRequisitions.length > 0}
                >
                  {isGenerating ? "Generating PRs..." : "Generate Purchase Requisitions"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Purchase Requisitions */}
          {purchaseRequisitions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Purchase Requisitions
                </CardTitle>
                <CardDescription>Review and approve purchase requisitions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {purchaseRequisitions.map((pr, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-semibold">PR #{pr.prNumber}</h4>
                          <p className="text-sm text-gray-600">
                            {pr.component} - {pr.partNumber}
                          </p>
                          <p className="text-sm">
                            Quantity: {pr.quantity} | Total: ${pr.totalCost.toFixed(2)}
                          </p>
                        </div>
                        <Badge variant={pr.status === "Approved" ? "default" : "secondary"}>{pr.status}</Badge>
                      </div>

                      {pr.status === "Generated" && (
                        <div className="space-y-3">
                          <Label>Select Supplier</Label>
                          <div className="grid gap-3">
                            {pr.suppliers.map((supplier: any, supplierIndex: number) => (
                              <div key={supplierIndex} className="flex items-center justify-between p-3 border rounded">
                                <div>
                                  <p className="font-medium">{supplier.name}</p>
                                  <p className="text-sm text-gray-600">{supplier.email}</p>
                                  <p className="text-sm text-gray-500">
                                    Lead time: {supplier.leadTime} days | Rating: {supplier.rating}/5
                                  </p>
                                </div>
                                <Button size="sm" onClick={() => approvePR(pr.prNumber, supplier.name)}>
                                  Select & Approve
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {pr.status === "Approved" && (
                        <div className="bg-green-50 p-3 rounded border border-green-200">
                          <p className="text-green-800 text-sm">✓ Approved with {pr.selectedSupplier}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generated Purchase Orders */}
          {generatedPOs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Purchase Orders
                </CardTitle>
                <CardDescription>Send purchase orders to suppliers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {generatedPOs.map((po, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">PO #{po.poNumber}</h4>
                          <p className="text-sm text-gray-600">To: {po.supplier.name}</p>
                          <p className="text-sm text-gray-600">Email: {po.supplier.email}</p>
                          <p className="text-sm">
                            {po.component} ({po.partNumber}) - Qty: {po.quantity} - ${po.totalCost.toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-500">Required: {po.requiredDate}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant={po.status === "Sent" ? "default" : "secondary"}>{po.status}</Badge>
                          {po.status === "Approved" && (
                            <Button size="sm" onClick={() => sendPO(po.poNumber)}>
                              <Send className="h-4 w-4 mr-2" />
                              Send PO
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {generatedPOs.every((po) => po.status === "Sent") && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">All Purchase Orders Sent</span>
                    </div>
                    <p className="text-green-700 text-sm mt-1">
                      Purchase orders have been sent to suppliers. Components will be delivered and inspected upon
                      arrival.
                    </p>
                    <Button onClick={handleContinue} className="mt-3">
                      Continue to Quality Control
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Purchase Summary */}
          {generatedPOs.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-800">Purchase Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Total POs Generated</p>
                    <p className="text-2xl font-bold text-blue-600">{generatedPOs.length}</p>
                  </div>
                  <div>
                    <p className="font-medium">Total Purchase Value</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ${generatedPOs.reduce((sum, po) => sum + po.totalCost, 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Expected Delivery</p>
                    <p className="text-2xl font-bold text-blue-600">3-7 days</p>
                  </div>
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
