"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Play, Pause, CheckCircle, Package, Truck } from "lucide-react"

interface ProductionTrackingProps {
  currentOrder: any
  orders: any[]
  onProductionCompleted: () => void
  onSelectOrder: (order: any) => void
}

export default function ProductionTracking({
  currentOrder,
  orders,
  onProductionCompleted,
  onSelectOrder,
}: ProductionTrackingProps) {
  const [productionStages, setProductionStages] = useState([
    {
      id: 1,
      name: "Frame Assembly",
      status: "not-started",
      qtyStarted: 0,
      qtyCompleted: 0,
      qtyRejected: 0,
      comments: "",
      estimatedHours: 2,
      actualHours: 0,
    },
    {
      id: 2,
      name: "Blade Installation",
      status: "not-started",
      qtyStarted: 0,
      qtyCompleted: 0,
      qtyRejected: 0,
      comments: "",
      estimatedHours: 3,
      actualHours: 0,
    },
    {
      id: 3,
      name: "Hardware Mounting",
      status: "not-started",
      qtyStarted: 0,
      qtyCompleted: 0,
      qtyRejected: 0,
      comments: "",
      estimatedHours: 1.5,
      actualHours: 0,
    },
    {
      id: 4,
      name: "Final Assembly",
      status: "not-started",
      qtyStarted: 0,
      qtyCompleted: 0,
      qtyRejected: 0,
      comments: "",
      estimatedHours: 2,
      actualHours: 0,
    },
    {
      id: 5,
      name: "Quality Testing",
      status: "not-started",
      qtyStarted: 0,
      qtyCompleted: 0,
      qtyRejected: 0,
      comments: "",
      estimatedHours: 1,
      actualHours: 0,
    },
  ])

  const [wipRecord, setWipRecord] = useState({
    wipId: `WIP-${currentOrder?.id || "XXX"}`,
    orderQuantity: 1,
    startDate: new Date().toISOString().split("T")[0],
    estimatedCompletion: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  })

  const [selectedStage, setSelectedStage] = useState<any>(null)
  const [stageInput, setStageInput] = useState({
    qtyStarted: "",
    qtyCompleted: "",
    qtyRejected: "",
    comments: "",
    hours: "",
  })

  const startStage = (stageId: number) => {
    const stage = productionStages.find((s) => s.id === stageId)
    if (stage) {
      setSelectedStage(stage)
      setStageInput({
        qtyStarted: stage.qtyStarted.toString(),
        qtyCompleted: stage.qtyCompleted.toString(),
        qtyRejected: stage.qtyRejected.toString(),
        comments: stage.comments,
        hours: stage.actualHours.toString(),
      })
    }
  }

  const updateStage = () => {
    if (!selectedStage) return

    const updatedStages = productionStages.map((stage) => {
      if (stage.id === selectedStage.id) {
        const qtyStarted = Number.parseInt(stageInput.qtyStarted) || 0
        const qtyCompleted = Number.parseInt(stageInput.qtyCompleted) || 0
        const qtyRejected = Number.parseInt(stageInput.qtyRejected) || 0

        let status = "not-started"
        if (qtyStarted > 0) status = "in-progress"
        if (qtyCompleted >= wipRecord.orderQuantity) status = "completed"

        return {
          ...stage,
          qtyStarted,
          qtyCompleted,
          qtyRejected,
          comments: stageInput.comments,
          actualHours: Number.parseFloat(stageInput.hours) || 0,
          status,
        }
      }
      return stage
    })

    setProductionStages(updatedStages)
    setSelectedStage(null)
    setStageInput({ qtyStarted: "", qtyCompleted: "", qtyRejected: "", comments: "", hours: "" })
  }

  const completeProduction = () => {
    alert("Production completed! Reserved components have been deducted from inventory.")
    onProductionCompleted()
  }

  const getOverallProgress = () => {
    const completedStages = productionStages.filter((s) => s.status === "completed").length
    return (completedStages / productionStages.length) * 100
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "in-progress":
        return "secondary"
      case "not-started":
        return "outline"
      default:
        return "outline"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "in-progress":
        return <Play className="h-4 w-4" />
      default:
        return <Pause className="h-4 w-4" />
    }
  }

  const allStagesCompleted = productionStages.every((s) => s.status === "completed")

  // Get orders in production phase
  const productionOrders = orders.filter((o) => o.currentStep === 7 || o.status === "In Production")

  return (
    <div className="space-y-6">
      {/* Orders in Production Phase */}
      <Card>
        <CardHeader>
          <CardTitle>Orders in Production Phase</CardTitle>
          <CardDescription>
            Active manufacturing orders and their progress - Click to select and work on
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {productionOrders.map((order) => (
              <div
                key={order.id}
                className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                  currentOrder?.id === order.id ? "border-blue-500 bg-blue-50" : ""
                }`}
                onClick={() => onSelectOrder(order)}
              >
                <div className="flex-1">
                  <p className="font-medium">
                    {order.id} - {order.customerName}
                  </p>
                  <p className="text-sm text-gray-600">{order.company}</p>
                  <p className="text-sm text-gray-500">{order.damperType}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-32 h-2 bg-gray-200 rounded-full">
                      <div
                        className="h-2 bg-blue-600 rounded-full transition-all"
                        style={{ width: `${order.productionProgress || 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{order.productionProgress || 0}%</span>
                  </div>
                  {order.specialRequirements && (
                    <p className="text-xs text-gray-400 mt-1">
                      Special: {order.specialRequirements.substring(0, 40)}...
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <Badge variant="secondary">In Production</Badge>
                  <p className="text-xs text-gray-400 mt-1">WIP: WIP-{order.id}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    {order.id === "ORD-001" ? "Est. completion: 2 days" : "Just started"}
                  </p>
                  {currentOrder?.id === order.id && <p className="text-xs text-blue-600 mt-1">← Currently Selected</p>}
                </div>
              </div>
            ))}
            {productionOrders.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No orders currently in production</p>
                <p className="text-sm text-gray-400 mt-1">Orders will appear here after quality control approval</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Order Production Tracking */}
      {currentOrder && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Step 7: Production Tracking
              </CardTitle>
              <CardDescription>Track manufacturing progress for Order #{currentOrder.id}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Order: {currentOrder.customerName}</p>
                    <p className="text-sm text-gray-600">Damper Type: {currentOrder.damperType}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">WIP #{wipRecord.wipId}</Badge>
                    <p className="text-sm text-gray-500 mt-1">{Math.round(getOverallProgress())}% Complete</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Progress</span>
                    <span>{Math.round(getOverallProgress())}%</span>
                  </div>
                  <Progress value={getOverallProgress()} className="w-full" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* WIP Record */}
          <Card>
            <CardHeader>
              <CardTitle>Work in Progress Record</CardTitle>
              <CardDescription>Production details and timeline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-medium">WIP ID</p>
                  <p className="text-gray-600">{wipRecord.wipId}</p>
                </div>
                <div>
                  <p className="font-medium">Order Quantity</p>
                  <p className="text-gray-600">{wipRecord.orderQuantity} unit(s)</p>
                </div>
                <div>
                  <p className="font-medium">Start Date</p>
                  <p className="text-gray-600">{wipRecord.startDate}</p>
                </div>
                <div>
                  <p className="font-medium">Est. Completion</p>
                  <p className="text-gray-600">{wipRecord.estimatedCompletion}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Production Stages */}
          <Card>
            <CardHeader>
              <CardTitle>Production Stages</CardTitle>
              <CardDescription>Track progress through each manufacturing stage</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Rejected</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productionStages.map((stage) => (
                    <TableRow key={stage.id}>
                      <TableCell className="font-medium">{stage.name}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(stage.status)} className="flex items-center gap-1 w-fit">
                          {getStatusIcon(stage.status)}
                          {stage.status.replace("-", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{stage.qtyStarted}</TableCell>
                      <TableCell>{stage.qtyCompleted}</TableCell>
                      <TableCell>{stage.qtyRejected}</TableCell>
                      <TableCell>
                        {stage.actualHours}h / {stage.estimatedHours}h
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => startStage(stage.id)}>
                          Update
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Stage Update Modal */}
          {selectedStage && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-800">Update Stage: {selectedStage.name}</CardTitle>
                <CardDescription>Enter production data for this stage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="qtyStarted">Qty Started</Label>
                    <Input
                      id="qtyStarted"
                      type="number"
                      value={stageInput.qtyStarted}
                      onChange={(e) => setStageInput((prev) => ({ ...prev, qtyStarted: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qtyCompleted">Qty Completed</Label>
                    <Input
                      id="qtyCompleted"
                      type="number"
                      value={stageInput.qtyCompleted}
                      onChange={(e) => setStageInput((prev) => ({ ...prev, qtyCompleted: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qtyRejected">Qty Rejected</Label>
                    <Input
                      id="qtyRejected"
                      type="number"
                      value={stageInput.qtyRejected}
                      onChange={(e) => setStageInput((prev) => ({ ...prev, qtyRejected: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hours">Actual Hours</Label>
                    <Input
                      id="hours"
                      type="number"
                      step="0.5"
                      value={stageInput.hours}
                      onChange={(e) => setStageInput((prev) => ({ ...prev, hours: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label htmlFor="comments">Comments</Label>
                  <Textarea
                    id="comments"
                    value={stageInput.comments}
                    onChange={(e) => setStageInput((prev) => ({ ...prev, comments: e.target.value }))}
                    placeholder="Any notes, issues, or observations..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <Button variant="outline" onClick={() => setSelectedStage(null)}>
                    Cancel
                  </Button>
                  <Button onClick={updateStage}>Update Stage</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Production Summary */}
          {allStagesCompleted && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  Production Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert className="border-green-200 bg-green-100 mb-4">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Manufacturing Complete</strong> - All production stages have been completed successfully.
                    Order is ready for final inventory update and shipment.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <p className="font-medium">Total Hours</p>
                    <p className="text-2xl font-bold text-green-600">
                      {productionStages.reduce((sum, stage) => sum + stage.actualHours, 0)}h
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Units Completed</p>
                    <p className="text-2xl font-bold text-green-600">{wipRecord.orderQuantity}</p>
                  </div>
                  <div>
                    <p className="font-medium">Quality Rate</p>
                    <p className="text-2xl font-bold text-green-600">100%</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={completeProduction} className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Complete Order & Update Inventory
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Production Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Production Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                {productionStages
                  .filter((stage) => stage.comments)
                  .map((stage, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <p className="font-medium">{stage.name}</p>
                      <p className="text-gray-600">{stage.comments}</p>
                    </div>
                  ))}
                {productionStages.every((stage) => !stage.comments) && (
                  <p className="text-gray-500 italic">No production notes recorded.</p>
                )}
              </div>
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
