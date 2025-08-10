"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios from "axios"
import { toast } from "sonner"
import { useParams, useRouter } from "next/navigation"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { FileText, Plus, Trash2, Calculator, ChevronsUpDown, Check, Home, ChevronRight } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

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
  discount: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
      message: "Discount must be a valid positive number",
    }),
})

const createSalesQuotationSchema = z.object({
  bpCode: z.string().min(1, "Customer is required"),
  validUntil: z.string().min(1, "Valid until date is required"),
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

// Reusable Combobox Component
const Combobox = ({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  placeholder: string
}) => {
  const [open, setOpen] = useState(false)
  const selectedOption = options.find((option) => option.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-9 font-normal bg-transparent"
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value === value ? "" : option.value)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default function NewSalesQuotationPage() {
  const params = useParams()
  const router = useRouter()
  const businessUnitId = params.businessUnitId as string

  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<BusinessPartner[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])

  const form = useForm<z.infer<typeof createSalesQuotationSchema>>({
    resolver: zodResolver(createSalesQuotationSchema),
    defaultValues: {
      bpCode: "",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      remarks: "",
      items: [{ menuItemId: "", quantity: "1", unitPrice: "", discount: "" }],
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
        setCustomers(customersRes.data.filter((bp: BusinessPartner) => bp.type === "CUSTOMER" || bp.type === "BOTH"))
        setMenuItems(menuItemsRes.data)
      } catch (error) {
        console.error("Failed to fetch reference data:", error)
        toast.error("Failed to load reference data")
      }
    }

    if (businessUnitId) {
      fetchReferenceData()
    }
  }, [businessUnitId])

  // Calculate totals
  const items = form.watch("items")
  const totalAmount = items.reduce((sum, item) => {
    const qty = Number.parseFloat(item.quantity) || 0
    const price = Number.parseFloat(item.unitPrice) || 0
    const discount = Number.parseFloat(item.discount || "0") || 0
    return sum + (qty * price - discount)
  }, 0)

  // Handle menu item selection
  const handleMenuItemChange = (index: number, menuItemId: string) => {
    const selectedItem = menuItems.find((item) => item.id === menuItemId)
    if (selectedItem) {
      form.setValue(`items.${index}.unitPrice`, selectedItem.price.toString())
    }
  }

  const onSubmit = async (values: z.infer<typeof createSalesQuotationSchema>) => {
    try {
      setLoading(true)

      await axios.post(`/api/${businessUnitId}/sales-quotations`, values, {
        headers: {
          "x-business-unit-id": businessUnitId,
        },
      })
      toast.success("Sales quotation created successfully")
      router.push(`/${businessUnitId}/sales/quotations`)
    } catch (error) {
      toast.error(`Failed to create sales quotation: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push(`/${businessUnitId}/sales/quotations`)
  }

  const addItem = () => {
    append({ menuItemId: "", quantity: "1", unitPrice: "", discount: "" })
  }

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index)
    }
  }

  return (
    <div className="min-h-screen w-full px-6 py-6">
      {/* Page Header with Breadcrumbs */}
      <div className="space-y-4 mb-6">
        {/* Breadcrumbs */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/${businessUnitId}`} className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/${businessUnitId}/sales`}>Sales</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/${businessUnitId}/sales/quotations`}>Sales Quotations</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>New Quotation</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page Title */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Create Sales Quotation
            </h1>
            <p className="text-muted-foreground">Create a new sales quotation for customer pricing.</p>
          </div>
        </div>
      </div>

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
                      <FormControl>
                        <Combobox
                          options={customers.map((customer) => ({
                            value: customer.bpCode,
                            label: `${customer.bpCode} - ${customer.name}`,
                          }))}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select customer..."
                        />
                      </FormControl>
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
                  <div className="col-span-2">Quantity</div>
                  <div className="col-span-2">Unit Price</div>
                  <div className="col-span-2">Discount</div>
                  <div className="col-span-1">Line Total</div>
                  <div className="col-span-1">Action</div>
                </div>

                {/* Quotation Items */}
                {fields.map((field, index) => {
                  const qty = Number.parseFloat(form.watch(`items.${index}.quantity`)) || 0
                  const price = Number.parseFloat(form.watch(`items.${index}.unitPrice`)) || 0
                  const discount = Number.parseFloat(form.watch(`items.${index}.discount`) || "0") || 0
                  const lineTotal = qty * price - discount

                  return (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.menuItemId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Combobox
                                  options={menuItems.map((item) => ({
                                    value: item.id,
                                    label: `${item.name} - ₱${item.price}`,
                                  }))}
                                  value={field.value}
                                  onChange={(value) => {
                                    field.onChange(value)
                                    handleMenuItemChange(index, value)
                                  }}
                                  placeholder="Select menu item..."
                                />
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
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.discount`}
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

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Quotation"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
