"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Camera, FileText, AlertTriangle } from "lucide-react"

interface QualityControlProps {
  currentOrder: any
  orders: any[]
  onQualityApproved: () => void
  onSelectOrder: (order: any) => void
}

export default function QualityControl({
  currentOrder,
  orders,
  onQualityApproved,
  onSelectOrder,
}: QualityControlProps) {
  const [inspectionResults, setInspectionResults] = useState<any[]>([])
  const [rejectTickets, setRejectTickets] = useState<any[]>([])
  const [isInspecting, setIsInspecting] = useState(false)
  const [selectedComponent, setSelectedComponent] = useState<any>(null)
  const [inspectionNotes, setInspectionNotes] = useState("")

  // Mock delivered components based on order
  const getDeliveredComponents = (order: any) => {
    if (order?.id === "ORD-005") {
      return [
        {
          component: "Actuator",
          partNumber: "SD-ACT-001",
          quantity: 1,
          supplier: "Control Systems Ltd",
          poNumber: "PO-789012",
          deliveryDate: "2024-01-16",
          batchNumber: "ACT-2024-003",
        },
        {
          component: "Control Module",
          partNumber: "SD-CTRL-001",
          quantity: 1,
          supplier: "Electronic Solutions Inc",
          poNumber: "PO-789013",
          deliveryDate: "2024-01-16",
          batchNumber: "CTRL-2024-001",
        },
      ]
    }
    return [
      {
        component: "Fusible Link",
        partNumber: "FD-LINK-001",
        quantity: 8,
        supplier: "Industrial Components Inc",
        poNumber: "PO-123456",
        deliveryDate: "2024-01-16",
        batchNumber: "FL-2024-001",
      },
      {
        component: "Spring Assembly",
        partNumber: "FD-SPRING-001",
        quantity: 7,
        supplier: "Mechanical Solutions Ltd",
        poNumber: "PO-123457",
        deliveryDate: "2024-01-16",
        batchNumber: "SA-2024-002",
      },
    ]
  }

  const startInspection = (component: any) => {
    setSelectedComponent(component)
    setIsInspecting(true)
  }

  const completeInspection = (passed: boolean) => {
    if (!selectedComponent) return

    const result = {
      ...selectedComponent,
      inspectionDate: new Date().toISOString(),
      passed,
      inspector: "John Smith",
      notes: inspectionNotes,
      inspectionId: `INS-${Date.now().toString().slice(-6)}`,
    }

    setInspectionResults((prev) => [...prev, result])

    if (!passed) {
      createRejectTicket(result)
    }

    setSelectedComponent(null)
    setIsInspecting(false)
    setInspectionNotes("")
  }

  const createRejectTicket = (failedInspection: any) => {
    const ticket = {
      ticketId: `REJ-${Date.now().toString().slice(-6)}`,
      poNumber: failedInspection.poNumber,
      supplier: failedInspection.supplier,
      component: failedInspection.component,
      partNumber: failedInspection.partNumber,
      quantityRejected: failedInspection.quantity,
      reason: inspectionNotes,
      action: "Replacement Required",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "Open",
      createdDate: new Date().toISOString(),
    }

    setRejectTickets((prev) => [...prev, ticket])
  }

  const handleContinue = () => {
    const deliveredComponents = getDeliveredComponents(currentOrder)
    const allPassed = inspectionResults.every((r) => r.passed)
    if (allPassed && inspectionResults.length === deliveredComponents.length) {
      onQualityApproved()
    }
  }

  // Get orders in quality control phase
  const qualityOrders = orders.filter((o) => o.currentStep === 6 || o.status === "Quality Control")

  return (
    <div className="space-y-6">
      {/* Orders in Quality Control Phase */}
      <Card>
        <CardHeader>
          <CardTitle>Orders in Quality Control Phase</CardTitle>
          <CardDescription>
            Orders with components ready for quality inspection - Click to select and work on
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {qualityOrders.map((order) => (
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
                  <p className="text-sm text-green-600">
                    {order.id === "ORD-005"
                      ? "Components delivered today - Ready for inspection"
                      : "Components received"}
                  </p>
                  {order.specialRequirements && (
                    <p className="text-xs text-gray-400 mt-1">
                      Special: {order.specialRequirements.substring(0, 50)}...
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <Badge variant="secondary">Quality Check</Badge>
                  <p className="text-xs text-gray-400 mt-1">
                    Inventory: {order.inventoryReserved ? "✓ Reserved" : "Pending"}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {order.id === "ORD-005" ? "Actuator & Control Module ready" : "Standard components"}
                  </p>
                  {currentOrder?.id === order.id && <p className="text-xs text-blue-600 mt-1">← Currently Selected</p>}
                </div>
              </div>
            ))}
            {qualityOrders.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No orders currently in quality control</p>
                <p className="text-sm text-gray-400 mt-1">Orders will appear here after component delivery</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Order Quality Control */}
      {currentOrder && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Step 6: Quality Control Inspection
              </CardTitle>
              <CardDescription>Inspect delivered components for Order #{currentOrder.id}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Order: {currentOrder.customerName}</p>
                    <p className="text-sm text-gray-600">Inspecting delivered components</p>
                  </div>
                  <Badge variant="secondary">
                    {inspectionResults.length} of {getDeliveredComponents(currentOrder).length} Inspected
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivered Components */}
          <Card>
            <CardHeader>
              <CardTitle>Delivered Components</CardTitle>
              <CardDescription>Components received and ready for inspection</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getDeliveredComponents(currentOrder).map((component, index) => {
                    const inspection = inspectionResults.find((r) => r.partNumber === component.partNumber)

                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{component.component}</TableCell>
                        <TableCell>{component.partNumber}</TableCell>
                        <TableCell>{component.quantity}</TableCell>
                        <TableCell>{component.supplier}</TableCell>
                        <TableCell>{component.deliveryDate}</TableCell>
                        <TableCell>
                          {inspection ? (
                            inspection.passed ? (
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                Passed
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-red-600">
                                <XCircle className="h-4 w-4" />
                                Failed
                              </div>
                            )
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!inspection && (
                            <Button size="sm" onClick={() => startInspection(component)} disabled={isInspecting}>
                              Inspect
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Inspection Modal */}
          {selectedComponent && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-800">Inspecting: {selectedComponent.component}</CardTitle>
                <CardDescription>
                  Part Number: {selectedComponent.partNumber} | Batch: {selectedComponent.batchNumber}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p>
                        <strong>Supplier:</strong> {selectedComponent.supplier}
                      </p>
                      <p>
                        <strong>PO Number:</strong> {selectedComponent.poNumber}
                      </p>
                    </div>
                    <div>
                      <p>
                        <strong>Quantity:</strong> {selectedComponent.quantity}
                      </p>
                      <p>
                        <strong>Delivery Date:</strong> {selectedComponent.deliveryDate}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inspectionNotes">Inspection Notes</Label>
                    <Textarea
                      id="inspectionNotes"
                      value={inspectionNotes}
                      onChange={(e) => setInspectionNotes(e.target.value)}
                      placeholder="Enter inspection observations, measurements, defects, etc..."
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                      <Camera className="h-4 w-4" />
                      Add Photos
                    </Button>
                    <div className="flex gap-3">
                      <Button variant="destructive" onClick={() => completeInspection(false)}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button onClick={() => completeInspection(true)}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Pass
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Inspection Results */}
          {inspectionResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Inspection Results</CardTitle>
                <CardDescription>Completed quality control inspections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {inspectionResults.map((result, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 ${result.passed ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{result.component}</h4>
                          <p className="text-sm text-gray-600">
                            {result.partNumber} | Inspector: {result.inspector}
                          </p>
                          <p className="text-sm text-gray-500">
                            Inspection ID: {result.inspectionId} | Date:{" "}
                            {new Date(result.inspectionDate).toLocaleDateString()}
                          </p>
                          {result.notes && (
                            <p className="text-sm mt-2 p-2 bg-white rounded border">
                              <strong>Notes:</strong> {result.notes}
                            </p>
                          )}
                        </div>
                        <Badge variant={result.passed ? "default" : "destructive"}>
                          {result.passed ? "Passed" : "Failed"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reject Tickets */}
          {rejectTickets.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-5 w-5" />
                  Reject Tickets
                </CardTitle>
                <CardDescription>Components that failed inspection</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rejectTickets.map((ticket, index) => (
                    <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-red-800">Ticket #{ticket.ticketId}</h4>
                          <p className="text-sm text-red-600">
                            {ticket.component} ({ticket.partNumber})
                          </p>
                        </div>
                        <Badge variant="destructive">{ticket.status}</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm text-red-700">
                        <div>
                          <p>
                            <strong>Supplier:</strong> {ticket.supplier}
                          </p>
                          <p>
                            <strong>PO Number:</strong> {ticket.poNumber}
                          </p>
                          <p>
                            <strong>Qty Rejected:</strong> {ticket.quantityRejected}
                          </p>
                        </div>
                        <div>
                          <p>
                            <strong>Action:</strong> {ticket.action}
                          </p>
                          <p>
                            <strong>Deadline:</strong> {ticket.deadline}
                          </p>
                          <p>
                            <strong>Created:</strong> {new Date(ticket.createdDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 p-2 bg-white rounded border">
                        <p className="text-sm">
                          <strong>Reason:</strong> {ticket.reason}
                        </p>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline">
                          <FileText className="h-4 w-4 mr-2" />
                          Send to Supplier
                        </Button>
                        <Button size="sm" variant="outline">
                          Request Replacement
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quality Summary */}
          {inspectionResults.length === getDeliveredComponents(currentOrder).length && (
            <Card>
              <CardContent className="pt-6">
                {inspectionResults.every((r) => r.passed) ? (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>Quality Control Passed</strong> - All components have passed inspection. Inventory will be
                      updated and production can begin.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <strong>Quality Issues Detected</strong> - Some components failed inspection. Reject tickets have
                      been created and sent to suppliers.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end mt-4">
                  <Button onClick={handleContinue} disabled={!inspectionResults.every((r) => r.passed)}>
                    {inspectionResults.every((r) => r.passed)
                      ? "Update Inventory & Continue to Production"
                      : "Waiting for Replacement Components"}
                  </Button>
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
