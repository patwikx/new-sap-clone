import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { headers } from 'next/headers'
import { Sidebar } from '@/components/sidebar'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: 'TWC POS',
  description: 'Point of Sale System for TWC',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers();
  const businessUnitId = headersList.get('x-business-unit-id');

  const session = await auth();

  // Redirect to sign-in if there's no session
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  // Handle case where businessUnitId is missing from the URL/header
  if (!businessUnitId) {
    const defaultUnitId = session.user.assignments[0]?.businessUnitId;
    // Redirect to the user's first assigned unit, or to a selection page
    redirect(defaultUnitId ? `/${defaultUnitId}` : '/select-unit');
    return null; // Stop rendering since we are redirecting
  }

  // Check if the user is authorized for this specific business unit
  const isAdmin = session.user.assignments.some(
    (assignment) => assignment.role.role === 'Administrator'
  );

  const isAuthorizedForUnit = session.user.assignments.some(
    (assignment) => assignment.businessUnitId === businessUnitId
  );

  // If not an admin and not authorized for this unit, redirect them
  if (!isAdmin && !isAuthorizedForUnit) {
    const defaultUnitId = session.user.assignments[0]?.businessUnitId;
    redirect(defaultUnitId ? `/${defaultUnitId}` : '/select-unit');
    return null; // Stop rendering
  }

  return (
    <>
      <div className="flex h-screen">
        <div className="hidden md:flex md:w-64 md:flex-col md:flex-shrink-0 md:border-r">
          {/* Pass the validated businessUnitId as a prop to the Sidebar */}
          <Sidebar businessUnitId={businessUnitId} />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
          <Toaster />
        </main>
      </div>
    </>
  );
}