"use client"

import { Bell, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import axios from "axios"
import { toast } from "sonner"
import { ThemeToggle } from "./theme-toggle"
import {
  FileText,
  ShoppingCart,
  Package,
  Users,
  CreditCard,
  Clock,
  CheckCircle,
  AlertTriangle,
  Building2,
  Calculator,
  RefreshCw,
} from "lucide-react"

interface SearchResult {
  id: string
  type: string
  docNum: string
  title: string
  description: string
  url: string
  date: string
  status?: string
}

interface Notification {
  id: string
  type: string
  docNum: string
  title: string
  description: string
  url: string
  date: string
  priority?: string
  amount?: number
  requestor?: string
}

export function Header() {
  const params = useParams()
  const router = useRouter()
  const businessUnitId = params.businessUnitId as string

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationCount, setNotificationCount] = useState(0)
  const [notificationsLoading, setNotificationsLoading] = useState(false)

  // Fetch notifications on mount
  useEffect(() => {
    if (businessUnitId) {
      fetchNotifications()
    }
  }, [businessUnitId])

  // Search functionality
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const debounceTimer = setTimeout(() => {
        performSearch()
      }, 300)
      return () => clearTimeout(debounceTimer)
    } else {
      setSearchResults([])
      setShowSearchResults(false)
    }
  }, [searchQuery])

  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true)
      const response = await axios.get(`/api/${businessUnitId}/notifications`, {
        headers: { "x-business-unit-id": businessUnitId },
      })
      setNotifications(response.data)
      setNotificationCount(response.data.length)
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setNotificationsLoading(false)
    }
  }

  const performSearch = async () => {
    try {
      setSearchLoading(true)
      const response = await axios.get(`/api/${businessUnitId}/search`, {
        headers: { "x-business-unit-id": businessUnitId },
        params: { q: searchQuery },
      })
      setSearchResults(response.data)
      setShowSearchResults(true)
    } catch (error) {
      console.error("Search failed:", error)
      toast.error("Search failed")
    } finally {
      setSearchLoading(false)
    }
  }

  const handleSearchResultClick = (result: SearchResult) => {
    router.push(result.url)
    setSearchQuery("")
    setShowSearchResults(false)
  }

  const handleNotificationClick = (notification: Notification) => {
    router.push(notification.url)
  }

  const getDocumentIcon = (type: string) => {
    const icons = {
      PURCHASE_REQUEST: FileText,
      PURCHASE_ORDER: ShoppingCart,
      GOODS_RECEIPT: Package,
      AP_INVOICE: FileText,
      JOURNAL_ENTRY: Calculator,
      BUSINESS_PARTNER: Users,
      INVENTORY_ITEM: Package,
      BANK_ACCOUNT: Building2,
      GL_ACCOUNT: FileText,
      OUTGOING_PAYMENT: CreditCard,
    }
    return icons[type as keyof typeof icons] || FileText
  }

  const getStatusBadge = (status?: string) => {
    if (!status) return null

    const statusConfig = {
      PENDING: { variant: "outline" as const, icon: Clock },
      OPEN: { variant: "default" as const, icon: Clock },
      APPROVED: { variant: "default" as const, icon: CheckCircle },
      POSTED: { variant: "secondary" as const, icon: CheckCircle },
      CLOSED: { variant: "outline" as const, icon: CheckCircle },
    }

    const config = statusConfig[status as keyof typeof statusConfig]
    if (!config) return null

    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="gap-1 text-xs">
        <Icon className="h-2 w-2" />
        {status}
      </Badge>
    )
  }

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null

    const priorityConfig = {
      LOW: { variant: "outline" as const, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
      MEDIUM: { variant: "secondary" as const, color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
      HIGH: { variant: "default" as const, color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
      URGENT: { variant: "destructive" as const, color: "text-red-600", bg: "bg-red-50 border-red-200" },
    }

    const config = priorityConfig[priority as keyof typeof priorityConfig]
    if (!config) return null

    return (
      <Badge
        variant={config.variant}
        className={`gap-1 text-xs font-medium ${config.color} ${config.bg} hover:${config.bg}`}
      >
        <AlertTriangle className="h-2.5 w-2.5" />
        {priority}
      </Badge>
    )
  }

  // Group notifications by priority for better visual hierarchy
  // const groupedNotifications = notifications.reduce(
  //   (acc, notification) => {
  //     const priority = notification.priority || "MEDIUM"
  //     if (!acc[priority]) acc[priority] = []
  //     acc[priority].push(notification)
  //     return acc
  //   },
  //   {} as Record<string, Notification[]>,
  // )

  // const priorityOrder = ["URGENT", "HIGH", "MEDIUM", "LOW"]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left Section - Business Unit Info */}
        <div className="flex items-center space-x-4">
          <div className="flex flex-col"></div>
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search transactions, customers, items..."
              className="pl-10 bg-muted/50 border-0 focus-visible:bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
            />

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                {searchLoading ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="p-2">
                    {searchResults.map((result) => {
                      const Icon = getDocumentIcon(result.type)
                      return (
                        <div
                          key={result.id}
                          className="flex items-center gap-3 p-2 hover:bg-muted rounded-md cursor-pointer"
                          onClick={() => handleSearchResultClick(result)}
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{result.title}</p>
                              {getStatusBadge(result.status)}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{result.description}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No results found for &quot;{searchQuery}&quot;
                  </div>
                )}
                <div className="p-2 border-t">
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowSearchResults(false)}>
                    <X className="h-3 w-3 mr-1" />
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Section - Actions & Profile */}
        <div className="flex items-center space-x-2">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {notificationCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 text-[10px] flex items-center justify-center"
                  >
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </Badge>
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[380px] flex flex-col" side="right">
              <SheetHeader className="pb-3">
                <SheetTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notifications
                  </div>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                    {notificationCount}
                  </Badge>
                </SheetTitle>
                <SheetDescription className="text-xs">Items that need your attention</SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto">
                {notificationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : notifications.length > 0 ? (
                  <div className="space-y-1">
                    {notifications.map((notification) => {
                      const Icon = getDocumentIcon(notification.type)
                      const priorityColors = {
                        URGENT: "border-l-red-500 bg-red-50/50",
                        HIGH: "border-l-orange-500 bg-orange-50/50",
                        MEDIUM: "border-l-blue-500 bg-blue-50/50",
                        LOW: "border-l-gray-500 bg-gray-50/50",
                      }
                      const priorityColor =
                        priorityColors[notification.priority as keyof typeof priorityColors] || priorityColors.MEDIUM

                      return (
                        <div
                          key={notification.id}
                          className={`p-3 rounded-md border-l-2 cursor-pointer hover:bg-muted/50 transition-colors ${priorityColor}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex items-center justify-center w-6 h-6 rounded bg-primary/10 flex-shrink-0 mt-0.5">
                              <Icon className="h-3 w-3 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className="font-medium text-xs leading-tight truncate">{notification.title}</h4>
                                <div className="flex items-center gap-1">
                                  {notification.priority && (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                                      {notification.priority}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <p className="text-[11px] text-muted-foreground mb-1.5 line-clamp-2">
                                {notification.description}
                              </p>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  {notification.requestor && <span className="truncate">{notification.requestor}</span>}
                                  {notification.amount && (
                                    <span className="font-medium text-foreground">
                                      ₱{notification.amount.toLocaleString()}
                                    </span>
                                  )}
                                </div>
                                <span className="whitespace-nowrap">
                                  {new Date(notification.date).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <h3 className="font-medium text-sm mb-1">All caught up!</h3>
                    <p className="text-muted-foreground text-xs">No pending notifications.</p>
                  </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs bg-transparent"
                    onClick={fetchNotifications}
                    disabled={notificationsLoading}
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${notificationsLoading ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Search Results Overlay */}
      {showSearchResults && (
        <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowSearchResults(false)} />
      )}
    </header>
  )
}
