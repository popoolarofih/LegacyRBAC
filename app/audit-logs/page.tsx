"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import DashboardLayout from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RefreshCw } from "lucide-react"
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface AuditLog {
  id: string
  timestamp: Date
  user: string
  action: string
  module: string
  details: string
}

export default function AuditLogsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
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

    // Fetch audit logs
    if (user?.role === "admin") {
      fetchAuditLogs()
    }
  }, [user, loading, router])

  const fetchAuditLogs = async () => {
    setIsLoading(true)
    try {
      const auditLogsQuery = query(collection(db, "auditLogs"), orderBy("timestamp", "desc"), limit(50))
      const snapshot = await getDocs(auditLogsQuery)

      const logs: AuditLog[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        logs.push({
          id: doc.id,
          timestamp: data.timestamp?.toDate() || new Date(),
          user: data.user || "System",
          action: data.action || "",
          module: data.module || "",
          details: data.details || "",
        })
      })

      setAuditLogs(logs)
    } catch (error) {
      console.error("Error fetching audit logs:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date)
  }

  if (loading || isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <Button variant="outline" size="sm" onClick={fetchAuditLogs}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDate(log.timestamp)}</TableCell>
                      <TableCell>{log.user}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.module}</TableCell>
                      <TableCell>{log.details}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
