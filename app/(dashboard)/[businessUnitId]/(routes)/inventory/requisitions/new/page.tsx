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
import {
  ClipboardList,
  Plus,
  Trash2,
  Home,
  ChevronRight,
  ChevronsUpDown,
  Check,
} from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"

const requisitionLineSchema = z.object({
  inventoryItemId: z.string().min(1, "Item is required"),
  requestedQuantity: z.string().min(1, "Quantity is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Quantity must be a positive number"
  }),
  notes: z.string().optional(),
})

const createRequisitionSchema = z.object({
  fromLocationId: z.string().min(1, "From location is required"),
  toLocationId: z.string().min(1, "To location is required"),
  requestDate: z.string().min(1, "Request date is required"),
  requiredDate: z.string().min(1, "Required date is required"),
  purpose: z.string().min(1, "Purpose is required"),
  notes: z.string().optional(),
  items: z.array(requisitionLineSchema).min(1, "At least one item is required"),
}).refine((data) => data.fromLocationId !== data.toLocationId, {
  message: "From and To locations must be different",
  path: ["toLocationId"],
})

interface InventoryItem {
  id: string
  name: string
  itemCode: string
  uom: {
    symbol: string
  }
}

interface InventoryLocation {
  id: string
  name: string
}

// Reusable Combobox Component from your reference
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
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
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

export default function NewStockRequisitionPage() {
  const params = useParams()
  const router = useRouter()
  const businessUnitId = params.businessUnitId as string
    
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [locations, setLocations] = useState<InventoryLocation[]>([])

  const form = useForm<z.infer<typeof createRequisitionSchema>>({
    resolver: zodResolver(createRequisitionSchema),
    defaultValues: {
      fromLocationId: "",
      toLocationId: "",
      requestDate: new Date().toISOString().split('T')[0],
      requiredDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      purpose: "",
      notes: "",
      items: [{ inventoryItemId: "", requestedQuantity: "", notes: "" }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  })

  // Fetch reference data
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [itemsRes, locationsRes] = await Promise.all([
          axios.get(`/api/${businessUnitId}/inventory-items`, {
            headers: { 'x-business-unit-id': businessUnitId }
          }),
          axios.get(`/api/${businessUnitId}/inventory-locations`, {
            headers: { 'x-business-unit-id': businessUnitId }
          })
        ])
        setItems(itemsRes.data)
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

  const onSubmit = async (values: z.infer<typeof createRequisitionSchema>) => {
    try {
      setLoading(true)
            
      await axios.post(`/api/${businessUnitId}/stock-requisitions`, values, {
        headers: {
          'x-business-unit-id': businessUnitId
        }
      })

      toast.success("Stock requisition created successfully")
      router.push(`/${businessUnitId}/inventory/requisitions`)
    } catch (error) {
      toast.error(`Failed to create stock requisition ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push(`/${businessUnitId}/inventory/requisitions`)
  }

  const addItem = () => {
    append({ inventoryItemId: "", requestedQuantity: "", notes: "" })
  }

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index)
    }
  }

  const purposes = [
    "Production",
    "Sales",
    "Maintenance",
    "Office Use",
    "Transfer",
    "Other"
  ]

  return (
    <div className="min-h-screen w-full px-6 py-6">
      {/* Page Header with Breadcrumbs */}
      <div className="space-y-4 mb-6">
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
              <BreadcrumbLink href={`/${businessUnitId}/inventory`}>Inventory</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/${businessUnitId}/inventory/requisitions`}>
                Stock Requisitions
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>New Requisition</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6" />
              Create Stock Requisition
            </h1>
            <p className="text-muted-foreground">Request inventory transfer between locations.</p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Header Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Requisition Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fromLocationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Location</FormLabel>
                        <FormControl>
                            <Combobox
                                options={locations.map(loc => ({ value: loc.id, label: loc.name }))}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select source location..."
                            />
                        </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="toLocationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Location</FormLabel>
                        <FormControl>
                            <Combobox
                                options={locations.map(loc => ({ value: loc.id, label: loc.name }))}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select destination location..."
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
                  name="purpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purpose</FormLabel>
                        <FormControl>
                            <Combobox
                                options={purposes.map(p => ({ value: p, label: p }))}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select purpose..."
                            />
                        </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes or instructions" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Requisition Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Requisition Items</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                  <div className="col-span-5">Item</div>
                  <div className="col-span-2">Quantity</div>
                  <div className="col-span-4">Notes</div>
                  <div className="col-span-1">Action</div>
                </div>

                {/* Requisition Items */}
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-5">
                      <FormField
                        control={form.control}
                        name={`items.${index}.inventoryItemId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Combobox
                                options={items.map((item) => ({ value: item.id, label: `${item.itemCode} - ${item.name}` }))}
                                value={field.value}
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
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-4">
                      <FormField
                        control={form.control}
                        name={`items.${index}.notes`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Item notes" {...field} />
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
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Requisition"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
