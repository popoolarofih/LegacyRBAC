"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import {
  Bell,
  LineChartIcon as ChartLine,
  Cog,
  History,
  ListTodo,
  LogOut,
  Menu,
  ShieldCheck,
  User,
  UserCheck,
  Users,
} from "lucide-react"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isAdmin = user?.role === "admin"
  const isManager = user?.role === "manager"
  const isEmployee = user?.role === "employee"

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`sidebar-gradient fixed top-0 left-0 h-full w-64 text-white z-50 transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 flex items-center">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-primary font-bold mr-3">
            AG
          </div>
          <h3 className="text-xl font-bold">AccessGuard</h3>
        </div>

        <nav className="mt-6">
          <ul className="space-y-1">
            {isAdmin && (
              <>
                <NavItem
                  href="/dashboard"
                  icon={<ChartLine className="h-5 w-5" />}
                  label="Dashboard"
                  active={pathname === "/dashboard"}
                />
                <NavItem
                  href="/user-management"
                  icon={<Users className="h-5 w-5" />}
                  label="User Management"
                  active={pathname === "/user-management"}
                />
                <NavItem
                  href="/role-management"
                  icon={<UserCheck className="h-5 w-5" />}
                  label="Role Management"
                  active={pathname === "/role-management"}
                />
                <NavItem
                  href="/permission-management"
                  icon={<ShieldCheck className="h-5 w-5" />}
                  label="Permissions"
                  active={pathname === "/permission-management"}
                />
                <NavItem
                  href="/audit-logs"
                  icon={<History className="h-5 w-5" />}
                  label="Audit Logs"
                  active={pathname === "/audit-logs"}
                />
              </>
            )}

            {isManager && (
              <>
                <NavItem
                  href="/manager-dashboard"
                  icon={<ChartLine className="h-5 w-5" />}
                  label="Dashboard"
                  active={pathname === "/manager-dashboard"}
                />
                <NavItem
                  href="/team-management"
                  icon={<Users className="h-5 w-5" />}
                  label="Team Management"
                  active={pathname === "/team-management"}
                />
                <NavItem
                  href="/reports"
                  icon={<ChartLine className="h-5 w-5" />}
                  label="Generate Reports"
                  active={pathname === "/reports"}
                />
                <NavItem
                  href="/notifications"
                  icon={<Bell className="h-5 w-5" />}
                  label="Notifications"
                  active={pathname === "/notifications"}
                />
              </>
            )}

            {isEmployee && (
              <>
                <NavItem
                  href="/user-dashboard"
                  icon={<ChartLine className="h-5 w-5" />}
                  label="My Dashboard"
                  active={pathname === "/user-dashboard"}
                />
                <NavItem
                  href="/my-tasks"
                  icon={<ListTodo className="h-5 w-5" />}
                  label="My Tasks"
                  active={pathname === "/my-tasks"}
                />
                <NavItem
                  href="/my-profile"
                  icon={<User className="h-5 w-5" />}
                  label="My Profile"
                  active={pathname === "/my-profile"}
                />
              </>
            )}

            <NavItem
              href="/settings"
              icon={<Cog className="h-5 w-5" />}
              label="Settings"
              active={pathname === "/settings"}
            />

            <li>
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-6 py-3 text-gray-200 hover:bg-white/10 hover:text-white transition-colors"
              >
                <LogOut className="h-5 w-5 mr-3" />
                <span>Logout</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white shadow-sm sticky top-0 z-40">
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <Menu className="h-6 w-6" />
        </Button>
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold mr-2">
            AG
          </div>
          <h3 className="font-bold">AccessGuard</h3>
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:ml-64 p-4 md:p-8 transition-all">{children}</main>

      {/* Backdrop for mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}

function NavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string
  icon: React.ReactNode
  label: string
  active: boolean
}) {
  return (
    <li>
      <Link
        href={href}
        className={`flex items-center px-6 py-3 transition-colors ${
          active ? "bg-white/10 text-white" : "text-gray-200 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span className="mr-3">{icon}</span>
        <span>{label}</span>
      </Link>
    </li>
  )
}
