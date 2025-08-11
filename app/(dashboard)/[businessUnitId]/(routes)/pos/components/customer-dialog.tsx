"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { User, Users, Check, ChevronsUpDown } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import axios from "axios"

const customerSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(1, "Customer name is required"),
  serverId: z.string().min(1, "Server is required"),
})

interface Table {
  id: string
  name: string
  status: string
}

interface BusinessPartner {
  id: string
  name: string
  email?: string
  phone?: string
}

interface Server {
  id: string
  name: string
  email: string
}

interface CustomerDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (customerName: string, customerId?: string, serverId?: string) => void
  table: Table | null
  businessUnitId: string
}

export const CustomerDialog = ({ isOpen, onClose, onConfirm, table, businessUnitId }: CustomerDialogProps) => {
  const [loading, setLoading] = useState(false)
  const [businessPartners, setBusinessPartners] = useState<BusinessPartner[]>([])
  const [servers, setServers] = useState<Server[]>([])
  const [customerOpen, setCustomerOpen] = useState(false)
  const [serverOpen, setServerOpen] = useState(false)

  const form = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      customerId: "",
      customerName: "",
      serverId: "",
    },
  })

  // Fetch business partners and servers
  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen || !businessUnitId) return

      try {
        const [partnersRes, serversRes] = await Promise.all([
          axios.get<BusinessPartner[]>(`/api/${businessUnitId}/business-partners`, {
            headers: { "x-business-unit-id": businessUnitId },
          }),
          axios.get<Server[]>(`/api/${businessUnitId}/users/servers`, {
            headers: { "x-business-unit-id": businessUnitId },
          }),
        ])
        setBusinessPartners(partnersRes.data)
        setServers(serversRes.data)
      } catch (error) {
        console.error("Failed to fetch data:", error)
        toast.error("Failed to load customer and server data")
      }
    }

    fetchData()
  }, [isOpen, businessUnitId])

  const onSubmit = async (values: z.infer<typeof customerSchema>) => {
    setLoading(true)
    onConfirm(values.customerName, values.customerId, values.serverId)
    form.reset()
    setLoading(false)
  }

  const handleClose = () => {
    form.reset()
    setCustomerOpen(false)
    setServerOpen(false)
    onClose()
  }

  const handleCustomerSelect = (partner: BusinessPartner | null) => {
    if (partner) {
      form.setValue("customerId", partner.id)
      form.setValue("customerName", partner.name)
    } else {
      // Walk-in customer
      form.setValue("customerId", "")
      form.setValue("customerName", "Walk-in")
    }
    setCustomerOpen(false)
  }

  const handleServerSelect = (server: Server) => {
    form.setValue("serverId", server.id)
    setServerOpen(false)
  }

  const selectedCustomer = businessPartners.find((p) => p.id === form.watch("customerId"))
  const selectedServer = servers.find((s) => s.id === form.watch("serverId"))

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Start New Order - {table?.name}
          </DialogTitle>
          <DialogDescription>Select customer and server to begin taking the order.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Customer Selection */}
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Customer</FormLabel>
                  <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={customerOpen}
                          className={cn("justify-between", !field.value && "text-muted-foreground")}
                        >
                          {field.value || "Select customer..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search customers..." />
                        <CommandList>
                          <CommandEmpty>No customers found.</CommandEmpty>
                          <CommandGroup>
                            {/* Walk-in option */}
                            <CommandItem value="walk-in" onSelect={() => handleCustomerSelect(null)}>
                              <Check
                                className={cn("mr-2 h-4 w-4", field.value === "Walk-in" ? "opacity-100" : "opacity-0")}
                              />
                              <User className="mr-2 h-4 w-4" />
                              Walk-in Customer
                            </CommandItem>
                            {/* Business partners */}
                            {businessPartners.map((partner) => (
                              <CommandItem
                                key={partner.id}
                                value={partner.name}
                                onSelect={() => handleCustomerSelect(partner)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedCustomer?.id === partner.id ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                <Users className="mr-2 h-4 w-4" />
                                <div className="flex flex-col">
                                  <span>{partner.name}</span>
                                  {partner.email && (
                                    <span className="text-xs text-muted-foreground">{partner.email}</span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Server Selection */}
            <FormField
              control={form.control}
              name="serverId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Server/Waiter</FormLabel>
                  <Popover open={serverOpen} onOpenChange={setServerOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={serverOpen}
                          className={cn("justify-between", !selectedServer && "text-muted-foreground")}
                        >
                          {selectedServer ? selectedServer.name : "Select server..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search servers..." />
                        <CommandList>
                          <CommandEmpty>No servers found.</CommandEmpty>
                          <CommandGroup>
                            {servers.map((server) => (
                              <CommandItem
                                key={server.id}
                                value={server.name}
                                onSelect={() => handleServerSelect(server)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedServer?.id === server.id ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                <User className="mr-2 h-4 w-4" />
                                <div className="flex flex-col">
                                  <span>{server.name}</span>
                                  <span className="text-xs text-muted-foreground">{server.email}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Starting..." : "Start Order"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
