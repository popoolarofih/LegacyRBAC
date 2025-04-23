import type React from "react"
import AuthGuard from "@/app/auth-guard"

export default function ManagerDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthGuard requiredRole="manager">{children}</AuthGuard>
}
