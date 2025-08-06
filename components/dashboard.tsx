"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle, Clock, Package, Trash2 } from "lucide-react"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { apiClient } from "@/lib/api"

interface DashboardProps {
  currentOrder: any
  workflowStep: number
  orders: any[]
  onNavigate: (tab: string) => void
  onSelectOrder: (order: any) => void
  onOrderDeleted?: (orderId: string) => void
}

export default function Dashboard({ currentOrder, workflowStep, orders, onNavigate, onSelectOrder, onOrderDeleted }: DashboardProps) {
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null)

  const handleDeleteOrder = async (orderId: string) => {
    try {
      setDeletingOrderId(orderId)
      await apiClient.deleteOrder(orderId)
      onOrderDeleted?.(orderId)
    } catch (error) {
      console.error("Failed to delete order:", error)
      // You might want to show a toast notification here
    } finally {
      setDeletingOrderId(null)
    }
  }

  const stats = {
    totalOrders: orders.length,
    inProduction: orders.filter((o) => o.status === "In Production").length,
    completed: orders.filter((o) => o.status === "Completed").length,
    pendingUL: orders.filter((o) => !o.ulCompliant && o.bomGenerated).length,
    needsPurchase: orders.filter((o) => o.status === "Purchase Orders").length,
    qualityControl: orders.filter((o) => o.status === "Quality Control").length,
  }

  return (
    <div className="space-y-6">
      {/* Current Order Status */}
      {currentOrder && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">Currently Working On</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  {currentOrder.id} - {currentOrder.customerName}
                </p>
                <p className="text-sm text-gray-600">{currentOrder.company}</p>
                <p className="text-sm text-gray-500">{currentOrder.damperType}</p>
              </div>
              <div className="text-right">
                <Badge variant="secondary">{currentOrder.status}</Badge>
                <p className="text-sm text-gray-500 mt-1">Step {currentOrder.currentStep} of 7</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
                <p className="text-sm text-gray-600">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{stats.inProduction}</p>
                <p className="text-sm text-gray-600">In Production</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{stats.pendingUL}</p>
                <p className="text-sm text-gray-600">UL Review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{stats.needsPurchase}</p>
                <p className="text-sm text-gray-600">Need Purchase</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
              <div>
                <p className="text-2xl font-bold">{stats.qualityControl}</p>
                <p className="text-sm text-gray-600">Quality Check</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Orders by Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Orders by Workflow Stage</CardTitle>
            <CardDescription>Current distribution of orders across workflow stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  stage: "BOM Creation",
                  count: orders.filter((o) => o.currentStep === 2).length,
                  color: "bg-blue-500",
                },
                {
                  stage: "UL Compliance",
                  count: orders.filter((o) => o.currentStep === 3).length,
                  color: "bg-yellow-500",
                },
                {
                  stage: "Inventory Check",
                  count: orders.filter((o) => o.currentStep === 4).length,
                  color: "bg-purple-500",
                },
                {
                  stage: "Purchase Orders",
                  count: orders.filter((o) => o.currentStep === 5).length,
                  color: "bg-orange-500",
                },
                {
                  stage: "Quality Control",
                  count: orders.filter((o) => o.currentStep === 6).length,
                  color: "bg-green-500",
                },
                {
                  stage: "Production",
                  count: orders.filter((o) => o.currentStep === 7).length,
                  color: "bg-indigo-500",
                },
              ].map((item) => (
                <div key={item.stage} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-sm font-medium">{item.stage}</span>
                  </div>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest order updates and status changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2 bg-green-50 rounded">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">ORD-001 Production 75% Complete</p>
                  <p className="text-xs text-gray-500">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 bg-red-50 rounded">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">ORD-002 UL Compliance Issues</p>
                  <p className="text-xs text-gray-500">4 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 bg-blue-50 rounded">
                <Package className="h-4 w-4 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">ORD-005 Components Delivered</p>
                  <p className="text-xs text-gray-500">6 hours ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Orders Overview */}
      <Card>
        <CardHeader>
          <CardTitle>All Orders Overview</CardTitle>
          <CardDescription>Click on any order to select and work on it</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className={`flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                  currentOrder?.id === order.id ? "border-blue-500 bg-blue-50" : ""
                }`}
              >
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => onSelectOrder(order)}
                >
                  <div className="flex items-center gap-3">
                    <p className="font-medium">
                      {order.id} - {order.customerName}
                    </p>
                    <Badge
                      variant={
                        order.status === "Completed"
                          ? "default"
                          : order.status === "In Production"
                            ? "secondary"
                            : order.status === "UL Review"
                              ? "destructive"
                              : "outline"
                      }
                    >
                      {order.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    {order.company} • {order.damperType}
                  </p>
                  {order.productionProgress > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <Progress value={order.productionProgress} className="flex-1" />
                        <span className="text-xs text-gray-500">{order.productionProgress}%</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-medium">Step {order.currentStep}/7</p>
                    <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <DeleteConfirmationDialog
                    title={`Delete Order ${order.id}?`}
                    description={`Are you sure you want to delete order ${order.id} for ${order.customerName}? This action cannot be undone and will also delete all associated BOM items and inventory reservations.`}
                    onConfirm={() => handleDeleteOrder(order.id)}
                    isLoading={deletingOrderId === order.id}
                    trigger={
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Jump to different workflow stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" onClick={() => onNavigate("orders")} className="h-auto p-4">
              <div className="text-center">
                <Package className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm">New Order</p>
              </div>
            </Button>
            <Button variant="outline" onClick={() => onNavigate("bom")} className="h-auto p-4">
              <div className="text-center">
                <BarChart3 className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm">BOM Management</p>
              </div>
            </Button>
            <Button variant="outline" onClick={() => onNavigate("compliance")} className="h-auto p-4">
              <div className="text-center">
                <CheckCircle className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm">UL Compliance</p>
              </div>
            </Button>
            <Button variant="outline" onClick={() => onNavigate("production")} className="h-auto p-4">
              <div className="text-center">
                <TrendingUp className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm">Production</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
