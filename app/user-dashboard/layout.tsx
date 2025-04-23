import type React from "react"
import AuthGuard from "@/app/auth-guard"

export default function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthGuard requiredRole="employee">{children}</AuthGuard>
}
