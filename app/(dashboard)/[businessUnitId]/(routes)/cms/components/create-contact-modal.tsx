"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios from "axios"
import { toast } from "sonner"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin } from "lucide-react"

const createContactSchema = z.object({
  type: z.string().min(1, "Type is required"),
  label: z.string().min(1, "Label is required"),
  value: z.string().min(1, "Value is required"),
  iconName: z.string().min(1, "Icon is required"),
  isActive: z.boolean().optional(),
  sortOrder: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) > 0), {
      message: "Sort order must be a positive number",
    }),
})

const typeOptions = [
  { value: "PHONE", label: "Phone", icon: "Phone" },
  { value: "EMAIL", label: "Email", icon: "Mail" },
  { value: "ADDRESS", label: "Address", icon: "MapPin" },
  { value: "SOCIAL", label: "Social Media", icon: "Share2" },
  { value: "WEBSITE", label: "Website", icon: "Globe" },
  { value: "FAX", label: "Fax", icon: "Printer" },
  { value: "OTHER", label: "Other", icon: "Info" },
]

interface CreateContactModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  businessUnitId: string
}

export const CreateContactModal = ({ isOpen, onClose, onSuccess, businessUnitId }: CreateContactModalProps) => {
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof createContactSchema>>({
    resolver: zodResolver(createContactSchema),
    defaultValues: {
      type: "",
      label: "",
      value: "",
      iconName: "",
      isActive: true,
      sortOrder: "1",
    },
  })

  const selectedType = form.watch("type")

  const onSubmit = async (values: z.infer<typeof createContactSchema>) => {
    try {
      setLoading(true)

      const payload = {
        ...values,
        sortOrder: values.sortOrder ? Number.parseInt(values.sortOrder) : 1,
      }

      await axios.post(`/api/cms/contact-info`, payload, {
        headers: {
          "x-business-unit-id": businessUnitId,
        },
      })

      toast.success("Contact info created successfully")
      form.reset()
      onSuccess()
    } catch (error) {
      toast.error(`Failed to create contact info: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    form.reset()
    onClose()
  }

  const handleTypeChange = (type: string) => {
    const selectedOption = typeOptions.find((option) => option.value === type)
    if (selectedOption) {
      form.setValue("iconName", selectedOption.icon)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Add Contact Information
          </DialogTitle>
          <DialogDescription>Add new contact information to display on your website.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Type</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
                      handleTypeChange(value)
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select contact type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {typeOptions.map((type) => (
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

            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        selectedType === "PHONE"
                          ? "e.g., Main Phone"
                          : selectedType === "EMAIL"
                            ? "e.g., General Inquiries"
                            : selectedType === "ADDRESS"
                              ? "e.g., Hotel Address"
                              : "e.g., Contact Label"
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Value</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        selectedType === "PHONE"
                          ? "e.g., +1 (555) 123-4567"
                          : selectedType === "EMAIL"
                            ? "e.g., info@hotel.com"
                            : selectedType === "ADDRESS"
                              ? "e.g., 123 Main St, City, State 12345"
                              : selectedType === "WEBSITE"
                                ? "e.g., https://www.hotel.com"
                                : "Enter contact value"
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="iconName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <FormControl>
                    <Input placeholder="Icon name (auto-filled based on type)" {...field} readOnly />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <div className="text-sm text-muted-foreground">Show on website</div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Add Contact Info"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
