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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Calculator } from "lucide-react"

const editTaxCodeSchema = z.object({
  code: z.string().min(1, "Tax code is required"),
  name: z.string().min(1, "Name is required"),
  rate: z.string().min(1, "Rate is required").refine((val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100, {
    message: "Rate must be between 0 and 100"
  }),
  type: z.string().min(1, "Type is required"),
  isActive: z.boolean(),
})

const taxTypes = [
  { value: "VAT", label: "Value Added Tax" },
  { value: "WITHHOLDING", label: "Withholding Tax" },
  { value: "OTHER", label: "Other Tax" },
]

interface TaxCode {
  id: string
  code: string
  name: string
  rate: number
  type: string
  isActive: boolean
}

interface EditTaxCodeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  taxCode: TaxCode | null
}

export const EditTaxCodeModal = ({
  isOpen,
  onClose,
  onSuccess,
  taxCode
}: EditTaxCodeModalProps) => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof editTaxCodeSchema>>({
    resolver: zodResolver(editTaxCodeSchema),
    defaultValues: {
      code: "",
      name: "",
      rate: "",
      type: "",
      isActive: true,
    },
  })

  useEffect(() => {
    if (taxCode && isOpen) {
      form.reset({
        code: taxCode.code,
        name: taxCode.name,
        rate: taxCode.rate.toString(),
        type: taxCode.type,
        isActive: taxCode.isActive,
      })
    }
  }, [taxCode, isOpen, form])

  const onSubmit = async (values: z.infer<typeof editTaxCodeSchema>) => {
    if (!taxCode) return

    try {
      setLoading(true)
      
      const payload = {
        ...values,
        rate: parseFloat(values.rate),
      }
      
      await axios.patch(`/api/${businessUnitId}/tax-codes-management/${taxCode.id}`, payload)

      toast.success("Tax code updated successfully")
      onSuccess()
    } catch (error) {
      toast.error(`Failed to update tax code: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  if (!taxCode) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Edit Tax Code
          </DialogTitle>
          <DialogDescription>
            Update the tax code information.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., VAT12" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" step="0.01" placeholder="12.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., VAT 12%" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tax type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {taxTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      Tax code is available for use in transactions
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
                {loading ? "Updating..." : "Update Tax Code"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}