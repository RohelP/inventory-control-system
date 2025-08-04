"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShieldCheck, AlertTriangle, CheckCircle, XCircle, FileText } from "lucide-react"

interface ULComplianceProps {
  currentOrder: any
  orders: any[]
  onComplianceValidated: () => void
  onSelectOrder: (order: any) => void
}

export default function ULCompliance({
  currentOrder,
  orders,
  onComplianceValidated,
  onSelectOrder,
}: ULComplianceProps) {
  const [validationResults, setValidationResults] = useState<any[]>([])
  const [overallCompliance, setOverallCompliance] = useState<"pending" | "compliant" | "non-compliant">("pending")
  const [isValidating, setIsValidating] = useState(false)
  const [complianceCertificate, setComplianceCertificate] = useState<any>(null)

  // UL Standards Database
  const ulStandards = {
    materials: {
      "Galvanized Steel": { approved: true, maxTemp: 2000, minThickness: 0.05 },
      Aluminum: { approved: true, maxTemp: 1200, minThickness: 0.08 },
      Steel: { approved: true, maxTemp: 2000, minThickness: 0.06 },
      Alloy: { approved: true, maxTemp: 1800, minThickness: 0.04 },
      Electronic: { approved: true, maxTemp: 200, minThickness: 0 },
      Rubber: { approved: true, maxTemp: 400, minThickness: 0.02 },
    },
    dimensions: {
      minLength: 6,
      maxLength: 120,
      minWidth: 6,
      maxWidth: 120,
      minHeight: 2,
      maxHeight: 48,
    },
    bladeSpacing: {
      min: 4,
      max: 8,
      standard: 6,
    },
  }

  const mockBOMComponents = [
    {
      component: "Steel Frame",
      partNumber: "FD-FRAME-001",
      quantity: 1,
      material: "Galvanized Steel",
      thickness: 0.06,
    },
    { component: "Fire Rated Blade", partNumber: "FD-BLADE-001", quantity: 4, material: "Steel", thickness: 0.08 },
    { component: "Fusible Link", partNumber: "FD-LINK-001", quantity: 1, material: "Alloy", thickness: 0.05 },
    { component: "Spring Assembly", partNumber: "FD-SPRING-001", quantity: 1, material: "Steel", thickness: 0.04 },
    { component: "Mounting Hardware", partNumber: "FD-MOUNT-001", quantity: 8, material: "Steel", thickness: 0.06 },
  ]

  const validateCompliance = () => {
    setIsValidating(true)

    setTimeout(() => {
      // Simulate different compliance results based on order
      let results
      if (currentOrder?.id === "ORD-002") {
        // Sarah Johnson's order has compliance issues
        results = mockBOMComponents.map((component, index) => {
          const materialStandard = ulStandards.materials[component.material]
          const isCompliant = index !== 1 // Make the second component fail

          return {
            ...component,
            compliant: isCompliant,
            issues: isCompliant
              ? []
              : ["Custom material specification requires manual UL review", "Thickness verification needed"],
          }
        })
      } else {
        // Other orders pass compliance
        results = mockBOMComponents.map((component) => {
          const materialStandard = ulStandards.materials[component.material]
          const isCompliant = materialStandard?.approved && component.thickness >= materialStandard.minThickness

          return {
            ...component,
            compliant: isCompliant,
            issues: isCompliant
              ? []
              : [
                  !materialStandard?.approved && "Material not UL approved",
                  component.thickness < materialStandard?.minThickness && "Thickness below minimum",
                ].filter(Boolean),
          }
        })
      }

      setValidationResults(results)

      const allCompliant = results.every((r) => r.compliant)
      setOverallCompliance(allCompliant ? "compliant" : "non-compliant")

      if (allCompliant) {
        generateComplianceCertificate()
      }

      setIsValidating(false)
    }, 3000)
  }

  const generateComplianceCertificate = () => {
    const certificate = {
      bomId: `BOM-${currentOrder?.id}`,
      validationDate: new Date().toISOString(),
      ulRuleVersion: "UL-555-2024",
      validator: "System Auto-Validation",
      certificateId: `UL-CERT-${Date.now().toString().slice(-8)}`,
    }
    setComplianceCertificate(certificate)
  }

  const handleContinue = () => {
    onComplianceValidated()
  }

  // Get orders that need UL compliance review
  const complianceOrders = orders.filter(
    (o) => o.currentStep === 3 || o.status === "UL Review" || (o.bomGenerated && !o.ulCompliant),
  )

  return (
    <div className="space-y-6">
      {/* Orders in UL Compliance Review */}
      <Card>
        <CardHeader>
          <CardTitle>Orders in UL Compliance Review</CardTitle>
          <CardDescription>Orders requiring UL compliance validation - Click to select and work on</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {complianceOrders.map((order) => (
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
                  {order.specialRequirements && (
                    <p className="text-xs text-gray-400 mt-1">
                      Requirements: {order.specialRequirements.substring(0, 60)}...
                    </p>
                  )}
                  {order.id === "ORD-002" && (
                    <p className="text-xs text-red-600 mt-1">⚠ Custom materials may require special UL review</p>
                  )}
                </div>
                <div className="text-right">
                  <Badge variant={order.ulCompliant ? "default" : "destructive"}>
                    {order.ulCompliant ? "UL Compliant" : "Needs Review"}
                  </Badge>
                  <p className="text-xs text-gray-400 mt-1">BOM: {order.bomGenerated ? "✓ Generated" : "Pending"}</p>
                  {currentOrder?.id === order.id && <p className="text-xs text-blue-600 mt-1">← Currently Selected</p>}
                </div>
              </div>
            ))}
            {complianceOrders.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No orders currently require UL compliance review</p>
                <p className="text-sm text-gray-400 mt-1">Orders will appear here after BOM creation</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Order UL Compliance */}
      {currentOrder && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Step 3: UL Compliance Validation
              </CardTitle>
              <CardDescription>
                Validate BOM components against UL standards for Order #{currentOrder.id}
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
                      overallCompliance === "compliant"
                        ? "default"
                        : overallCompliance === "non-compliant"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {overallCompliance === "compliant"
                      ? "UL Compliant"
                      : overallCompliance === "non-compliant"
                        ? "Non-Compliant"
                        : "Pending Validation"}
                  </Badge>
                </div>

                {validationResults.length === 0 && (
                  <Button onClick={validateCompliance} disabled={isValidating} className="w-full">
                    {isValidating ? "Validating Against UL Standards..." : "Start UL Compliance Validation"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* UL Standards Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                UL Standards Reference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Material Requirements</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Steel: Min 0.06" thickness</li>
                    <li>• Aluminum: Min 0.08" thickness</li>
                    <li>• Max temp ratings apply</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Dimension Limits</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Length: 6" - 120"</li>
                    <li>• Width: 6" - 120"</li>
                    <li>• Height: 2" - 48"</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Configuration Rules</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Blade spacing: 4" - 8"</li>
                    <li>• Standard spacing: 6"</li>
                    <li>• Frame reinforcement req'd</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Validation Results */}
          {validationResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Validation Results</CardTitle>
                <CardDescription>Component-by-component UL compliance check</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Component</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Thickness</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Issues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validationResults.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{result.component}</TableCell>
                        <TableCell>{result.material}</TableCell>
                        <TableCell>{result.thickness}"</TableCell>
                        <TableCell>
                          {result.compliant ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              Compliant
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-red-600">
                              <XCircle className="h-4 w-4" />
                              Non-Compliant
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.issues.length > 0 ? (
                            <ul className="text-sm text-red-600">
                              {result.issues.map((issue: string, i: number) => (
                                <li key={i}>• {issue}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-green-600 text-sm">No issues</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Compliance Status */}
          {overallCompliance !== "pending" && (
            <Card>
              <CardContent className="pt-6">
                {overallCompliance === "compliant" ? (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>UL Compliance Validated</strong> - All components meet UL standards. Compliance
                      certificate generated.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <strong>UL Compliance Failed</strong> - Some components do not meet UL standards. Manual review
                      required.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Compliance Certificate */}
          {complianceCertificate && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <ShieldCheck className="h-5 w-5" />
                  UL Compliance Certificate Generated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p>
                      <strong>Certificate ID:</strong> {complianceCertificate.certificateId}
                    </p>
                    <p>
                      <strong>BOM ID:</strong> {complianceCertificate.bomId}
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>Validation Date:</strong>{" "}
                      {new Date(complianceCertificate.validationDate).toLocaleDateString()}
                    </p>
                    <p>
                      <strong>UL Rule Version:</strong> {complianceCertificate.ulRuleVersion}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <Button onClick={handleContinue}>Continue to Inventory Check</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Non-Compliant Actions */}
          {overallCompliance === "non-compliant" && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-800">Non-Compliance Actions Required</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    This BOM requires supervisor review due to UL compliance issues.
                  </p>
                  <div className="flex gap-3">
                    <Button variant="outline">Route to Supervisor</Button>
                    <Button variant="outline">Reconfigure BOM</Button>
                    <Button variant="destructive">Admin Override</Button>
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
