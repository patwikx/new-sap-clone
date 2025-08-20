"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreditCard, Save, AlertTriangle, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import axios from "axios"

interface PaymentMethod {
  id: string
  name: string
  isActive: boolean
  glMapping?: {
    id: string
    glAccountId: string
    glAccount: {
      accountCode: string
      name: string
    }
  }
}

interface GlAccount {
  id: string
  accountCode: string
  name: string
  accountType: {
    name: string
  }
}

interface PaymentMethodGlMappingsProps {
  businessUnitId: string
}

export const PaymentMethodGlMappings = ({ businessUnitId }: PaymentMethodGlMappingsProps) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [glAccounts, setGlAccounts] = useState<GlAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [mappings, setMappings] = useState<Record<string, string>>({})

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [methodsRes, accountsRes] = await Promise.all([
        axios.get(`/api/${businessUnitId}/pos/payment-methods-with-mappings`, {
          headers: { 'x-business-unit-id': businessUnitId }
        }),
        axios.get(`/api/${businessUnitId}/gl-accounts`, {
          headers: { 'x-business-unit-id': businessUnitId }
        })
      ])
      
      setPaymentMethods(methodsRes.data)
      setGlAccounts(accountsRes.data)
      
      // Initialize mappings from existing data
      const initialMappings: Record<string, string> = {}
      methodsRes.data.forEach((method: PaymentMethod) => {
        initialMappings[method.id] = method.glMapping?.glAccountId || ""
      })
      setMappings(initialMappings)
    } catch (error) {
      console.error("Failed to fetch data:", error)
      toast.error("Failed to load payment methods and GL accounts")
    } finally {
      setLoading(false)
    }
  }, [businessUnitId]);

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleMappingChange = (paymentMethodId: string, glAccountId: string) => {
    setMappings(prev => ({
      ...prev,
      [paymentMethodId]: glAccountId
    }))
  }

  const saveMapping = async (paymentMethodId: string) => {
    try {
      setSaving(paymentMethodId)
      
      const glAccountId = mappings[paymentMethodId]
      if (!glAccountId) {
        toast.error("GL account is required")
        setSaving(null); // Reset saving state
        return
      }

      await axios.post(`/api/${businessUnitId}/pos/payment-method-gl-mappings`, {
        paymentMethodId,
        glAccountId,
      }, {
        headers: { 'x-business-unit-id': businessUnitId }
      })

      toast.success("GL mapping saved successfully")
      await fetchData() // Refresh data
    } catch (error) {
      console.error("Failed to save mapping:", error)
      toast.error("Failed to save GL mapping")
    } finally {
      setSaving(null)
    }
  }

  const getMappingStatus = (method: PaymentMethod) => {
    if (method.glMapping?.glAccountId) {
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Mapped
        </Badge>
      )
    }
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Not Mapped
      </Badge>
    )
  }

  // Filter accounts - payment methods typically map to asset accounts (cash, bank)
  const assetAccounts = glAccounts.filter(acc => acc.accountType.name === 'ASSET')

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Method GL Mappings
        </CardTitle>
        <CardDescription>
          Map payment methods to General Ledger accounts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {paymentMethods.filter(method => method.isActive).map((method) => (
            <div key={method.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{method.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {method.glMapping?.glAccount ? 
                      `${method.glMapping.glAccount.accountCode} - ${method.glMapping.glAccount.name}` :
                      "No GL account assigned"
                    }
                  </p>
                </div>
                {getMappingStatus(method)}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Select
                    value={mappings[method.id] || ""}
                    onValueChange={(value) => handleMappingChange(method.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select GL account" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.accountCode} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => saveMapping(method.id)}
                  disabled={saving === method.id || !mappings[method.id]}
                  size="sm"
                  className="gap-2"
                >
                  <Save className="h-3 w-3" />
                  {saving === method.id ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ))}

          {paymentMethods.filter(method => method.isActive).length === 0 && (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No active payment methods found</h3>
              <p className="text-muted-foreground">
                Create payment methods first to configure GL mappings
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
