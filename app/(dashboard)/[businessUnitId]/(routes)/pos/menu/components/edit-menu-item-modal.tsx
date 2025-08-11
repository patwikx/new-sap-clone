"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios from "axios"
import { toast } from "sonner"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Utensils } from "lucide-react"

const editMenuItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  price: z.string().min(1, "Price is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Price must be a positive number"
  }),
  categoryId: z.string().min(1, "Category is required"),
  isActive: z.boolean(),
})

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
}

interface MenuCategory {
  id: string
  name: string
  description?: string
  sortOrder: number
}

interface EditMenuItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  item: MenuItem | null
  businessUnitId: string
  categories: MenuCategory[]
}

export const EditMenuItemModal = ({
  isOpen,
  onClose,
  onSuccess,
  item,
  businessUnitId,
  categories
}: EditMenuItemModalProps) => {
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof editMenuItemSchema>>({
    resolver: zodResolver(editMenuItemSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      categoryId: "",
      isActive: true,
    },
  })

  useEffect(() => {
    if (item && isOpen) {
      form.reset({
        name: item.name,
        description: item.description || "",
        price: item.price.toString(),
        categoryId: item.category.id,
        isActive: item.isActive,
      })
    }
  }, [item, isOpen, form])

  const onSubmit = async (values: z.infer<typeof editMenuItemSchema>) => {
    if (!item) return

    try {
      setLoading(true)
      
      const payload = {
        ...values,
        price: parseFloat(values.price),
      }
      
      await axios.patch(`/api/${businessUnitId}/menu-items-management/${item.id}`, payload, {
        headers: {
          'x-business-unit-id': businessUnitId
        }
      })

      toast.success("Menu item updated successfully")
      onSuccess()
    } catch (error) {
      toast.error(`Failed to update menu item: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  if (!item) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Edit Menu Item
          </DialogTitle>
          <DialogDescription>
            Update the menu item information.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Adobong Manok" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the dish, ingredients, or preparation method" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (₱)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Item is available for ordering
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Item"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}