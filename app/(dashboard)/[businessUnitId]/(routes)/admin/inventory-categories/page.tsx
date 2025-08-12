"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, MoreHorizontal, Edit, Trash2, Tag, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { CreateInventoryCategoryModal } from "./components/create-inventory-categories-modal"
import { EditInventoryCategoryModal } from "./components/edit-inventory-categories-modal"


interface InventoryCategory {
  id: string
  name: string
  itemCount: number
  createdAt: string
}

const InventoryCategoriesPage = () => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string

  // State management
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Modal states
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false)
  const [editCategoryOpen, setEditCategoryOpen] = useState(false)
  const [deleteCategoryOpen, setDeleteCategoryOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | null>(null)

  // Fetch data
  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/inventory-categories-management`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        },
      })
      setCategories(response.data)
    } catch (error) {
      toast.error("Failed to fetch inventory categories")
      console.error(error)
    }
  }, [businessUnitId])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchCategories()
      setLoading(false)
    }
    if (businessUnitId) {
      loadData()
    }
  }, [businessUnitId, fetchCategories])

  // Filter categories
  const filteredCategories = categories.filter(category => 
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Category actions
  const handleDeleteCategory = async () => {
    if (!selectedCategory) return
    
    try {
      await axios.delete(`/api/${businessUnitId}/inventory-categories-management/${selectedCategory.id}`, {
        headers: {
          'x-business-unit-id': businessUnitId,
        }
      })
      toast.success("Inventory category deleted successfully")
      setDeleteCategoryOpen(false)
      setSelectedCategory(null)
      fetchCategories()
    } catch (error) {
      toast.error("Failed to delete inventory category")
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
          <h1 className="text-3xl font-bold tracking-tight">Inventory Categories</h1>
          <p className="text-muted-foreground">
            Organize your inventory items into categories
          </p>
        </div>
        <Button onClick={() => setCreateCategoryOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.reduce((sum, c) => sum + c.itemCount, 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Items/Category</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categories.length > 0 ? Math.round(categories.reduce((sum, c) => sum + c.itemCount, 0) / categories.length) : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
          <CardDescription>Find inventory categories by name</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredCategories.length > 0 ? (
          filteredCategories.map((category) => (
            <Card key={category.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-base">{category.name}</CardTitle>
                    <CardDescription className="pt-1">
                      {category.itemCount} item{category.itemCount !== 1 ? 's' : ''}
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
                      <DropdownMenuItem onClick={() => { setSelectedCategory(category); setEditCategoryOpen(true); }} className="gap-2">
                        <Edit className="h-4 w-4" /> Edit Category
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => { setSelectedCategory(category); setDeleteCategoryOpen(true); }} className="gap-2 text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4" /> Delete Category
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">
                  Created: {new Date(category.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="md:col-span-2 lg:col-span-3 xl:col-span-4 text-center py-16 border-2 border-dashed rounded-lg">
            <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No inventory categories found</h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? "Try adjusting your search terms"
                : "Get started by adding your first inventory category"}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateInventoryCategoryModal
        isOpen={createCategoryOpen}
        onClose={() => setCreateCategoryOpen(false)}
        onSuccess={() => {
          fetchCategories()
          setCreateCategoryOpen(false)
        }}
      />

      <EditInventoryCategoryModal
        isOpen={editCategoryOpen}
        onClose={() => {
          setEditCategoryOpen(false)
          setSelectedCategory(null)
        }}
        onSuccess={() => {
          fetchCategories()
          setEditCategoryOpen(false)
          setSelectedCategory(null)
        }}
        category={selectedCategory}
      />

      <AlertModal
        isOpen={deleteCategoryOpen}
        onClose={() => {
          setDeleteCategoryOpen(false)
          setSelectedCategory(null)
        }}
        onConfirm={handleDeleteCategory}
        loading={false}
      />
    </div>
  )
}

export default InventoryCategoriesPage