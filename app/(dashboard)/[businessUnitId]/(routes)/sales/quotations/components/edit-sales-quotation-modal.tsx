"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { FileText, Plus, Trash2, Calculator } from "lucide-react"

const quotationLineSchema = z.object({
  menuItemId: z.string().min(1, "Menu item is required"),
  quantity: z
    .string()
    .min(1, "Quantity is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Quantity must be a positive number",
    }),
  unitPrice: z
    .string()
    .min(1, "Unit price is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: "Unit price must be a valid positive number",
    }),
  description: z.string().optional(),
})

const editSalesQuotationSchema = z.object({
  bpCode: z.string().min(1, "Customer is required"),
  validUntil: z.string().min(1, "Valid until date is required"),
  documentDate: z.string().min(1, "Document date is required"),
  postingDate: z.string().min(1, "Posting date is required"),
  remarks: z.string().optional(),
  items: z.array(quotationLineSchema).min(1, "At least one item is required"),
})

interface BusinessPartner {
  id: string
  bpCode: string
  name: string
  type: string
}

interface MenuItem {
  id: string
  name: string
  price: number
  category: {
    name: string
  }
}

interface SalesQuotation {
  id: string
  docNum: string
  bpCode: string
  businessPartner: {
    name: string
  }
  validUntil: string
  documentDate: string
  postingDate: string
  status: string
  totalAmount: number
  remarks?: string
  owner: {
    name: string
  }
  items: {
    id: string
    menuItemId: string
    quantity: number
    unitPrice: number
    description: string
    menuItem: {
      name: string
    }
  }[]
  createdAt: string
}

interface EditSalesQuotationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  quotation: SalesQuotation | null
}

export const EditSalesQuotationModal = ({ isOpen, onClose, onSuccess, quotation }: EditSalesQuotationModalProps) => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string

  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<BusinessPartner[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])

  const form = useForm<z.infer<typeof editSalesQuotationSchema>>({
    resolver: zodResolver(editSalesQuotationSchema),
    defaultValues: {
      bpCode: "",
      validUntil: "",
      documentDate: "",
      postingDate: "",
      remarks: "",
      items: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  })

  // Fetch reference data
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [customersRes, menuItemsRes] = await Promise.all([
          axios.get(`/api/${businessUnitId}/business-partners?type=CUSTOMER`, {
            headers: { "x-business-unit-id": businessUnitId },
          }),
          axios.get(`/api/${businessUnitId}/menu-items`, {
            headers: { "x-business-unit-id": businessUnitId },
          }),
        ])
        setCustomers(customersRes.data.filter((bp: BusinessPartner) => bp.type === "CUSTOMER"))
        setMenuItems(menuItemsRes.data)
      } catch (error) {
        console.error("Failed to fetch reference data:", error)
      }
    }

    if (isOpen && businessUnitId) {
      fetchReferenceData()
    }
  }, [isOpen, businessUnitId])

  useEffect(() => {
    if (quotation && isOpen) {
      form.reset({
        bpCode: quotation.bpCode,
        validUntil: new Date(quotation.validUntil).toISOString().split("T")[0],
        documentDate: new Date(quotation.documentDate).toISOString().split("T")[0],
        postingDate: new Date(quotation.postingDate).toISOString().split("T")[0],
        remarks: quotation.remarks || "",
        items: quotation.items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          description: item.description || "",
        })),
      })
    }
  }, [quotation, isOpen, form])

  // Calculate totals
  const items = form.watch("items")
  const totalAmount = items.reduce((sum, item) => {
    const qty = Number.parseFloat(item.quantity) || 0
    const price = Number.parseFloat(item.unitPrice) || 0
    return sum + qty * price // Removed discount calculation
  }, 0)

  const onSubmit = async (values: z.infer<typeof editSalesQuotationSchema>) => {
    if (!quotation) return

    try {
      setLoading(true)

      await axios.patch(`/api/${businessUnitId}/sales-quotations/${quotation.id}`, values, {
        headers: {
          "x-business-unit-id": businessUnitId,
        },
      })
      toast.success("Sales quotation updated successfully")
      onSuccess()
    } catch (error) {
      toast.error(`Failed to update sales quotation: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const addItem = () => {
    append({ menuItemId: "", quantity: "1", unitPrice: "", description: "" })
  }

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index)
    }
  }

  // Handle menu item selection to auto-fill price
  const handleMenuItemSelection = (index: number, menuItemId: string) => {
    const menuItem = menuItems.find((item) => item.id === menuItemId)
    if (menuItem) {
      form.setValue(`items.${index}.unitPrice`, menuItem.price.toString())
      if (!form.getValues(`items.${index}.description`)) {
        form.setValue(`items.${index}.description`, menuItem.name)
      }
    }
  }

  if (!quotation) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Edit Sales Quotation - {quotation.docNum}
          </DialogTitle>
          <DialogDescription>Update the sales quotation details and line items.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Header Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quotation Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bpCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select customer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {customers.map((customer) => (
                              <SelectItem key={customer.bpCode} value={customer.bpCode}>
                                {customer.bpCode} - {customer.name}
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
                    name="validUntil"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valid Until</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="documentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Document Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="postingDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Posting Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remarks</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes or terms" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Quotation Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Quotation Items</CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      <span className="text-sm text-muted-foreground">Total:</span>
                      <span className="font-medium">₱{totalAmount.toLocaleString()}</span>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Header Row */}
                  <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                    <div className="col-span-4">Menu Item</div>
                    <div className="col-span-2">Description</div>
                    <div className="col-span-2">Quantity</div>
                    <div className="col-span-2">Unit Price</div>
                    <div className="col-span-1">Line Total</div>
                    <div className="col-span-1">Action</div>
                  </div>

                  {/* Quotation Items */}
                  {fields.map((field, index) => {
                    const qty = Number.parseFloat(form.watch(`items.${index}.quantity`)) || 0
                    const price = Number.parseFloat(form.watch(`items.${index}.unitPrice`)) || 0
                    const lineTotal = qty * price

                    return (
                      <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                        <div className="col-span-4">
                          <FormField
                            control={form.control}
                            name={`items.${index}.menuItemId`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Select
                                    onValueChange={(value) => {
                                      field.onChange(value)
                                      handleMenuItemSelection(index, value)
                                    }}
                                    value={field.value}
                                  >
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="Select menu item" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {menuItems.map((item) => (
                                        <SelectItem key={item.id} value={item.id}>
                                          {item.name} - ₱{item.price}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input placeholder="Item description" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input type="number" step="0.01" min="0" placeholder="1" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.unitPrice`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-1 flex items-center justify-center h-9">
                          <span className="text-sm font-medium">₱{lineTotal.toFixed(2)}</span>
                        </div>
                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            disabled={fields.length <= 1}
                            className="h-9 w-9 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}

                  <Separator />

                  {/* Totals Row */}
                  <div className="grid grid-cols-12 gap-2 text-sm font-medium bg-muted/50 p-3 rounded-md">
                    <div className="col-span-10 flex items-center">
                      <Calculator className="h-4 w-4 mr-2" />
                      <span>Total Amount:</span>
                    </div>
                    <div className="col-span-1 text-right">₱{totalAmount.toFixed(2)}</div>
                    <div className="col-span-1"></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Quotation"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
