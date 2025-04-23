import type React from "react"
import AuthGuard from "@/app/auth-guard"

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthGuard requiredRole="admin">{children}</AuthGuard>
}
