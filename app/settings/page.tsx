"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import DashboardLayout from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface UserProfile {
  firstName: string
  lastName: string
  email: string
  phone: string
  department: string
}

export default function SettingsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [profile, setProfile] = useState<UserProfile>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "",
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null)

  useEffect(() => {
    // Redirect if not authenticated
    if (!loading && !user) {
      router.push("/auth")
    }

    // Fetch user profile
    if (user) {
      fetchUserProfile(user.uid)
    }
  }, [user, loading, router])

  const fetchUserProfile = async (userId: string) => {
    setIsLoading(true)
    try {
      const userDoc = await getDoc(doc(db, "users", userId))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        // Split name into first and last name if it exists
        let firstName = ""
        let lastName = ""
        if (userData.name) {
          const nameParts = userData.name.split(" ")
          firstName = nameParts[0] || ""
          lastName = nameParts.slice(1).join(" ") || ""
        }

        setProfile({
          firstName,
          lastName,
          email: userData.email || user?.email || "",
          phone: userData.phone || "",
          department: userData.department || "",
        })
      } else {
        // If no profile exists, use auth data
        setProfile({
          firstName: "",
          lastName: "",
          email: user?.email || "",
          phone: "",
          department: "",
        })
      }
    } catch (error) {
      console.error("Error fetching user profile:", error)
      setAlert({
        type: "error",
        message: "Failed to load profile. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProfile((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)
    setAlert(null)

    try {
      // Combine first and last name
      const name = `${profile.firstName} ${profile.lastName}`.trim()

      await updateDoc(doc(db, "users", user.uid), {
        name,
        email: profile.email,
        phone: profile.phone,
        department: profile.department,
        updatedAt: new Date(),
      })

      setAlert({
        type: "success",
        message: "Profile updated successfully!",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      setAlert({
        type: "error",
        message: "Failed to update profile. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Your Profile</CardTitle>
          <CardDescription>Update your personal information and preferences</CardDescription>
        </CardHeader>
        <CardContent>
          {alert && (
            <Alert variant={alert.type === "error" ? "destructive" : "default"} className="mb-6">
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={profile.firstName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" name="lastName" value={profile.lastName} onChange={handleInputChange} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={profile.email}
                onChange={handleInputChange}
                disabled={true}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" name="phone" type="tel" value={profile.phone} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input id="department" name="department" value={profile.department} onChange={handleInputChange} />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
