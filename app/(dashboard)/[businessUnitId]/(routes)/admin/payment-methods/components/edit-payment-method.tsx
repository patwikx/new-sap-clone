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
import { Switch } from "@/components/ui/switch"
import { CreditCard } from "lucide-react"

const editPaymentMethodSchema = z.object({
  name: z.string().min(1, "Name is required"),
  isActive: z.boolean(),
})

interface PaymentMethod {
  id: string
  name: string
  isActive: boolean
}

interface EditPaymentMethodModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  method: PaymentMethod | null
}

export const EditPaymentMethodModal = ({
  isOpen,
  onClose,
  onSuccess,
  method
}: EditPaymentMethodModalProps) => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof editPaymentMethodSchema>>({
    resolver: zodResolver(editPaymentMethodSchema),
    defaultValues: {
      name: "",
      isActive: true,
    },
  })

  useEffect(() => {
    if (method && isOpen) {
      form.reset({
        name: method.name,
        isActive: method.isActive,
      })
    }
  }, [method, isOpen, form])

  const onSubmit = async (values: z.infer<typeof editPaymentMethodSchema>) => {
    if (!method) return

    try {
      setLoading(true)
      
      await axios.patch(`/api/${businessUnitId}/payment-methods-management/${method.id}`, values)

      toast.success("Payment method updated successfully")
      onSuccess()
    } catch (error) {
      toast.error(`Failed to update payment method: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  if (!method) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Edit Payment Method
          </DialogTitle>
          <DialogDescription>
            Update the payment method information.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Method Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Cash, Credit Card, GCash" {...field} />
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
                      Payment method is available for transactions
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
                {loading ? "Updating..." : "Update Method"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}