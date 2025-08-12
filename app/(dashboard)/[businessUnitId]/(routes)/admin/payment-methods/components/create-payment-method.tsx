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
import { Switch } from "@/components/ui/switch"
import { CreditCard } from "lucide-react"

const createPaymentMethodSchema = z.object({
  name: z.string().min(1, "Name is required"),
  isActive: z.boolean().default(true).optional(),
})

interface CreatePaymentMethodModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const CreatePaymentMethodModal = ({
  isOpen,
  onClose,
  onSuccess
}: CreatePaymentMethodModalProps) => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof createPaymentMethodSchema>>({
    resolver: zodResolver(createPaymentMethodSchema),
    defaultValues: {
      name: "",
      isActive: true,
    },
  })

  const onSubmit = async (values: z.infer<typeof createPaymentMethodSchema>) => {
    try {
      setLoading(true)
      
      await axios.post(`/api/${businessUnitId}/payment-methods-management`, values, {
        headers: {
          'x-business-unit-id': businessUnitId
        }
      })

      toast.success("Payment method created successfully")
      form.reset()
      onSuccess()
    } catch (error) {
      toast.error(`Failed to create payment method: ${error}`)
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
            <CreditCard className="h-5 w-5" />
            Create Payment Method
          </DialogTitle>
          <DialogDescription>
            Add a new payment method for transactions.
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
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Method"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}