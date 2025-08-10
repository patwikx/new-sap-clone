// Comprehensive seed script for Tropicana Worldwide Corporation
// 4 Business Units: Anchor Hotel, Dolores Tropicana Resort, Dolores Lake Resort, Dolores Farm Resort
// Philippines-focused hospitality industry data

import { PrismaClient, Prisma } from "@prisma/client"

const prisma = new PrismaClient()

// Helper functions
const D = (v: string | number) => new Prisma.Decimal(v)
const doc = (prefix: string, n: number | string) => `${prefix}-${String(n).toString().padStart(5, "0")}`
const randomBetween = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const randomDecimal = (min: number, max: number) => D(Math.random() * (max - min) + min)

async function main() {
  console.log("🌴 Seeding Tropicana Worldwide Corporation database...")

  // 1) CORE SETUP: Roles, Users, Business Units
  console.log("Creating roles and users...")

  const roles = await Promise.all([
       prisma.roles.create({ data: { role: "Admin" } }),
    prisma.roles.create({ data: { role: "CEO" } }),
    prisma.roles.create({ data: { role: "General Manager" } }),
    prisma.roles.create({ data: { role: "Operations Manager" } }),
    prisma.roles.create({ data: { role: "Finance Manager" } }),
    prisma.roles.create({ data: { role: "Front Desk Manager" } }),
    prisma.roles.create({ data: { role: "Housekeeping Manager" } }),
    prisma.roles.create({ data: { role: "F&B Manager" } }),
    prisma.roles.create({ data: { role: "Maintenance Manager" } }),
    prisma.roles.create({ data: { role: "Accountant" } }),
    prisma.roles.create({ data: { role: "Cashier" } }),
    prisma.roles.create({ data: { role: "Front Desk Agent" } }),
    prisma.roles.create({ data: { role: "Housekeeper" } }),
    prisma.roles.create({ data: { role: "Server" } }),
    prisma.roles.create({ data: { role: "Cook" } }),
    prisma.roles.create({ data: { role: "Maintenance Staff" } }),
  ])

  const users = await Promise.all([

        prisma.user.create({
      data: { name: "System Administrator", username: "admin", password: "asdasd123", isActive: true },
    }),
    // Executive Level
    prisma.user.create({
      data: { name: "Ricardo Tropicana", username: "ricardo.ceo", password: "ceo123", isActive: true },
    }),

    // Management Level
    prisma.user.create({
      data: { name: "Maria Santos-Cruz", username: "maria.gm", password: "gm123", isActive: true },
    }),
    prisma.user.create({ data: { name: "Jose Dela Cruz", username: "jose.ops", password: "ops123", isActive: true } }),
    prisma.user.create({ data: { name: "Ana Reyes", username: "ana.finance", password: "fin123", isActive: true } }),
    prisma.user.create({ data: { name: "Carlos Mendoza", username: "carlos.fd", password: "fd123", isActive: true } }),

    // Department Managers
    prisma.user.create({ data: { name: "Elena Villanueva", username: "elena.hk", password: "hk123", isActive: true } }),
    prisma.user.create({ data: { name: "Miguel Torres", username: "miguel.fb", password: "fb123", isActive: true } }),
    prisma.user.create({
      data: { name: "Roberto Silva", username: "roberto.maint", password: "maint123", isActive: true },
    }),

    // Staff Level
    prisma.user.create({ data: { name: "Grace Aquino", username: "grace.acct", password: "acct123", isActive: true } }),
    prisma.user.create({ data: { name: "John Ramos", username: "john.cash", password: "cash123", isActive: true } }),
    prisma.user.create({ data: { name: "Lisa Garcia", username: "lisa.fda", password: "fda123", isActive: true } }),
    prisma.user.create({ data: { name: "Mark Fernandez", username: "mark.hk", password: "hk123", isActive: true } }),
    prisma.user.create({
      data: { name: "Sarah Lim", username: "sarah.server", password: "server123", isActive: true },
    }),
    prisma.user.create({ data: { name: "David Tan", username: "david.cook", password: "cook123", isActive: true } }),
    prisma.user.create({
      data: { name: "Peter Gonzales", username: "peter.maint", password: "maint123", isActive: true },
    }),
  ])

  // Create 4 Business Units
  console.log("Creating business units...")
  const businessUnits = await Promise.all([
    prisma.businessUnit.create({
      data: {
        name: "Anchor Hotel",
        functionalCurrency: "PHP",
        reportingCurrency: "USD",
        createdById: users[0].id,
      },
    }),
    prisma.businessUnit.create({
      data: {
        name: "Dolores Tropicana Resort",
        functionalCurrency: "PHP",
        reportingCurrency: "USD",
        createdById: users[0].id,
      },
    }),
    prisma.businessUnit.create({
      data: {
        name: "Dolores Lake Resort",
        functionalCurrency: "PHP",
        reportingCurrency: "USD",
        createdById: users[0].id,
      },
    }),
    prisma.businessUnit.create({
      data: {
        name: "Dolores Farm Resort",
        functionalCurrency: "PHP",
        reportingCurrency: "USD",
        createdById: users[0].id,
      },
    }),
  ])

  // Assign users to business units with roles
  console.log("Assigning users to business units...")
  const userAssignments = []
  for (let i = 0; i < businessUnits.length; i++) {
    const bu = businessUnits[i]
    // CEO to all units
    userAssignments.push(
      prisma.userBusinessUnit.create({
        data: { userId: users[0].id, businessUnitId: bu.id, roleId: roles[0].id },
      }),
    )
    // Assign managers and staff to each unit
    for (let j = 1; j < Math.min(users.length, 8); j++) {
      userAssignments.push(
        prisma.userBusinessUnit.create({
          data: { userId: users[j].id, businessUnitId: bu.id, roleId: roles[j % roles.length].id },
        }),
      )
    }
  }
  await Promise.all(userAssignments)

  // 2) NUMBERING SERIES
  console.log("Creating numbering series...")
  const docTypes = [
    "SALES_QUOTATION",
    "SALES_ORDER",
    "DELIVERY",
    "AR_INVOICE",
    "PURCHASE_REQUEST",
    "PURCHASE_ORDER",
    "GOODS_RECEIPT_PO",
    "AP_INVOICE",
    "JOURNAL_ENTRY",
    "INCOMING_PAYMENT",
    "OUTGOING_PAYMENT",
  ] as const

  const numberingSeries = []
  for (const bu of businessUnits) {
    const prefix = bu.name
      .split(" ")
      .map((w) => w[0])
      .join("")
    for (const docType of docTypes) {
      numberingSeries.push(
        prisma.numberingSeries.create({
          data: {
            name: `${docType}-${prefix}`,
            prefix: `${docType.substring(0, 3)}-${prefix}-`,
            nextNumber: 1,
            documentType: docType as any,
            businessUnitId: bu.id,
            createdById: users[0].id,
          },
        }),
      )
    }
  }
  await Promise.all(numberingSeries)

  // 3) CHART OF ACCOUNTS
  console.log("Creating chart of accounts...")
  const accountTypes = await Promise.all([
    prisma.accountType.create({ data: { name: "ASSET", defaultNormalBalance: "DEBIT", createdById: users[0].id } }),
    prisma.accountType.create({
      data: { name: "LIABILITY", defaultNormalBalance: "CREDIT", createdById: users[0].id },
    }),
    prisma.accountType.create({ data: { name: "EQUITY", defaultNormalBalance: "CREDIT", createdById: users[0].id } }),
    prisma.accountType.create({ data: { name: "REVENUE", defaultNormalBalance: "CREDIT", createdById: users[0].id } }),
    prisma.accountType.create({ data: { name: "EXPENSE", defaultNormalBalance: "DEBIT", createdById: users[0].id } }),
  ])

  // Create account categories and groups for each business unit
  const accountCategories = []
  const accountGroups = []
  const glAccounts = []

  for (const bu of businessUnits) {
    // Account Categories
    const categories = await Promise.all([
      prisma.accountCategory.create({
        data: {
          businessUnitId: bu.id,
          code: "CASH",
          name: "Cash and Cash Equivalents",
          level: 1,
          createdById: users[0].id,
        },
      }),
      prisma.accountCategory.create({
        data: { businessUnitId: bu.id, code: "AR", name: "Accounts Receivable", level: 1, createdById: users[0].id },
      }),
      prisma.accountCategory.create({
        data: { businessUnitId: bu.id, code: "INV", name: "Inventory", level: 1, createdById: users[0].id },
      }),
      prisma.accountCategory.create({
        data: {
          businessUnitId: bu.id,
          code: "PPE",
          name: "Property Plant Equipment",
          level: 1,
          createdById: users[0].id,
        },
      }),
    ])
    accountCategories.push(...categories)

    // Account Groups
    const groups = await Promise.all([
      prisma.accountGroup.create({
        data: {
          businessUnitId: bu.id,
          name: "1000-1999 Current Assets",
          codePrefix: "1",
          rangeMin: 1000,
          rangeMax: 1999,
          createdById: users[0].id,
        },
      }),
      prisma.accountGroup.create({
        data: {
          businessUnitId: bu.id,
          name: "2000-2999 Current Liabilities",
          codePrefix: "2",
          rangeMin: 2000,
          rangeMax: 2999,
          createdById: users[0].id,
        },
      }),
      prisma.accountGroup.create({
        data: {
          businessUnitId: bu.id,
          name: "4000-4999 Revenue",
          codePrefix: "4",
          rangeMin: 4000,
          rangeMax: 4999,
          createdById: users[0].id,
        },
      }),
    ])
    accountGroups.push(...groups)

    // GL Accounts - Hospitality focused
    const accounts = await Promise.all([
      // Assets
      prisma.glAccount.create({
        data: {
          businessUnitId: bu.id,
          accountCode: "1000",
          name: "Cash on Hand",
          accountTypeId: accountTypes[0].id,
          normalBalance: "DEBIT",
          accountCategoryId: categories[0].id,
          accountGroupId: groups[0].id,
          createdById: users[0].id,
        },
      }),
      prisma.glAccount.create({
        data: {
          businessUnitId: bu.id,
          accountCode: "1010",
          name: "Cash in Bank - BPI PHP",
          accountTypeId: accountTypes[0].id,
          normalBalance: "DEBIT",
          accountCategoryId: categories[0].id,
          createdById: users[0].id,
        },
      }),
      prisma.glAccount.create({
        data: {
          businessUnitId: bu.id,
          accountCode: "1100",
          name: "Accounts Receivable - Guests",
          accountTypeId: accountTypes[0].id,
          normalBalance: "DEBIT",
          accountCategoryId: categories[1].id,
          createdById: users[0].id,
        },
      }),
      prisma.glAccount.create({
        data: {
          businessUnitId: bu.id,
          accountCode: "1200",
          name: "Food & Beverage Inventory",
          accountTypeId: accountTypes[0].id,
          normalBalance: "DEBIT",
          accountCategoryId: categories[2].id,
          createdById: users[0].id,
        },
      }),
      prisma.glAccount.create({
        data: {
          businessUnitId: bu.id,
          accountCode: "1210",
          name: "Housekeeping Supplies",
          accountTypeId: accountTypes[0].id,
          normalBalance: "DEBIT",
          accountCategoryId: categories[2].id,
          createdById: users[0].id,
        },
      }),
      prisma.glAccount.create({
        data: {
          businessUnitId: bu.id,
          accountCode: "1405",
          name: "Input VAT",
          accountTypeId: accountTypes[0].id,
          normalBalance: "DEBIT",
          createdById: users[0].id,
        },
      }),
      // Liabilities
      prisma.glAccount.create({
        data: {
          businessUnitId: bu.id,
          accountCode: "2000",
          name: "Accounts Payable",
          accountTypeId: accountTypes[1].id,
          normalBalance: "CREDIT",
          createdById: users[0].id,
        },
      }),
      prisma.glAccount.create({
        data: {
          businessUnitId: bu.id,
          accountCode: "2105",
          name: "VAT Output Payable",
          accountTypeId: accountTypes[1].id,
          normalBalance: "CREDIT",
          createdById: users[0].id,
        },
      }),
      // Equity
      prisma.glAccount.create({
        data: {
          businessUnitId: bu.id,
          accountCode: "3000",
          name: "Retained Earnings",
          accountTypeId: accountTypes[2].id,
          normalBalance: "CREDIT",
          createdById: users[0].id,
        },
      }),
      // Revenue - Hospitality specific
      prisma.glAccount.create({
        data: {
          businessUnitId: bu.id,
          accountCode: "4000",
          name: "Room Revenue",
          accountTypeId: accountTypes[3].id,
          normalBalance: "CREDIT",
          accountGroupId: groups[2].id,
          createdById: users[0].id,
        },
      }),
      prisma.glAccount.create({
        data: {
          businessUnitId: bu.id,
          accountCode: "4100",
          name: "Food & Beverage Revenue",
          accountTypeId: accountTypes[3].id,
          normalBalance: "CREDIT",
          accountGroupId: groups[2].id,
          createdById: users[0].id,
        },
      }),
      prisma.glAccount.create({
        data: {
          businessUnitId: bu.id,
          accountCode: "4200",
          name: "Event & Function Revenue",
          accountTypeId: accountTypes[3].id,
          normalBalance: "CREDIT",
          createdById: users[0].id,
        },
      }),
      // Expenses
      prisma.glAccount.create({
        data: {
          businessUnitId: bu.id,
          accountCode: "5000",
          name: "Cost of Food & Beverage",
          accountTypeId: accountTypes[4].id,
          normalBalance: "DEBIT",
          createdById: users[0].id,
        },
      }),
      prisma.glAccount.create({
        data: {
          businessUnitId: bu.id,
          accountCode: "6100",
          name: "Housekeeping Expenses",
          accountTypeId: accountTypes[4].id,
          normalBalance: "DEBIT",
          createdById: users[0].id,
        },
      }),
      prisma.glAccount.create({
        data: {
          businessUnitId: bu.id,
          accountCode: "6200",
          name: "Utilities Expense",
          accountTypeId: accountTypes[4].id,
          normalBalance: "DEBIT",
          createdById: users[0].id,
        },
      }),
    ])
    glAccounts.push(...accounts)
  }

  // 4) BANK ACCOUNTS
  console.log("Creating bank accounts...")
  const bankAccounts = []
  for (let i = 0; i < businessUnits.length; i++) {
    const bu = businessUnits[i]
    const cashAccount = glAccounts.find((acc) => acc.businessUnitId === bu.id && acc.accountCode === "1010")
    if (cashAccount) {
      bankAccounts.push(
        prisma.bankAccount.create({
          data: {
            name: `${bu.name} Operating Account`,
            bankName: "Bank of the Philippine Islands",
            accountNumber: `00${1000 + i}123456`,
            glAccountId: cashAccount.id,
            businessUnitId: bu.id,
            createdById: users[0].id,
          },
        }),
      )
    }
  }
  const createdBankAccounts = await Promise.all(bankAccounts)

  // 5) ACCOUNTING PERIODS
  console.log("Creating accounting periods...")
  const now = new Date()
  const fiscalYear = now.getFullYear()
  const periods = []

  for (const bu of businessUnits) {
    // Create 12 months of periods
    for (let month = 1; month <= 12; month++) {
      periods.push(
        prisma.accountingPeriod.create({
          data: {
            name: `FY${fiscalYear} P${month}`,
            startDate: new Date(fiscalYear, month - 1, 1),
            endDate: new Date(fiscalYear, month, 0),
            businessUnitId: bu.id,
            fiscalYear,
            periodNumber: month,
            status: month <= now.getMonth() + 1 ? "OPEN" : "OPEN",
            type: "MONTHLY",
            createdById: users[0].id,
            updatedById: users[0].id,
          },
        }),
      )
    }
  }
  const createdPeriods = await Promise.all(periods)

  // 6) TAX CODES
  console.log("Creating tax codes...")
  const taxCodes = []
  for (const bu of businessUnits) {
    taxCodes.push(
      ...(await Promise.all([
        prisma.taxCode.create({
          data: {
            businessUnitId: bu.id,
            code: "VAT12",
            name: "VAT 12%",
            rate: D(0.12),
            type: "VAT",
            createdById: users[0].id,
          },
        }),
        prisma.taxCode.create({
          data: {
            businessUnitId: bu.id,
            code: "VATEX",
            name: "VAT Exempt",
            rate: D(0),
            type: "VAT",
            createdById: users[0].id,
          },
        }),
        prisma.taxCode.create({
          data: {
            businessUnitId: bu.id,
            code: "EWT2",
            name: "Expanded Withholding Tax 2%",
            rate: D(0.02),
            type: "OTHER",
            createdById: users[0].id,
          },
        }),
      ])),
    )
  }

  // 7) DIMENSIONS
  console.log("Creating dimensions...")
  const dimensions = []
  for (const bu of businessUnits) {
    const dept = await prisma.dimension.create({
      data: {
        businessUnitId: bu.id,
        name: "Department",
        type: "DEPARTMENT",
        createdById: users[0].id,
      },
    })

    const location = await prisma.dimension.create({
      data: {
        businessUnitId: bu.id,
        name: "Location",
        type: "LOCATION",
        createdById: users[0].id,
      },
    })

    dimensions.push(dept, location)

    // Dimension Values
    await Promise.all([
      prisma.dimensionValue.create({
        data: { dimensionId: dept.id, name: "Front Office", code: "FO", createdById: users[0].id },
      }),
      prisma.dimensionValue.create({
        data: { dimensionId: dept.id, name: "Housekeeping", code: "HK", createdById: users[0].id },
      }),
      prisma.dimensionValue.create({
        data: { dimensionId: dept.id, name: "Food & Beverage", code: "FB", createdById: users[0].id },
      }),
      prisma.dimensionValue.create({
        data: { dimensionId: dept.id, name: "Maintenance", code: "MT", createdById: users[0].id },
      }),
      prisma.dimensionValue.create({
        data: { dimensionId: location.id, name: "Main Building", code: "MB", createdById: users[0].id },
      }),
      prisma.dimensionValue.create({
        data: { dimensionId: location.id, name: "Annex Building", code: "AB", createdById: users[0].id },
      }),
    ])
  }

  // 8) BUSINESS PARTNERS
  console.log("Creating business partners...")
  const businessPartners = []

  // Customers - Travel Agencies, Corporate Clients, Walk-ins
  const customerNames = [
    "Rajah Travel Corporation",
    "Philippine Airlines",
    "Cebu Pacific Air",
    "Ayala Corporation",
    "SM Investments Corporation",
    "Jollibee Foods Corporation",
    "San Miguel Corporation",
    "BDO Unibank Inc",
    "Metropolitan Bank & Trust Company",
    "Robinsons Land Corporation",
    "Megaworld Corporation",
    "Century Pacific Food Inc",
    "Universal Robina Corporation",
    "Aboitiz Equity Ventures",
    "GT Capital Holdings",
    "PLDT Inc",
    "Globe Telecom Inc",
    "Manila Electric Company",
    "Petron Corporation",
    "Shell Philippines",
    // Individual guests
    "Juan Dela Cruz",
    "Maria Santos",
    "Jose Rizal",
    "Andres Bonifacio",
    "Emilio Aguinaldo",
    "Apolinario Mabini",
    "Marcelo Del Pilar",
    "Graciano Lopez Jaena",
    "Mariano Ponce",
    "Antonio Luna",
    "Heneral Gregorio Del Pilar",
    "Melchora Aquino",
    "Gabriela Silang",
    "Corazon Aquino",
    "Benigno Aquino Jr",
    "Ferdinand Marcos",
    "Gloria Arroyo",
    "Rodrigo Duterte",
    "Manny Pacquiao",
    "Lea Salonga",
  ]

  for (let i = 0; i < businessUnits.length; i++) {
    const bu = businessUnits[i]
    for (let j = 0; j < 15; j++) {
      const name = customerNames[j + i * 15] || `Customer ${j + (i * 15) + 1}`
      businessPartners.push(
        prisma.businessPartner.create({
          data: {
            bpCode: `CUST-${bu.name
              .split(" ")
              .map((w) => w[0])
              .join("")}-${String(j + 1).padStart(3, "0")}`,
            name,
            type: "CUSTOMER",
            phone: `+63 ${randomBetween(900, 999)} ${randomBetween(100, 999)} ${randomBetween(1000, 9999)}`,
            email: `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}@email.com`,
            businessUnitId: bu.id,
            createdById: users[randomBetween(0, users.length - 1)].id,
          },
        }),
      )
    }
  }

  // Vendors - Suppliers for hospitality industry
  const vendorNames = [
    "Metro Manila Food Distributors",
    "Cebu Fresh Produce Supply",
    "Davao Organic Farms",
    "Philippine Linen Supply Co",
    "Marikina Textile Mills",
    "Bataan Food Processing Corp",
    "Laguna Spring Water Company",
    "Baguio Highland Vegetables",
    "Iloilo Seafood Traders",
    "Zamboanga Spice Merchants",
    "Bicol Express Logistics",
    "Palawan Pearl Divers Coop",
    "Mindanao Coffee Roasters",
    "Visayas Coconut Oil Mills",
    "Luzon Rice Traders",
    "Philippine Cleaning Solutions",
    "Manila Bay Salt Works",
    "Cordillera Mountain Herbs",
    "Sulu Sea Salt Company",
    "Taal Lake Fish Farm",
    "Carabao Dairy Cooperative",
    "Philippine Furniture Makers",
    "Bamboo Craft Industries",
    "Rattan Weavers Guild",
    "Tropical Fruit Processors",
    "Island Spice Company",
    "Coconut Coir Products",
    "Philippine Handicrafts Export",
    "Native Delicacies Suppliers",
    "Organic Farm Collective",
  ]

  for (let i = 0; i < businessUnits.length; i++) {
    const bu = businessUnits[i]
    for (let j = 0; j < 15; j++) {
      const name = vendorNames[j + i * 7] || `Vendor ${j + (i * 15) + 1}`
      businessPartners.push(
        prisma.businessPartner.create({
          data: {
            bpCode: `VEND-${bu.name
              .split(" ")
              .map((w) => w[0])
              .join("")}-${String(j + 1).padStart(3, "0")}`,
            name,
            type: "VENDOR",
            phone: `+63 ${randomBetween(900, 999)} ${randomBetween(100, 999)} ${randomBetween(1000, 9999)}`,
            email: `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}@supplier.com`,
            businessUnitId: bu.id,
            paymentTerms: ["Net 30", "Net 15", "2/10 Net 30", "COD"][randomBetween(0, 3)],
            creditLimit: randomDecimal(50000, 500000),
            createdById: users[randomBetween(0, users.length - 1)].id,
          },
        }),
      )
    }
  }

  const createdBusinessPartners = await Promise.all(businessPartners)

  // 9) UOM (Units of Measure)
  console.log("Creating units of measure...")
  const uoms = await Promise.all([
    prisma.uoM.create({ data: { name: "Piece", symbol: "pc", createdById: users[0].id } }),
    prisma.uoM.create({ data: { name: "Kilogram", symbol: "kg", createdById: users[0].id } }),
    prisma.uoM.create({ data: { name: "Liter", symbol: "L", createdById: users[0].id } }),
    prisma.uoM.create({ data: { name: "Gram", symbol: "g", createdById: users[0].id } }),
    prisma.uoM.create({ data: { name: "Milliliter", symbol: "ml", createdById: users[0].id } }),
    prisma.uoM.create({ data: { name: "Box", symbol: "box", createdById: users[0].id } }),
    prisma.uoM.create({ data: { name: "Pack", symbol: "pack", createdById: users[0].id } }),
    prisma.uoM.create({ data: { name: "Bottle", symbol: "btl", createdById: users[0].id } }),
    prisma.uoM.create({ data: { name: "Can", symbol: "can", createdById: users[0].id } }),
    prisma.uoM.create({ data: { name: "Roll", symbol: "roll", createdById: users[0].id } }),
  ])

  // 10) INVENTORY LOCATIONS
  console.log("Creating inventory locations...")
  const inventoryLocations = []

  for (const bu of businessUnits) {
    const locations = await Promise.all([
      prisma.inventoryLocation.create({
        data: {
          name: "Main Kitchen",
          description: "Primary food preparation area",
          address: `${bu.name} Main Building`,
          contactPerson: "Head Chef",
          phone: `+63 ${randomBetween(900, 999)} ${randomBetween(100, 999)} ${randomBetween(1000, 9999)}`,
          businessUnitId: bu.id,
          createdById: users[0].id,
        },
      }),
      prisma.inventoryLocation.create({
        data: {
          name: "Main Warehouse",
          description: "Central storage facility",
          address: `${bu.name} Storage Building`,
          contactPerson: "Warehouse Manager",
          phone: `+63 ${randomBetween(900, 999)} ${randomBetween(100, 999)} ${randomBetween(1000, 9999)}`,
          businessUnitId: bu.id,
          createdById: users[0].id,
        },
      }),
      prisma.inventoryLocation.create({
        data: {
          name: "Housekeeping Storage",
          description: "Cleaning supplies and linens",
          address: `${bu.name} Service Area`,
          contactPerson: "Housekeeping Supervisor",
          phone: `+63 ${randomBetween(900, 999)} ${randomBetween(100, 999)} ${randomBetween(1000, 9999)}`,
          businessUnitId: bu.id,
          createdById: users[0].id,
        },
      }),
      prisma.inventoryLocation.create({
        data: {
          name: "Bar Storage",
          description: "Alcoholic and non-alcoholic beverages",
          address: `${bu.name} Bar Area`,
          contactPerson: "Bar Manager",
          phone: `+63 ${randomBetween(900, 999)} ${randomBetween(100, 999)} ${randomBetween(1000, 9999)}`,
          businessUnitId: bu.id,
          createdById: users[0].id,
        },
      }),
      prisma.inventoryLocation.create({
        data: {
          name: "Maintenance Shop",
          description: "Tools and maintenance supplies",
          address: `${bu.name} Maintenance Building`,
          contactPerson: "Maintenance Supervisor",
          phone: `+63 ${randomBetween(900, 999)} ${randomBetween(100, 999)} ${randomBetween(1000, 9999)}`,
          businessUnitId: bu.id,
          createdById: users[0].id,
        },
      }),
    ])
    inventoryLocations.push(...locations)
  }

  // 11) INVENTORY CATEGORIES
  console.log("Creating inventory categories...")
  const inventoryCategories = []

  for (const bu of businessUnits) {
    const categories = await Promise.all([
      prisma.inventoryCategory.create({
        data: { name: "Food & Beverages", businessUnitId: bu.id },
      }),
      prisma.inventoryCategory.create({
        data: { name: "Housekeeping Supplies", businessUnitId: bu.id },
      }),
      prisma.inventoryCategory.create({
        data: { name: "Maintenance Supplies", businessUnitId: bu.id },
      }),
      prisma.inventoryCategory.create({
        data: { name: "Office Supplies", businessUnitId: bu.id },
      }),
      prisma.inventoryCategory.create({
        data: { name: "Linens & Textiles", businessUnitId: bu.id },
      }),
    ])
    inventoryCategories.push(...categories)
  }

  // 12) INVENTORY ITEMS
  console.log("Creating inventory items...")
  const inventoryItems = []

  const itemTemplates = [
    // Food & Beverages
    { name: "Jasmine Rice", category: "Food & Beverages", uom: "kg", standardCost: "45.00" },
    { name: "Chicken Breast", category: "Food & Beverages", uom: "kg", standardCost: "280.00" },
    { name: "Pork Belly", category: "Food & Beverages", uom: "kg", standardCost: "320.00" },
    { name: "Fresh Fish (Bangus)", category: "Food & Beverages", uom: "kg", standardCost: "180.00" },
    { name: "Beef Sirloin", category: "Food & Beverages", uom: "kg", standardCost: "450.00" },
    { name: "Shrimp", category: "Food & Beverages", uom: "kg", standardCost: "380.00" },
    { name: "Coconut Oil", category: "Food & Beverages", uom: "L", standardCost: "120.00" },
    { name: "Soy Sauce", category: "Food & Beverages", uom: "L", standardCost: "85.00" },
    { name: "Vinegar", category: "Food & Beverages", uom: "L", standardCost: "65.00" },
    { name: "Calamansi", category: "Food & Beverages", uom: "kg", standardCost: "150.00" },
    { name: "Tomatoes", category: "Food & Beverages", uom: "kg", standardCost: "80.00" },
    { name: "Onions", category: "Food & Beverages", uom: "kg", standardCost: "90.00" },
    { name: "Garlic", category: "Food & Beverages", uom: "kg", standardCost: "200.00" },
    { name: "Ginger", category: "Food & Beverages", uom: "kg", standardCost: "120.00" },
    { name: "Coconut Milk", category: "Food & Beverages", uom: "can", standardCost: "35.00" },
    { name: "San Miguel Beer", category: "Food & Beverages", uom: "btl", standardCost: "45.00" },
    { name: "Red Horse Beer", category: "Food & Beverages", uom: "btl", standardCost: "50.00" },
    { name: "Tanduay Rum", category: "Food & Beverages", uom: "btl", standardCost: "180.00" },
    { name: "Coca Cola", category: "Food & Beverages", uom: "btl", standardCost: "25.00" },
    { name: "Sprite", category: "Food & Beverages", uom: "btl", standardCost: "25.00" },

    // Housekeeping Supplies
    { name: "Toilet Paper", category: "Housekeeping Supplies", uom: "roll", standardCost: "25.00" },
    { name: "Hand Soap", category: "Housekeeping Supplies", uom: "btl", standardCost: "45.00" },
    { name: "Shampoo", category: "Housekeeping Supplies", uom: "btl", standardCost: "85.00" },
    { name: "Conditioner", category: "Housekeeping Supplies", uom: "btl", standardCost: "85.00" },
    { name: "Body Wash", category: "Housekeeping Supplies", uom: "btl", standardCost: "75.00" },
    { name: "Towels (Bath)", category: "Housekeeping Supplies", uom: "pc", standardCost: "180.00" },
    { name: "Towels (Hand)", category: "Housekeeping Supplies", uom: "pc", standardCost: "85.00" },
    { name: "Bed Sheets (Queen)", category: "Housekeeping Supplies", uom: "pc", standardCost: "450.00" },
    { name: "Pillowcases", category: "Housekeeping Supplies", uom: "pc", standardCost: "120.00" },
    { name: "Blankets", category: "Housekeeping Supplies", uom: "pc", standardCost: "380.00" },
    { name: "Vacuum Cleaner Bags", category: "Housekeeping Supplies", uom: "pack", standardCost: "150.00" },
    { name: "All-Purpose Cleaner", category: "Housekeeping Supplies", uom: "btl", standardCost: "65.00" },
    { name: "Glass Cleaner", category: "Housekeeping Supplies", uom: "btl", standardCost: "55.00" },
    { name: "Floor Wax", category: "Housekeeping Supplies", uom: "btl", standardCost: "120.00" },
    { name: "Disinfectant", category: "Housekeeping Supplies", uom: "btl", standardCost: "85.00" },

    // Maintenance Supplies
    { name: "Light Bulbs (LED)", category: "Maintenance Supplies", uom: "pc", standardCost: "180.00" },
    { name: "Electrical Wire", category: "Maintenance Supplies", uom: "roll", standardCost: "450.00" },
    { name: "PVC Pipes", category: "Maintenance Supplies", uom: "pc", standardCost: "280.00" },
    { name: "Paint (White)", category: "Maintenance Supplies", uom: "can", standardCost: "320.00" },
    { name: "Paint Brushes", category: "Maintenance Supplies", uom: "pc", standardCost: "85.00" },
    { name: "Screws & Bolts", category: "Maintenance Supplies", uom: "pack", standardCost: "120.00" },
    { name: "Hammer", category: "Maintenance Supplies", uom: "pc", standardCost: "380.00" },
    { name: "Screwdriver Set", category: "Maintenance Supplies", uom: "pc", standardCost: "450.00" },
    { name: "Plumbing Tape", category: "Maintenance Supplies", uom: "roll", standardCost: "25.00" },
    { name: "Lubricating Oil", category: "Maintenance Supplies", uom: "btl", standardCost: "180.00" },
  ]

  for (const bu of businessUnits) {
    for (let i = 0; i < itemTemplates.length; i++) {
      const template = itemTemplates[i]
      const category = inventoryCategories.find((c) => c.businessUnitId === bu.id && c.name === template.category)
      const uom = uoms.find((u) => u.symbol === template.uom)

      if (category && uom) {
        inventoryItems.push(
          prisma.inventoryItem.create({
            data: {
              itemCode: `${bu.name
                .split(" ")
                .map((w) => w[0])
                .join("")}-${String(i + 1).padStart(4, "0")}`,
              name: template.name,
              description: `${template.name} for ${bu.name}`,
              standardCost: template.standardCost,
              businessUnitId: bu.id,
              uomId: uom.id,
              inventoryCategoryId: category.id,
              isActive: true,
              createdById: users[randomBetween(0, users.length - 1)].id,
            },
          }),
        )
      }
    }
  }

  const createdInventoryItems = await Promise.all(inventoryItems)

  // 13) INVENTORY STOCK
  console.log("Creating inventory stock...")
  const inventoryStocks = []

  for (const item of createdInventoryItems) {
    const buLocations = inventoryLocations.filter((loc) => loc.businessUnitId === item.businessUnitId)
    // Create stock for 2-3 locations per item
    const selectedLocations = buLocations.slice(0, randomBetween(2, Math.min(3, buLocations.length)))

    for (const location of selectedLocations) {
      inventoryStocks.push(
        prisma.inventoryStock.create({
          data: {
            inventoryItemId: item.id,
            locationId: location.id,
            quantityOnHand: randomDecimal(10, 500),
            reorderPoint: randomDecimal(5, 50),
            createdById: users[randomBetween(0, users.length - 1)].id,
          },
        }),
      )
    }
  }

  const createdInventoryStocks = await Promise.all(inventoryStocks)

  // 14) MENU CATEGORIES
  console.log("Creating menu categories...")
  const menuCategories = []

  for (const bu of businessUnits) {
    const categories = await Promise.all([
      prisma.menuCategory.create({
        data: {
          name: "Filipino Specialties",
          description: "Traditional Filipino dishes",
          businessUnitId: bu.id,
          sortOrder: 1,
          createdById: users[0].id,
        },
      }),
      prisma.menuCategory.create({
        data: {
          name: "International Cuisine",
          description: "Western and Asian fusion dishes",
          businessUnitId: bu.id,
          sortOrder: 2,
          createdById: users[0].id,
        },
      }),
      prisma.menuCategory.create({
        data: {
          name: "Seafood",
          description: "Fresh seafood dishes",
          businessUnitId: bu.id,
          sortOrder: 3,
          createdById: users[0].id,
        },
      }),
      prisma.menuCategory.create({
        data: {
          name: "Beverages",
          description: "Hot and cold beverages",
          businessUnitId: bu.id,
          sortOrder: 4,
          createdById: users[0].id,
        },
      }),
      prisma.menuCategory.create({
        data: {
          name: "Desserts",
          description: "Sweet treats and desserts",
          businessUnitId: bu.id,
          sortOrder: 5,
          createdById: users[0].id,
        },
      }),
    ])
    menuCategories.push(...categories)
  }

  // 15) MENU ITEMS
  console.log("Creating menu items...")
  const menuItems = []

  const menuItemTemplates = [
    // Filipino Specialties
    { name: "Adobong Manok", price: "280.00", category: "Filipino Specialties" },
    { name: "Pork Sinigang", price: "320.00", category: "Filipino Specialties" },
    { name: "Beef Kare-Kare", price: "380.00", category: "Filipino Specialties" },
    { name: "Lechon Kawali", price: "350.00", category: "Filipino Specialties" },
    { name: "Chicken Inasal", price: "250.00", category: "Filipino Specialties" },
    { name: "Pork Sisig", price: "280.00", category: "Filipino Specialties" },
    { name: "Beef Caldereta", price: "380.00", category: "Filipino Specialties" },
    { name: "Laing", price: "220.00", category: "Filipino Specialties" },
    { name: "Pinakbet", price: "200.00", category: "Filipino Specialties" },
    { name: "Lumpia Shanghai", price: "180.00", category: "Filipino Specialties" },

    // International Cuisine
    { name: "Grilled Chicken Breast", price: "380.00", category: "International Cuisine" },
    { name: "Beef Steak", price: "580.00", category: "International Cuisine" },
    { name: "Pasta Carbonara", price: "320.00", category: "International Cuisine" },
    { name: "Chicken Caesar Salad", price: "280.00", category: "International Cuisine" },
    { name: "Fish and Chips", price: "350.00", category: "International Cuisine" },
    { name: "Pork Chop", price: "380.00", category: "International Cuisine" },
    { name: "Fried Rice", price: "180.00", category: "International Cuisine" },
    { name: "Club Sandwich", price: "250.00", category: "International Cuisine" },

    // Seafood
    { name: "Grilled Bangus", price: "280.00", category: "Seafood" },
    { name: "Sweet and Sour Lapu-Lapu", price: "450.00", category: "Seafood" },
    { name: "Buttered Shrimp", price: "380.00", category: "Seafood" },
    { name: "Crispy Squid", price: "320.00", category: "Seafood" },
    { name: "Fish Fillet", price: "350.00", category: "Seafood" },
    { name: "Seafood Paella", price: "480.00", category: "Seafood" },

    // Beverages
    { name: "Fresh Buko Juice", price: "80.00", category: "Beverages" },
    { name: "Calamansi Juice", price: "60.00", category: "Beverages" },
    { name: "Iced Tea", price: "50.00", category: "Beverages" },
    { name: "Coffee (Hot)", price: "80.00", category: "Beverages" },
    { name: "Cappuccino", price: "120.00", category: "Beverages" },
    { name: "Fresh Mango Shake", price: "120.00", category: "Beverages" },
    { name: "San Miguel Beer", price: "80.00", category: "Beverages" },
    { name: "Red Horse Beer", price: "90.00", category: "Beverages" },
    { name: "House Wine (Glass)", price: "180.00", category: "Beverages" },
    { name: "Soft Drinks", price: "45.00", category: "Beverages" },

    // Desserts
    { name: "Halo-Halo", price: "150.00", category: "Desserts" },
    { name: "Leche Flan", price: "120.00", category: "Desserts" },
    { name: "Buko Pie", price: "180.00", category: "Desserts" },
    { name: "Ice Cream (3 scoops)", price: "120.00", category: "Desserts" },
    { name: "Chocolate Cake", price: "180.00", category: "Desserts" },
    { name: "Fresh Fruit Salad", price: "150.00", category: "Desserts" },
  ]

  for (const bu of businessUnits) {
    for (const template of menuItemTemplates) {
      const category = menuCategories.find((c) => c.businessUnitId === bu.id && c.name === template.category)
      if (category) {
        menuItems.push(
          prisma.menuItem.create({
            data: {
              name: template.name,
              description: `Delicious ${template.name} prepared by our expert chefs`,
              price: D(template.price),
              businessUnitId: bu.id,
              categoryId: category.id,
              isActive: true,
              createdById: users[randomBetween(0, users.length - 1)].id,
            },
          }),
        )
      }
    }
  }

  const createdMenuItems = await Promise.all(menuItems)

  // 16) POS TERMINALS
  console.log("Creating POS terminals...")
  const posTerminals = []

  for (const bu of businessUnits) {
    for (let i = 1; i <= 3; i++) {
      posTerminals.push(
        prisma.posTerminal.create({
          data: {
            name: `${bu.name} Terminal ${i}`,
            businessUnitId: bu.id,
            createdById: users[0].id,
          },
        }),
      )
    }
  }

  const createdPosTerminals = await Promise.all(posTerminals)

  // 17) TABLES
  console.log("Creating tables...")
  const tables = []

  for (const bu of businessUnits) {
    // Create 20 tables per business unit
    for (let i = 1; i <= 20; i++) {
      tables.push(
        prisma.table.create({
          data: {
            name: `Table ${i}`,
            businessUnitId: bu.id,
            status: ["AVAILABLE", "OCCUPIED", "RESERVED"][randomBetween(0, 2)] as any,
            createdById: users[randomBetween(0, users.length - 1)].id,
          },
        }),
      )
    }
  }

  const createdTables = await Promise.all(tables)

  // 18) PAYMENT METHODS
  console.log("Creating payment methods...")
  const paymentMethods = await Promise.all([
    prisma.paymentMethod.create({ data: { name: "Cash", createdById: users[0].id } }),
    prisma.paymentMethod.create({ data: { name: "Credit Card", createdById: users[0].id } }),
    prisma.paymentMethod.create({ data: { name: "Debit Card", createdById: users[0].id } }),
    prisma.paymentMethod.create({ data: { name: "GCash", createdById: users[0].id } }),
    prisma.paymentMethod.create({ data: { name: "PayMaya", createdById: users[0].id } }),
    prisma.paymentMethod.create({ data: { name: "Bank Transfer", createdById: users[0].id } }),
  ])

  // 19) DISCOUNTS
  console.log("Creating discounts...")
  const discounts = []

  for (const bu of businessUnits) {
    discounts.push(
      ...(await Promise.all([
        prisma.discount.create({
          data: {
            name: "Senior Citizen Discount",
            type: "PERCENTAGE",
            value: D(20),
            businessUnitId: bu.id,
            createdById: users[0].id,
          },
        }),
        prisma.discount.create({
          data: {
            name: "PWD Discount",
            type: "PERCENTAGE",
            value: D(20),
            businessUnitId: bu.id,
            createdById: users[0].id,
          },
        }),
        prisma.discount.create({
          data: {
            name: "Group Discount",
            type: "PERCENTAGE",
            value: D(10),
            businessUnitId: bu.id,
            createdById: users[0].id,
          },
        }),
        prisma.discount.create({
          data: {
            name: "Early Bird Special",
            type: "FIXED_AMOUNT",
            value: D(100),
            businessUnitId: bu.id,
            createdById: users[0].id,
          },
        }),
      ])),
    )
  }

  // 20) SHIFTS
  console.log("Creating shifts...")
  const shifts = []

  for (let i = 0; i < businessUnits.length; i++) {
    const bu = businessUnits[i]
    const terminal = createdPosTerminals.find((t) => t.businessUnitId === bu.id)
    if (terminal) {
      // Create 10 shifts per business unit
      for (let j = 0; j < 10; j++) {
        const startDate = new Date(now.getTime() - j * 24 * 60 * 60 * 1000)
        shifts.push(
          prisma.shift.create({
            data: {
              businessUnitId: bu.id,
              userId: users[randomBetween(1, users.length - 1)].id,
              terminalId: terminal.id,
              startedAt: startDate,
              endedAt: j < 5 ? new Date(startDate.getTime() + 8 * 60 * 60 * 1000) : null,
              startingCash: randomDecimal(5000, 10000),
              endingCash: j < 5 ? randomDecimal(8000, 15000) : null,
              createdById: users[0].id,
            },
          }),
        )
      }
    }
  }

  const createdShifts = await Promise.all(shifts)

  console.log("✅ Seed completed successfully!")
  console.log(`Created:
  - ${roles.length} roles
  - ${users.length} users  
  - ${businessUnits.length} business units
  - ${createdBusinessPartners.length} business partners
  - ${createdInventoryItems.length} inventory items
  - ${createdInventoryStocks.length} inventory stock records
  - ${createdMenuItems.length} menu items
  - ${createdTables.length} tables
  - ${createdShifts.length} shifts
  - And much more!`)
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
