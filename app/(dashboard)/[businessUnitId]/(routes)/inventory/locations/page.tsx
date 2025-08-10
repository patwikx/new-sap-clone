"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, MoreHorizontal, Edit, Trash2, MapPin, Package, Building2, Users } from "lucide-react"
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
import { useParams } from "next/navigation"
import { toast } from "sonner"
import axios from "axios"
import { CreateLocationModal } from "./components/create-locations-modal"
import { EditLocationModal } from "./components/edit-locations-modal"


interface InventoryLocation {
  id: string
  name: string
  description?: string
  address?: string
  contactPerson?: string
  phone?: string
  stocks: {
    id: string
    quantityOnHand: number
    inventoryItem: {
      name: string
    }
  }[]
  createdAt: string
}

const InventoryLocationsPage = () => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string

  // State management
  const [locations, setLocations] = useState<InventoryLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Modal states
  const [createLocationOpen, setCreateLocationOpen] = useState(false)
  const [editLocationOpen, setEditLocationOpen] = useState(false)
  const [deleteLocationOpen, setDeleteLocationOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<InventoryLocation | null>(null)

  // Fetch data
  const fetchLocations = useCallback(async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/inventory-locations`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        },
      })
      setLocations(response.data)
    } catch (error) {
      toast.error("Failed to fetch inventory locations")
      console.error(error)
    }
  }, [businessUnitId])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchLocations()
      setLoading(false)
    }
    if (businessUnitId) {
      loadData()
    }
  }, [businessUnitId, fetchLocations])

  // Filter locations
  const filteredLocations = locations.filter(location => 
    location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calculate metrics
  const totalLocations = locations.length
  const totalStockRecords = locations.reduce((sum, loc) => sum + loc.stocks.length, 0)
  const totalStockValue = locations.reduce((sum, loc) => 
    sum + loc.stocks.reduce((locSum, stock) => locSum + stock.quantityOnHand, 0), 0)

  // Location actions
  const handleDeleteLocation = async () => {
    if (!selectedLocation) return
    
    try {
      await axios.delete(`/api/${businessUnitId}/inventory-locations/${selectedLocation.id}`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        }
      })
      toast.success("Inventory location deleted successfully")
      setDeleteLocationOpen(false)
      setSelectedLocation(null)
      fetchLocations()
    } catch (error) {
      toast.error("Failed to delete inventory location")
      console.error(error)
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Inventory Locations</h1>
          <p className="text-muted-foreground">
            Manage warehouse locations and storage facilities
          </p>
        </div>
        <Button onClick={() => setCreateLocationOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Location
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLocations}</div>
            <p className="text-xs text-muted-foreground">
              Active storage locations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Records</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStockRecords}</div>
            <p className="text-xs text-muted-foreground">
              Items across all locations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
            <Building2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStockValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Units in all locations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Items/Location</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalLocations > 0 ? Math.round(totalStockRecords / totalLocations) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Average stock diversity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
          <CardDescription>Find inventory locations by name, description, or contact</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search inventory locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Locations List */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Locations ({filteredLocations.length})</CardTitle>
          <CardDescription>
            Manage your warehouse and storage locations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredLocations.map((location) => (
              <div
                key={location.id}
                className="flex items-center justify-between p-6 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{location.name}</h3>
                      <Badge variant="outline" className="gap-1">
                        <Package className="h-3 w-3" />
                        {location.stocks.length} items
                      </Badge>
                    </div>
                    {location.description && (
                      <p className="text-sm text-muted-foreground">{location.description}</p>
                    )}
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      {location.address && (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {location.address}
                        </div>
                      )}
                      {location.contactPerson && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {location.contactPerson}
                          {location.phone && ` • ${location.phone}`}
                        </div>
                      )}
                    </div>
                    {location.stocks.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {location.stocks.slice(0, 3).map((stock) => (
                          <Badge key={stock.id} variant="secondary" className="text-xs">
                            {stock.inventoryItem.name}: {stock.quantityOnHand}
                          </Badge>
                        ))}
                        {location.stocks.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{location.stocks.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
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
                        setSelectedLocation(location)
                        setEditLocationOpen(true)
                      }}
                      className="gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Location
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedLocation(location)
                        setDeleteLocationOpen(true)
                      }}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Location
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}

            {filteredLocations.length === 0 && (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No inventory locations found</h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "Try adjusting your search terms"
                    : "Get started by adding your first inventory location"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateLocationModal
        isOpen={createLocationOpen}
        onClose={() => setCreateLocationOpen(false)}
        onSuccess={() => {
          fetchLocations()
          setCreateLocationOpen(false)
        }}
      />

      <EditLocationModal
        isOpen={editLocationOpen}
        onClose={() => {
          setEditLocationOpen(false)
          setSelectedLocation(null)
        }}
        onSuccess={() => {
          fetchLocations()
          setEditLocationOpen(false)
          setSelectedLocation(null)
        }}
        location={selectedLocation}
      />

      <AlertModal
        isOpen={deleteLocationOpen}
        onClose={() => {
          setDeleteLocationOpen(false)
          setSelectedLocation(null)
        }}
        onConfirm={handleDeleteLocation}
        loading={false}
      />
    </div>
  )
}

export default InventoryLocationsPage