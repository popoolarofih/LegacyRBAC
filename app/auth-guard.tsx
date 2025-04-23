"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { Card, CardContent } from "@/components/ui/card"

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: "admin" | "manager" | "employee" | null
  redirectTo?: string
}

export default function AuthGuard({ children, requiredRole = null, redirectTo = "/auth" }: AuthGuardProps) {
  const { user, loading, authStatus } = useAuth()
  const router = useRouter()
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    // Only run the check once authentication state is fully loaded
    if (!loading && authStatus !== "initializing" && !hasChecked) {
      setHasChecked(true)

      // If user is not authenticated, redirect to auth page
      if (authStatus === "unauthenticated") {
        console.log("AuthGuard: User not authenticated, redirecting to", redirectTo)
        router.push(redirectTo)
        return
      }

      // If a specific role is required, check if user has that role
      if (requiredRole && user?.role !== requiredRole) {
        console.log("AuthGuard: User does not have required role, redirecting")

        // Redirect based on user's actual role
        if (user?.role === "admin") {
          router.push("/dashboard")
        } else if (user?.role === "manager") {
          router.push("/manager-dashboard")
        } else if (user?.role === "employee") {
          router.push("/user-dashboard")
        } else {
          router.push(redirectTo)
        }
        return
      }
    }
  }, [user, loading, authStatus, requiredRole, redirectTo, router, hasChecked])

  // Show loading state while checking authentication
  if (loading || authStatus === "initializing" || !hasChecked) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium">Verifying authentication...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If user is not authenticated and we've already checked, show loading while redirecting
  if (authStatus === "unauthenticated") {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium">Redirecting to login...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If user doesn't have required role and we've already checked, show loading while redirecting
  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium">Redirecting to appropriate dashboard...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If all checks pass, render the children
  return <>{children}</>
}
