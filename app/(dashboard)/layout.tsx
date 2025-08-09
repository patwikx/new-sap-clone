import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { headers } from 'next/headers' // 1. Import the `headers` function
import { Toaster } from 'sonner'

export const metadata = {
  title: 'TWC POS',
  description: 'Point of Sale System for TWC',
}

// 2. Remove `params` from the function signature entirely
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 3. Read the businessUnitId from the custom header we set in the middleware
  const headersList = await headers();
  const businessUnitId = headersList.get('x-business-unit-id');

  const session = await auth();

  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  // All subsequent logic now uses the `businessUnitId` from the header
  const isAdmin = session.user.assignments.some(
    (assignment) => assignment.role.role === 'Administrator'
  );

  const isAuthorizedForUnit = session.user.assignments.some(
    (assignment) => assignment.businessUnitId === businessUnitId
  );

  if (!isAdmin && !isAuthorizedForUnit) {
    const defaultUnitId = session.user.assignments[0]?.businessUnitId;
    redirect(defaultUnitId ? `/${defaultUnitId}` : '/select-unit');
  }

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}