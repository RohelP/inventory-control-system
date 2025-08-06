"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, User, Phone, Mail, Package, ExternalLink, Trash2 } from "lucide-react"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { apiClient } from "@/lib/api"

interface OrderCreationProps {
  orders: any[]
  onOrderCreated: (order: any) => void
  onSelectOrder: (order: any) => void
  onOrderDeleted?: (orderId: string) => void
}

export default function OrderCreation({ orders, onOrderCreated, onSelectOrder, onOrderDeleted }: OrderCreationProps) {
  const [formData, setFormData] = useState({
    customerName: "",
    company: "",
    phone: "",
    email: "",
    orderDate: new Date().toISOString().split("T")[0],
    damperType: "",
    specialRequirements: "",
  })

  const [showExternalPortal, setShowExternalPortal] = useState(false)
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

  const damperTypes = [
    "Fire Damper - Standard",
    "Smoke Damper - Standard",
    "Combination Damper - Standard",
    "Fire Damper - Custom",
    "Smoke Damper - Custom",
    "Combination Damper - Custom",
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const order = {
      id: `ORD-${Date.now().toString().slice(-6)}`,
      ...formData,
      status: "Created",
      createdAt: new Date().toISOString(),
      currentStep: 1,
      bomGenerated: false,
      ulCompliant: false,
      inventoryReserved: false,
      productionProgress: 0,
    }
    onOrderCreated(order)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleExternalOrderImport = () => {
    // Simulate importing from external portal
    const externalOrder = {
      customerName: "Jennifer Wilson",
      company: "Wilson Engineering Group",
      phone: "(555) 789-0123",
      email: "jennifer@wilsoneng.com",
      orderDate: new Date().toISOString().split("T")[0],
      damperType: "Fire Damper - Custom",
      specialRequirements: "Imported from customer portal - High-temp application, 4-hour fire rating",
    }

    Object.entries(externalOrder).forEach(([key, value]) => {
      handleInputChange(key, value)
    })

    setShowExternalPortal(false)
  }

  return (
    <div className="space-y-6">
      {/* External Portal Integration */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <ExternalLink className="h-5 w-5" />
            Customer Portal Integration
          </CardTitle>
          <CardDescription className="text-green-700">
            Import orders directly from the customer portal or create new orders manually
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowExternalPortal(!showExternalPortal)} className="bg-white">
              {showExternalPortal ? "Hide Portal" : "View Portal Orders"}
            </Button>
            <Button onClick={handleExternalOrderImport} className="bg-green-600 hover:bg-green-700">
              Import Sample Order
            </Button>
          </div>

          {showExternalPortal && (
            <div className="mt-4 p-4 bg-white rounded border">
              <h4 className="font-medium mb-3">Available Portal Orders</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">Jennifer Wilson - Wilson Engineering</p>
                    <p className="text-sm text-gray-600">Fire Damper - Custom (High-temp application)</p>
                  </div>
                  <Button size="sm" onClick={handleExternalOrderImport}>
                    Import
                  </Button>
                </div>
                <div className="flex items-center justify-between p-2 border rounded opacity-50">
                  <div>
                    <p className="font-medium">Robert Martinez - Martinez Construction</p>
                    <p className="text-sm text-gray-600">Smoke Damper - Standard (Already imported)</p>
                  </div>
                  <Button size="sm" disabled>
                    Imported
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Orders in Creation Phase */}
      <Card>
        <CardHeader>
          <CardTitle>Orders in Creation Phase</CardTitle>
          <CardDescription>
            Select an existing order to continue working on it or create a new order below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {orders
              .filter((o) => o.currentStep <= 2)
              .map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onSelectOrder(order)}
                >
                  <div>
                    <p className="font-medium">
                      {order.id} - {order.customerName}
                    </p>
                    <p className="text-sm text-gray-600">{order.company}</p>
                    <p className="text-sm text-gray-500">{order.damperType}</p>
                    {order.specialRequirements && (
                      <p className="text-xs text-gray-400 mt-1">
                        Special: {order.specialRequirements.substring(0, 50)}...
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <Badge variant="outline">{order.status}</Badge>
                      <p className="text-xs text-gray-400 mt-1">Step {order.currentStep} of 7</p>
                      <p className="text-xs text-gray-400">Created: {new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <DeleteConfirmationDialog
                      title={`Delete Order ${order.id}?`}
                      description={`Are you sure you want to delete order ${order.id} for ${order.customerName}? This action cannot be undone.`}
                      onConfirm={() => handleDeleteOrder(order.id)}
                      isLoading={deletingOrderId === order.id}
                      trigger={
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </div>
                </div>
              ))}
            {orders.filter((o) => o.currentStep <= 2).length === 0 && (
              <div className="text-center py-6">
                <p className="text-gray-500">No orders in creation phase</p>
                <p className="text-sm text-gray-400 mt-1">Create a new order using the form below</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Step 1: Create New Customer Order
          </CardTitle>
          <CardDescription>Enter customer information and order details to begin the workflow</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Information
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange("customerName", e.target.value)}
                    placeholder="John Smith"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company *</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => handleInputChange("company", e.target.value)}
                    placeholder="ACME Construction Corp"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="(555) 123-4567"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="john@acmecorp.com"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Order Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Order Details
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="orderDate">Order Date *</Label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="orderDate"
                      type="date"
                      value={formData.orderDate}
                      onChange={(e) => handleInputChange("orderDate", e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="damperType">Damper Type *</Label>
                  <Select value={formData.damperType} onValueChange={(value) => handleInputChange("damperType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select damper type" />
                    </SelectTrigger>
                    <SelectContent>
                      {damperTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            {type}
                            {type.includes("Custom") && (
                              <Badge variant="outline" className="text-xs">
                                Custom
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialRequirements">Special Requirements</Label>
                  <Textarea
                    id="specialRequirements"
                    value={formData.specialRequirements}
                    onChange={(e) => handleInputChange("specialRequirements", e.target.value)}
                    placeholder="Any special requirements, certifications, or notes..."
                    rows={4}
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-between items-center pt-6 border-t">
              <div className="text-sm text-gray-600">* Required fields</div>
              <div className="flex gap-3">
                <Button type="button" variant="outline">
                  Save Draft
                </Button>
                <Button type="submit">Create Order & Continue</Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Order Preview */}
      {formData.customerName && formData.damperType && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">Order Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p>
                  <strong>Customer:</strong> {formData.customerName}
                </p>
                <p>
                  <strong>Company:</strong> {formData.company}
                </p>
              </div>
              <div>
                <p>
                  <strong>Damper Type:</strong> {formData.damperType}
                </p>
                <p>
                  <strong>Order Date:</strong> {formData.orderDate}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
