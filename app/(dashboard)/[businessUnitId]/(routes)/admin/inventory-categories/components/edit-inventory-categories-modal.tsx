"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios from "axios"
import { toast } from "sonner"
import { useParams } from "next/navigation"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tag } from "lucide-react"

const editInventoryCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
})

interface InventoryCategory {
  id: string
  name: string
  itemCount: number
}

interface EditInventoryCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  category: InventoryCategory | null
}

export const EditInventoryCategoryModal = ({
  isOpen,
  onClose,
  onSuccess,
  category
}: EditInventoryCategoryModalProps) => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof editInventoryCategorySchema>>({
    resolver: zodResolver(editInventoryCategorySchema),
    defaultValues: {
      name: "",
    },
  })

  useEffect(() => {
    if (category && isOpen) {
      form.reset({
        name: category.name,
      })
    }
  }, [category, isOpen, form])

  const onSubmit = async (values: z.infer<typeof editInventoryCategorySchema>) => {
    if (!category) return

    try {
      setLoading(true)
      
      await axios.patch(`/api/${businessUnitId}/inventory-categories-management/${category.id}`, values)

      toast.success("Inventory category updated successfully")
      onSuccess()
    } catch (error) {
      toast.error(`Failed to update inventory category: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  if (!category) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Edit Inventory Category
          </DialogTitle>
          <DialogDescription>
            Update the inventory category information.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Food & Beverages, Housekeeping Supplies" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Category"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}