// Seed script for the ERP/POS schema (Philippines-focused data)
// How to run (after generating Prisma Client):
//  - npx prisma generate   // generates Prisma Client [^1][^5]
//  - ts-node scripts/seed.ts  (or node --loader ts-node/esm scripts/seed.ts if using ESM)
//
// Note: This script assumes an empty database. For idempotency in non-empty DBs,
// convert some creates into upserts based on unique fields.

import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

// small helper for decimals
const D = (v: string | number) => new Prisma.Decimal(v)

// random-ish doc number helper
const doc = (prefix: string, n: number | string) => `${prefix}-${String(n).toString().padStart(5, '0')}`

async function main() {
  console.log('Seeding database with Philippines-focused production-grade data...')

  // 1) Core: Roles, Users, Business Units, Assignments
  const [adminRole, managerRole, accountantRole, cashierRole] = await Promise.all([
    prisma.roles.create({ data: { role: 'Admin' } }),
    prisma.roles.create({ data: { role: 'Manager' } }),
    prisma.roles.create({ data: { role: 'Accountant' } }),
    prisma.roles.create({ data: { role: 'Cashier' } }),
  ])

  const [userAdmin, userAcct, userCashier] = await Promise.all([
    prisma.user.create({ data: { name: 'System Admin', username: 'admin', password: 'admin123', isActive: true } }),
    prisma.user.create({ data: { name: 'Maria Santos', username: 'maria', password: 'secret', isActive: true } }),
    prisma.user.create({ data: { name: 'Jose Reyes', username: 'jose', password: 'secret', isActive: true } }),
  ])

  const buMnl = await prisma.businessUnit.create({
    data: {
      name: 'Manila HQ',
      functionalCurrency: 'PHP',
      reportingCurrency: 'USD',
    },
  })

  // optional second BU for intercompany example
  const buCeb = await prisma.businessUnit.create({
    data: {
      name: 'Cebu Branch',
      functionalCurrency: 'PHP',
      reportingCurrency: 'USD',
    },
  })

  await Promise.all([
    prisma.userBusinessUnit.create({
      data: { userId: userAdmin.id, businessUnitId: buMnl.id, roleId: adminRole.id },
    }),
    prisma.userBusinessUnit.create({
      data: { userId: userAcct.id, businessUnitId: buMnl.id, roleId: accountantRole.id },
    }),
    prisma.userBusinessUnit.create({
      data: { userId: userCashier.id, businessUnitId: buMnl.id, roleId: cashierRole.id },
    }),
  ])

  // 2) Numbering Series (simple)
  const docTypes = [
    'SALES_ORDER',
    'DELIVERY',
    'AR_INVOICE',
    'PURCHASE_REQUEST',
    'PURCHASE_ORDER',
    'GOODS_RECEIPT_PO',
    'AP_INVOICE',
    'JOURNAL_ENTRY',
    'INCOMING_PAYMENT',
    'OUTGOING_PAYMENT',
  ] as const

  await Promise.all(
    docTypes.map((dt) =>
      prisma.numberingSeries.create({
        data: {
          name: `${dt}-MNL`,
          prefix: `${dt.substring(0, 3)}-MNL-`,
          nextNumber: 1,
          documentType: dt as any,
          businessUnitId: buMnl.id,
        }
      }),
    ),
  )

  // 3) Chart of Accounts types and groups
  const [assetType, liabilityType, equityType, revenueType, expenseType] = await Promise.all([
    prisma.accountType.create({ data: { name: 'ASSET', defaultNormalBalance: 'DEBIT' } }),
    prisma.accountType.create({ data: { name: 'LIABILITY', defaultNormalBalance: 'CREDIT' } }),
    prisma.accountType.create({ data: { name: 'EQUITY', defaultNormalBalance: 'CREDIT' } }),
    prisma.accountType.create({ data: { name: 'REVENUE', defaultNormalBalance: 'CREDIT' } }),
    prisma.accountType.create({ data: { name: 'EXPENSE', defaultNormalBalance: 'DEBIT' } }),
  ])

  const accCatCash = await prisma.accountCategory.create({
    data: { businessUnitId: buMnl.id, code: 'ASSET-CASH', name: 'Cash and Cash Equivalents', level: 1 },
  })
  const accGroup1 = await prisma.accountGroup.create({
    data: {
      businessUnitId: buMnl.id,
      name: '1000-1999 Current Assets',
      codePrefix: '1',
      rangeMin: 1000,
      rangeMax: 1999,
      description: 'Current assets accounts',
    },
  })

  // 4) GL Accounts (PH style incl. VAT)
  const gl = {
    cashOnHand: await prisma.glAccount.create({
      data: {
        businessUnitId: buMnl.id,
        accountCode: '1000',
        name: 'Cash on Hand',
        accountTypeId: assetType.id,
        normalBalance: 'DEBIT',
        accountCategoryId: accCatCash.id,
        accountGroupId: accGroup1.id,
      },
    }),
    cashInBankBDO: await prisma.glAccount.create({
      data: {
        businessUnitId: buMnl.id,
        accountCode: '1010',
        name: 'Cash in Bank - BDO PHP',
        accountTypeId: assetType.id,
        normalBalance: 'DEBIT',
      },
    }),
    accountsReceivable: await prisma.glAccount.create({
      data: {
        businessUnitId: buMnl.id,
        accountCode: '1100',
        name: 'Accounts Receivable',
        accountTypeId: assetType.id,
        normalBalance: 'DEBIT',
      },
    }),
    inventory: await prisma.glAccount.create({
      data: {
        businessUnitId: buMnl.id,
        accountCode: '1200',
        name: 'Inventory',
        accountTypeId: assetType.id,
        normalBalance: 'DEBIT',
      },
    }),
    inputVAT: await prisma.glAccount.create({
      data: {
        businessUnitId: buMnl.id,
        accountCode: '1405',
        name: 'Input VAT',
        accountTypeId: assetType.id,
        normalBalance: 'DEBIT',
      },
    }),
    accountsPayable: await prisma.glAccount.create({
      data: {
        businessUnitId: buMnl.id,
        accountCode: '2000',
        name: 'Accounts Payable',
        accountTypeId: liabilityType.id,
        normalBalance: 'CREDIT',
      },
    }),
    vatPayable: await prisma.glAccount.create({
      data: {
        businessUnitId: buMnl.id,
        accountCode: '2105',
        name: 'VAT Output Payable',
        accountTypeId: liabilityType.id,
        normalBalance: 'CREDIT',
      },
    }),
    ownersEquity: await prisma.glAccount.create({
      data: {
        businessUnitId: buMnl.id,
        accountCode: '3000',
        name: "Owner's Equity",
        accountTypeId: equityType.id,
        normalBalance: 'CREDIT',
      },
    }),
    sales: await prisma.glAccount.create({
      data: {
        businessUnitId: buMnl.id,
        accountCode: '4000',
        name: 'Sales Revenue',
        accountTypeId: revenueType.id,
        normalBalance: 'CREDIT',
      },
    }),
    cogs: await prisma.glAccount.create({
      data: {
        businessUnitId: buMnl.id,
        accountCode: '5000',
        name: 'Cost of Goods Sold',
        accountTypeId: expenseType.id,
        normalBalance: 'DEBIT',
      },
    }),
    operatingExpenses: await prisma.glAccount.create({
      data: {
        businessUnitId: buMnl.id,
        accountCode: '6100',
        name: 'Operating Expenses',
        accountTypeId: expenseType.id,
        normalBalance: 'DEBIT',
      },
    }),
  }

  // 5) Bank Account
  const bankBDO = await prisma.bankAccount.create({
    data: {
      name: 'Operating Account (PHP)',
      bankName: 'BDO Unibank, Inc.',
      accountNumber: '007490123456',
      glAccountId: gl.cashInBankBDO.id,
      businessUnitId: buMnl.id,
    },
  })

  // 6) Accounting Period and Posting Control
  const now = new Date()
  const fiscalYear = now.getFullYear()
  const periodNumber = now.getMonth() + 1

  const period = await prisma.accountingPeriod.create({
    data: {
      name: `FY${fiscalYear} P${periodNumber}`,
      startDate: new Date(fiscalYear, now.getMonth(), 1),
      endDate: new Date(fiscalYear, now.getMonth() + 1, 0),
      businessUnitId: buMnl.id,
      fiscalYear,
      periodNumber,
      status: 'OPEN',
      type: 'MONTHLY',
      createdById: userAdmin.id,
      updatedById: userAdmin.id,
    },
  })

  await prisma.postingControl.create({
    data: {
      businessUnitId: buMnl.id,
      accountingPeriodId: period.id,
      isAllowed: true,
      isDefault: true,
      notes: 'Default posting allowed',
    },
  })

  // 7) Taxes (PH VAT 12%)
  const [vat12, vatExempt, ewt1] = await Promise.all([
    prisma.taxCode.create({
      data: {
        businessUnitId: buMnl.id,
        code: 'VAT12',
        name: 'VAT 12%',
        rate: D(0.12),
        type: 'VAT',
        createdById: userAdmin.id,
      },
    }),
    prisma.taxCode.create({
      data: {
        businessUnitId: buMnl.id,
        code: 'VATEX',
        name: 'VAT Exempt',
        rate: D(0),
        type: 'VAT',
        createdById: userAdmin.id,
      },
    }),
    prisma.taxCode.create({
      data: {
        businessUnitId: buMnl.id,
        code: 'EWT1',
        name: 'Expanded Withholding Tax 1%',
        rate: D(0.01),
        type: 'OTHER',
        createdById: userAdmin.id,
      },
    }),
  ])

  // 8) Dimensions
  const dimDept = await prisma.dimension.create({
    data: {
      businessUnitId: buMnl.id,
      name: 'Department',
      type: 'DEPARTMENT',
    },
  })
  const [dvOps, dvFinance] = await Promise.all([
    prisma.dimensionValue.create({ data: { dimensionId: dimDept.id, name: 'Operations', code: 'OPS' } }),
    prisma.dimensionValue.create({ data: { dimensionId: dimDept.id, name: 'Finance', code: 'FIN' } }),
  ])

  // 9) Business Partners
  const [bpCustomer, bpVendor] = await Promise.all([
    prisma.businessPartner.create({
      data: {
        bpCode: 'CUST-JBFC',
        name: 'Jollibee Foods Corporation',
        type: 'CUSTOMER',
        phone: '+63 2 8706 7101',
        email: 'ap@jollibee.com.ph',
        businessUnitId: buMnl.id,
      },
    }),
    prisma.businessPartner.create({
      data: {
        bpCode: 'VEND-SMFS',
        name: 'San Miguel Food Solutions',
        type: 'VENDOR',
        phone: '+63 2 8632 3000',
        email: 'ar@smg.com.ph',
        businessUnitId: buMnl.id,
      },
    }),
  ])

  // 10) UoM
  const [uomPc, uomKg, uomL] = await Promise.all([
    prisma.uoM.create({ data: { name: 'Piece', symbol: 'pc' } }),
    prisma.uoM.create({ data: { name: 'Kilogram', symbol: 'kg' } }),
    prisma.uoM.create({ data: { name: 'Liter', symbol: 'L' } }),
  ])

  // 11) Inventory Locations
  const [locWarehouse, locKitchen] = await Promise.all([
    prisma.inventoryLocation.create({ data: { name: 'Main Warehouse', businessUnitId: buMnl.id } }),
    prisma.inventoryLocation.create({ data: { name: 'Kitchen', businessUnitId: buMnl.id } }),
  ])

  // 12) Inventory Items
  const [itmRice, itmChicken, itmPork, itmSoy, itmVinegar, itmCalamansi] = await Promise.all([
    prisma.inventoryItem.create({
      data: { name: 'Rice (Jasmine)', businessUnitId: buMnl.id, uomId: uomKg.id, isActive: true },
    }),
    prisma.inventoryItem.create({
      data: { name: 'Chicken (Whole)', businessUnitId: buMnl.id, uomId: uomKg.id, isActive: true },
    }),
    prisma.inventoryItem.create({
      data: { name: 'Pork (Belly)', businessUnitId: buMnl.id, uomId: uomKg.id, isActive: true },
    }),
    prisma.inventoryItem.create({
      data: { name: 'Soy Sauce', businessUnitId: buMnl.id, uomId: uomL.id, isActive: true },
    }),
    prisma.inventoryItem.create({
      data: { name: 'Vinegar', businessUnitId: buMnl.id, uomId: uomL.id, isActive: true },
    }),
    prisma.inventoryItem.create({
      data: { name: 'Calamansi', businessUnitId: buMnl.id, uomId: uomKg.id, isActive: true },
    }),
  ])

  // 13) Initial Inventory Stock (Warehouse)
  const [stockRiceWH, stockChickenWH, stockSoyWH, stockVinegarWH, stockCalamansiWH] = await Promise.all([
    prisma.inventoryStock.create({
      data: { inventoryItemId: itmRice.id, locationId: locWarehouse.id, quantityOnHand: D(200), reorderPoint: D(50) },
    }),
    prisma.inventoryStock.create({
      data: { inventoryItemId: itmChicken.id, locationId: locWarehouse.id, quantityOnHand: D(100), reorderPoint: D(20) },
    }),
    prisma.inventoryStock.create({
      data: { inventoryItemId: itmSoy.id, locationId: locWarehouse.id, quantityOnHand: D(80), reorderPoint: D(10) },
    }),
    prisma.inventoryStock.create({
      data: { inventoryItemId: itmVinegar.id, locationId: locWarehouse.id, quantityOnHand: D(80), reorderPoint: D(10) },
    }),
    prisma.inventoryStock.create({
      data: { inventoryItemId: itmCalamansi.id, locationId: locWarehouse.id, quantityOnHand: D(40), reorderPoint: D(10) },
    }),
  ])

  // 14) Menu: Categories, Items, Modifiers, Recipes
  const catFilipino = await prisma.menuCategory.create({
    data: { name: 'Filipino Classics', businessUnitId: buMnl.id, sortOrder: 1 },
  })
  const catBeverages = await prisma.menuCategory.create({
    data: { name: 'Beverages', businessUnitId: buMnl.id, sortOrder: 2 },
  })

  const [menuAdobo, menuSinigang, menuIcedTea] = await Promise.all([
    prisma.menuItem.create({
      data: {
        name: 'Chicken Adobo',
        price: D(180),
        businessUnitId: buMnl.id,
        categoryId: catFilipino.id,
        isActive: true,
      },
    }),
    prisma.menuItem.create({
      data: {
        name: 'Pork Sinigang',
        price: D(220),
        businessUnitId: buMnl.id,
        categoryId: catFilipino.id,
        isActive: true,
      },
    }),
    prisma.menuItem.create({
      data: {
        name: 'Iced Tea',
        price: D(60),
        businessUnitId: buMnl.id,
        categoryId: catBeverages.id,
        isActive: true,
      },
    }),
  ])

  // Modifiers
  const mgExtras = await prisma.modifierGroup.create({
    data: { name: 'Extras', required: false, maxSelections: 2, businessUnitId: buMnl.id },
  })
  const modExtraRice = await prisma.modifier.create({
    data: { name: 'Extra Rice', priceChange: D(30), modifierGroupId: mgExtras.id, inventoryItemId: itmRice.id },
  })

  // Recipes
  const recipeAdobo = await prisma.recipe.create({ data: { menuItemId: menuAdobo.id } })
  await Promise.all([
    prisma.recipeItem.create({
      data: { recipeId: recipeAdobo.id, inventoryItemId: itmChicken.id, quantityUsed: D(0.25) },
    }),
    prisma.recipeItem.create({ data: { recipeId: recipeAdobo.id, inventoryItemId: itmSoy.id, quantityUsed: D(0.05) } }),
    prisma.recipeItem.create({
      data: { recipeId: recipeAdobo.id, inventoryItemId: itmVinegar.id, quantityUsed: D(0.04) },
    }),
    prisma.recipeItem.create({ data: { recipeId: recipeAdobo.id, inventoryItemId: itmRice.id, quantityUsed: D(0.2) } }),
  ])

  const recipeSinigang = await prisma.recipe.create({ data: { menuItemId: menuSinigang.id } })
  await Promise.all([
    prisma.recipeItem.create({ data: { recipeId: recipeSinigang.id, inventoryItemId: itmPork.id, quantityUsed: D(0.3) } }),
    prisma.recipeItem.create({
      data: { recipeId: recipeSinigang.id, inventoryItemId: itmCalamansi.id, quantityUsed: D(0.05) },
    }),
    prisma.recipeItem.create({ data: { recipeId: recipeSinigang.id, inventoryItemId: itmRice.id, quantityUsed: D(0.2) } }),
  ])

  // 15) POS: Terminal, Tables, Payment Methods, Shift
  const terminal1 = await prisma.posTerminal.create({ data: { name: 'Front Counter 1', businessUnitId: buMnl.id } })
  const [tbl1, tbl2] = await Promise.all([
    prisma.table.create({ data: { name: 'T1', businessUnitId: buMnl.id, status: 'AVAILABLE' } }),
    prisma.table.create({ data: { name: 'T2', businessUnitId: buMnl.id, status: 'AVAILABLE' } }),
  ])
  const [pmCash, pmCard, pmGCash] = await Promise.all([
    prisma.paymentMethod.create({ data: { name: 'Cash' } }),
    prisma.paymentMethod.create({ data: { name: 'Card' } }),
    prisma.paymentMethod.create({ data: { name: 'GCash' } }),
  ])

  const shift = await prisma.shift.create({
    data: {
      businessUnitId: buMnl.id,
      userId: userCashier.id,
      terminalId: terminal1.id,
      startingCash: D(5000),
    },
  })

  // 16) Procurement: PR -> PO -> Receiving -> AP Invoice (+tax) -> Outgoing Payment (+application)
  const pr = await prisma.purchaseRequest.create({
    data: {
      prNumber: doc('PR', 1),
      businessUnitId: buMnl.id,
      requestorId: userAdmin.id,
      status: 'PENDING',
      items: {
        create: [
          {
            description: 'Rice 50kg',
            requestedQuantity: D(50),
            uomId: uomKg.id,
            notes: 'For kitchen replenishment',
          },
        ],
      },
    },
  })

  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber: doc('PO', 1),
      purchaseRequestId: pr.id,
      businessUnitId: buMnl.id,
      bpCode: bpVendor.bpCode,
      ownerId: userAdmin.id,
      postingDate: now,
      deliveryDate: new Date(now.getTime() + 2 * 24 * 3600 * 1000),
      documentDate: now,
      status: 'OPEN',
      items: {
        create: [
          {
            description: 'Rice',
            inventoryItemId: itmRice.id,
            quantity: D(50),
            unitPrice: D(45), // PHP per kg
            lineTotal: D(2250),
            openQuantity: D(50),
          },
        ],
      },
      totalAmount: D(2250),
    },
  })

  const grpo = await prisma.receiving.create({
    data: {
      docNum: doc('GRPO', 1),
      basePurchaseOrderId: po.id,
      businessUnitId: buMnl.id,
      receivedById: userAdmin.id,
      postingDate: now,
      documentDate: now,
      items: {
        create: [
          {
            inventoryItemId: itmRice.id,
            quantity: D(50),
          },
        ],
      },
    },
  })

  // Link inventory movement to receiving (increase warehouse stock)
  const updatedStockRiceWH = await prisma.inventoryStock.update({
    where: { id: stockRiceWH.id },
    data: { quantityOnHand: stockRiceWH.quantityOnHand.plus(D(50)) },
  })
  // Create a movement record referencing the receiving item and the stock row
  const receivingItem = await prisma.receivingItem.findFirstOrThrow({
    where: { document: { id: grpo.id } },
  })
  await prisma.inventoryMovement.create({
    data: {
      inventoryStockId: updatedStockRiceWH.id,
      type: 'RECEIVING',
      quantity: D(50),
      reason: 'PO Receipt',
      receivingItemId: receivingItem.id,
    },
  })

  // AP Invoice for that PO with VAT 12% (Input VAT)
  const apInvoice = await prisma.aPInvoice.create({
    data: {
      docNum: doc('AP', 1),
      basePurchaseOrderId: po.id,
      businessUnitId: buMnl.id,
      bpCode: bpVendor.bpCode,
      postingDate: now,
      dueDate: new Date(now.getTime() + 30 * 24 * 3600 * 1000),
      documentDate: now,
      items: {
        create: [
          {
            description: 'Rice',
            quantity: D(50),
            unitPrice: D(45),
            lineTotal: D(2250),
            glAccountId: gl.inventory.id,
            taxes: {
              create: [
                {
                  taxCodeId: vat12.id,
                  taxBase: D(2250),
                  taxAmount: D(270), // 12% VAT Input
                },
              ],
            },
          },
        ],
      },
      totalAmount: D(2250).plus(D(270)),
      amountPaid: D(0),
      status: 'OPEN',
      settlementStatus: 'OPEN',
    },
  })

  // Outgoing payment and application
  const op = await prisma.outgoingPayment.create({
    data: {
      docNum: doc('OP', 1),
      businessUnitId: buMnl.id,
      bpCode: bpVendor.bpCode,
      paymentDate: now,
      amount: D(1000),
      bankAccountId: bankBDO.id,
    },
  })
  await prisma.aPPaymentApplication.create({
    data: {
      apInvoiceId: apInvoice.id,
      outgoingPaymentId: op.id,
      amountApplied: D(1000),
    },
  })

  // Optional: Withholding on outgoing payment (EWT 1% of base)
  await prisma.outgoingPaymentWithholding.create({
    data: {
      paymentId: op.id,
      taxCodeId: ewt1.id,
      amount: D(22.5), // simplistic example
    },
  })

  // 17) Stock Requisition: Warehouse -> Kitchen
  const sr = await prisma.stockRequisition.create({
    data: {
      requisitionNumber: doc('SR', 1),
      fromLocationId: locWarehouse.id,
      toLocationId: locKitchen.id,
      requestorId: userAdmin.id,
      status: 'APPROVED',
      items: {
        create: [
          {
            inventoryItemId: itmRice.id,
            requestedQuantity: D(10),
            fulfilledQuantity: D(10),
          },
        ],
      },
    },
  })

  // Create kitchen stock rows (if missing) and movements for transfer
  const stockRiceKitchen = await prisma.inventoryStock.create({
    data: { inventoryItemId: itmRice.id, locationId: locKitchen.id, quantityOnHand: D(0), reorderPoint: D(5) },
  })

  await prisma.inventoryMovement.create({
    data: {
      inventoryStockId: stockRiceWH.id,
      type: 'STOCK_TRANSFER_OUT',
      quantity: D(10),
      reason: 'To kitchen',
      stockRequisitionId: sr.id,
    },
  })
  await prisma.inventoryMovement.create({
    data: {
      inventoryStockId: stockRiceKitchen.id,
      type: 'STOCK_TRANSFER_IN',
      quantity: D(10),
      reason: 'From warehouse',
      stockRequisitionId: sr.id,
    },
  })
  await prisma.inventoryStock.update({
    where: { id: stockRiceWH.id },
    data: { quantityOnHand: stockRiceWH.quantityOnHand.minus(D(10)) },
  })
  await prisma.inventoryStock.update({
    where: { id: stockRiceKitchen.id },
    data: { quantityOnHand: stockRiceKitchen.quantityOnHand.plus(D(10)) },
  })

  // 18) Sales flow: SQ -> SO -> Delivery -> AR Invoice -> Incoming Payment
  const sq = await prisma.salesQuotation.create({
    data: {
      docNum: doc('SQ', 1),
      businessUnitId: buMnl.id,
      bpCode: bpCustomer.bpCode,
      ownerId: userAdmin.id,
      postingDate: now,
      validUntil: new Date(now.getTime() + 7 * 24 * 3600 * 1000),
      documentDate: now,
      items: {
        create: [
          {
            itemCode: menuAdobo.id,
            description: 'Chicken Adobo',
            quantity: D(5),
            unitPrice: D(180),
            lineTotal: D(900),
          },
        ],
      },
      totalAmount: D(900),
      status: 'OPEN',
    },
  })

  const so = await prisma.salesOrder.create({
    data: {
      docNum: doc('SO', 1),
      baseQuotationId: sq.id,
      businessUnitId: buMnl.id,
      bpCode: bpCustomer.bpCode,
      ownerId: userAdmin.id,
      postingDate: now,
      deliveryDate: new Date(now.getTime() + 1 * 24 * 3600 * 1000),
      documentDate: now,
      items: {
        create: [
          {
            itemCode: menuAdobo.id,
            description: 'Chicken Adobo',
            quantity: D(5),
            unitPrice: D(180),
            lineTotal: D(900),
            openQuantity: D(5),
          },
        ],
      },
      totalAmount: D(900),
      status: 'OPEN',
    },
  })

  const dlv = await prisma.delivery.create({
    data: {
      docNum: doc('DLV', 1),
      baseSalesOrderId: so.id,
      businessUnitId: buMnl.id,
      bpCode: bpCustomer.bpCode,
      createdById: userAdmin.id,
      postingDate: now,
      documentDate: now,
      items: {
        create: [
          { itemCode: menuAdobo.id, description: 'Chicken Adobo', quantity: D(5) },
        ],
      },
      status: 'OPEN',
    },
  })

  const arInv = await prisma.aRInvoice.create({
    data: {
      docNum: doc('AR', 1),
      baseDeliveryId: dlv.id,
      businessUnitId: buMnl.id,
      bpCode: bpCustomer.bpCode,
      postingDate: now,
      dueDate: new Date(now.getTime() + 30 * 24 * 3600 * 1000),
      documentDate: now,
      items: {
        create: [
          {
            itemCode: menuAdobo.id,
            description: 'Chicken Adobo',
            quantity: D(5),
            unitPrice: D(180),
            lineTotal: D(900),
            glAccountId: gl.sales.id,
            taxes: {
              create: [{ taxCodeId: vat12.id, taxBase: D(900), taxAmount: D(108) }],
            },
          },
        ],
      },
      totalAmount: D(1008),
      amountPaid: D(0),
      status: 'OPEN',
      settlementStatus: 'OPEN',
    },
  })

  // Incoming payment and application
  const ip = await prisma.incomingPayment.create({
    data: {
      docNum: doc('IP', 1),
      businessUnitId: buMnl.id,
      bpCode: bpCustomer.bpCode,
      paymentDate: now,
      amount: D(1008),
      bankAccountId: bankBDO.id,
    },
  })
  await prisma.aRPaymentApplication.create({
    data: { invoiceId: arInv.id, incomingPaymentId: ip.id, amountApplied: D(1008) },
  })

  // 19) POS order & payment
  const order = await prisma.order.create({
    data: {
      businessUnitId: buMnl.id,
      tableId: tbl1.id,
      userId: userCashier.id,
      terminalId: terminal1.id,
      status: 'OPEN',
      orderType: 'Dine-In',
      items: {
        create: [
          { menuItemId: menuAdobo.id, quantity: 2, priceAtSale: D(180) },
          { menuItemId: menuSinigang.id, quantity: 1, priceAtSale: D(220) },
        ],
      },
      subTotal: D(580),
      tax: D(69.6), // illustrative 12% on 580
      totalAmount: D(649.6),
      amountPaid: D(649.6),
      isPaid: true,
      specialInstructions: 'Less salty',
    },
  })
  await prisma.payment.create({
    data: {
      orderId: order.id,
      amount: D(649.6),
      paymentMethodId: pmCash.id,
      processedByUserId: userCashier.id,
      shiftId: shift.id,
    },
  })

  // 20) Journal Batch and JEs
  const jb = await prisma.journalBatch.create({
    data: {
      businessUnitId: buMnl.id,
      name: 'Auto-Post Sales and Purchasing',
      batchDate: now,
      status: 'OPEN',
    },
  })

  // JE for AR Invoice: Dr A/R 1008, Cr Sales 900, Cr VAT Payable 108
  const jeAR = await prisma.journalEntry.create({
    data: {
      docNum: doc('JE', 1),
      postingDate: now,
      documentDate: now,
      authorId: userAcct.id,
      businessUnitId: buMnl.id,
      accountingPeriodId: period.id,
      batchId: jb.id,
      approvalWorkflowStatus: 'APPROVED',
      lines: {
        create: [
          {
            glAccountBusinessUnitId: buMnl.id,
            glAccountCode: gl.accountsReceivable.accountCode,
            debit: D(1008),
            description: 'AR from invoice AR-00001',
          },
          {
            glAccountBusinessUnitId: buMnl.id,
            glAccountCode: gl.sales.accountCode,
            credit: D(900),
            description: 'Sales revenue',
          },
          {
            glAccountBusinessUnitId: buMnl.id,
            glAccountCode: gl.vatPayable.accountCode,
            credit: D(108),
            description: 'VAT Output 12%',
          },
        ],
      },
    },
  })
  await prisma.journalEntryApprovalLog.create({
    data: { journalEntryId: jeAR.id, action: 'APPROVE', actorId: userAcct.id, reason: 'Auto-approved' },
  })

  // JE for AP Invoice: Dr Inventory 2250, Dr Input VAT 270, Cr A/P 2520
  const jeAP = await prisma.journalEntry.create({
    data: {
      docNum: doc('JE', 2),
      postingDate: now,
      documentDate: now,
      authorId: userAcct.id,
      businessUnitId: buMnl.id,
      accountingPeriodId: period.id,
      batchId: jb.id,
      approvalWorkflowStatus: 'APPROVED',
      lines: {
        create: [
          {
            glAccountBusinessUnitId: buMnl.id,
            glAccountCode: gl.inventory.accountCode,
            debit: D(2250),
            description: 'Inventory from AP invoice AP-00001',
          },
          {
            glAccountBusinessUnitId: buMnl.id,
            glAccountCode: gl.inputVAT.accountCode,
            debit: D(270),
            description: 'VAT Input 12%',
          },
          {
            glAccountBusinessUnitId: buMnl.id,
            glAccountCode: gl.accountsPayable.accountCode,
            credit: D(2520),
            description: 'Payable to vendor',
          },
        ],
      },
    },
  })

  // Link AR/AP invoices to their JEs
  await prisma.aRInvoice.update({ where: { id: arInv.id }, data: { journalEntryId: jeAR.id } })
  await prisma.aPInvoice.update({ where: { id: apInvoice.id }, data: { journalEntryId: jeAP.id } })

  // 21) Deposit (example)
  await prisma.deposit.create({
    data: {
      docNum: doc('DEP', 1),
      businessUnitId: buMnl.id,
      bankAccountId: bankBDO.id,
      depositDate: now,
      amount: D(1008),
      status: 'OPEN',
    },
  })

  // 22) Financial Report and lines (illustrative values)
  const fr = await prisma.financialReport.create({
    data: {
      businessUnitId: buMnl.id,
      name: `P&L ${now.toLocaleString('en-US', { month: 'long' })} ${fiscalYear}`,
      lines: {
        create: [
          { label: 'Sales', value: D(900), order: 1 },
          { label: 'COGS', value: D(400), order: 2 },
          { label: 'Gross Profit', value: D(500), order: 3 },
        ],
      },
    },
  })
  console.log('FinancialReport created:', fr.name)

  // 23) Budget for year
  const budget = await prisma.budget.create({
    data: {
      businessUnitId: buMnl.id,
      name: `FY${fiscalYear} Operating Budget`,
      fiscalYear,
      currency: 'PHP',
      lines: {
        create: [
          {
            glAccountId: gl.sales.id,
            amount: D(1000000),
          },
          {
            glAccountId: gl.cogs.id,
            amount: D(600000),
          },
        ],
      },
    },
  })
  console.log('Budget created:', budget.name)

  // 24) Attachments & audit log
  const att = await prisma.attachment.create({
    data: {
      url: 'https://example.com/uploads/po-00001.pdf',
      fileName: 'PO-00001.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 123456,
      uploadedById: userAdmin.id,
    },
  })
  await prisma.attachmentLink.create({
    data: { attachmentId: att.id, entityType: 'PURCHASE_ORDER', entityId: po.id, notes: 'Signed copy' },
  })

  await prisma.auditLog.create({
    data: {
      tableName: 'PurchaseOrder',
      recordId: po.id,
      action: 'CREATE',
      userId: userAdmin.id,
      notes: 'Initial PO created via seed',
    },
  })

  // 25) Intercompany example
  const ic = await prisma.intercompanyTransaction.create({
    data: {
      fromBusinessUnitId: buMnl.id,
      toBusinessUnitId: buCeb.id,
      description: 'IT support fee allocation',
    },
  })
  // Example JE line tagged with IC transaction (line alone; not balanced JE here—just demo linking)
  const jeIC = await prisma.journalEntry.create({
    data: {
      docNum: doc('JE', 3),
      postingDate: now,
      authorId: userAcct.id,
      businessUnitId: buMnl.id,
      lines: {
        create: [
          {
            glAccountBusinessUnitId: buMnl.id,
            glAccountCode: gl.operatingExpenses.accountCode,
            debit: D(1000),
            description: 'Intercompany expense',
            intercompanyTransactionId: ic.id,
          },
          {
            glAccountBusinessUnitId: buMnl.id,
            glAccountCode: gl.cashInBankBDO.accountCode,
            credit: D(1000),
            description: 'Settlement',
          },
        ],
      },
    },
  })
  await prisma.journalEntryApprovalLog.create({
    data: { journalEntryId: jeIC.id, action: 'APPROVE', actorId: userAcct.id, reason: 'IC allocation' },
  })

  console.log('Seed completed successfully.')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
