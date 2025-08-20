"use client"

import * as z from "zod"
import { useForm } from "react-hook-form"
import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { LoginSchema } from "@/lib/validations/login-schema"
import { login } from "@/lib/auth-actions/login"

// --- UI & ICONS ---
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { FormError } from "@/components/form-error"
import { FormSuccess } from "@/components/form-success"
import { Mail, Lock, Loader2, Eye, EyeOff, Building, BarChart2 } from 'lucide-react'

// A simple component for a social login button
const SocialButton = ({ children, onClick }: { children: React.ReactNode, onClick: () => void }) => (
  <Button variant="outline" className="w-full" onClick={onClick}>
    {children}
  </Button>
);

export const LoginForm = () => {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl")
  const [showTwoFactor, setShowTwoFactor] = useState(false)
  const [error, setError] = useState<string | undefined>("")
  const [success, setSuccess] = useState<string | undefined>("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  })

  const onSubmit = async (values: z.infer<typeof LoginSchema>) => {
    setError("");
    setSuccess("");
    setIsLoading(true);
    try {
      const data = await login(values);
      if (data?.error) {
        setError(data.error);
      } else if (data.success) {
        // On successful login, redirect to the dashboard or home page
        window.location.assign("/setup"); 
      }
    } catch (error) {
      setError(`An unexpected error occurred. Please try again. ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          {/* Company Logo and Name */}
          <div className="flex justify-center items-center gap-2 mb-2">
            <BarChart2 className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold tracking-tight">PLM Accounting Solutions</h1>
          </div>
          <CardTitle className="text-2xl">
            {showTwoFactor ? "Two-Factor Authentication" : "Welcome Back!"}
          </CardTitle>
          <CardDescription>
            {showTwoFactor 
              ? "Enter the code from your authenticator app." 
              : "Securely access your financial dashboard."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {showTwoFactor ? (
                // --- 2FA Code Field ---
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification Code</FormLabel>
                      <FormControl>
                          <Input
                            {...field}
                            disabled={isLoading}
                            placeholder="123456"
                            className="h-12 text-lg tracking-widest text-center"
                          />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <>
                  {/* --- Username Field --- */}
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                              {...field}
                              disabled={isLoading}
                              placeholder="e.g., j.doe"
                              className="pl-10 h-12"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* --- Password Field --- */}
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                              {...field}
                              disabled={isLoading}
                              placeholder="••••••••"
                              type={showPassword ? "text" : "password"}
                              className="pl-10 pr-12 h-12"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* --- Remember Me & Forgot Password --- */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="remember-me" />
                      <label htmlFor="remember-me" className="font-medium cursor-pointer">
                        Remember me
                      </label>
                    </div>
                    <Button variant="link" asChild className="p-0 h-auto">
                      <Link href="/auth/reset">
                        Forgot Password?
                      </Link>
                    </Button>
                  </div>
                </>
              )}
              
              <FormError message={error} />
              <FormSuccess message={success} />
              
              {/* --- Submit Button --- */}
              <Button
                disabled={isLoading}
                type="submit"
                className="w-full h-12 font-bold text-base"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <span>{showTwoFactor ? "Confirming..." : "Logging in..."}</span>
                  </>
                ) : (
                  <span>{showTwoFactor ? "Confirm & Sign In" : "Sign In"}</span>
                )}
              </Button>
            </form>
          </Form>

          {/* --- Social Logins (Optional) --- */}
          {!showTwoFactor && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SocialButton onClick={() => { /* Handle Google Login */ }}>
                  {/* You would need to add an actual Google icon here */}
                  <p className="mr-2">G</p> Google
                </SocialButton>
                 <SocialButton onClick={() => { /* Handle Another Provider Login */ }}>
                  <Building className="mr-2 h-4 w-4" /> Microsoft
                </SocialButton>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
           Don&apos;t have an account?{" "}
          <Button variant="link" asChild className="p-1 h-auto">
             <Link href="/auth/register">
              Sign up
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}