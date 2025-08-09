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
import { Hash } from "lucide-react"

const editNumberingSeriesSchema = z.object({
  name: z.string().min(1, "Name is required"),
  prefix: z.string().min(1, "Prefix is required"),
  nextNumber: z.string().min(1, "Next number is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Next number must be a positive number"
  }),
  documentType: z.string().min(1, "Document type is required"),
})

const documentTypes = [
  { value: "SALES_ORDER", label: "Sales Order" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "AR_INVOICE", label: "AR Invoice" },
  { value: "PURCHASE_REQUEST", label: "Purchase Request" },
  { value: "PURCHASE_ORDER", label: "Purchase Order" },
  { value: "GOODS_RECEIPT_PO", label: "Goods Receipt PO" },
  { value: "AP_INVOICE", label: "AP Invoice" },
  { value: "JOURNAL_ENTRY", label: "Journal Entry" },
  { value: "INCOMING_PAYMENT", label: "Incoming Payment" },
  { value: "OUTGOING_PAYMENT", label: "Outgoing Payment" },
]

interface NumberingSeries {
  id: string
  name: string
  prefix: string
  nextNumber: number
  documentType: string
}

interface EditNumberingSeriesModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  series: NumberingSeries | null
}

export const EditNumberingSeriesModal = ({
  isOpen,
  onClose,
  onSuccess,
  series
}: EditNumberingSeriesModalProps) => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof editNumberingSeriesSchema>>({
    resolver: zodResolver(editNumberingSeriesSchema),
    defaultValues: {
      name: "",
      prefix: "",
      nextNumber: "1",
      documentType: "",
    },
  })

  useEffect(() => {
    if (series && isOpen) {
      form.reset({
        name: series.name,
        prefix: series.prefix,
        nextNumber: series.nextNumber.toString(),
        documentType: series.documentType,
      })
    }
  }, [series, isOpen, form])

  const onSubmit = async (values: z.infer<typeof editNumberingSeriesSchema>) => {
    if (!series) return

    try {
      setLoading(true)
      
      await axios.patch(`/api/${businessUnitId}/numbering-series/${series.id}`, values)

      toast.success("Numbering series updated successfully")
      onSuccess()
    } catch (error) {
      toast.error(`Failed to update numbering series: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  if (!series) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Edit Numbering Series
          </DialogTitle>
          <DialogDescription>
            Update the numbering series information.
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
                    <Input placeholder="e.g., Sales Order - Manila" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="documentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {documentTypes.map((type) => (
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
              name="prefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prefix</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., SO-MNL-" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nextNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Next Number</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" placeholder="1" {...field} />
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
                {loading ? "Updating..." : "Update Series"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}