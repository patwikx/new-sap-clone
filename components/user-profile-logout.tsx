'use client'

import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu'
import { Button } from './ui/button'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { LogOut, Bell, ChevronDown } from 'lucide-react'
import { useCurrentUser } from '@/lib/current-user'

export function UserProfileLogout() {
  const user = useCurrentUser()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' })
    router.push('/')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-12 w-full justify-start gap-2 px-3 py-2">
          <Avatar className="h-8 w-8 rounded-lg">
            {user?.image ? (
              <AvatarImage 
                src={user.image} 
                alt={user?.name || ''} 
                className="object-cover rounded-lg"
              />
            ) : (
              <AvatarFallback className="rounded-lg">
                {user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">{user?.name || 'User'}</span>
            <span className="text-xs text-muted-foreground">{user?.username || 'user@example.com'}</span>
          </div>
          <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-[200px]"
        sideOffset={5}
      >
        <DropdownMenuItem onClick={() => router.push("/notifications")}>
          <Bell className="mr-2 h-4 w-4" />
          <span>Notifications</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleLogout}
          className="text-red-500 focus:text-red-500"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default UserProfileLogout

