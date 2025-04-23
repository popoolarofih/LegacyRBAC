"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import DashboardLayout from "@/components/dashboard-layout"
import UserTable from "@/components/user-table"
import UserForm from "@/components/user-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search } from "lucide-react"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"

export type UserData = {
  id: string
  email: string
  role: "admin" | "manager" | "employee"
  createdAt: Date
  lastLogin?: Date
  status: "active" | "inactive" | "pending"
}

export default function UserManagementPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [users, setUsers] = useState<UserData[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [showAddUserForm, setShowAddUserForm] = useState(false)

  useEffect(() => {
    // Redirect if not admin
    if (!loading && (!user || user.role !== "admin")) {
      if (user?.role === "manager") {
        router.push("/manager-dashboard")
      } else if (user?.role === "employee") {
        router.push("/user-dashboard")
      } else {
        router.push("/auth")
      }
    }

    // Fetch users
    if (user?.role === "admin") {
      fetchUsers()
    }
  }, [user, loading, router])

  useEffect(() => {
    // Filter users based on search term and active tab
    if (users.length > 0) {
      let filtered = [...users]

      // Filter by search term
      if (searchTerm) {
        filtered = filtered.filter((user) => user.email.toLowerCase().includes(searchTerm.toLowerCase()))
      }

      // Filter by role
      if (activeTab !== "all") {
        filtered = filtered.filter((user) => user.role === activeTab)
      }

      setFilteredUsers(filtered)
    }
  }, [users, searchTerm, activeTab])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"))
      const usersSnapshot = await getDocs(usersQuery)

      const usersData: UserData[] = []
      usersSnapshot.forEach((doc) => {
        const data = doc.data()
        usersData.push({
          id: doc.id,
          email: data.email || "",
          role: data.role || "employee",
          createdAt: data.createdAt?.toDate() || new Date(),
          lastLogin: data.lastLogin?.toDate(),
          status: data.status || "active",
        })
      })

      setUsers(usersData)
      setFilteredUsers(usersData)
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  const handleUserAdded = () => {
    fetchUsers()
    setShowAddUserForm(false)
  }

  const handleUserUpdated = () => {
    fetchUsers()
  }

  if (loading || isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Button onClick={() => setShowAddUserForm(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      {showAddUserForm ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add New User</CardTitle>
            <CardDescription>Create a new user account</CardDescription>
          </CardHeader>
          <CardContent>
            <UserForm onUserAdded={handleUserAdded} onCancel={() => setShowAddUserForm(false)} />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search users..." className="pl-8" value={searchTerm} onChange={handleSearch} />
                </div>
                <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange} className="w-full md:w-auto">
                  <TabsList>
                    <TabsTrigger value="all">All Users</TabsTrigger>
                    <TabsTrigger value="admin">Admins</TabsTrigger>
                    <TabsTrigger value="manager">Managers</TabsTrigger>
                    <TabsTrigger value="employee">Employees</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          <UserTable users={filteredUsers} onUserUpdated={handleUserUpdated} />
        </>
      )}
    </DashboardLayout>
  )
}
