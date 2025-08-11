"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios from "axios"
import { toast } from "sonner"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tag } from "lucide-react"

const createMenuCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  sortOrder: z.string().optional().refine((val) => !val || (!isNaN(Number(val)) && Number(val) > 0), {
    message: "Sort order must be a positive number"
  }),
})

interface CreateMenuCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  businessUnitId: string
}

export const CreateMenuCategoryModal = ({
  isOpen,
  onClose,
  onSuccess,
  businessUnitId
}: CreateMenuCategoryModalProps) => {
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof createMenuCategorySchema>>({
    resolver: zodResolver(createMenuCategorySchema),
    defaultValues: {
      name: "",
      description: "",
      sortOrder: "1",
    },
  })

  const onSubmit = async (values: z.infer<typeof createMenuCategorySchema>) => {
    try {
      setLoading(true)
      
      const payload = {
        ...values,
        sortOrder: values.sortOrder ? parseInt(values.sortOrder) : 1,
      }
      
      await axios.post(`/api/${businessUnitId}/menu-categories-management`, payload, {
        headers: {
          'x-business-unit-id': businessUnitId
        }
      })

      toast.success("Menu category created successfully")
      form.reset()
      onSuccess()
    } catch (error) {
      toast.error(`Failed to create menu category: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    form.reset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Create Menu Category
          </DialogTitle>
          <DialogDescription>
            Add a new category to organize your menu items.
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
                    <Input placeholder="e.g., Filipino Specialties" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Brief description of this category" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort Order</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" placeholder="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Category"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}