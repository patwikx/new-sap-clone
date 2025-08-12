"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  Settings,
  ExternalLink
} from "lucide-react"
import { useState, useEffect } from "react"
import axios from "axios"
import { toast } from "sonner"
import Link from "next/link"

interface ValidationResult {
  isValid: boolean
  issues: string[]
  warnings: string[]
}

interface ConfigurationValidatorProps {
  businessUnitId: string
}

export function ConfigurationValidator({ businessUnitId }: ConfigurationValidatorProps) {
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [loading, setLoading] = useState(false)

  const validateConfiguration = async () => {
    if (!businessUnitId) return

    try {
      setLoading(true)
      const response = await axios.get(
        `/api/${businessUnitId}/pos/validate-configuration`,
        {
          headers: { "x-business-unit-id": businessUnitId }
        }
      )
      setValidation(response.data)
    } catch (error) {
      console.error("Failed to validate POS configuration:", error)
      toast.error("Failed to validate POS configuration")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    validateConfiguration()
  }, [businessUnitId])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          Validating POS configuration...
        </CardContent>
      </Card>
    )
  }

  if (!validation) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <AlertTriangle className="h-4 w-4 mr-2 text-destructive" />
          Failed to validate configuration
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              POS Configuration
            </CardTitle>
            <CardDescription>
              Validation status for POS to accounting integration
            </CardDescription>
          </div>
          <Badge variant={validation.isValid ? "default" : "destructive"} className="gap-1">
            {validation.isValid ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <AlertTriangle className="h-3 w-3" />
            )}
            {validation.isValid ? "Valid" : "Issues Found"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {validation.isValid ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              POS configuration is valid. Orders can be posted to the General Ledger automatically.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Configuration issues found. Please resolve these before posting orders to GL.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Issues to resolve:</h4>
              <ul className="space-y-1">
                {validation.issues.map((issue, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <AlertTriangle className="h-3 w-3 mt-0.5 text-orange-500 flex-shrink-0" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/${businessUnitId}/pos/menu`}>
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Configure Menu
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/${businessUnitId}/pos/configuration`}>
                  <ExternalLink className="h-3 w-3 mr-1" />
                  POS Configuration
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/${businessUnitId}/admin/payment-methods`}>
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Configure Payment Methods
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/${businessUnitId}/financials/chart-of-accounts`}>
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Configure GL Accounts
                </Link>
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={validateConfiguration} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Re-validate
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}