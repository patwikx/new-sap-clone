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
import { MessageSquare } from "lucide-react"

const createTestimonialSchema = z.object({
  guestName: z.string().min(1, "Guest name is required"),
  guestTitle: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  rating: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 1 && Number(val) <= 5, {
    message: "Rating must be between 1 and 5",
  }),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  sortOrder: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) > 0), {
      message: "Sort order must be a positive number",
    }),
})

interface CreateTestimonialModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  businessUnitId: string
}

export const CreateTestimonialModal = ({ isOpen, onClose, onSuccess, businessUnitId }: CreateTestimonialModalProps) => {
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof createTestimonialSchema>>({
    resolver: zodResolver(createTestimonialSchema),
    defaultValues: {
      guestName: "",
      guestTitle: "",
      content: "",
      rating: "5",
      imageUrl: "",
      isActive: true,
      sortOrder: "1",
    },
  })

  const onSubmit = async (values: z.infer<typeof createTestimonialSchema>) => {
    try {
      setLoading(true)

      const payload = {
        ...values,
        rating: Number.parseInt(values.rating),
        sortOrder: values.sortOrder ? Number.parseInt(values.sortOrder) : 1,
        imageUrl: values.imageUrl || undefined,
      }

      await axios.post(`/api/cms/testimonials`, payload, {
        headers: {
          "x-business-unit-id": businessUnitId,
        },
      })

      toast.success("Testimonial created successfully")
      form.reset()
      onSuccess()
    } catch (error) {
      toast.error(`Failed to create testimonial: ${error}`)
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
            <MessageSquare className="h-5 w-5" />
            Create Testimonial
          </DialogTitle>
          <DialogDescription>Add a new customer testimonial to showcase on your website.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="guestName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guest Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., John Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="guestTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guest Title (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Business Traveler" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Testimonial Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share what the guest said about their experience..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guest Photo URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://images.pexels.com/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rating" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1 Star</SelectItem>
                        <SelectItem value="2">2 Stars</SelectItem>
                        <SelectItem value="3">3 Stars</SelectItem>
                        <SelectItem value="4">4 Stars</SelectItem>
                        <SelectItem value="5">5 Stars</SelectItem>
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
                {loading ? "Creating..." : "Create Testimonial"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
