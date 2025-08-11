// Shared types for POS system
export interface OrderItem {
  id: string
  quantity: number
  priceAtSale: number
  lineTotal: number
  menuItemName: string
  modifiers: {
    id: string
    name: string
    priceChange: number
  }[]
}

export interface MenuItem {
  id: string
  name: string
  description?: string
  price: number
  category: {
    name: string
  }
  isActive: boolean
}

export interface MenuCategory {
  id: string
  name: string
  description?: string
  sortOrder: number
}

// Base order interface with common properties
export interface BaseOrder {
  tableId: string
  customerName: string
  items: OrderItem[]
  totalAmount: number
}

// Existing order from API (has all the calculated fields)
export interface ExistingOrder extends BaseOrder {
  id: string
  status: string
  createdAt: string
  calculatedTotal: number
  modifiersTotal: number
}

// New order being created (minimal fields)
export interface NewOrder extends BaseOrder {
  // No additional fields needed
}

// Union type for current order state
export type CurrentOrder = ExistingOrder | NewOrder | null

export interface Table {
  id: string
  name: string
  capacity: string | null
  location: string | null
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED"
  businessUnitId: string
  createdAt: string
  createdById: string | null
  currentOrder?: ExistingOrder // Tables always have existing orders from API
}
