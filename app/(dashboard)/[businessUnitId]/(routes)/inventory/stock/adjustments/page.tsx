"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios from "axios"
import { toast } from "sonner"
import { useParams, useRouter } from "next/navigation"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, ChevronsUpDown, Check, ArrowLeft, Home, ChevronRight } from "lucide-react"
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

const stockAdjustmentSchema = z.object({
  inventoryStockId: z.string().min(1, "Stock record is required"),
  adjustmentType: z.string().min(1, "Adjustment type is required"),
  quantity: z
    .string()
    .min(1, "Quantity is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) !== 0, {
      message: "Quantity must be a non-zero number",
    }),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
})

interface InventoryStock {
  id: string
  quantityOnHand: number
  inventoryItem: {
    name: string
    itemCode: string | null
  }
  location: {
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

export default function NewStockAdjustmentPage() {
  const params = useParams()
  const router = useRouter()
  const businessUnitId = params.businessUnitId as string

  const [loading, setLoading] = useState(false)
  const [stocks, setStocks] = useState<InventoryStock[]>([])
  const [selectedStock, setSelectedStock] = useState<InventoryStock | null>(null)

  const form = useForm<z.infer<typeof stockAdjustmentSchema>>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      inventoryStockId: "",
      adjustmentType: "",
      quantity: "",
      reason: "",
      notes: "",
    },
  })

  // Fetch stock records
  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const response = await axios.get(`/api/${businessUnitId}/inventory-stocks`, {
          headers: {
            "x-business-unit-id": businessUnitId,
          },
        })
        setStocks(response.data)
      } catch (error) {
        console.error("Failed to fetch stock records:", error)
        toast.error("Failed to load stock records")
      }
    }

    if (businessUnitId) {
      fetchStocks()
    }
  }, [businessUnitId])

  // Watch for stock selection changes
  const watchStockId = form.watch("inventoryStockId")
  useEffect(() => {
    const stock = stocks.find((s) => s.id === watchStockId)
    setSelectedStock(stock || null)
  }, [watchStockId, stocks])

  const onSubmit = async (values: z.infer<typeof stockAdjustmentSchema>) => {
    try {
      setLoading(true)

      await axios.post(`/api/${businessUnitId}/stock-adjustments`, values, {
        headers: {
          "x-business-unit-id": businessUnitId,
        },
      })

      toast.success("Stock adjustment created successfully")
      router.push(`/${businessUnitId}/inventory/stock/adjustments`)
    } catch (error) {
      toast.error(`Failed to create stock adjustment: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push(`/${businessUnitId}/inventory/stock/adjustments`)
  }

  const adjustmentTypes = [
    { value: "INCREASE", label: "Increase Stock" },
    { value: "DECREASE", label: "Decrease Stock" },
  ]

  const reasons = [
    "Physical count adjustment",
    "Damaged goods",
    "Expired items",
    "Theft/Loss",
    "Found inventory",
    "System correction",
    "Other",
  ]

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
              <BreadcrumbLink href={`/${businessUnitId}/inventory`}>Inventory</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/${businessUnitId}/inventory/stock-adjustments`}>Stock Adjustments</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>New Adjustment</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page Title and Back Button */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleCancel} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Adjustments
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6" />
              Create Stock Adjustment
            </h1>
            <p className="text-muted-foreground">Adjust inventory stock levels for physical count corrections.</p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Adjustment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Adjustment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="inventoryStockId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Record</FormLabel>
                    <FormControl>
                      <Combobox
                        options={stocks.map((stock) => ({
                          value: stock.id,
                          label: `${stock.inventoryItem.itemCode} - ${stock.inventoryItem.name} @ ${stock.location.name}`,
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select stock record..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedStock && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedStock.inventoryItem.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedStock.location.name} • Code: {selectedStock.inventoryItem.itemCode}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {Number(selectedStock.quantityOnHand).toLocaleString()} units
                    </Badge>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="adjustmentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adjustment Type</FormLabel>
                      <FormControl>
                        <Combobox
                          options={adjustmentTypes}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select adjustment type..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Combobox
                        options={reasons.map((reason) => ({ value: reason, label: reason }))}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select reason..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional details about the adjustment" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Processing..." : "Create Adjustment"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
