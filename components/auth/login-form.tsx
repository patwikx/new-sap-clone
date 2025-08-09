"use client"

import * as z from "zod"
import { useForm } from "react-hook-form"
import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { LoginSchema } from "@/lib/validations/schemas"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox" // Added Checkbox
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { FormError } from "@/components/form-error"
import { FormSuccess } from "@/components/form-success"
import { Mail, Lock, Loader2, Eye, EyeOff, ChromeIcon as Google, Facebook } from 'lucide-react' // Added Eye, EyeOff, Google, Facebook
import { login } from "@/lib/auth-actions/login"

export const LoginForm = () => {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl")
  const [showTwoFactor, setShowTwoFactor] = useState(false)
  const [error, setError] = useState<string | undefined>("")
  const [success, setSuccess] = useState<string | undefined>("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false) // State for password visibility

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
        window.location.assign("/");
      }
    } catch (error) {
      setError(`Something went wrong ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#2d0e94] p-6"> {/* Light purple background */}
        {/* Left Section: Illustration */}
        <div className="relative flex-1 bg-gray-50 p-8 flex items-center justify-center lg:p-12">
          <img
            src="/placeholder.svg?height=400&width=400"
            alt="Login Illustration"
            className="max-w-full h-auto"
          />
        </div>

        {/* Right Section: Login Form */}
        <div className="flex-1 p-8 lg:p-12">

            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to</h2>
            <h1 className="text-4xl font-bold text-[#6A5ACD] whitespace-nowrap">POS & Accounting System</h1> {/* Purple text */}
            <p className="text-gray-600 text-sm">
              Please enter your credentials to access your account.
            </p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {showTwoFactor ? (
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">Two Factor Code</FormLabel> {/* Hidden label */}
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input
                              {...field}
                              disabled={isLoading}
                              placeholder="123456"
                              className="pl-12 h-12 bg-gray-100 border-gray-200 focus:border-[#6A5ACD] focus:ring-2 focus:ring-[#6A5ACD]/20 rounded-lg text-gray-900 placeholder:text-gray-500 font-medium"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <>
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="sr-only">Username</FormLabel> {/* Hidden label */}
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <Input
                                {...field}
                                disabled={isLoading}
                                type="text"
                                className="pl-12 h-12 bg-gray-100 border-gray-200 focus:border-[#3c48b9] focus:ring-2 focus:ring-[#6A5ACD]/20 rounded-lg text-gray-900 placeholder:text-gray-500 font-medium"
                                placeholder="username"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="sr-only">Password</FormLabel> {/* Hidden label */}
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <Input
                                {...field}
                                disabled={isLoading}
                                placeholder="••••••••"
                                type={showPassword ? "text" : "password"} // Toggle password visibility
                                className="pl-12 pr-12 h-12 bg-gray-100 border-gray-200 focus:border-[#6A5ACD] focus:ring-2 focus:ring-[#6A5ACD]/20 rounded-lg text-gray-900 placeholder:text-gray-500 font-medium"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
                  </>
                )}

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="remember-me" className="border-gray-300 data-[state=checked]:bg-[#6A5ACD] data-[state=checked]:text-white" />
                    <label
                      htmlFor="remember-me"
                      className="text-gray-600 font-medium cursor-pointer"
                    >
                      Remember me
                    </label>
                  </div>
                  <Button
                    size="sm"
                    variant="link"
                    asChild
                    className="px-0 font-semibold text-[#6A5ACD] hover:text-[#5A4BBF] h-auto text-sm"
                  >
                    <Link href="/auth/reset">
                      Forgot Password?
                    </Link>
                  </Button>
                </div>

                <FormError message={error} />
                <FormSuccess message={success} />

                <Button
                  disabled={isLoading}
                  type="submit"
                  className="w-full h-12 bg-[#6A5ACD] hover:bg-[#5A4BBF] text-white font-bold text-lg rounded-lg shadow-md transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      <span className="tracking-wide">{showTwoFactor ? "Confirming..." : "Logging in..."}</span>
                    </>
                  ) : (
                    <span className="tracking-wide">
                      {showTwoFactor ? "Confirm" : "Login"}
                    </span>
                  )}
                </Button>
              </form>
            </Form>

            {/* Don't have an account? Register */}

              Don&apos;t have an account?{" "}
              <Link href="#" className="font-bold text-[#6A5ACD] hover:text-[#5A4BBF] transition-colors">
                Register
              </Link>

        </div>
    </div>
  )
}
