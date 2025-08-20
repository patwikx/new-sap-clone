"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Settings, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  FileText,
  CreditCard,
  Calculator,
} from "lucide-react"
import { toast } from "sonner"
import axios from "axios"
import { useCurrentUser } from "@/lib/current-user"
import { PosConfigurationForm } from "./components/pos-configuration-form"
import { MenuItemGlMappings } from "./components/menu-items-gl-mappings"
import { PaymentMethodGlMappings } from "./components/payment-method-gl-mappings"

// Import shared types from the dedicated file
import {
  PosConfiguration,
  ValidationResult,
  PosConfigFormData
} from "@/types/pos-config"

const POSConfigurationPage = () => {
  const params = useParams()
  const router = useRouter()
  const businessUnitId = params.businessUnitId as string
  const user = useCurrentUser()

  // Check authorization
  const isAuthorized = user?.role?.role === 'Admin'

  // State management
  const [config, setConfig] = useState<PosConfiguration | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)

  // Fetch configuration
  const fetchConfiguration = useCallback(async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/pos/configuration`, {
        headers: { 'x-business-unit-id': businessUnitId }
      })
      setConfig(response.data)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // No configuration exists yet - this is normal for new setups
        setConfig(null)
      } else {
        toast.error("Failed to fetch POS configuration")
        console.error(error)
      }
    }
  }, [businessUnitId])

  // Validate configuration
  const validateConfiguration = useCallback(async () => {
    try {
      setValidating(true)
      const response = await axios.get(`/api/${businessUnitId}/pos/validate-configuration`, {
        headers: { 'x-business-unit-id': businessUnitId }
      })
      setValidation(response.data)
    } catch (error) {
      toast.error("Failed to validate configuration")
      console.error(error)
    } finally {
      setValidating(false)
    }
  }, [businessUnitId])

  useEffect(() => {
    const loadData = async () => {
      if (!isAuthorized) return
      
      setLoading(true)
      await Promise.all([fetchConfiguration(), validateConfiguration()])
      setLoading(false)
    }

    if (businessUnitId) {
      loadData()
    }
  }, [businessUnitId, fetchConfiguration, validateConfiguration, isAuthorized])

  // Redirect if not authorized
  useEffect(() => {
    if (user && !isAuthorized) { // check user to avoid redirect on initial load
      router.push(`/${businessUnitId}/not-authorized`)
    }
  }, [isAuthorized, router, businessUnitId, user])


  const handleConfigurationSave = async (updatedConfig: Omit<PosConfigFormData, 'serviceChargeRate'> & { serviceChargeRate: number }) => {
    try {
      setSaving(true)
      
      const payload = {
        ...updatedConfig,
        // Ensure optional fields that are empty strings are sent as null
        salesRevenueAccountId: updatedConfig.salesRevenueAccountId || null,
        salesTaxAccountId: updatedConfig.salesTaxAccountId || null,
        cashAccountId: updatedConfig.cashAccountId || null,
        discountAccountId: updatedConfig.discountAccountId || null,
        serviceChargeAccountId: updatedConfig.serviceChargeAccountId || null,
        arInvoiceSeriesId: updatedConfig.arInvoiceSeriesId || null,
        journalEntrySeriesId: updatedConfig.journalEntrySeriesId || null,
      };

      if (config?.id) {
        // Update existing configuration
        await axios.patch(`/api/${businessUnitId}/pos/configuration/${config.id}`, payload, {
          headers: { 'x-business-unit-id': businessUnitId }
        })
      } else {
        // Create new configuration
        await axios.post(`/api/${businessUnitId}/pos/configuration`, payload, {
          headers: { 'x-business-unit-id': businessUnitId }
        })
      }
      
      toast.success("POS configuration saved successfully")
      await fetchConfiguration()
      await validateConfiguration()
    } catch (error) {
      toast.error("Failed to save POS configuration")
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const getValidationBadge = () => {
    if (!validation) return null
    
    if (validation.isValid) {
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Valid Configuration
        </Badge>
      )
    }
    
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        {validation.issues.length} Issue(s)
      </Badge>
    )
  }

  if (!isAuthorized) {
    return null // Will redirect in useEffect
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">POS Configuration</h1>
          <p className="text-muted-foreground">
            Configure Point of Sale integration with General Ledger
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getValidationBadge()}
          <Button 
            variant="outline" 
            onClick={validateConfiguration} 
            disabled={validating}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${validating ? 'animate-spin' : ''}`} />
            Validate
          </Button>
        </div>
      </div>

      {/* Validation Results */}
      {validation && !validation.isValid && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Configuration Issues
            </CardTitle>
            <CardDescription>
              The following issues must be resolved before automatic GL posting can be enabled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {validation.issues.map((issue, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <span>{issue}</span>
                </div>
              ))}
            </div>
            {validation.warnings.length > 0 && (
              <>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Warnings:</h4>
                  {validation.warnings.map((warning, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Configuration Sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Main Configuration */}
        <div className="space-y-6">
          <PosConfigurationForm
            config={config}
            onSave={handleConfigurationSave}
            loading={saving}
            businessUnitId={businessUnitId}
          />
        </div>

        {/* GL Mappings */}
        <div className="space-y-6">
          <MenuItemGlMappings businessUnitId={businessUnitId} />
          <PaymentMethodGlMappings businessUnitId={businessUnitId} />
        </div>
      </div>

      {/* Quick Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Quick Setup Guide
          </CardTitle>
          <CardDescription>
            Follow these steps to configure POS for automatic GL posting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">1. GL Accounts</p>
                <p className="text-xs text-muted-foreground">Set up chart of accounts</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">2. Payment Methods</p>
                <p className="text-xs text-muted-foreground">Map to GL accounts</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                <Calculator className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">3. Menu Items</p>
                <p className="text-xs text-muted-foreground">Assign revenue accounts</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                <CheckCircle className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">4. Enable Auto-Post</p>
                <p className="text-xs text-muted-foreground">Turn on automation</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default POSConfigurationPage
