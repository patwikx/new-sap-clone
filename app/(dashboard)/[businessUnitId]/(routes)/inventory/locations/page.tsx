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
    quantityOnHand: number | string // Allow string to handle API data gracefully
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
  
  // FIXED: Ensure values are treated as numbers before adding them up.
  const totalStockQuantity = locations.reduce((sum, loc) => 
    sum + loc.stocks.reduce((locSum, stock) => locSum + Number(stock.quantityOnHand), 0), 0)

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">Unique Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStockRecords}</div>
            <p className="text-xs text-muted-foreground">
              Stocked item varieties
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStockQuantity.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total units on hand
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Items/Location</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {/* FIXED: Use Math.round for a clean integer display. */}
              {totalLocations > 0 ? Math.round(totalStockRecords / totalLocations) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Average stock diversity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Locations Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Locations ({filteredLocations.length})</CardTitle>
          <CardDescription>Search for a location or browse the list below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, description, or contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {filteredLocations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredLocations.map((location) => (
                <Card key={location.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <CardTitle>{location.name}</CardTitle>
                        <CardDescription className="pt-2">
                          {location.description || "No description provided."}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => { setSelectedLocation(location); setEditLocationOpen(true); }} className="gap-2">
                            <Edit className="h-4 w-4" /> Edit Location
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => { setSelectedLocation(location); setDeleteLocationOpen(true); }} className="gap-2 text-destructive focus:text-destructive">
                            <Trash2 className="h-4 w-4" /> Delete Location
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 flex-grow">
                     <div className="space-y-2 text-sm text-muted-foreground">
                        {location.address && (
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 flex-shrink-0" />
                                <span>{location.address}</span>
                            </div>
                        )}
                        {location.contactPerson && (
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 flex-shrink-0" />
                                <span>{location.contactPerson}{location.phone && ` • ${location.phone}`}</span>
                            </div>
                        )}
                    </div>
                    {location.stocks.length > 0 && (
                      <div className="border-t pt-4">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                          Stock Highlights ({location.stocks.reduce((sum, s) => sum + Number(s.quantityOnHand), 0).toLocaleString()} total units)
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {location.stocks.slice(0, 5).map((stock) => (
                            <Badge key={stock.id} variant="secondary" className="text-xs">
                              {/* FIXED: Format the number for display. */}
                              {stock.inventoryItem.name}: {Number(stock.quantityOnHand).toLocaleString()}
                            </Badge>
                          ))}
                          {location.stocks.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{location.stocks.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No inventory locations found</h3>
              <p className="text-muted-foreground">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Get started by adding your first inventory location"}
              </p>
            </div>
          )}
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