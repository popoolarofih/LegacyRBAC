"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/context/auth-context"
import DashboardLayout from "@/components/dashboard-layout"
import { Cog, ShieldCheck, UserCheck, UserPlus, Users } from "lucide-react"
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function AdminDashboard() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeRoles: 0,
    newUsers: 0,
    permissionSets: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

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

    // Fetch dashboard stats
    if (user?.role === "admin") {
      fetchDashboardStats()
    }
  }, [user, loading, router])

  const fetchDashboardStats = async () => {
    setIsLoading(true)
    try {
      // Get total users
      const usersSnapshot = await getDocs(collection(db, "users"))
      const totalUsers = usersSnapshot.size

      // Get active roles (count unique role values)
      const roles = new Set()
      usersSnapshot.forEach((doc) => {
        const userData = doc.data()
        if (userData.role) {
          roles.add(userData.role)
        }
      })
      const activeRoles = roles.size

      // Get new users in the last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const newUsersQuery = query(collection(db, "users"), where("createdAt", ">=", Timestamp.fromDate(thirtyDaysAgo)))
      const newUsersSnapshot = await getDocs(newUsersQuery)
      const newUsers = newUsersSnapshot.size

      // Get permission sets (for demo, we'll use a fixed number)
      // In a real app, you would query a permissions collection
      const permissionSets = 42

      setStats({
        totalUsers,
        activeRoles,
        newUsers,
        permissionSets,
      })
    } catch (error) {
      console.error("Error fetching dashboard stats:", error)
      // Set fallback values if there's an error
      setStats({
        totalUsers: 0,
        activeRoles: 0,
        newUsers: 0,
        permissionSets: 0,
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (loading || isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  return (
    <DashboardLayout>
      {/* Dashboard Header */}
      <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-xl font-semibold mr-4">
            {user?.email?.substring(0, 2).toUpperCase() || "AD"}
          </div>
          <div>
            <h2 className="text-2xl font-bold">Welcome, {user?.email || "Admin"}</h2>
            <div className="flex gap-2">
              <span className="bg-primary text-white text-xs px-2 py-1 rounded">Admin</span>
              <span className="bg-blue-400 text-white text-xs px-2 py-1 rounded">Full Access</span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Users" value={stats.totalUsers} icon={<Users className="h-6 w-6 text-primary" />} />
        <StatCard
          title="Active Roles"
          value={stats.activeRoles}
          icon={<UserCheck className="h-6 w-6 text-green-500" />}
        />
        <StatCard
          title="New Users (30d)"
          value={stats.newUsers}
          icon={<UserPlus className="h-6 w-6 text-yellow-500" />}
        />
        <StatCard
          title="Permission Sets"
          value={stats.permissionSets}
          icon={<ShieldCheck className="h-6 w-6 text-blue-500" />}
        />
      </div>

      {/* Quick Actions */}
      <h4 className="text-xl font-semibold mb-4">Quick Actions</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ActionCard title="User Management" icon={<Users className="h-8 w-8 text-primary" />} href="/user-management" />
        <ActionCard
          title="Role Management"
          icon={<UserCheck className="h-8 w-8 text-green-500" />}
          href="/role-management"
        />
        <ActionCard
          title="Permissions"
          icon={<ShieldCheck className="h-8 w-8 text-yellow-500" />}
          href="/permission-management"
        />
        <ActionCard title="Settings" icon={<Cog className="h-8 w-8 text-blue-500" />} href="/settings" />
      </div>
    </DashboardLayout>
  )
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="hover:shadow-md transition-all hover:-translate-y-1">
      <CardContent className="p-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <h3 className="text-2xl font-bold">{value}</h3>
          </div>
          <div className="text-2xl">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function ActionCard({ title, icon, href }: { title: string; icon: React.ReactNode; href: string }) {
  return (
    <a href={href} className="block">
      <Card className="hover:shadow-md transition-all hover:-translate-y-1 border border-gray-100">
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="mb-3">{icon}</div>
          <h5 className="font-semibold">{title}</h5>
        </CardContent>
      </Card>
    </a>
  )
}
