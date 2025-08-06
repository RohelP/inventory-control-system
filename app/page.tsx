"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClipboardList, Package, ShieldCheck, ShoppingCart, CheckCircle, Settings, FileText } from "lucide-react"

import OrderCreation from "@/components/order-creation"
import BOMManagement from "@/components/bom-management"
import ULCompliance from "@/components/ul-compliance"
import InventoryCheck from "@/components/inventory-check"
import PurchaseOrders from "@/components/purchase-orders"
import QualityControl from "@/components/quality-control"
import ProductionTracking from "@/components/production-tracking"
import Dashboard from "@/components/dashboard"
import { apiClient, transformOrderForFrontend, transformOrderForBackend } from "@/lib/api"

export default function InventoryControlSystem() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [currentOrder, setCurrentOrder] = useState(null)
  const [workflowStep, setWorkflowStep] = useState(1)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load orders from API on component mount
  const loadOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      const apiOrders = await apiClient.getOrders()
      const transformedOrders = apiOrders.map(transformOrderForFrontend)
      setOrders(transformedOrders)
    } catch (err) {
      console.error('Failed to load orders:', err)
      setError('Failed to load orders. Please check if the backend is running.')
      // Fall back to sample data if API is unavailable
      setOrders([
        {
          id: "ORD-001",
          customerName: "John Smith",
          company: "ACME Construction Corp",
          phone: "(555) 123-4567",
          email: "john@acmecorp.com",
          orderDate: "2024-01-10",
          damperType: "Fire Damper - Standard",
          specialRequirements: "UL listed, 2-hour fire rating required",
          status: "In Production",
          currentStep: 7,
          createdAt: "2024-01-10T08:00:00Z",
          bomGenerated: true,
          ulCompliant: true,
          inventoryReserved: true,
          productionProgress: 75,
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  // Helper function to update order via API
  const updateOrderWorkflow = async (orderId: string, updates: any) => {
    try {
      const updatedOrder = await apiClient.updateOrder(orderId, updates)
      const transformedOrder = transformOrderForFrontend(updatedOrder)
      
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...transformedOrder } : o))
      )
      
      if (currentOrder && currentOrder.id === orderId) {
        setCurrentOrder({ ...currentOrder, ...transformedOrder })
      }
      
      return transformedOrder
    } catch (err) {
      console.error('Failed to update order:', err)
      // Fallback to local state update
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...updates } : o))
      )
      
      if (currentOrder && currentOrder.id === orderId) {
        setCurrentOrder({ ...currentOrder, ...updates })
      }
      
      return { ...currentOrder, ...updates }
    }
  }

  // Helper function to delete order
  const handleOrderDeleted = (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId))
    
    // If the deleted order was the current order, clear it
    if (currentOrder && currentOrder.id === orderId) {
      setCurrentOrder(null)
      setWorkflowStep(1)
      setActiveTab("dashboard")
    }
  }

  // Load orders on component mount
  useEffect(() => {
    loadOrders()
  }, [])

  // Listen for order selection events
  useEffect(() => {
    const handleOrderSelection = (event: any) => {
      const selectedOrder = event.detail
      setCurrentOrder(selectedOrder)
      setWorkflowStep(selectedOrder.currentStep)
    }

    window.addEventListener("selectOrder", handleOrderSelection)
    return () => window.removeEventListener("selectOrder", handleOrderSelection)
  }, [])

  const workflowSteps = [
    { id: 1, name: "Order Creation", icon: ClipboardList, tab: "orders" },
    { id: 2, name: "BOM Management", icon: Package, tab: "bom" },
    { id: 3, name: "UL Compliance", icon: ShieldCheck, tab: "compliance" },
    { id: 4, name: "Inventory Check", icon: Settings, tab: "inventory" },
    { id: 5, name: "Purchase Orders", icon: ShoppingCart, tab: "purchase" },
    { id: 6, name: "Quality Control", icon: CheckCircle, tab: "quality" },
    { id: 7, name: "Production", icon: FileText, tab: "production" },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Control System</h1>
            <p className="text-gray-600">Damper Manufacturing & UL Compliance Management</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="px-3 py-1">
              Step {workflowStep} of {workflowSteps.length}
            </Badge>
            {currentOrder && (
              <Badge variant="secondary" className="px-3 py-1">
                Order #{currentOrder.id}
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Workflow Progress Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Workflow Progress</h3>
            <div className="space-y-2">
              {workflowSteps.map((step) => {
                const Icon = step.icon
                const isActive = workflowStep === step.id
                const isCompleted = workflowStep > step.id

                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : isCompleted
                          ? "bg-green-50 text-green-700"
                          : "text-gray-600 hover:bg-gray-50"
                    }`}
                    onClick={() => setActiveTab(step.tab)}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{step.name}</span>
                    {isCompleted && <CheckCircle className="h-4 w-4 ml-auto" />}
                    {isActive && <div className="w-2 h-2 bg-blue-600 rounded-full ml-auto" />}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-8">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="bom">BOM</TabsTrigger>
              <TabsTrigger value="compliance">UL Compliance</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="purchase">Purchase</TabsTrigger>
              <TabsTrigger value="quality">Quality</TabsTrigger>
              <TabsTrigger value="production">Production</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-6">
              <Dashboard
                currentOrder={currentOrder}
                workflowStep={workflowStep}
                orders={orders}
                onNavigate={setActiveTab}
                onSelectOrder={(order) => {
                  setCurrentOrder(order)
                  setWorkflowStep(order.currentStep)
                  // Navigate to appropriate tab based on current step
                  const stepTabs = ["", "orders", "bom", "compliance", "inventory", "purchase", "quality", "production"]
                  setActiveTab(stepTabs[order.currentStep] || "dashboard")
                }}
                onOrderDeleted={handleOrderDeleted}
              />
            </TabsContent>

            <TabsContent value="orders" className="mt-6">
              <OrderCreation
                orders={orders}
                onOrderCreated={async (order) => {
                  try {
                    const backendOrder = transformOrderForBackend(order)
                    const newOrder = await apiClient.createOrder(backendOrder)
                    const transformedOrder = transformOrderForFrontend(newOrder)
                    const updatedOrder = { ...transformedOrder, currentStep: 2, status: "BOM Creation" }
                    
                    setOrders((prev) => [...prev, updatedOrder])
                    setCurrentOrder(updatedOrder)
                    setWorkflowStep(2)
                    setActiveTab("bom")
                  } catch (err) {
                    console.error('Failed to create order:', err)
                    // Fallback to local state update
                    const newOrder = { ...order, currentStep: 2, status: "BOM Creation" }
                    setOrders((prev) => [...prev, newOrder])
                    setCurrentOrder(newOrder)
                    setWorkflowStep(2)
                    setActiveTab("bom")
                  }
                }}
                onSelectOrder={(order) => {
                  setCurrentOrder(order)
                  setWorkflowStep(order.currentStep)
                }}
                onOrderDeleted={handleOrderDeleted}
              />
            </TabsContent>

            <TabsContent value="bom" className="mt-6">
              <BOMManagement
                currentOrder={currentOrder}
                orders={orders}
                onBOMCreated={async () => {
                  if (currentOrder) {
                    await updateOrderWorkflow(currentOrder.id, {
                      current_step: 3,
                      status: "UL Compliance",
                      bom_generated: true
                    })
                    setWorkflowStep(3)
                    setActiveTab("compliance")
                  }
                }}
                onSelectOrder={(order) => {
                  setCurrentOrder(order)
                  setWorkflowStep(order.currentStep)
                }}
              />
            </TabsContent>

            <TabsContent value="compliance" className="mt-6">
              <ULCompliance
                currentOrder={currentOrder}
                orders={orders}
                onComplianceValidated={() => {
                  if (currentOrder) {
                    setOrders((prev) =>
                      prev.map((o) =>
                        o.id === currentOrder.id
                          ? { ...o, currentStep: 4, status: "Inventory Check", ulCompliant: true }
                          : o,
                      ),
                    )
                    setWorkflowStep(4)
                    setActiveTab("inventory")
                  }
                }}
                onSelectOrder={(order) => {
                  setCurrentOrder(order)
                  setWorkflowStep(order.currentStep)
                }}
              />
            </TabsContent>

            <TabsContent value="inventory" className="mt-6">
              <InventoryCheck
                currentOrder={currentOrder}
                orders={orders}
                onInventoryChecked={(needsPurchase) => {
                  if (currentOrder) {
                    const nextStep = needsPurchase ? 5 : 6
                    const nextStatus = needsPurchase ? "Purchase Orders" : "Quality Control"
                    setOrders((prev) =>
                      prev.map((o) =>
                        o.id === currentOrder.id
                          ? { ...o, currentStep: nextStep, status: nextStatus, inventoryReserved: !needsPurchase }
                          : o,
                      ),
                    )
                    setWorkflowStep(nextStep)
                    setActiveTab(needsPurchase ? "purchase" : "quality")
                  }
                }}
                onSelectOrder={(order) => {
                  setCurrentOrder(order)
                  setWorkflowStep(order.currentStep)
                }}
              />
            </TabsContent>

            <TabsContent value="purchase" className="mt-6">
              <PurchaseOrders
                currentOrder={currentOrder}
                orders={orders}
                onPurchaseCompleted={() => {
                  if (currentOrder) {
                    setOrders((prev) =>
                      prev.map((o) =>
                        o.id === currentOrder.id ? { ...o, currentStep: 6, status: "Quality Control" } : o,
                      ),
                    )
                    setWorkflowStep(6)
                    setActiveTab("quality")
                  }
                }}
                onSelectOrder={(order) => {
                  setCurrentOrder(order)
                  setWorkflowStep(order.currentStep)
                }}
              />
            </TabsContent>

            <TabsContent value="quality" className="mt-6">
              <QualityControl
                currentOrder={currentOrder}
                orders={orders}
                onQualityApproved={() => {
                  if (currentOrder) {
                    setOrders((prev) =>
                      prev.map((o) =>
                        o.id === currentOrder.id ? { ...o, currentStep: 7, status: "In Production" } : o,
                      ),
                    )
                    setWorkflowStep(7)
                    setActiveTab("production")
                  }
                }}
                onSelectOrder={(order) => {
                  setCurrentOrder(order)
                  setWorkflowStep(order.currentStep)
                }}
              />
            </TabsContent>

            <TabsContent value="production" className="mt-6">
              <ProductionTracking
                currentOrder={currentOrder}
                orders={orders}
                onProductionCompleted={() => {
                  if (currentOrder) {
                    setOrders((prev) =>
                      prev.map((o) =>
                        o.id === currentOrder.id
                          ? { ...o, currentStep: 8, status: "Completed", productionProgress: 100 }
                          : o,
                      ),
                    )
                    setWorkflowStep(1)
                    setCurrentOrder(null)
                    setActiveTab("dashboard")
                  }
                }}
                onSelectOrder={(order) => {
                  setCurrentOrder(order)
                  setWorkflowStep(order.currentStep)
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
