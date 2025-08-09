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
import { Calendar } from "lucide-react"

const editAccountingPeriodSchema = z.object({
  name: z.string().min(1, "Name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  fiscalYear: z.string().min(1, "Fiscal year is required").refine((val) => !isNaN(Number(val)) && Number(val) > 1900, {
    message: "Fiscal year must be a valid year"
  }),
  periodNumber: z.string().min(1, "Period number is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Period number must be a positive number"
  }),
  type: z.string().min(1, "Period type is required"),
  status: z.string().optional(),
}).refine((data) => new Date(data.startDate) < new Date(data.endDate), {
  message: "End date must be after start date",
  path: ["endDate"],
})

const periodTypes = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
]

const statusOptions = [
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
  { value: "LOCKED", label: "Locked" },
]

interface AccountingPeriod {
  id: string
  name: string
  startDate: string
  endDate: string
  fiscalYear: number
  periodNumber: number
  type: string
  status: string
}

interface EditAccountingPeriodModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  period: AccountingPeriod | null
}

export const EditAccountingPeriodModal = ({
  isOpen,
  onClose,
  onSuccess,
  period
}: EditAccountingPeriodModalProps) => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof editAccountingPeriodSchema>>({
    resolver: zodResolver(editAccountingPeriodSchema),
    defaultValues: {
      name: "",
      startDate: "",
      endDate: "",
      fiscalYear: "",
      periodNumber: "",
      type: "",
      status: "",
    },
  })

  useEffect(() => {
    if (period && isOpen) {
      form.reset({
        name: period.name,
        startDate: new Date(period.startDate).toISOString().split('T')[0],
        endDate: new Date(period.endDate).toISOString().split('T')[0],
        fiscalYear: period.fiscalYear.toString(),
        periodNumber: period.periodNumber.toString(),
        type: period.type,
        status: period.status,
      })
    }
  }, [period, isOpen, form])

  const onSubmit = async (values: z.infer<typeof editAccountingPeriodSchema>) => {
    if (!period) return

    try {
      setLoading(true)
      
      await axios.patch(`/api/${businessUnitId}/accounting-periods/${period.id}`, values)

      toast.success("Accounting period updated successfully")
      onSuccess()
    } catch (error) {
      toast.error(`Failed to update accounting period: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  if (!period) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Edit Accounting Period
          </DialogTitle>
          <DialogDescription>
            Update the accounting period information.
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
                    <Input placeholder="e.g., January 2024" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fiscalYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fiscal Year</FormLabel>
                    <FormControl>
                      <Input type="number" min="1900" placeholder="2024" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="periodNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period Number</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Period Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select period type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {periodTypes.map((type) => (
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
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
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Period"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}