"use client"

import { CommandGroup } from "@/components/ui/command"

import { CommandEmpty } from "@/components/ui/command"

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
import { ShoppingCart, Plus, Trash2, Calculator, ChevronsUpDown, Check } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Home, ChevronRight } from "lucide-react"

const purchaseOrderLineSchema = z.object({
  description: z.string().min(1, "Description is required"),
  inventoryItemId: z.string().optional(),
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
  glAccountId: z.string().optional(),
})

const createPurchaseOrderSchema = z.object({
  bpCode: z.string().min(1, "Vendor is required"),
  documentDate: z.string().min(1, "Document date is required"),
  postingDate: z.string().min(1, "Posting date is required"),
  deliveryDate: z.string().min(1, "Delivery date is required"),
  purchaseRequestId: z.string().min(1, "A Purchase Request is required"),
  remarks: z.string().optional(),
  items: z.array(purchaseOrderLineSchema).min(1, "At least one item is required"),
})

interface BusinessPartner {
  id: string
  bpCode: string
  name: string
  type: string
}

interface InventoryItem {
  id: string
  name: string
}

interface GlAccount {
  id: string
  accountCode: string
  name: string
}

interface PurchaseRequest {
  id: string
  prNumber: string
  items: {
    id: string
    description: string
    requestedQuantity: number
    inventoryItem?: {
      id: string
      name: string
    }
  }[]
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

export default function NewPurchaseOrderPage() {
  const params = useParams()
  const router = useRouter()
  const businessUnitId = params.businessUnitId as string

  const [loading, setLoading] = useState(false)
  const [vendors, setVendors] = useState<BusinessPartner[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [glAccounts, setGlAccounts] = useState<GlAccount[]>([])
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([])

  const form = useForm<z.infer<typeof createPurchaseOrderSchema>>({
    resolver: zodResolver(createPurchaseOrderSchema),
    defaultValues: {
      bpCode: "",
      documentDate: new Date().toISOString().split("T")[0],
      postingDate: new Date().toISOString().split("T")[0],
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      purchaseRequestId: "",
      remarks: "",
      items: [{ description: "", inventoryItemId: "", quantity: "", unitPrice: "", glAccountId: "" }],
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
        const [vendorsRes, itemsRes, accountsRes, requestsRes] = await Promise.all([
          axios.get(`/api/${businessUnitId}/business-partners?type=VENDOR`, {
            headers: { "x-business-unit-id": businessUnitId },
          }),
          axios.get(`/api/${businessUnitId}/inventory-items`, {
            headers: { "x-business-unit-id": businessUnitId },
          }),
          axios.get(`/api/${businessUnitId}/gl-accounts`, {
            headers: { "x-business-unit-id": businessUnitId },
          }),
          axios.get(`/api/${businessUnitId}/purchase-requests?status=APPROVED`, {
            headers: { "x-business-unit-id": businessUnitId },
          }),
        ])

        setVendors(vendorsRes.data.filter((bp: BusinessPartner) => bp.type === "VENDOR" || bp.type === "BOTH"))
        setInventoryItems(itemsRes.data)
        setGlAccounts(accountsRes.data)
        setPurchaseRequests(requestsRes.data)
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
    return sum + qty * price
  }, 0)

  // Handle PR selection
  const handlePRSelection = (prId: string) => {
    const selectedPR = purchaseRequests.find((pr) => pr.id === prId)
    if (selectedPR) {
      const newItems = selectedPR.items.map((item) => ({
        description: item.description,
        inventoryItemId: item.inventoryItem?.id || "",
        quantity: item.requestedQuantity.toString(),
        unitPrice: "",
        glAccountId: "",
      }))
      form.setValue("items", newItems)
    }
  }

  const onSubmit = async (values: z.infer<typeof createPurchaseOrderSchema>) => {
    try {
      setLoading(true)

      await axios.post(`/api/${businessUnitId}/purchase-orders`, values, {
        headers: {
          "x-business-unit-id": businessUnitId,
        },
      })

      toast.success("Purchase order created successfully")
      router.push(`/${businessUnitId}/purchasing/orders`)
    } catch (error) {
      toast.error(`Failed to create purchase order: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push(`/${businessUnitId}/purchasing/orders`)
  }

  const addItem = () => {
    append({ description: "", inventoryItemId: "", quantity: "", unitPrice: "", glAccountId: "" })
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
              <BreadcrumbLink href={`/${businessUnitId}/purchasing`}>Purchasing</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/${businessUnitId}/purchasing/orders`}>Purchase Orders</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>New Order</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page Title and Back Button */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-6 w-6" />
              Create Purchase Order
            </h1>
            <p className="text-muted-foreground">Create a new purchase order for vendor procurement.</p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Header Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bpCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor</FormLabel>
                      <FormControl>
                        <Combobox
                          options={vendors.map((v) => ({ value: v.bpCode, label: `${v.bpCode} - ${v.name}` }))}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select vendor..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="purchaseRequestId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Based on Purchase Request</FormLabel>
                      <FormControl>
                        <Combobox
                          options={purchaseRequests.map((pr) => ({
                            value: pr.id,
                            label: `${pr.prNumber} (${pr.items.length} items)`,
                          }))}
                          value={field.value}
                          onChange={(value) => {
                            field.onChange(value)
                            if (value) handlePRSelection(value)
                          }}
                          placeholder="Select PR..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
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
                <FormField
                  control={form.control}
                  name="deliveryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Date</FormLabel>
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
                      <Textarea placeholder="Additional notes or instructions" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Order Items</CardTitle>
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
                <div className="grid grid-cols-16 gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                  <div className="col-span-4">Description</div>
                  <div className="col-span-3">Inventory Item</div>
                  <div className="col-span-2">Quantity</div>
                  <div className="col-span-2">Unit Price</div>
                  <div className="col-span-3">GL Account</div>
                  <div className="col-span-1">Line Total</div>
                  <div className="col-span-1">Action</div>
                </div>

                {/* Order Items */}
                {fields.map((field, index) => {
                  const qty = Number.parseFloat(form.watch(`items.${index}.quantity`)) || 0
                  const price = Number.parseFloat(form.watch(`items.${index}.unitPrice`)) || 0
                  const lineTotal = qty * price

                  return (
                    <div key={field.id} className="grid grid-cols-16 gap-2 items-start">
                      <div className="col-span-4">
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
                      <div className="col-span-3">
                        <FormField
                          control={form.control}
                          name={`items.${index}.inventoryItemId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Combobox
                                  options={inventoryItems.map((item) => ({ value: item.id, label: item.name }))}
                                  value={field.value || ""}
                                  onChange={field.onChange}
                                  placeholder="Select item..."
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
                                <Input type="number" step="0.01" min="0" placeholder="0" {...field} />
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
                      <div className="col-span-3">
                        <FormField
                          control={form.control}
                          name={`items.${index}.glAccountId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Combobox
                                  options={glAccounts.map((acc) => ({
                                    value: acc.id,
                                    label: `${acc.accountCode} - ${acc.name}`,
                                  }))}
                                  value={field.value || ""}
                                  onChange={field.onChange}
                                  placeholder="Select GL Account..."
                                />
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
                <div className="grid grid-cols-16 gap-2 text-sm font-medium bg-muted/50 p-3 rounded-md">
                  <div className="col-span-14 flex items-center">
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
              {loading ? "Creating..." : "Create Purchase Order"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
