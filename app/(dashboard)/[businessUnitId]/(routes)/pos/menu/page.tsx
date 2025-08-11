"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, MoreHorizontal, Edit, Trash2, Utensils, Package, DollarSign, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertModal } from "@/components/modals/alert-modal"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import axios from "axios"
import { useCurrentUser } from "@/lib/current-user"
import { CreateMenuItemModal } from "./components/create-menu-item-modal"
import { EditMenuItemModal } from "./components/edit-menu-item-modal"
import { CreateMenuCategoryModal } from "./components/create-menu-category-modal"

interface MenuItem {
  id: string
  name: string
  description?: string
  price: number
  category: {
    id: string
    name: string
  }
  isActive: boolean
  createdAt: string
}

interface MenuCategory {
  id: string
  name: string
  description?: string
  sortOrder: number
  itemCount: number
}

const MenuManagementPage = () => {
  const params = useParams()
  const router = useRouter()
  const businessUnitId = params.businessUnitId as string
  const user = useCurrentUser()

  // Check authorization
  const isAuthorized = user?.role?.role === 'Admin'

  // State management
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Modal states
  const [createItemOpen, setCreateItemOpen] = useState(false)
  const [editItemOpen, setEditItemOpen] = useState(false)
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false)
  const [deleteItemOpen, setDeleteItemOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)

  // Redirect if not authorized
  useEffect(() => {
    if (!isAuthorized) {
      router.push(`/${businessUnitId}/not-authorized`)
    }
  }, [isAuthorized, router, businessUnitId])

  // Fetch data
  const fetchMenuItems = useCallback(async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/menu-items-management`, {
        headers: { 'x-business-unit-id': businessUnitId }
      })
      setMenuItems(response.data)
    } catch (error) {
      toast.error("Failed to fetch menu items")
      console.error(error)
    }
  }, [businessUnitId])

  const fetchMenuCategories = useCallback(async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/menu-categories-management`, {
        headers: { 'x-business-unit-id': businessUnitId }
      })
      setMenuCategories(response.data)
    } catch (error) {
      toast.error("Failed to fetch menu categories")
      console.error(error)
    }
  }, [businessUnitId])

  useEffect(() => {
    const loadData = async () => {
      if (!isAuthorized) return
      
      setLoading(true)
      await Promise.all([fetchMenuItems(), fetchMenuCategories()])
      setLoading(false)
    }

    if (businessUnitId) {
      loadData()
    }
  }, [businessUnitId, fetchMenuItems, fetchMenuCategories, isAuthorized])

  // Filter menu items
  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = categoryFilter === "all" || item.category.id === categoryFilter
    const matchesStatus = statusFilter === "all" || 
                          (statusFilter === "active" && item.isActive) ||
                          (statusFilter === "inactive" && !item.isActive)

    return matchesSearch && matchesCategory && matchesStatus
  })

  // Menu item actions
  const handleDeleteItem = async () => {
    if (!selectedItem) return
    
    try {
      await axios.delete(`/api/${businessUnitId}/menu-items-management/${selectedItem.id}`, {
        headers: { 'x-business-unit-id': businessUnitId }
      })
      toast.success("Menu item deleted successfully")
      setDeleteItemOpen(false)
      setSelectedItem(null)
      fetchMenuItems()
    } catch (error) {
      toast.error("Failed to delete menu item")
      console.error(error)
    }
  }

  const getStatusBadge = (isActive: boolean) => (
    <Badge variant={isActive ? "default" : "secondary"}>
      {isActive ? "Active" : "Inactive"}
    </Badge>
  )

  // Calculate summary metrics
  const totalItems = menuItems.length
  const activeItems = menuItems.filter(item => item.isActive).length
  const totalCategories = menuCategories.length
  const averagePrice = menuItems.length > 0 ? menuItems.reduce((sum, item) => sum + item.price, 0) / menuItems.length : 0

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
          <h1 className="text-3xl font-bold tracking-tight">Menu Management</h1>
          <p className="text-muted-foreground">
            Manage your restaurant menu items and categories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCreateCategoryOpen(true)} className="gap-2">
            <Tag className="h-4 w-4" />
            Add Category
          </Button>
          <Button onClick={() => setCreateItemOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Menu Item
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Utensils className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">
              {activeItems} active items
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCategories}</div>
            <p className="text-xs text-muted-foreground">
                Total categories
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{averagePrice.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
                Average price of all items
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeItems}</div>
             <p className="text-xs text-muted-foreground">
                Items available for sale
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Menu Items</CardTitle>
          <CardDescription>Filter, search, and manage your menu items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search menu items by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {menuCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Menu Items Grid */}
      <div>
        {filteredMenuItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMenuItems.map((item) => (
              <Card key={item.id} className="flex flex-col justify-between">
                <CardHeader>
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                            <CardTitle className="text-base">{item.name}</CardTitle>
                            <CardDescription className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                                {getStatusBadge(item.isActive)}
                                <Badge variant="outline" className="gap-1">
                                    <Tag className="h-3 w-3"/>{item.category.name}
                                </Badge>
                            </CardDescription>
                        </div>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => { setSelectedItem(item); setEditItemOpen(true); }} className="gap-2">
                                    <Edit className="h-4 w-4" /> Edit Item
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { setSelectedItem(item); setDeleteItemOpen(true); }} className="gap-2 text-destructive focus:text-destructive">
                                    <Trash2 className="h-4 w-4" /> Delete Item
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {item.description || "No description provided."}
                  </p>
                </CardContent>
                <CardFooter>
                    <div className="font-bold text-lg text-green-600">
                      ₱{item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <Utensils className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No menu items found</h3>
            <p className="text-muted-foreground">
              {searchTerm || categoryFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by adding your first menu item"}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateMenuItemModal
        isOpen={createItemOpen}
        onClose={() => setCreateItemOpen(false)}
        onSuccess={() => {
          fetchMenuItems()
          setCreateItemOpen(false)
        }}
        businessUnitId={businessUnitId}
        categories={menuCategories}
      />

      <EditMenuItemModal
        isOpen={editItemOpen}
        onClose={() => {
          setEditItemOpen(false)
          setSelectedItem(null)
        }}
        onSuccess={() => {
          fetchMenuItems()
          setEditItemOpen(false)
          setSelectedItem(null)
        }}
        item={selectedItem}
        businessUnitId={businessUnitId}
        categories={menuCategories}
      />

      <CreateMenuCategoryModal
        isOpen={createCategoryOpen}
        onClose={() => setCreateCategoryOpen(false)}
        onSuccess={() => {
          fetchMenuCategories()
          setCreateCategoryOpen(false)
        }}
        businessUnitId={businessUnitId}
      />

      <AlertModal
        isOpen={deleteItemOpen}
        onClose={() => {
          setDeleteItemOpen(false)
          setSelectedItem(null)
        }}
        onConfirm={handleDeleteItem}
        loading={false}
      />
    </div>
  )
}

export default MenuManagementPage