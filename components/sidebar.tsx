"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Building2,
  Users,
  FileText,
  ShoppingCart,
  Package,
  CreditCard,
  BarChart3,
  Settings,
  ChevronRight,
  Receipt,
  Truck,
  Banknote,
  Calculator,
  Store,
  ClipboardList,
  Utensils,
  Archive,
  Calendar,
  Computer,
} from "lucide-react"
import UserProfileLogout from "./user-profile-logout"
import BusinessUnitSwitcher from "./business-unit-switcher"
import type { BusinessUnitItem } from "@/types/business-unit-types"

// 1. DATA STRUCTURE AND NAVIGATION ITEMS
// =================================================================
export interface NavItem {
  title: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  children?: NavItem[]
}

const navigation: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: BarChart3,
  },
  {
    title: "Sales & A/R",
    icon: Receipt,
    children: [
      { title: "Sales Quotations", href: "/sales/quotations", icon: FileText },
      { title: "Sales Orders", href: "/sales/orders", icon: ShoppingCart },
      { title: "Deliveries", href: "/sales/deliveries", icon: Truck },
      { title: "A/R Invoices", href: "/sales/invoices", icon: Receipt },
      { title: "Incoming Payments", href: "/sales/payments", icon: Banknote },
    ],
  },
  {
    title: "Purchasing & A/P",
    icon: Package,
    children: [
      { title: "Purchase Requests", href: "/purchasing/requests", icon: ClipboardList },
      { title: "Purchase Orders", href: "/purchasing/orders", icon: ShoppingCart },
      { title: "Goods Receipt", href: "/purchasing/receiving", icon: Archive },
      { title: "A/P Invoices", href: "/purchasing/invoices", icon: FileText },
      { title: "Outgoing Payments", href: "/purchasing/payments", icon: CreditCard },
    ],
  },
  {
    title: "Inventory",
    icon: Archive,
    children: [
      { title: "Items", href: "/inventory/items", icon: Package },
      { title: "Stock Levels", href: "/inventory/stock", icon: BarChart3 },
      { title: "Stock Requisitions", href: "/inventory/requisitions", icon: ClipboardList },
      { title: "Locations", href: "/inventory/locations", icon: Building2 },
    ],
  },
  {
    title: "Point of Sale",
    icon: Store,
    children: [
      { title: "POS", href: "/pos", icon: Store },
      { title: "POS Terminals", href: "/pos/terminals", icon: Computer },
      { title: "Orders", href: "/pos/orders", icon: Receipt },
      { title: "Menu Management", href: "/pos/menu", icon: Utensils },
      { title: "Tables", href: "/pos/tables", icon: Building2 },
    ],
  },
  {
    title: "Financials",
    icon: Calculator,
    children: [
      { title: "Chart of Accounts", href: "/financials/chart-of-accounts", icon: FileText },
      { title: "Journal Entries", href: "/financials/journal-entries", icon: FileText },
      { title: "Bank Accounts", href: "/financials/banks", icon: Banknote },
      { title: "Financial Reports", href: "/financials/reports", icon: BarChart3 },
    ],
  },
  {
    title: "Business Partners",
    href: "/business-partners",
    icon: Users,
  },
  {
    title: "Administration",
    icon: Settings,
    children: [
      { title: "Users", href: "/admin/users", icon: Users },
      { title: "Business Units", href: "/admin/business-units", icon: Building2 },
      { title: "Numbering Series", href: "/admin/numbering-series", icon: FileText },
      { title: "Accounting Periods", href: "/admin/accounting-periods", icon: Calendar },
    ],
  },
]

// 2. PROP TYPE DEFINITIONS
// =================================================================
interface SidebarProps {
  businessUnitId: string
  businessUnits: BusinessUnitItem[]
  // The onBusinessUnitChange prop is no longer directly used by Sidebar
  // as BusinessUnitSwitcher handles navigation internally.
  // onBusinessUnitChange?: (id: string) => void
}

interface SidebarLinkProps {
  item: NavItem
  businessUnitId: string
}

// 3. SIDEBAR LINK SUB-COMPONENT
// =================================================================
function SidebarLink({ item, businessUnitId }: SidebarLinkProps) {
  const pathname = usePathname()
  const href = item.href ? `/${businessUnitId}${item.href}` : ""
  const isActive = pathname === href

  if (item.children) {
    // Determine if any child link is active to set default open state for collapsible
    const isAnyChildActive = item.children.some((child) => {
      const childHref = child.href ? `/${businessUnitId}${child.href}` : ""
      return pathname === childHref
    })

    return (
      <Collapsible defaultOpen={isAnyChildActive}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-start font-normal">
            <item.icon className="mr-2 h-4 w-4" />
            {item.title}
            <ChevronRight className="ml-auto h-4 w-4 transition-transform ui-open:rotate-90" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-4 mt-2 flex flex-col space-y-1 border-l pl-4">
            {item.children.map((child) => (
              <SidebarLink key={child.title} item={child} businessUnitId={businessUnitId} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <Button variant={isActive ? "secondary" : "ghost"} className="w-full justify-start font-normal" asChild>
      <Link href={href}>
        <item.icon className="mr-2 h-4 w-4" />
        {item.title}
      </Link>
    </Button>
  )
}

// 4. MAIN SIDEBAR COMPONENT
// =================================================================
export function Sidebar({ businessUnitId, businessUnits }: SidebarProps) {
  return (
    <div className="flex h-full flex-col border-r bg-background">
      {/* Static Header Section */}
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <Calculator className="h-6 w-6" />
          <span className="text-lg font-semibold whitespace-nowrap">PLM Acctg Solutions</span>
        </div>
      </div>
       
      <Separator />
<div className="mt-2 mb-2 ml-4">
  <BusinessUnitSwitcher items={businessUnits} />
</div>
         <Separator />
      {/* Pass the full list of business units to the switcher */}
   
      {/* Scrollable Navigation Section */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex flex-col space-y-1">
          {navigation.map((item) => (
            <SidebarLink key={item.title} item={item} businessUnitId={businessUnitId} />
          ))}
        </div>
      </div>
      {/* Logout Section */}
      <div className="mt-auto p-3">
        <Separator className="mb-3" />
        <UserProfileLogout />
      </div>
    </div>
  )
}
