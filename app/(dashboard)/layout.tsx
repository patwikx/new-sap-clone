import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { headers } from 'next/headers'
import { Sidebar } from '@/components/sidebar'
import { Toaster } from '@/components/ui/sonner'
import type { BusinessUnitItem } from '@/types/business-unit-types'
import { prisma } from '@/lib/prisma'
import "../globals.css" // Import globals.css at the top of the file
import { Header } from "@/components/header"

export const metadata = {
  title: "PLM Acctg Solutions, Inc.",
  description: "Point of Sale System for TWC",
}

// Define a more specific type for the business unit from the session
type SessionBusinessUnit = {
  id: string;
  name: string | { name: string }; // The name can be a string or a nested object
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const businessUnitId = headersList.get("x-business-unit-id")
  const session = await auth() // Get initial session

  // Redirect to sign-in if there's no session
  if (!session?.user) {
    redirect("/auth/sign-in")
  }

  // --- START: Force re-fetch user assignments if session seems stale ---
  const currentBusinessUnitIdInSession = session.user.assignments.some(
    (assignment) => assignment.businessUnitId === businessUnitId,
  )

  if (session.user.id && businessUnitId && !currentBusinessUnitIdInSession) {
    const freshUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        assignments: { include: { role: true, businessUnit: true } },
        role: true,
      },
    })

    if (freshUser) {
      session.user.assignments = freshUser.assignments.map((a) => ({
        businessUnitId: a.businessUnitId,
        businessUnit: { id: a.businessUnit.id, name: a.businessUnit.name },
        role: { id: a.role.id, role: a.role.role },
      }))
      if (freshUser.role) {
        session.user.role = freshUser.role
      } else if (freshUser.assignments.length > 0) {
        session.user.role = freshUser.assignments[0].role
      }
    }
  }
  // --- END: Force re-fetch user assignments if session seems stale ---

  if (!businessUnitId) {
    const defaultUnitId = session.user.assignments[0]?.businessUnitId
    redirect(defaultUnitId ? `/${defaultUnitId}` : "/select-unit")
    return null
  }

  let businessUnits: BusinessUnitItem[] = []
  const isAdmin = session.user.assignments.some((assignment) => assignment.role.role === "Admin")
  const isAuthorizedForUnit = session.user.assignments.some(
    (assignment) => assignment.businessUnitId === businessUnitId,
  )

  if (isAdmin) {
    businessUnits = await prisma.businessUnit.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    })
  } else {
    businessUnits = session.user.assignments.map((assignment) => {
      const bu = assignment.businessUnit as SessionBusinessUnit;
      return {
        id: bu.id,
        name: typeof bu.name === 'object' && bu.name !== null ? bu.name.name : bu.name,
      };
    });
  }

  if (!isAdmin && !isAuthorizedForUnit) {
    const defaultUnitId = session.user.assignments[0]?.businessUnitId
    redirect(defaultUnitId ? `/${defaultUnitId}` : "/select-unit")
    return null
  }

  return (
    <>
      <div className="flex h-screen">
        <div className="hidden md:flex md:w-64 md:flex-col md:flex-shrink-0 md:border-r">
          <Sidebar businessUnitId={businessUnitId} businessUnits={businessUnits} />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* FIX: Removed the businessUnitName prop from the Header */}
          <Header />

          <main className="flex-1 p-6 overflow-y-auto">
            {children}
            <Toaster />
          </main>
        </div>
      </div>
    </>
  )
}
