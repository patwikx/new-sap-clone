import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { LockKeyhole } from "lucide-react"


export default function NotAuthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-950">
      <Card className="mx-auto w-full max-w-md text-center">
        <CardHeader>
          <LockKeyhole className="mx-auto h-12 w-12 text-destructive" />
          <CardTitle className="text-2xl font-bold mt-4">Access Denied</CardTitle>
          <CardDescription>
            You do not have the necessary permissions to view this page for the selected business unit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-6">
            Please ensure you have selected the correct business unit or contact your administrator for assistance.
          </p>
          <Button asChild>
            <Link href="/">Go to Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
