"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import DashboardLayout from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RefreshCw, Plus, Edit, Trash2 } from "lucide-react"
import { collection, query, orderBy, getDocs, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface Permission {
  id: string
  name: string
  description: string
}

export default function PermissionManagementPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentPermission, setCurrentPermission] = useState<Permission | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })

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

    // Fetch permissions
    if (user?.role === "admin") {
      fetchPermissions()
    }
  }, [user, loading, router])

  const fetchPermissions = async () => {
    setIsLoading(true)
    try {
      const permissionsQuery = query(collection(db, "permissions"), orderBy("name"))
      const snapshot = await getDocs(permissionsQuery)

      const permissionsList: Permission[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        permissionsList.push({
          id: doc.id,
          name: data.name || "",
          description: data.description || "",
        })
      })

      setPermissions(permissionsList)
    } catch (error) {
      console.error("Error fetching permissions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const openAddDialog = () => {
    setCurrentPermission(null)
    setFormData({
      name: "",
      description: "",
    })
    setIsDialogOpen(true)
  }

  const openEditDialog = (permission: Permission) => {
    setCurrentPermission(permission)
    setFormData({
      name: permission.name,
      description: permission.description,
    })
    setIsDialogOpen(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (currentPermission) {
        // Update existing permission
        await updateDoc(doc(db, "permissions", currentPermission.id), {
          name: formData.name,
          description: formData.description,
        })
      } else {
        // Create new permission
        const newPermissionRef = doc(collection(db, "permissions"))
        await setDoc(newPermissionRef, {
          name: formData.name,
          description: formData.description,
        })
      }

      setIsDialogOpen(false)
      fetchPermissions()
    } catch (error) {
      console.error("Error saving permission:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this permission?")) {
      try {
        await deleteDoc(doc(db, "permissions", id))
        fetchPermissions()
      } catch (error) {
        console.error("Error deleting permission:", error)
      }
    }
  }

  if (loading || isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Permission Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchPermissions}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Permission
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Permission</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No permissions found
                    </TableCell>
                  </TableRow>
                ) : (
                  permissions.map((permission) => (
                    <TableRow key={permission.id}>
                      <TableCell className="font-medium">{permission.name}</TableCell>
                      <TableCell>{permission.description}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(permission)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(permission.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Permission Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentPermission ? "Edit Permission" : "Add Permission"}</DialogTitle>
            <DialogDescription>
              {currentPermission ? "Update the permission details." : "Create a new permission for the system."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Permission Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter permission name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter permission description"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Permission"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
