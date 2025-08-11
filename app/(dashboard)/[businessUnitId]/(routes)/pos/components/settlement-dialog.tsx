"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import axios from "axios"
import { CreditCard, Calculator, Receipt, Lock, Unlock } from "lucide-react"
import { SupervisorOverrideDialog } from "./supervisor-override-dialog"
import type { ExistingOrder, OrderItem } from "@/types/pos"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

const settlementSchema = z.object({
  paymentMethodId: z.string().min(1, "Payment method is required"),
  amountReceived: z
    .string()
    .min(1, "Amount received is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Amount must be a positive number",
    }),
  discountId: z.string().optional(),
  discountAmount: z.string().optional(),
})

interface PaymentMethod {
  id: string
  name: string
}

interface Discount {
  id: string
  name: string
  type: "PERCENTAGE" | "FIXED_AMOUNT"
  value: number
}

interface SettlementDialogProps {
  isOpen: boolean
  onClose: () => void
  order: ExistingOrder | null | undefined
  onComplete: () => void
  businessUnitId: string
}

export const SettlementDialog = ({ isOpen, onClose, order, onComplete, businessUnitId }: SettlementDialogProps) => {
  const [loading, setLoading] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [discounts, setDiscounts] = useState<Discount[]>([])
  
  const [isDiscountUnlocked, setIsDiscountUnlocked] = useState(false)
  const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState(false)

  const form = useForm<z.infer<typeof settlementSchema>>({
    resolver: zodResolver(settlementSchema),
    defaultValues: {
      paymentMethodId: "",
      amountReceived: "",
      discountId: "",
      discountAmount: "",
    },
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [paymentRes, discountRes] = await Promise.all([
          axios.get<PaymentMethod[]>(`/api/${businessUnitId}/payment-methods`, {
            headers: { "x-business-unit-id": businessUnitId },
          }),
          axios.get<Discount[]>(`/api/${businessUnitId}/pos/discounts`, {
            headers: { "x-business-unit-id": businessUnitId },
          }),
        ])
        setPaymentMethods(paymentRes.data)
        setDiscounts(discountRes.data)
      } catch (error) {
        console.error("Failed to fetch settlement data:", error)
      }
    }

    if (isOpen && businessUnitId) {
      fetchData()
    }
  }, [isOpen, businessUnitId])

  const subtotal =
    order?.items?.reduce((sum: number, item: OrderItem) => {
      const lineTotal = typeof item.lineTotal === "number" ? item.lineTotal : Number(item.lineTotal) || 0
      return sum + lineTotal
    }, 0) || 0

  const discountAmount = Number(form.watch("discountAmount")) || 0
  const totalAfterDiscount = subtotal - discountAmount
  const finalTotal = totalAfterDiscount * 1.12
  const amountReceived = Number(form.watch("amountReceived")) || 0
  const change = amountReceived - finalTotal

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount)
  }

  useEffect(() => {
    if (finalTotal > 0) {
      form.setValue("amountReceived", finalTotal.toFixed(2))
    }
  }, [finalTotal, form])

  const handleDiscountChange = (discountId: string) => {
    const selectedDiscount = discounts.find((d) => d.id === discountId)
    if (selectedDiscount) {
      let discountValue = 0
      // Explicitly convert the value from the API to a number
      const numericDiscountValue = Number(selectedDiscount.value)

      if (selectedDiscount.type === "PERCENTAGE") {
        discountValue = subtotal * (numericDiscountValue / 100)
      } else { // FIXED_AMOUNT
        discountValue = numericDiscountValue // Now assigning a number, not a string
      }
      form.setValue("discountAmount", discountValue.toFixed(2))
    } else {
      form.setValue("discountId", "")
      form.setValue("discountAmount", "0")
    }
  }

  const onSubmit = async (values: z.infer<typeof settlementSchema>) => {
    if (change < 0) {
      toast.error("Insufficient payment amount")
      return
    }

    if (!order?.id) {
      toast.error("Invalid order")
      return
    }

    setLoading(true)
    try {
      await axios.post(`/api/${businessUnitId}/pos/settlements`, {
        orderId: order.id,
        paymentMethodId: values.paymentMethodId,
        amountReceived: Number(values.amountReceived),
        discountId: values.discountId || null,
        discountAmount: Number(values.discountAmount) || 0,
      }, {
        headers: { "x-business-unit-id": businessUnitId },
      })
      toast.success("Payment settled successfully")
      form.reset()
      setIsDiscountUnlocked(false)
      onComplete()
    } catch (error) {
      toast.error("Failed to settle payment")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleClose = () => {
    form.reset()
    setIsDiscountUnlocked(false)
    onClose()
  }

  if (!order) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="!max-w-[55vw] !w-[55vw] max-h-[85vh] h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Settle Payment - Order #{order.id}
            </DialogTitle>
            <DialogDescription>Process payment for {order.customerName || "Walk-in"}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
            <div className="space-y-4 flex flex-col min-h-0">
              <h3 className="font-medium flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Order Summary
              </h3>
              <Card className="flex-1 flex flex-col overflow-hidden">
                <ScrollArea className="flex-1" style={{ height: '300px' }}>
                  <CardContent className="p-4">
                    <div className="space-y-3 pr-4">
                      {order.items?.map((item: OrderItem, index: number) => (
                        <div key={item.id || index} className="flex justify-between items-center">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.menuItemName}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} × {formatCurrency(item.priceAtSale)}
                            </p>
                          </div>
                          <span className="font-medium">{formatCurrency(item.lineTotal)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </ScrollArea>
                <CardFooter className="flex-col items-start p-4 pt-0">
                  <div className="w-full pt-4 border-t">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount:</span>
                          <span>-{formatCurrency(discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span>VAT (12%):</span>
                        <span>{formatCurrency(totalAfterDiscount * 0.12)}</span>
                      </div>
                      <Separator className="mb-4 mt-4" />
                      <div className="flex justify-between font-bold">
                        <span>Total:</span>
                        <span>{formatCurrency(finalTotal)}</span>
                      </div>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </div>

            <div className="space-y-4 flex flex-col">
              <h3 className="font-medium flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Payment Details
              </h3>

              <div className="flex-1">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 h-full flex flex-col">
                    <FormField
                      control={form.control}
                      name="paymentMethodId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {paymentMethods.map((method) => (
                                <SelectItem key={method.id} value={method.id}>
                                  {method.name}
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
                      name="discountId"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Discount (Optional)</FormLabel>
                            <Button
                              type="button"
                              variant="outline"
                              size='default'
                              onClick={() => setIsOverrideDialogOpen(true)}
                              disabled={isDiscountUnlocked}
                              className=" px-2 py-1 text-xs"
                            >
                              {isDiscountUnlocked ? <Unlock className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                              {isDiscountUnlocked ? "Unlocked" : "Unlock"}
                            </Button>
                          </div>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value === "none" ? "" : value)
                              handleDiscountChange(value)
                            }}
                            value={field.value || "none"}
                            disabled={!isDiscountUnlocked || loading}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select discount" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No Discount</SelectItem>
                              {discounts.map((discount) => (
                                <SelectItem key={discount.id} value={discount.id}>
                                  {discount.name} ({discount.type === "PERCENTAGE" ? `${discount.value}%` : formatCurrency(discount.value)})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Label>Remarks</Label>
                    <Textarea />
                    
                    <FormField
                      control={form.control}
                      name="amountReceived"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount Received</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Card
                      className={
                        change >= 0
                          ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                          : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                      }
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Change:</span>
                          <span
                            className={`font-bold text-lg ${
                              change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {formatCurrency(Math.abs(change))}
                          </span>
                        </div>
                        {change < 0 && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">Insufficient payment amount</p>
                        )}
                      </CardContent>
                    </Card>

                    <div className="flex justify-end space-x-2 pt-4 mt-auto">
                      <Button type="button" variant="outline" onClick={handleClose}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading || change < 0}>
                        {loading ? "Processing..." : "Settle Payment"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <SupervisorOverrideDialog
        isOpen={isOverrideDialogOpen}
        onClose={() => setIsOverrideDialogOpen(false)}
        onSuccess={() => {
          setIsDiscountUnlocked(true);
          setIsOverrideDialogOpen(false);
        }}
        businessUnitId={businessUnitId}
      />
    </>
  )
}