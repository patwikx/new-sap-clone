import { Prisma } from '@prisma/client'

// =================================================================
// ## Core Types: Users, Business Units, and Roles
// =================================================================

// A basic Business Unit
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type BusinessUnitBasic = Prisma.BusinessUnitGetPayload<{}>

// A basic Role
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type Role = Prisma.RolesGetPayload<{}>

// A validator to fetch a User with their role assignments

const userWithAssignments = Prisma.validator<Prisma.UserDefaultArgs>()({
  include: {
    assignments: {
      include: {
        role: true,
        businessUnit: true,
      },
    },
  },
})
export type UserWithAssignments = Prisma.UserGetPayload<typeof userWithAssignments>

// A validator for a single detailed user assignment
const userAssignmentWithDetails = Prisma.validator<Prisma.UserBusinessUnitDefaultArgs>()({
  include: {
    user: {
      select: {
        id: true,
        name: true,
        username: true,
        isActive: true,
      },
    },
    businessUnit: true,
    role: true,
  },
})
export type UserAssignmentWithDetails = Prisma.UserBusinessUnitGetPayload<typeof userAssignmentWithDetails>

// =================================================================
// ## Financials & Accounting Types
// =================================================================

// A basic General Ledger Account
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type GlAccountBasic = Prisma.GlAccountGetPayload<{}>

// A GL Account with its related category and type
const glAccountWithDetails = Prisma.validator<Prisma.GlAccountDefaultArgs>()({
  include: {
    accountType: true,
    accountCategory: true,
  },
})
export type GlAccountWithDetails = Prisma.GlAccountGetPayload<typeof glAccountWithDetails>

// A validator for a complete Journal Entry document
const journalEntryWithDetails = Prisma.validator<Prisma.JournalEntryDefaultArgs>()({
  include: {
    businessUnit: true,
    author: true,
    approver: true,
    postedBy: true,
    lines: {
      include: {
        glAccount: {
          select: { accountCode: true, name: true },
        },
      },
    },
    approvals: {
      include: {
        actor: { select: { name: true } },
      },
    },
  },
})
export type JournalEntryWithDetails = Prisma.JournalEntryGetPayload<typeof journalEntryWithDetails>

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type AccountingPeriod = Prisma.AccountingPeriodGetPayload<{}>
export type BankAccountWithGL = Prisma.BankAccountGetPayload<{ include: { glAccount: true } }>
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type NumberingSeries = Prisma.NumberingSeriesGetPayload<{}>

// =================================================================
// ## Sales - A/R Document Types
// =================================================================

// A validator for a complete Sales Order document
const salesOrderWithDetails = Prisma.validator<Prisma.SalesOrderDefaultArgs>()({
  include: {
    businessUnit: true,
    businessPartner: true,
    owner: true,
    items: {
      include: {
        menuItem: true,
      },
    },
  },
})
export type SalesOrderWithDetails = Prisma.SalesOrderGetPayload<typeof salesOrderWithDetails>

// A validator for a complete AR Invoice document
const arInvoiceWithDetails = Prisma.validator<Prisma.ARInvoiceDefaultArgs>()({
  include: {
    businessUnit: true,
    businessPartner: true,
    items: {
      include: {
        menuItem: true,
        glAccount: true,
      },
    },
    journalEntry: true,
  },
})
export type ARInvoiceWithDetails = Prisma.ARInvoiceGetPayload<typeof arInvoiceWithDetails>

export type SalesQuotationWithDetails = Prisma.SalesQuotationGetPayload<{
  include: { businessPartner: true; owner: true; items: { include: { menuItem: true } } }
}>

export type DeliveryWithDetails = Prisma.DeliveryGetPayload<{
  include: { businessPartner: true; createdBy: true; items: { include: { menuItem: true } } }
}>

// =================================================================
// ## Purchasing - A/P Document Types
// =================================================================

// A validator for a complete Purchase Order document
const purchaseOrderWithDetails = Prisma.validator<Prisma.PurchaseOrderDefaultArgs>()({
  include: {
    businessUnit: true,
    businessPartner: true,
    owner: true,
    items: {
      include: {
        inventoryItem: true,
        glAccount: true,
      },
    },
  },
})
export type PurchaseOrderWithDetails = Prisma.PurchaseOrderGetPayload<typeof purchaseOrderWithDetails>

// A validator for a complete AP Invoice document
const apInvoiceWithDetails = Prisma.validator<Prisma.APInvoiceDefaultArgs>()({
  include: {
    businessUnit: true,
    businessPartner: true,
    items: {
      include: {
        glAccount: true,
      },
    },
    journalEntry: true,
  },
})
export type APInvoiceWithDetails = Prisma.APInvoiceGetPayload<typeof apInvoiceWithDetails>

export type PurchaseRequestWithDetails = Prisma.PurchaseRequestGetPayload<{
  include: { requestor: true; approver: true; items: true }
}>

// =================================================================
// ## Inventory & POS Types
// =================================================================
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type InventoryItemBasic = Prisma.InventoryItemGetPayload<{}>
export type InventoryStockWithDetails = Prisma.InventoryStockGetPayload<{
  include: { inventoryItem: true; location: true }
}>

// A validator for a complete Point-of-Sale Order document
const posOrderWithDetails = Prisma.validator<Prisma.OrderDefaultArgs>()({
  include: {
    table: true,
    user: true,
    businessPartner: true,
    items: {
      include: {
        menuItem: true,
        modifiers: true,
      },
    },
    payments: {
      include: {
        paymentMethod: true,
      },
    },
  },
})
export type PosOrderWithDetails = Prisma.OrderGetPayload<typeof posOrderWithDetails>

export type MenuItemWithCategory = Prisma.MenuItemGetPayload<{ include: { category: true } }>