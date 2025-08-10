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
import {
  ClipboardList,
  Plus,
  Trash2,
  Calculator,
  ChevronsUpDown,
  Check,
  Home,
  ChevronRight,
} from "lucide-react"
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

const purchaseRequestLineSchema = z.object({
  description: z.string().min(1, "Description is required"),
  inventoryItemId: z.string().optional(),
  requestedQuantity: z
    .string()
    .min(1, "Quantity is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Quantity must be a positive number",
    }),
  uomId: z.string().min(1, "Unit of measure is required"),
  estimatedPrice: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
      message: "Price must be a valid positive number",
    }),
  notes: z.string().optional(),
})

const createPurchaseRequestSchema = z
  .object({
    requestDate: z.string().min(1, "Request date is required"),
    requiredDate: z.string().min(1, "Required date is required"),
    priority: z.string().min(1, "Priority is required"),
    justification: z.string().optional(),
    items: z.array(purchaseRequestLineSchema).min(1, "At least one item is required"),
  })
  .refine((data) => new Date(data.requestDate) <= new Date(data.requiredDate), {
    message: "Required date must be after request date",
    path: ["requiredDate"],
  })

const priorities = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
]

interface InventoryItem {
  id: string
  name: string
}

interface UoM {
  id: string
  name: string
  symbol: string
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

export default function NewPurchaseRequestPage() {
  const params = useParams()
  const router = useRouter()
  const businessUnitId = params.businessUnitId as string

  const [loading, setLoading] = useState(false)
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [uoms, setUoms] = useState<UoM[]>([])

  const form = useForm<z.infer<typeof createPurchaseRequestSchema>>({
    resolver: zodResolver(createPurchaseRequestSchema),
    defaultValues: {
      requestDate: new Date().toISOString().split("T")[0],
      requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      priority: "MEDIUM",
      justification: "",
      items: [
        { description: "", inventoryItemId: "", requestedQuantity: "", uomId: "", estimatedPrice: "", notes: "" },
      ],
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
        const [itemsRes, uomsRes] = await Promise.all([
          axios.get(`/api/${businessUnitId}/inventory-items`, {
            headers: { "x-business-unit-id": businessUnitId },
          }),
          axios.get(`/api/${businessUnitId}/uoms`, {
            headers: { "x-business-unit-id": businessUnitId },
          }),
        ])
        setInventoryItems(itemsRes.data)
        setUoms(uomsRes.data)
      } catch (error) {
        console.error("Failed to fetch reference data:", error)
        toast.error("Failed to load reference data")
      }
    }

    if (businessUnitId) {
      fetchReferenceData()
    }
  }, [businessUnitId])

  // Calculate total estimated amount
  const items = form.watch("items")
  const totalEstimated = items.reduce((sum, item) => {
    const qty = Number.parseFloat(item.requestedQuantity) || 0
    const price = Number.parseFloat(item.estimatedPrice || "0") || 0
    return sum + qty * price
  }, 0)

  const onSubmit = async (values: z.infer<typeof createPurchaseRequestSchema>) => {
    try {
      setLoading(true)

      await axios.post(`/api/${businessUnitId}/purchase-requests`, values, {
        headers: {
          "x-business-unit-id": businessUnitId,
        },
      })

      toast.success("Purchase request created successfully")
      router.push(`/${businessUnitId}/purchasing/requests`)
    } catch (error) {
      toast.error(`Failed to create purchase request: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push(`/${businessUnitId}/purchasing/purchase-requests`)
  }

  const addItem = () => {
    append({ description: "", inventoryItemId: "", requestedQuantity: "", uomId: "", estimatedPrice: "", notes: "" })
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
              <BreadcrumbLink href={`/${businessUnitId}/purchasing/purchase-requests`}>
                Purchase Requests
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>New Request</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page Title and Back Button */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6" />
              Create Purchase Request
            </h1>
            <p className="text-muted-foreground">Create a new purchase request for procurement approval.</p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Header Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="requestDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Request Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="requiredDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Required Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {priorities.map((priority) => (
                            <SelectItem key={priority.value} value={priority.value}>
                              {priority.label}
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
                name="justification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Justification</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Business justification for this request" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Request Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Request Items</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    <span className="text-sm text-muted-foreground">Total Estimated:</span>
                    <span className="font-medium">₱{totalEstimated.toLocaleString()}</span>
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
                  <div className="col-span-2">UoM</div>
                  <div className="col-span-2">Est. Price</div>
                  <div className="col-span-2">Notes</div>
                  <div className="col-span-1">Action</div>
                </div>

                {/* Request Items */}
                {fields.map((field, index) => (
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
                        name={`items.${index}.requestedQuantity`}
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
                        name={`items.${index}.uomId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Combobox
                                options={uoms.map((uom) => ({ value: uom.id, label: uom.symbol }))}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="UoM"
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
                        name={`items.${index}.estimatedPrice`}
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
                ))}

                <Separator />

                {/* Summary Row */}
                <div className="grid grid-cols-16 gap-2 text-sm font-medium bg-muted/50 p-3 rounded-md">
                  <div className="col-span-14 flex items-center">
                    <Calculator className="h-4 w-4 mr-2" />
                    <span>Total Estimated Amount:</span>
                  </div>
                  <div className="col-span-1 text-right">₱{totalEstimated.toLocaleString()}</div>
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
              {loading ? "Creating..." : "Create Request"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
