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
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HelpCircle } from "lucide-react"

const createFAQSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  category: z.string().min(1, "Category is required"),
  isActive: z.boolean().optional(),
  sortOrder: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) > 0), {
      message: "Sort order must be a positive number",
    }),
})

const categoryOptions = [
  { value: "general", label: "General" },
  { value: "booking", label: "Booking & Reservations" },
  { value: "rooms", label: "Rooms & Accommodations" },
  { value: "amenities", label: "Amenities & Services" },
  { value: "dining", label: "Dining" },
  { value: "policies", label: "Policies" },
  { value: "location", label: "Location & Transportation" },
  { value: "events", label: "Events & Meetings" },
  { value: "other", label: "Other" },
]

interface CreateFAQModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  businessUnitId: string
}

export const CreateFAQModal = ({ isOpen, onClose, onSuccess, businessUnitId }: CreateFAQModalProps) => {
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof createFAQSchema>>({
    resolver: zodResolver(createFAQSchema),
    defaultValues: {
      question: "",
      answer: "",
      category: "",
      isActive: true,
      sortOrder: "1",
    },
  })

  const onSubmit = async (values: z.infer<typeof createFAQSchema>) => {
    try {
      setLoading(true)

      const payload = {
        ...values,
        sortOrder: values.sortOrder ? Number.parseInt(values.sortOrder) : 1,
      }

      await axios.post(`/api/cms/faqs`, payload, {
        headers: {
          "x-business-unit-id": businessUnitId,
        },
      })

      toast.success("FAQ created successfully")
      form.reset()
      onSuccess()
    } catch (error) {
      toast.error(`Failed to create FAQ: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    form.reset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Create FAQ
          </DialogTitle>
          <DialogDescription>Add a new frequently asked question to help your guests.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., What time is check-in?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="answer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Answer</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide a detailed answer to the question..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoryOptions.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
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
                {loading ? "Creating..." : "Create FAQ"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
