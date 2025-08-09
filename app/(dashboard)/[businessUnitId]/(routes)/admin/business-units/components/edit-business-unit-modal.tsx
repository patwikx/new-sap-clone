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
import { Building2 } from "lucide-react"

const editBusinessUnitSchema = z.object({
  name: z.string().min(1, "Name is required"),
  functionalCurrency: z.string().min(1, "Functional currency is required"),
  reportingCurrency: z.string().optional(),
})

const currencies = [
  { value: "PHP", label: "Philippine Peso (PHP)" },
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "JPY", label: "Japanese Yen (JPY)" },
  { value: "GBP", label: "British Pound (GBP)" },
  { value: "AUD", label: "Australian Dollar (AUD)" },
  { value: "CAD", label: "Canadian Dollar (CAD)" },
  { value: "SGD", label: "Singapore Dollar (SGD)" },
]

interface BusinessUnit {
  id: string
  name: string
  functionalCurrency: string
  reportingCurrency?: string
}

interface EditBusinessUnitModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  unit: BusinessUnit | null
}

export const EditBusinessUnitModal = ({
  isOpen,
  onClose,
  onSuccess,
  unit
}: EditBusinessUnitModalProps) => {
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof editBusinessUnitSchema>>({
    resolver: zodResolver(editBusinessUnitSchema),
    defaultValues: {
      name: "",
      functionalCurrency: "",
      reportingCurrency: "",
    },
  })

  useEffect(() => {
    if (unit && isOpen) {
      form.reset({
        name: unit.name,
        functionalCurrency: unit.functionalCurrency,
        reportingCurrency: unit.reportingCurrency || "",
      })
    }
  }, [unit, isOpen, form])

  const onSubmit = async (values: z.infer<typeof editBusinessUnitSchema>) => {
    if (!unit) return

    try {
      setLoading(true)
      
      await axios.patch(`/api/business-units/${unit.id}`, values)

      toast.success("Business unit updated successfully")
      onSuccess()
    } catch (error) {
      toast.error(`Failed to update business unit: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  if (!unit) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Edit Business Unit
          </DialogTitle>
          <DialogDescription>
            Update the business unit information.
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
                    <Input placeholder="e.g., Manila Branch" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="functionalCurrency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Functional Currency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select functional currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
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
              name="reportingCurrency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reporting Currency (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reporting currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Same as functional currency</SelectItem>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Unit"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}