"use client"

import { useState } from "react"
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

const createInventoryCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
})

interface CreateInventoryCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const CreateInventoryCategoryModal = ({
  isOpen,
  onClose,
  onSuccess
}: CreateInventoryCategoryModalProps) => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof createInventoryCategorySchema>>({
    resolver: zodResolver(createInventoryCategorySchema),
    defaultValues: {
      name: "",
    },
  })

  const onSubmit = async (values: z.infer<typeof createInventoryCategorySchema>) => {
    try {
      setLoading(true)
      
      await axios.post(`/api/${businessUnitId}/inventory-categories-management`, values, {
        headers: {
          'x-business-unit-id': businessUnitId
        }
      })

      toast.success("Inventory category created successfully")
      form.reset()
      onSuccess()
    } catch (error) {
      toast.error(`Failed to create inventory category: ${error}`)
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
            Create Inventory Category
          </DialogTitle>
          <DialogDescription>
            Add a new category to organize your inventory items.
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