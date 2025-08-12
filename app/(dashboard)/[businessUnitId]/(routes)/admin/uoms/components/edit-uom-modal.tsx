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
import { Package } from "lucide-react"

const editUoMSchema = z.object({
  name: z.string().min(1, "Name is required"),
  symbol: z.string().min(1, "Symbol is required").max(10, "Symbol must be 10 characters or less"),
})

interface UoM {
  id: string
  name: string
  symbol: string
}

interface EditUoMModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  uom: UoM | null
}

export const EditUoMModal = ({
  isOpen,
  onClose,
  onSuccess,
  uom
}: EditUoMModalProps) => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof editUoMSchema>>({
    resolver: zodResolver(editUoMSchema),
    defaultValues: {
      name: "",
      symbol: "",
    },
  })

  useEffect(() => {
    if (uom && isOpen) {
      form.reset({
        name: uom.name,
        symbol: uom.symbol,
      })
    }
  }, [uom, isOpen, form])

  const onSubmit = async (values: z.infer<typeof editUoMSchema>) => {
    if (!uom) return

    try {
      setLoading(true)
      
      await axios.patch(`/api/${businessUnitId}/uoms-management/${uom.id}`, values)

      toast.success("Unit of measure updated successfully")
      onSuccess()
    } catch (error) {
      toast.error(`Failed to update unit of measure: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  if (!uom) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Edit Unit of Measure
          </DialogTitle>
          <DialogDescription>
            Update the unit of measure information.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Kilogram, Piece, Liter" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Symbol</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., kg, pc, L" {...field} />
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
                {loading ? "Updating..." : "Update UoM"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}