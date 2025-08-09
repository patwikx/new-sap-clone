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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Hash } from "lucide-react"

const createNumberingSeriesSchema = z.object({
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

interface CreateNumberingSeriesModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const CreateNumberingSeriesModal = ({
  isOpen,
  onClose,
  onSuccess
}: CreateNumberingSeriesModalProps) => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof createNumberingSeriesSchema>>({
    resolver: zodResolver(createNumberingSeriesSchema),
    defaultValues: {
      name: "",
      prefix: "",
      nextNumber: "1",
      documentType: "",
    },
  })

  const onSubmit = async (values: z.infer<typeof createNumberingSeriesSchema>) => {
    try {
      setLoading(true)
      
      await axios.post(`/api/${businessUnitId}/numbering-series`, values, {
        headers: {
          'x-business-unit-id': businessUnitId
        }
      })

      toast.success("Numbering series created successfully")
      form.reset()
      onSuccess()
    } catch (error) {
      toast.error(`Failed to create numbering series: ${error}`)
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
            <Hash className="h-5 w-5" />
            Create Numbering Series
          </DialogTitle>
          <DialogDescription>
            Add a new numbering series for document generation.
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
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Series"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}