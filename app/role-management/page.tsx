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

interface Role {
  id: string
  name: string
  permissions: string
}

export default function RoleManagementPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentRole, setCurrentRole] = useState<Role | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    permissions: "",
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

    // Fetch roles
    if (user?.role === "admin") {
      fetchRoles()
    }
  }, [user, loading, router])

  const fetchRoles = async () => {
    setIsLoading(true)
    try {
      const rolesQuery = query(collection(db, "roles"), orderBy("name"))
      const snapshot = await getDocs(rolesQuery)

      const rolesList: Role[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        rolesList.push({
          id: doc.id,
          name: data.name || "",
          permissions: data.permissions || "",
        })
      })

      setRoles(rolesList)
    } catch (error) {
      console.error("Error fetching roles:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const openAddDialog = () => {
    setCurrentRole(null)
    setFormData({
      name: "",
      permissions: "",
    })
    setIsDialogOpen(true)
  }

  const openEditDialog = (role: Role) => {
    setCurrentRole(role)
    setFormData({
      name: role.name,
      permissions: role.permissions,
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
      if (currentRole) {
        // Update existing role
        await updateDoc(doc(db, "roles", currentRole.id), {
          name: formData.name,
          permissions: formData.permissions,
        })
      } else {
        // Create new role
        const newRoleRef = doc(collection(db, "roles"))
        await setDoc(newRoleRef, {
          name: formData.name,
          permissions: formData.permissions,
        })
      }

      setIsDialogOpen(false)
      fetchRoles()
    } catch (error) {
      console.error("Error saving role:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this role?")) {
      try {
        await deleteDoc(doc(db, "roles", id))
        fetchRoles()
      } catch (error) {
        console.error("Error deleting role:", error)
      }
    }
  }

  if (loading || isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Role Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchRoles}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Role
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No roles found
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell>{role.permissions}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(role)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(role.id)}>
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

      {/* Add/Edit Role Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentRole ? "Edit Role" : "Add Role"}</DialogTitle>
            <DialogDescription>
              {currentRole
                ? "Update the role details and permissions."
                : "Create a new role with specific permissions."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter role name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="permissions">Permissions (comma-separated)</Label>
                <Input
                  id="permissions"
                  name="permissions"
                  value={formData.permissions}
                  onChange={handleInputChange}
                  placeholder="read:users, write:users, etc."
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
