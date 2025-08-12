"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Utensils, Save, AlertTriangle, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import axios from "axios"

interface MenuItem {
  id: string
  name: string
  price: number
  category: {
    name: string
  }
  glMapping?: {
    id: string
    salesAccountId: string
    cogsAccountId?: string
    inventoryAccountId?: string
    salesAccount: {
      accountCode: string
      name: string
    }
    cogsAccount?: {
      accountCode: string
      name: string
    }
    inventoryAccount?: {
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

interface MenuItemGlMappingsProps {
  businessUnitId: string
}

export const MenuItemGlMappings = ({ businessUnitId }: MenuItemGlMappingsProps) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [glAccounts, setGlAccounts] = useState<GlAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [mappings, setMappings] = useState<Record<string, {
    salesAccountId: string
    cogsAccountId: string
    inventoryAccountId: string
  }>>({})

  useEffect(() => {
    fetchData()
  }, [businessUnitId])

  const fetchData = async () => {
    try {
      const [menuRes, accountsRes] = await Promise.all([
        axios.get(`/api/${businessUnitId}/pos/menu-items-with-mappings`, {
          headers: { 'x-business-unit-id': businessUnitId }
        }),
        axios.get(`/api/${businessUnitId}/gl-accounts`, {
          headers: { 'x-business-unit-id': businessUnitId }
        })
      ])
      
      setMenuItems(menuRes.data)
      setGlAccounts(accountsRes.data)
      
      // Initialize mappings from existing data
      const initialMappings: Record<string, any> = {}
      menuRes.data.forEach((item: MenuItem) => {
        if (item.glMapping) {
          initialMappings[item.id] = {
            salesAccountId: item.glMapping.salesAccountId,
            cogsAccountId: item.glMapping.cogsAccountId || "",
            inventoryAccountId: item.glMapping.inventoryAccountId || "",
          }
        } else {
          initialMappings[item.id] = {
            salesAccountId: "",
            cogsAccountId: "",
            inventoryAccountId: "",
          }
        }
      })
      setMappings(initialMappings)
    } catch (error) {
      console.error("Failed to fetch data:", error)
      toast.error("Failed to load menu items and GL accounts")
    } finally {
      setLoading(false)
    }
  }

  const handleMappingChange = (menuItemId: string, field: string, value: string) => {
    setMappings(prev => ({
      ...prev,
      [menuItemId]: {
        ...prev[menuItemId],
        [field]: value
      }
    }))
  }

  const saveMapping = async (menuItemId: string) => {
    try {
      setSaving(menuItemId)
      
      const mapping = mappings[menuItemId]
      if (!mapping.salesAccountId) {
        toast.error("Sales account is required")
        return
      }

      await axios.post(`/api/${businessUnitId}/pos/menu-item-gl-mappings`, {
        menuItemId,
        salesAccountId: mapping.salesAccountId,
        cogsAccountId: mapping.cogsAccountId || null,
        inventoryAccountId: mapping.inventoryAccountId || null,
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

  const getMappingStatus = (item: MenuItem) => {
    if (item.glMapping?.salesAccountId) {
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

  // Filter accounts by type
  const revenueAccounts = glAccounts.filter(acc => acc.accountType.name === 'REVENUE')
  const assetAccounts = glAccounts.filter(acc => acc.accountType.name === 'ASSET')
  const expenseAccounts = glAccounts.filter(acc => acc.accountType.name === 'EXPENSE')

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
          <Utensils className="h-5 w-5" />
          Menu Item GL Mappings
        </CardTitle>
        <CardDescription>
          Map menu items to General Ledger accounts for automatic posting
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {menuItems.map((item) => (
            <div key={item.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{item.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {item.category.name} • ₱{item.price.toLocaleString()}
                  </p>
                </div>
                {getMappingStatus(item)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sales Revenue Account *</label>
                  <Select
                    value={mappings[item.id]?.salesAccountId || ""}
                    onValueChange={(value) => handleMappingChange(item.id, 'salesAccountId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select revenue account" />
                    </SelectTrigger>
                    <SelectContent>
                      {revenueAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.accountCode} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">COGS Account</label>
                  <Select
                    value={mappings[item.id]?.cogsAccountId || ""}
                    onValueChange={(value) => handleMappingChange(item.id, 'cogsAccountId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select COGS account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No COGS Account</SelectItem>
                      {expenseAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.accountCode} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Inventory Account</label>
                  <Select
                    value={mappings[item.id]?.inventoryAccountId || ""}
                    onValueChange={(value) => handleMappingChange(item.id, 'inventoryAccountId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select inventory account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Inventory Account</SelectItem>
                      {assetAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.accountCode} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => saveMapping(item.id)}
                  disabled={saving === item.id || !mappings[item.id]?.salesAccountId}
                  size="sm"
                  className="gap-2"
                >
                  <Save className="h-3 w-3" />
                  {saving === item.id ? "Saving..." : "Save Mapping"}
                </Button>
              </div>
            </div>
          ))}

          {menuItems.length === 0 && (
            <div className="text-center py-8">
              <Utensils className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No menu items found</h3>
              <p className="text-muted-foreground">
                Create menu items first to configure GL mappings
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}