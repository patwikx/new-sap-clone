"use client"

import { useCurrentUser } from "@/lib/current-user"

const HomeDashboardPage = ({ params }: { params: { businessUnitId: string } }) => {
  const user = useCurrentUser()

  // Add console logs to inspect the user object and its role
  console.log("User object in HomeDashboardPage:", user)
  console.log("User role in HomeDashboardPage:", user?.role)
  console.log("User role name in HomeDashboardPage:", user?.role?.role)

  return <div>HomeDashboardPage {user?.role?.role || "Role Not Assigned"}</div>
}

export default HomeDashboardPage
