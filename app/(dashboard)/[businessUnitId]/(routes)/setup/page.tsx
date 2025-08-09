import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { FinancialSetupWizard } from '@/components/setup/financial-setup-wizard'

export default async function SetupPage({
  params,
}: {
  params: { businessUnitId: string }
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/sign-in')
  }

  // Check if user has permission for this business unit
  const hasPermission = session.user.assignments.some(
    (assignment) => assignment.businessUnitId === params.businessUnitId
  )

  if (!hasPermission) {
    redirect('/')
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Financial System Setup</h1>
          <p className="text-muted-foreground mt-2">
            Configure your accounting and financial system settings
          </p>
        </div>
        <FinancialSetupWizard businessUnitId={params.businessUnitId} />
      </div>
    </div>
  )
}