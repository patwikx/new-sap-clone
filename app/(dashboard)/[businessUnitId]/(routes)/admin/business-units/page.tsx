"use client"

import { useState, useEffect } from "react"
import { Plus, Search, MoreHorizontal, Edit, Trash2, Building2, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AlertModal } from "@/components/modals/alert-modal"
import { toast } from "sonner"
import axios from "axios"
import { CreateBusinessUnitModal } from "./components/create-business-unit-modal"
import { EditBusinessUnitModal } from "./components/edit-business-unit-modal"

interface BusinessUnit {
  id: string
  name: string
  functionalCurrency: string
  reportingCurrency?: string
  createdAt: string
}

const BusinessUnitsPage = () => {
  // State management
  const [units, setUnits] = useState<BusinessUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Modal states
  const [createUnitOpen, setCreateUnitOpen] = useState(false)
  const [editUnitOpen, setEditUnitOpen] = useState(false)
  const [deleteUnitOpen, setDeleteUnitOpen] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<BusinessUnit | null>(null)

  // Fetch data
  const fetchUnits = async () => {
    try {
      const response = await axios.get('/api/business-units?includeAll=true')
      setUnits(response.data)
    } catch (error) {
      toast.error("Failed to fetch business units")
      console.error(error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchUnits()
      setLoading(false)
    }
    loadData()
  }, [])

  // Filter units
  const filteredUnits = units.filter(unit => 
    unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.functionalCurrency.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Unit actions
  const handleDeleteUnit = async () => {
    if (!selectedUnit) return
    
    try {
      await axios.delete(`/api/business-units/${selectedUnit.id}`)
      toast.success("Business unit deleted successfully")
      setDeleteUnitOpen(false)
      setSelectedUnit(null)
      fetchUnits()
    } catch (error) {
      toast.error("Failed to delete business unit")
      console.error(error)
    }
  }

  const getCurrencyBadge = (currency: string) => (
    <Badge variant="outline" className="gap-1">
      <DollarSign className="h-3 w-3" />
      {currency}
    </Badge>
  )

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
          <h1 className="text-3xl font-bold tracking-tight">Business Units</h1>
          <p className="text-muted-foreground">
            Manage business units and their configurations across your organization
          </p>
        </div>
        <Button onClick={() => setCreateUnitOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Business Unit
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Units</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{units.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Currencies</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(units.map(u => u.functionalCurrency)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Multi-Currency</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {units.filter(u => u.reportingCurrency && u.reportingCurrency !== u.functionalCurrency).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
          <CardDescription>Find business units by name or currency</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search business units..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Units List */}
      <Card>
        <CardHeader>
          <CardTitle>Business Units ({filteredUnits.length})</CardTitle>
          <CardDescription>
            Manage your organization&apos;s business units
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUnits.map((unit) => (
              <div
                key={unit.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{unit.name}</p>
                      {getCurrencyBadge(unit.functionalCurrency)}
                      {unit.reportingCurrency && unit.reportingCurrency !== unit.functionalCurrency && (
                        <Badge variant="secondary" className="gap-1">
                          <DollarSign className="h-3 w-3" />
                          {unit.reportingCurrency} (Reporting)
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Created: {new Date(unit.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedUnit(unit)
                        setEditUnitOpen(true)
                      }}
                      className="gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Unit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedUnit(unit)
                        setDeleteUnitOpen(true)
                      }}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Unit
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}

            {filteredUnits.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No business units found</h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "Try adjusting your search terms"
                    : "Get started by adding your first business unit"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateBusinessUnitModal
        isOpen={createUnitOpen}
        onClose={() => setCreateUnitOpen(false)}
        onSuccess={() => {
          fetchUnits()
          setCreateUnitOpen(false)
        }}
      />

      <EditBusinessUnitModal
        isOpen={editUnitOpen}
        onClose={() => {
          setEditUnitOpen(false)
          setSelectedUnit(null)
        }}
        onSuccess={() => {
          fetchUnits()
          setEditUnitOpen(false)
          setSelectedUnit(null)
        }}
        unit={selectedUnit}
      />

      <AlertModal
        isOpen={deleteUnitOpen}
        onClose={() => {
          setDeleteUnitOpen(false)
          setSelectedUnit(null)
        }}
        onConfirm={handleDeleteUnit}
        loading={false}
      />
    </div>
  )
}

export default BusinessUnitsPage