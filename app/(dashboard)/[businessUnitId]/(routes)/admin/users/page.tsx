"use client"

import { useState, useEffect } from "react"
import { Plus, Search, MoreHorizontal, Edit, Trash2, Shield, Key, UserCheck, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertModal } from "@/components/modals/alert-modal"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import axios from "axios"
import { CreateUserModal } from "./components/create-user-modal"
import { EditUserModal } from "./components/edit-user-modal"
import { ChangePasswordModal } from "./components/change-password-modal"
import { useCurrentUser } from "@/lib/current-user"

interface User {
  id: string
  name: string
  username: string
  isActive: boolean
  createdAt: string
  assignments: {
    businessUnitId: string
    businessUnit: { id: string; name: string }
    role: { id: string; role: string }
  }[]
}

interface Role {
  id: string
  role: string
}

interface BusinessUnit {
  id: string
  name: string
}

const UsersPage = () => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string

  // State management
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")

  // Modal states
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [editUserOpen, setEditUserOpen] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [deleteUserOpen, setDeleteUserOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const router = useRouter();

  const session = useCurrentUser();

  if (!session?.role?.role) {
    router.push("/auth/sign-in") // Redirect to sign-in if no session
  }

  // Check if the user is authorized for this specific business unit
  const isAuthorizedForUnit = session?.assignments?.some(
    (assignment) => assignment.businessUnitId === businessUnitId,
  )

  if (!isAuthorizedForUnit) {
    router.push(`/${businessUnitId}/not-authorized`) // Redirect if not authorized for this business unit
  }

  // Fetch data
  const fetchUsers = async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/users`, {
        headers: {
          "x-business-unit-id": businessUnitId,
        },
      })
      setUsers(response.data)
    } catch (error) {
      toast.error("Failed to fetch users")
      console.error(error)
    }
  }

  const fetchRoles = async () => {
    try {
      const response = await axios.get(`/api/${businessUnitId}/roles`, {
        headers: {
          "x-business-unit-id": businessUnitId,
        },
      })
      setRoles(response.data)
    } catch (error) {
      toast.error("Failed to fetch roles")
      console.error(error)
    }
  }

  const fetchBusinessUnits = async () => {
    try {
      // --- MODIFICATION START ---
      // Add includeAll=true query parameter to fetch all business units
      const response = await axios.get(`/api/business-units?includeAll=true`)
      // --- MODIFICATION END ---
      setBusinessUnits(response.data)
    } catch (error) {
      toast.error("Failed to fetch business units")
      console.error(error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchUsers(), fetchRoles(), fetchBusinessUnits()])
      setLoading(false)
    }
    if (businessUnitId) {
      loadData()
    }
  }, [businessUnitId]) // Added businessUnitId to dependency array for re-fetch on unit switch

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && user.isActive) ||
      (statusFilter === "inactive" && !user.isActive)
    const matchesRole =
      roleFilter === "all" || user.assignments.some((assignment) => assignment.role.role === roleFilter)
    return matchesSearch && matchesStatus && matchesRole
  })

  // User actions
  const handleToggleUserStatus = async (user: User) => {
    try {
      await axios.patch(
        `/api/${businessUnitId}/users/${user.id}/status`,
        { isActive: !user.isActive },
        {
          headers: {
            "x-business-unit-id": businessUnitId,
          },
        },
      )
      toast.success(`User ${user.isActive ? "deactivated" : "activated"} successfully`)
      fetchUsers()
    } catch (error) {
      toast.error("Failed to update user status")
      console.error(error)
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    try {
      await axios.delete(`/api/${businessUnitId}/users/${selectedUser.id}`, {
        headers: {
          "x-business-unit-id": businessUnitId,
        },
      })
      toast.success("User deleted successfully")
      setDeleteUserOpen(false)
      setSelectedUser(null)
      fetchUsers()
    } catch (error) {
      toast.error("Failed to delete user")
      console.error(error)
    }
  }

  const getUserRoleInCurrentBU = (user: User) => {
    const assignment = user.assignments.find((a) => a.businessUnitId === businessUnitId)
    return assignment?.role.role || "No Role"
  }

  const getUserStatusBadge = (isActive: boolean) => (
    <Badge variant={isActive ? "default" : "secondary"} className="gap-1">
      {isActive ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
      {isActive ? "Active" : "Inactive"}
    </Badge>
  )

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      Admin: "destructive",
      Manager: "default",
      Accountant: "secondary",
      Cashier: "outline",
    }
    return (
      <Badge variant={variants[role] || "outline"} className="gap-1">
        <Shield className="h-3 w-3" />
        {role}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage users, roles, and permissions across your organization</p>
        </div>
        <Button onClick={() => setCreateUserOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter((u) => u.isActive).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter((u) => !u.isActive).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Filter and search users by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users by name or username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.role}>
                    {role.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>Manage user accounts, roles, and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={`https://avatar.vercel.sh/${user.username}`} />
                    <AvatarFallback>
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.name}</p>
                      {getUserStatusBadge(user.isActive)}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.username}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right space-y-1">
                    {getRoleBadge(getUserRoleInCurrentBU(user))}
                    <p className="text-xs text-muted-foreground">
                      {user.assignments.length} business unit{user.assignments.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedUser(user)
                          setEditUserOpen(true)
                        }}
                        className="gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Edit Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedUser(user)
                          setChangePasswordOpen(true)
                        }}
                        className="gap-2"
                      >
                        <Key className="h-4 w-4" />
                        Change Password
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleUserStatus(user)} className="gap-2">
                        {user.isActive ? (
                          <>
                            <UserX className="h-4 w-4" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedUser(user)
                          setDeleteUserOpen(true)
                        }}
                        className="gap-2 text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <UserX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No users found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "all" || roleFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Get started by adding your first user"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateUserModal
        isOpen={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        onSuccess={() => {
          fetchUsers()
          setCreateUserOpen(false)
        }}
        roles={roles}
        businessUnits={businessUnits}
      />
      <EditUserModal
        isOpen={editUserOpen}
        onClose={() => {
          setEditUserOpen(false)
          setSelectedUser(null)
        }}
        onSuccess={() => {
          fetchUsers()
          setEditUserOpen(false)
          setSelectedUser(null)
        }}
        user={selectedUser}
        roles={roles}
        businessUnits={businessUnits}
      />
      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => {
          setChangePasswordOpen(false)
          setSelectedUser(null)
        }}
        onSuccess={() => {
          setChangePasswordOpen(false)
          setSelectedUser(null)
        }}
        user={selectedUser}
      />
      <AlertModal
        isOpen={deleteUserOpen}
        onClose={() => {
          setDeleteUserOpen(false)
          setSelectedUser(null)
        }}
        onConfirm={handleDeleteUser}
        loading={false} // You might want to connect this to a state for the delete operation
      />
    </div>
  )
}

export default UsersPage
