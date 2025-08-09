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
import { Textarea } from "@/components/ui/textarea"
import { Users } from "lucide-react"

const editBusinessPartnerSchema = z.object({
  bpCode: z.string().min(1, "BP Code is required"),
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  tinId: z.string().optional(),
  contactPerson: z.string().optional(),
  paymentTerms: z.string().optional(),
  creditLimit: z.string().optional().refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
    message: "Credit limit must be a valid positive number"
  }),
})

const businessPartnerTypes = [
  { value: "CUSTOMER", label: "Customer" },
  { value: "VENDOR", label: "Vendor" },
  { value: "BOTH", label: "Both" },
]

const paymentTermsOptions = [
  { value: "NET_30", label: "Net 30 Days" },
  { value: "NET_15", label: "Net 15 Days" },
  { value: "NET_7", label: "Net 7 Days" },
  { value: "COD", label: "Cash on Delivery" },
  { value: "PREPAID", label: "Prepaid" },
]

interface BusinessPartner {
  id: string
  bpCode: string
  name: string
  type: string
  phone?: string
  email?: string
  address?: string
  tinId?: string
  contactPerson?: string
  paymentTerms?: string
  creditLimit?: number
}

interface EditBusinessPartnerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  partner: BusinessPartner | null
}

export const EditBusinessPartnerModal = ({
  isOpen,
  onClose,
  onSuccess,
  partner
}: EditBusinessPartnerModalProps) => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof editBusinessPartnerSchema>>({
    resolver: zodResolver(editBusinessPartnerSchema),
    defaultValues: {
      bpCode: "",
      name: "",
      type: "",
      phone: "",
      email: "",
      address: "",
      tinId: "",
      contactPerson: "",
      paymentTerms: "",
      creditLimit: "",
    },
  })

  useEffect(() => {
    if (partner && isOpen) {
      form.reset({
        bpCode: partner.bpCode,
        name: partner.name,
        type: partner.type,
        phone: partner.phone || "",
        email: partner.email || "",
        address: partner.address || "",
        tinId: partner.tinId || "",
        contactPerson: partner.contactPerson || "",
        paymentTerms: partner.paymentTerms || "",
        creditLimit: partner.creditLimit?.toString() || "",
      })
    }
  }, [partner, isOpen, form])

  const onSubmit = async (values: z.infer<typeof editBusinessPartnerSchema>) => {
    if (!partner) return

    try {
      setLoading(true)
      
      const payload = {
        ...values,
        creditLimit: values.creditLimit ? parseFloat(values.creditLimit) : undefined,
      }
      
      await axios.patch(`/api/${businessUnitId}/business-partners/${partner.id}`, payload)

      toast.success("Business partner updated successfully")
      onSuccess()
    } catch (error) {
      toast.error(`Failed to update business partner: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  if (!partner) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Edit Business Partner
          </DialogTitle>
          <DialogDescription>
            Update the business partner information.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bpCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BP Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., CUST-001" {...field} />
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
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {businessPartnerTypes.map((type) => (
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
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., ABC Corporation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., +63 2 1234 5678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="e.g., contact@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Complete address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tinId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax ID / TIN</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 123-456-789-000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Person</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Terms</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment terms" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentTermsOptions.map((term) => (
                          <SelectItem key={term.value} value={term.value}>
                            {term.label}
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
                name="creditLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credit Limit</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Partner"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}