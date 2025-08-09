"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { User, Settings, LogOut, Home, Users, Menu, Package, BarChart3, DollarSign } from "lucide-react"
import { signOut } from "next-auth/react"

export function SiteHeader() {
  const { data: session } = useSession()

  if (!session?.user) return null

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-xl">Tropicana POS</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link href="/dashboard" className="transition-colors hover:text-foreground/80 text-foreground/60">
              <Home className="w-4 h-4 inline mr-1" />
              Dashboard
            </Link>
            <Link href="/pos" className="transition-colors hover:text-foreground/80 text-foreground/60">
              <Menu className="w-4 h-4 inline mr-1" />
              POS
            </Link>
            <Link href="/kds/kitchen-display" className="transition-colors hover:text-foreground/80 text-foreground/60">
              <BarChart3 className="w-4 h-4 inline mr-1" />
              Kitchen
            </Link>
            {session.user.role === "MANAGER" && (
              <>
                <Link
                  href="/management/users"
                  className="transition-colors hover:text-foreground/80 text-foreground/60"
                >
                  <Users className="w-4 h-4 inline mr-1" />
                  Users
                </Link>
                <Link href="/management/menu" className="transition-colors hover:text-foreground/80 text-foreground/60">
                  <Menu className="w-4 h-4 inline mr-1" />
                  Menu
                </Link>
                <Link
                  href="/management/inventory"
                  className="transition-colors hover:text-foreground/80 text-foreground/60"
                >
                  <Package className="w-4 h-4 inline mr-1" />
                  Inventory
                </Link>
                <Link
                  href="/management/transactions"
                  className="transition-colors hover:text-foreground/80 text-foreground/60"
                >
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Transactions
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <Badge variant="secondary" className="mr-2">
              {session.user.restaurant?.name}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{session.user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
                  <Badge variant="outline" className="w-fit">
                    {session.user.role}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
