// Business Unit related types
export interface BusinessUnitItem {
  id: string
  name: string
  functionalCurrency?: string
  reportingCurrency?: string
}

export interface UserAssignmentWithDetails {
  id: string
  userId: string
  businessUnitId: string
  roleId: string
  assignedAt: Date
  user: {
    id: string
    name: string | null
    username: string | null
    isActive: boolean
  }
  businessUnit: BusinessUnitItem
  role: {
    id: string
    role: string
  }
}