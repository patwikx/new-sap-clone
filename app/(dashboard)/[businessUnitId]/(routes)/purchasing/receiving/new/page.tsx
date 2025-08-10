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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Truck, Calculator, Package, Home, ChevronRight } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const goodsReceiptLineSchema = z.object({
  purchaseOrderItemId: z.string().min(1, "PO item is required"),
  quantityReceived: z
    .string()
    .min(1, "Quantity is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Quantity must be a positive number",
    }),
  inventoryLocationId: z.string().min(1, "Location is required"),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
})

const createGoodsReceiptSchema = z.object({
  purchaseOrderId: z.string().min(1, "Purchase order is required"),
  documentDate: z.string().min(1, "Document date is required"),
  postingDate: z.string().min(1, "Posting date is required"),
  deliveryNote: z.string().optional(),
  remarks: z.string().optional(),
  items: z.array(goodsReceiptLineSchema).min(1, "At least one item is required"),
})

interface PurchaseOrder {
  id: string
  poNumber: string
  businessPartner: {
    name: string
  }
  items: {
    id: string
    description: string
    quantity: number
    openQuantity: number
    unitPrice: number
    inventoryItem?: {
      id: string
      name: string
    }
  }[]
}

interface InventoryLocation {
  id: string
  name: string
}

export default function NewGoodsReceiptPage() {
  const params = useParams()
  const router = useRouter()
  const businessUnitId = params.businessUnitId as string

  const [loading, setLoading] = useState(false)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [locations, setLocations] = useState<InventoryLocation[]>([])
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)

  const form = useForm<z.infer<typeof createGoodsReceiptSchema>>({
    resolver: zodResolver(createGoodsReceiptSchema),
    defaultValues: {
      purchaseOrderId: "",
      documentDate: new Date().toISOString().split("T")[0],
      postingDate: new Date().toISOString().split("T")[0],
      deliveryNote: "",
      remarks: "",
      items: [],
    },
  })

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "items",
  })

  // Fetch reference data
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [ordersRes, locationsRes] = await Promise.all([
          axios.get(`/api/${businessUnitId}/purchase-orders?status=OPEN&hasOpenItems=true`, {
            headers: { "x-business-unit-id": businessUnitId },
          }),
          axios.get(`/api/${businessUnitId}/inventory-locations`, {
            headers: { "x-business-unit-id": businessUnitId },
          }),
        ])
        setPurchaseOrders(ordersRes.data)
        setLocations(locationsRes.data)
      } catch (error) {
        console.error("Failed to fetch reference data:", error)
        toast.error("Failed to load reference data")
      }
    }

    if (businessUnitId) {
      fetchReferenceData()
    }
  }, [businessUnitId])

  // Handle PO selection
  const handlePOSelection = (poId: string) => {
    const po = purchaseOrders.find((p) => p.id === poId)
    if (po) {
      setSelectedPO(po)
      const newItems = po.items
        .filter((item) => item.openQuantity > 0)
        .map((item) => ({
          purchaseOrderItemId: item.id,
          quantityReceived: item.openQuantity.toString(),
          inventoryLocationId: "",
          batchNumber: "",
          expiryDate: "",
          notes: "",
        }))
      replace(newItems)
    }
  }

  // Calculate totals
  const items = form.watch("items")
  const totalQuantity = items.reduce((sum, item) => {
    return sum + (Number.parseFloat(item.quantityReceived) || 0)
  }, 0)

  const onSubmit = async (values: z.infer<typeof createGoodsReceiptSchema>) => {
    try {
      setLoading(true)

      await axios.post(`/api/${businessUnitId}/goods-receipts`, values, {
        headers: {
          "x-business-unit-id": businessUnitId,
        },
      })

      toast.success("Goods receipt created successfully")
      router.push(`/${businessUnitId}/purchasing/receiving`)
    } catch (error) {
      toast.error(`Failed to create goods receipt: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push(`/${businessUnitId}/purchasing/receiving`)
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
              <BreadcrumbLink href={`/${businessUnitId}/purchasing/goods-receipts`}>Goods Receipts</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>New Receipt</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page Title and Back Button */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="h-6 w-6" />
              Create Goods Receipt
            </h1>
            <p className="text-muted-foreground">Record the receipt of goods from a purchase order.</p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Header Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Receipt Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="purchaseOrderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Order</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value)
                        handlePOSelection(value)
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select purchase order" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {purchaseOrders.map((po) => (
                          <SelectItem key={po.id} value={po.id}>
                            {po.poNumber} - {po.businessPartner.name} (
                            {po.items.filter((i) => i.openQuantity > 0).length} open items)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedPO && (
                <div className="p-3 bg-muted/50 rounded-md">
                  <p className="text-sm font-medium">Selected PO: {selectedPO.poNumber}</p>
                  <p className="text-xs text-muted-foreground">Vendor: {selectedPO.businessPartner.name}</p>
                </div>
              )}

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
                  name="deliveryNote"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Note #</FormLabel>
                      <FormControl>
                        <Input placeholder="Vendor delivery note number" {...field} />
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
                      <Textarea placeholder="Additional notes about the receipt" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Receipt Items */}
          {selectedPO && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Items to Receive</CardTitle>
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    <span className="text-sm text-muted-foreground">Total Qty:</span>
                    <span className="font-medium">{totalQuantity.toLocaleString()}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Header Row */}
                  <div className="grid grid-cols-16 gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                    <div className="col-span-4">Item Description</div>
                    <div className="col-span-1">Ordered</div>
                    <div className="col-span-1">Open</div>
                    <div className="col-span-2">Receiving</div>
                    <div className="col-span-3">Location</div>
                    <div className="col-span-2">Batch/Lot</div>
                    <div className="col-span-2">Expiry</div>
                    <div className="col-span-1">Notes</div>
                  </div>

                  {/* Receipt Items */}
                  {fields.map((field, index) => {
                    const poItem = selectedPO.items.find(
                      (item) => item.id === form.watch(`items.${index}.purchaseOrderItemId`),
                    )

                    return (
                      <div key={field.id} className="grid grid-cols-16 gap-2 items-start">
                        <div className="col-span-4">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{poItem?.description}</p>
                            {poItem?.inventoryItem && (
                              <Badge variant="outline" className="text-xs">
                                <Package className="h-3 w-3 mr-1" />
                                {poItem.inventoryItem.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="col-span-1 flex items-center justify-center h-9">
                          <span className="text-sm">{poItem?.quantity || 0}</span>
                        </div>
                        <div className="col-span-1 flex items-center justify-center h-9">
                          <span className="text-sm font-medium">{poItem?.openQuantity || 0}</span>
                        </div>
                        <div className="col-span-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantityReceived`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={poItem?.openQuantity || 0}
                                    placeholder="0"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-3">
                          <FormField
                            control={form.control}
                            name={`items.${index}.inventoryLocationId`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="Select location" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {locations.map((location) => (
                                        <SelectItem key={location.id} value={location.id}>
                                          {location.name}
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
                            name={`items.${index}.batchNumber`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input placeholder="Batch/Lot #" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.expiryDate`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-1">
                          <FormField
                            control={form.control}
                            name={`items.${index}.notes`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input placeholder="Notes" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )
                  })}

                  <Separator />

                  {/* Summary Row */}
                  <div className="grid grid-cols-16 gap-2 text-sm font-medium bg-muted/50 p-3 rounded-md">
                    <div className="col-span-15 flex items-center">
                      <Calculator className="h-4 w-4 mr-2" />
                      <span>Total Quantity Receiving:</span>
                      <span className="ml-2 font-bold">{totalQuantity.toLocaleString()}</span>
                    </div>
                    <div className="col-span-1"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedPO}>
              {loading ? "Creating..." : "Create Receipt"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
