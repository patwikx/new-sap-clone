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
import { MapPin } from "lucide-react"

const editTableSchema = z.object({
  name: z.string().min(1, "Table name is required"),
  capacity: z.string().optional().refine((val) => !val || (!isNaN(Number(val)) && Number(val) > 0), {
    message: "Capacity must be a positive number"
  }),
  location: z.string().optional(),
  status: z.string().min(1, "Status is required"),
})

interface Table {
  id: string
  name: string
  status: string
  capacity?: number
  location?: string
}

interface EditTableModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  table: Table | null
  businessUnitId: string
}

export const EditTableModal = ({
  isOpen,
  onClose,
  onSuccess,
  table,
  businessUnitId
}: EditTableModalProps) => {
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof editTableSchema>>({
    resolver: zodResolver(editTableSchema),
    defaultValues: {
      name: "",
      capacity: "",
      location: "",
      status: "",
    },
  })

  useEffect(() => {
    if (table && isOpen) {
      form.reset({
        name: table.name,
        capacity: table.capacity?.toString() || "",
        location: table.location || "",
        status: table.status,
      })
    }
  }, [table, isOpen, form])

  const onSubmit = async (values: z.infer<typeof editTableSchema>) => {
    if (!table) return

    try {
      setLoading(true)
      
      const payload = {
        ...values,
        capacity: values.capacity ? parseInt(values.capacity) : undefined,
      }
      
      await axios.patch(`/api/${businessUnitId}/pos/tables-management/${table.id}`, payload, {
        headers: {
          'x-business-unit-id': businessUnitId
        }
      })

      toast.success("Table updated successfully")
      onSuccess()
    } catch (error) {
      toast.error(`Failed to update table: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  if (!table) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Edit Table
          </DialogTitle>
          <DialogDescription>
            Update the table information.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Table Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Table 1, VIP Table A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder="4" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="AVAILABLE">Available</SelectItem>
                        <SelectItem value="OCCUPIED">Occupied</SelectItem>
                        <SelectItem value="RESERVED">Reserved</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Main Dining, Terrace, VIP Area" {...field} />
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
                {loading ? "Updating..." : "Update Table"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}