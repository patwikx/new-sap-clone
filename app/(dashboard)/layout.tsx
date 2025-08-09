import type React from "react"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { headers } from "next/headers"
import { Sidebar } from "@/components/sidebar"
import { Toaster } from "@/components/ui/sonner"
import type { BusinessUnitItem } from "@/types/business-unit-types"
import { prisma } from "@/lib/prisma"
import "../globals.css" // Import globals.css at the top of the file

export const metadata = {
  title: "PLM Acctg Solutions, Inc.",
  description: "Point of Sale System for TWC",
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
  // This is a defensive check to ensure the session assignments are up-to-date
  // especially after client-side navigations that change the businessUnitId.
  const currentBusinessUnitIdInSession = session.user.assignments.some(
    (assignment) => assignment.businessUnitId === businessUnitId,
  )

  // If the requested businessUnitId is not in the current session's assignments,
  // it means the session might be stale. Re-fetch user details from DB.
  // This also handles the case where businessUnitId is initially null/undefined
  // but the user is logged in and needs to be redirected to a default unit.
  if (session.user.id && businessUnitId && !currentBusinessUnitIdInSession) {
    const freshUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        assignments: { include: { role: true, businessUnit: true } },
        role: true,
      },
    })

    if (freshUser) {
      // Update the session object with fresh assignments
      session.user.assignments = freshUser.assignments.map((a) => ({
        businessUnitId: a.businessUnitId,
        businessUnit: { id: a.businessUnit.id, name: a.businessUnit.name },
        role: { id: a.role.id, role: a.role.role },
      }))
      // Also update the main role if it's derived from assignments
      if (freshUser.role) {
        session.user.role = freshUser.role
      } else if (freshUser.assignments.length > 0) {
        session.user.role = freshUser.assignments[0].role
      }
    }
  }
  // --- END: Force re-fetch user assignments if session seems stale ---

  // Handle case where businessUnitId is missing from the URL/header
  if (!businessUnitId) {
    const defaultUnitId = session.user.assignments[0]?.businessUnitId
    // Redirect to the user's first assigned unit, or to a selection page
    redirect(defaultUnitId ? `/${defaultUnitId}` : "/select-unit")
    return null // Stop rendering since we are redirecting
  }

  let businessUnits: BusinessUnitItem[] = []
  // Check if the user is authorized for this specific business unit
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
    businessUnits = session.user.assignments.map((assignment) => assignment.businessUnit)
  }

  // If not an admin and not authorized for this unit, redirect them
  if (!isAdmin && !isAuthorizedForUnit) {
    const defaultUnitId = session.user.assignments[0]?.businessUnitId
    redirect(defaultUnitId ? `/${defaultUnitId}` : "/select-unit")
    return null // Stop rendering
  }

  return (
    <>
      <div className="flex h-screen">
        <div className="hidden md:flex md:w-64 md:flex-col md:flex-shrink-0 md:border-r">
          {/* Pass the validated businessUnitId as a prop to the Sidebar */}
          <Sidebar businessUnitId={businessUnitId} businessUnits={businessUnits} />
        </div>
        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
          <Toaster />
        </main>
      </div>
    </>
  )
}
