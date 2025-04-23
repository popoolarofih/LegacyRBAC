"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/context/auth-context"
import DashboardLayout from "@/components/dashboard-layout"
import {
  Bell,
  CheckCircle,
  LineChartIcon as ChartLine,
  ListTodo,
  Users,
  UserPlus,
  AlertCircle,
  BarChart,
  ChevronRight,
  Plus,
  ClipboardList,
  UserCheck,
  Search,
  Filter,
  Download,
  Calendar,
  FileText,
  Trash2,
  Edit,
  Eye,
} from "lucide-react"
import {
  collection,
  getDocs,
  query,
  where,
  limit,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  Timestamp,
  writeBatch,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { approveRequest, rejectRequest } from "@/lib/request-actions"
import { markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/notification-actions"
import { logAuditEvent } from "@/lib/audit-service"

// Define interfaces for our data types
interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  department: string
  status: "active" | "inactive" | "pending"
  joinDate: Date
}

interface Request {
  id: string
  userId: string
  userName: string
  type: string
  status: "pending" | "approved" | "rejected"
  createdAt: Date
  description: string
}

interface Report {
  id: string
  title: string
  period: string
  createdAt: Date
  status: "draft" | "published"
}

interface Notification {
  id: string
  title: string
  message: string
  timestamp: Date
  read: boolean
  type: "info" | "warning" | "success" | "error"
}

export default function ManagerDashboard() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { toast } = useToast()
  const [stats, setStats] = useState({
    totalTeamMembers: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    departmentReports: 0,
  })
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [searchTerm, setSearchTerm] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false)
  const [isRequestDetailDialogOpen, setIsRequestDetailDialogOpen] = useState(false)
  const [isAddTeamMemberDialogOpen, setIsAddTeamMemberDialogOpen] = useState(false)
  const [newTeamMember, setNewTeamMember] = useState({
    name: "",
    email: "",
    role: "employee",
    department: "General",
  })
  const [isCreatingReport, setIsCreatingReport] = useState(false)
  const [newReport, setNewReport] = useState({
    title: "",
    period: "",
    description: "",
  })

  useEffect(() => {
    // Redirect if not manager
    if (!loading && (!user || user.role !== "manager")) {
      if (user?.role === "admin") {
        router.push("/dashboard")
      } else if (user?.role === "employee") {
        router.push("/user-dashboard")
      } else {
        router.push("/auth")
      }
    }

    // Fetch dashboard data
    if (user?.role === "manager" && user?.uid) {
      fetchManagerData(user.uid)
    }
  }, [user, loading, router])

  const fetchManagerData = async (managerId: string) => {
    setIsLoading(true)
    try {
      // Fetch team members
      await fetchTeamMembers(managerId)

      // Fetch requests
      await fetchRequests(managerId)

      // Fetch reports
      await fetchReports(managerId)

      // Fetch notifications
      await fetchNotifications(managerId)
    } catch (error) {
      console.error("Error fetching manager data:", error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTeamMembers = async (managerId: string) => {
    try {
      const teamQuery = query(collection(db, "users"), where("managerId", "==", managerId))
      const teamSnapshot = await getDocs(teamQuery)

      const members: TeamMember[] = []
      teamSnapshot.forEach((doc) => {
        const data = doc.data()
        members.push({
          id: doc.id,
          name: data.name || "Unnamed User",
          email: data.email || "",
          role: data.role || "employee",
          department: data.department || "General",
          status: data.status || "active",
          joinDate: data.createdAt?.toDate() || new Date(),
        })
      })

      setTeamMembers(members)
      setStats((prev) => ({ ...prev, totalTeamMembers: members.length }))
    } catch (error) {
      console.error("Error fetching team members:", error)
      throw error
    }
  }

  const fetchRequests = async (managerId: string) => {
    try {
      const requestsQuery = query(collection(db, "requests"), where("managerId", "==", managerId))
      const requestsSnapshot = await getDocs(requestsQuery)

      const requestsList: Request[] = []
      let pendingCount = 0
      let approvedCount = 0

      requestsSnapshot.forEach((doc) => {
        const data = doc.data()
        const request: Request = {
          id: doc.id,
          userId: data.userId || "",
          userName: data.userName || "Unknown User",
          type: data.type || "General Request",
          status: data.status || "pending",
          createdAt: data.createdAt?.toDate() || new Date(),
          description: data.description || "",
        }

        if (request.status === "pending") {
          pendingCount++
        } else if (request.status === "approved") {
          approvedCount++
        }

        requestsList.push(request)
      })

      // Sort requests by createdAt in descending order (newest first)
      requestsList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      setRequests(requestsList)
      setStats((prev) => ({
        ...prev,
        pendingRequests: pendingCount,
        approvedRequests: approvedCount,
      }))
    } catch (error) {
      console.error("Error fetching requests:", error)
      throw error
    }
  }

  const fetchReports = async (managerId: string) => {
    try {
      const reportsQuery = query(collection(db, "reports"), where("managerId", "==", managerId))
      const reportsSnapshot = await getDocs(reportsQuery)

      const reportsList: Report[] = []
      reportsSnapshot.forEach((doc) => {
        const data = doc.data()
        reportsList.push({
          id: doc.id,
          title: data.title || "Untitled Report",
          period: data.period || "N/A",
          createdAt: data.createdAt?.toDate() || new Date(),
          status: data.status || "draft",
        })
      })

      // Sort reports by createdAt in descending order (newest first)
      reportsList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      setReports(reportsList)
      setStats((prev) => ({ ...prev, departmentReports: reportsList.length }))
    } catch (error) {
      console.error("Error fetching reports:", error)
      throw error
    }
  }

  const fetchNotifications = async (managerId: string) => {
    try {
      const notificationsQuery = query(collection(db, "notifications"), where("userId", "==", managerId), limit(5))
      const notificationsSnapshot = await getDocs(notificationsQuery)

      const notificationsList: Notification[] = []
      notificationsSnapshot.forEach((doc) => {
        const data = doc.data()
        notificationsList.push({
          id: doc.id,
          title: data.title || "",
          message: data.message || "",
          timestamp: data.timestamp?.toDate() || new Date(),
          read: data.read || false,
          type: data.type || "info",
        })
      })

      // Sort notifications by timestamp in descending order (newest first)
      notificationsList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

      setNotifications(notificationsList)
    } catch (error) {
      console.error("Error fetching notifications:", error)
      throw error
    }
  }

  const handleApproveRequest = async (requestId: string, userId: string) => {
    if (!user) return

    try {
      setIsLoading(true)
      const result = await approveRequest(requestId, user.uid, user.displayName || user.email || "Manager", userId)

      if (result.success) {
        toast({
          title: "Request Approved",
          description: "The request has been successfully approved.",
        })

        // Refresh requests data
        await fetchRequests(user.uid)
      } else {
        throw new Error("Failed to approve request")
      }
    } catch (error) {
      console.error("Error approving request:", error)
      toast({
        title: "Error",
        description: "Failed to approve request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRejectRequest = async () => {
    if (!user || !selectedRequest) return

    try {
      setIsLoading(true)
      const result = await rejectRequest(
        selectedRequest.id,
        user.uid,
        user.displayName || user.email || "Manager",
        selectedRequest.userId,
        rejectionReason,
      )

      if (result.success) {
        toast({
          title: "Request Rejected",
          description: "The request has been rejected.",
        })

        // Refresh requests data
        await fetchRequests(user.uid)
        setIsRejectionDialogOpen(false)
        setRejectionReason("")
        setSelectedRequest(null)
      } else {
        throw new Error("Failed to reject request")
      }
    } catch (error) {
      console.error("Error rejecting request:", error)
      toast({
        title: "Error",
        description: "Failed to reject request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAllNotificationsAsRead = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const result = await markAllNotificationsAsRead(user.uid)

      if (result.success) {
        toast({
          title: "Notifications Marked as Read",
          description: `${result.count} notifications marked as read.`,
        })

        // Refresh notifications data
        await fetchNotifications(user.uid)
      } else {
        throw new Error("Failed to mark notifications as read")
      }
    } catch (error) {
      console.error("Error marking notifications as read:", error)
      toast({
        title: "Error",
        description: "Failed to mark notifications as read. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    if (!user) return

    try {
      const result = await markNotificationAsRead(notificationId)

      if (result.success) {
        // Update the local state
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === notificationId ? { ...notification, read: true } : notification,
          ),
        )
      } else {
        throw new Error("Failed to mark notification as read")
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
      toast({
        title: "Error",
        description: "Failed to mark notification as read.",
        variant: "destructive",
      })
    }
  }

  const handleAddTeamMember = async () => {
    if (!user) return

    try {
      setIsLoading(true)

      // Validate inputs
      if (!newTeamMember.name || !newTeamMember.email) {
        toast({
          title: "Missing Information",
          description: "Please provide name and email for the new team member.",
          variant: "destructive",
        })
        return
      }

      // Add new team member to Firestore
      const usersRef = collection(db, "users")
      await addDoc(usersRef, {
        name: newTeamMember.name,
        email: newTeamMember.email,
        role: newTeamMember.role,
        department: newTeamMember.department,
        managerId: user.uid,
        status: "pending",
        createdAt: Timestamp.now(),
      })

      toast({
        title: "Team Member Added",
        description: "New team member has been added successfully.",
      })

      // Log audit event
      await logAuditEvent({
        action: "team_member_added",
        userId: user.uid,
        targetId: newTeamMember.email,
        details: `New team member ${newTeamMember.name} (${newTeamMember.email}) added by manager ${user.uid}`,
        timestamp: new Date(),
      })

      // Refresh team members data
      await fetchTeamMembers(user.uid)

      // Reset form and close dialog
      setNewTeamMember({
        name: "",
        email: "",
        role: "employee",
        department: "General",
      })
      setIsAddTeamMemberDialogOpen(false)
    } catch (error) {
      console.error("Error adding team member:", error)
      toast({
        title: "Error",
        description: "Failed to add team member. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateReport = async () => {
    if (!user) return

    try {
      setIsLoading(true)

      // Validate inputs
      if (!newReport.title || !newReport.period) {
        toast({
          title: "Missing Information",
          description: "Please provide title and period for the new report.",
          variant: "destructive",
        })
        return
      }

      // Add new report to Firestore
      const reportsRef = collection(db, "reports")
      await addDoc(reportsRef, {
        title: newReport.title,
        period: newReport.period,
        description: newReport.description,
        managerId: user.uid,
        status: "draft",
        createdAt: Timestamp.now(),
      })

      toast({
        title: "Report Created",
        description: "New report has been created successfully.",
      })

      // Log audit event
      await logAuditEvent({
        action: "report_created",
        userId: user.uid,
        targetId: newReport.title,
        details: `New report "${newReport.title}" created by manager ${user.uid}`,
        timestamp: new Date(),
      })

      // Refresh reports data
      await fetchReports(user.uid)

      // Reset form and close dialog
      setNewReport({
        title: "",
        period: "",
        description: "",
      })
      setIsCreatingReport(false)
    } catch (error) {
      console.error("Error creating report:", error)
      toast({
        title: "Error",
        description: "Failed to create report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePublishReport = async (reportId: string) => {
    if (!user) return

    try {
      setIsLoading(true)

      // Update report status in Firestore
      const reportRef = doc(db, "reports", reportId)
      await updateDoc(reportRef, {
        status: "published",
        publishedAt: Timestamp.now(),
      })

      toast({
        title: "Report Published",
        description: "The report has been published successfully.",
      })

      // Log audit event
      await logAuditEvent({
        action: "report_published",
        userId: user.uid,
        targetId: reportId,
        details: `Report ${reportId} published by manager ${user.uid}`,
        timestamp: new Date(),
      })

      // Refresh reports data
      await fetchReports(user.uid)
    } catch (error) {
      console.error("Error publishing report:", error)
      toast({
        title: "Error",
        description: "Failed to publish report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteReport = async (reportId: string) => {
    if (!user) return

    try {
      setIsLoading(true)

      // Delete report from Firestore
      const reportRef = doc(db, "reports", reportId)
      await deleteDoc(reportRef)

      toast({
        title: "Report Deleted",
        description: "The report has been deleted successfully.",
      })

      // Log audit event
      await logAuditEvent({
        action: "report_deleted",
        userId: user.uid,
        targetId: reportId,
        details: `Report ${reportId} deleted by manager ${user.uid}`,
        timestamp: new Date(),
      })

      // Refresh reports data
      await fetchReports(user.uid)
    } catch (error) {
      console.error("Error deleting report:", error)
      toast({
        title: "Error",
        description: "Failed to delete report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleApproveAllRequests = async () => {
    if (!user) return

    try {
      setIsLoading(true)

      const pendingRequests = requests.filter((r) => r.status === "pending")

      if (pendingRequests.length === 0) {
        toast({
          title: "No Pending Requests",
          description: "There are no pending requests to approve.",
        })
        return
      }

      const batch = writeBatch(db)

      // Update all pending requests
      pendingRequests.forEach((request) => {
        const requestRef = doc(db, "requests", request.id)
        batch.update(requestRef, {
          status: "approved",
          approvedBy: user.uid,
          approvedByName: user.displayName || user.email || "Manager",
          approvedAt: Timestamp.now(),
        })

        // Create notifications for users
        const notificationRef = doc(db, "notifications", `req-approved-${request.id}`)
        batch.set(notificationRef, {
          userId: request.userId,
          title: "Request Approved",
          message: "Your request has been approved by your manager.",
          timestamp: Timestamp.now(),
          read: false,
          type: "success",
        })
      })

      await batch.commit()

      toast({
        title: "Requests Approved",
        description: `${pendingRequests.length} requests have been approved.`,
      })

      // Log audit event
      await logAuditEvent({
        action: "bulk_requests_approved",
        userId: user.uid,
        targetId: "multiple",
        details: `${pendingRequests.length} requests approved by manager ${user.uid}`,
        timestamp: new Date(),
      })

      // Refresh requests data
      await fetchRequests(user.uid)
    } catch (error) {
      console.error("Error approving all requests:", error)
      toast({
        title: "Error",
        description: "Failed to approve all requests. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>
      case "rejected":
        return <Badge className="bg-red-500">Rejected</Badge>
      case "active":
        return <Badge className="bg-green-500">Active</Badge>
      case "inactive":
        return <Badge className="bg-gray-500">Inactive</Badge>
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>
      case "published":
        return <Badge className="bg-blue-500">Published</Badge>
      case "draft":
        return <Badge className="bg-gray-500">Draft</Badge>
      default:
        return <Badge className="bg-gray-500">{status}</Badge>
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Bell className="h-5 w-5 text-blue-500" />
    }
  }

  const filteredTeamMembers = teamMembers.filter(
    (member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.department.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredRequests = requests.filter(
    (request) =>
      request.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredReports = reports.filter(
    (report) =>
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.period.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading || isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
            <div className="flex items-center">
              <Skeleton className="w-12 h-12 rounded-full mr-4" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <div className="flex gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-8 w-12" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="flex items-start justify-between border-b pb-3">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                          <div className="flex gap-2 mt-1">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                        </div>
                        <Skeleton className="h-3 w-24" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Dashboard Header */}
      <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-xl font-semibold mr-4">
            {user?.email?.substring(0, 2).toUpperCase() || "MG"}
          </div>
          <div>
            <h2 className="text-2xl font-bold">Welcome, {user?.displayName || user?.email || "Manager"}</h2>
            <div className="flex gap-2">
              <span className="bg-primary text-white text-xs px-2 py-1 rounded">Manager</span>
              <span className="bg-blue-400 text-white text-xs px-2 py-1 rounded">View, Edit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Team Members"
              value={stats.totalTeamMembers}
              icon={<Users className="h-6 w-6 text-primary" />}
            />
            <StatCard
              title="Pending Requests"
              value={stats.pendingRequests}
              icon={<ListTodo className="h-6 w-6 text-yellow-500" />}
            />
            <StatCard
              title="Approved Requests"
              value={stats.approvedRequests}
              icon={<CheckCircle className="h-6 w-6 text-green-500" />}
            />
            <StatCard
              title="Department Reports"
              value={stats.departmentReports}
              icon={<ChartLine className="h-6 w-6 text-blue-500" />}
            />
          </div>

          {/* Team Overview and Pending Requests */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Team Overview */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle>Team Overview</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("team")}>
                    View All <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {teamMembers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No team members found</p>
                ) : (
                  <div className="space-y-4">
                    {teamMembers.slice(0, 3).map((member) => (
                      <div key={member.id} className="flex items-start justify-between border-b pb-3">
                        <div>
                          <h4 className="font-medium">{member.name}</h4>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline">{member.role}</Badge>
                            {getStatusBadge(member.status)}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">Joined: {formatDate(member.joinDate)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending Requests */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle>Pending Requests</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("requests")}>
                    View All <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {requests.filter((r) => r.status === "pending").length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No pending requests</p>
                ) : (
                  <div className="space-y-4">
                    {requests
                      .filter((r) => r.status === "pending")
                      .slice(0, 3)
                      .map((request) => (
                        <div key={request.id} className="flex items-start justify-between border-b pb-3">
                          <div>
                            <h4 className="font-medium">{request.type}</h4>
                            <p className="text-sm text-muted-foreground">From: {request.userName}</p>
                            <p className="text-sm text-muted-foreground">{request.description.substring(0, 50)}...</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground mb-2">{formatDate(request.createdAt)}</div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-green-50 hover:bg-green-100"
                                onClick={() => handleApproveRequest(request.id, request.userId)}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-red-50 hover:bg-red-100"
                                onClick={() => {
                                  setSelectedRequest(request)
                                  setIsRejectionDialogOpen(true)
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Reports and Notifications */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Reports */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle>Recent Reports</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("reports")}>
                    View All <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {reports.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No reports found</p>
                ) : (
                  <div className="space-y-4">
                    {reports.slice(0, 3).map((report) => (
                      <div key={report.id} className="flex items-start justify-between border-b pb-3">
                        <div>
                          <h4 className="font-medium">{report.title}</h4>
                          <p className="text-sm text-muted-foreground">Period: {report.period}</p>
                          <div className="mt-1">{getStatusBadge(report.status)}</div>
                        </div>
                        <div className="text-sm text-muted-foreground">Created: {formatDate(report.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle>Notifications</CardTitle>
                  <Button variant="ghost" size="sm" onClick={handleMarkAllNotificationsAsRead}>
                    Mark All Read
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No notifications</p>
                ) : (
                  <div className="space-y-4">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="flex gap-3 border-b pb-3"
                        onClick={() => handleMarkNotificationAsRead(notification.id)}
                      >
                        <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                        <div className="flex-1">
                          <h4 className={`font-medium ${notification.read ? "text-muted-foreground" : ""}`}>
                            {notification.title}
                          </h4>
                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(notification.timestamp)}</p>
                        </div>
                        {!notification.read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Department Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Department Performance</CardTitle>
              <CardDescription>Team performance metrics for the current quarter</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Task Completion</span>
                    <span className="text-sm font-medium">78%</span>
                  </div>
                  <Progress value={78} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">On-time Delivery</span>
                    <span className="text-sm font-medium">92%</span>
                  </div>
                  <Progress value={92} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Resource Utilization</span>
                    <span className="text-sm font-medium">85%</span>
                  </div>
                  <Progress value={85} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Team Management</CardTitle>
                <Button onClick={() => setIsAddTeamMemberDialogOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Team Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search team members..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                  <span className="sr-only">Filter</span>
                </Button>
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                  <span className="sr-only">Download</span>
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTeamMembers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {searchTerm ? "No matching team members found" : "No team members found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTeamMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>{member.role}</TableCell>
                          <TableCell>{member.department}</TableCell>
                          <TableCell>{getStatusBadge(member.status)}</TableCell>
                          <TableCell>{formatDate(member.joinDate)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
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

          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
              <CardDescription>Individual performance metrics for team members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {filteredTeamMembers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    {searchTerm ? "No matching team members found" : "No team members found"}
                  </p>
                ) : (
                  filteredTeamMembers.map((member) => (
                    <div key={member.id} className="border-b pb-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">{member.name}</h4>
                        <Badge variant="outline">{member.role}</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Task Completion</span>
                            <span className="text-sm font-medium">{Math.floor(Math.random() * 30) + 70}%</span>
                          </div>
                          <Progress value={Math.floor(Math.random() * 30) + 70} className="h-2" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">On-time Delivery</span>
                            <span className="text-sm font-medium">{Math.floor(Math.random() * 20) + 80}%</span>
                          </div>
                          <Progress value={Math.floor(Math.random() * 20) + 80} className="h-2" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Quality Score</span>
                            <span className="text-sm font-medium">{Math.floor(Math.random() * 15) + 85}%</span>
                          </div>
                          <Progress value={Math.floor(Math.random() * 15) + 85} className="h-2" />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Approval Requests</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApproveAllRequests}
                    disabled={requests.filter((r) => r.status === "pending").length === 0}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search requests..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                  <span className="sr-only">Filter</span>
                </Button>
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                  <span className="sr-only">Download</span>
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request Type</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {searchTerm ? "No matching requests found" : "No requests found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">{request.type}</TableCell>
                          <TableCell>{request.userName}</TableCell>
                          <TableCell>{request.description.substring(0, 50)}...</TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell>{formatDate(request.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            {request.status === "pending" ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-green-50 hover:bg-green-100"
                                  onClick={() => handleApproveRequest(request.id, request.userId)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-red-50 hover:bg-red-100"
                                  onClick={() => {
                                    setSelectedRequest(request)
                                    setIsRejectionDialogOpen(true)
                                  }}
                                >
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request)
                                  setIsRequestDetailDialogOpen(true)
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Department Reports</CardTitle>
                <Button onClick={() => setIsCreatingReport(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search reports..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                  <span className="sr-only">Filter</span>
                </Button>
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                  <span className="sr-only">Download</span>
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report Title</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {searchTerm ? "No matching reports found" : "No reports found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">{report.title}</TableCell>
                          <TableCell>{report.period}</TableCell>
                          <TableCell>{getStatusBadge(report.status)}</TableCell>
                          <TableCell>{formatDate(report.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            {report.status === "draft" && (
                              <>
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handlePublishReport(report.id)}>
                                  <FileText className="h-4 w-4 mr-1" />
                                  Publish
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteReport(report.id)}>
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Report Templates</CardTitle>
              <CardDescription>Pre-defined report templates for common scenarios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="hover:shadow-md transition-all hover:-translate-y-1">
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center">
                      <BarChart className="h-8 w-8 text-primary mb-2" />
                      <h4 className="font-medium">Performance Report</h4>
                      <p className="text-sm text-muted-foreground">Team performance metrics and KPIs</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => {
                          setNewReport({
                            title: "Team Performance Report",
                            period: `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`,
                            description: "Comprehensive analysis of team performance metrics and KPIs.",
                          })
                          setIsCreatingReport(true)
                        }}
                      >
                        Use Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-all hover:-translate-y-1">
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center">
                      <ClipboardList className="h-8 w-8 text-green-500 mb-2" />
                      <h4 className="font-medium">Resource Allocation</h4>
                      <p className="text-sm text-muted-foreground">Track resource usage and allocation</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => {
                          setNewReport({
                            title: "Resource Allocation Report",
                            period: `${new Date().toLocaleString("default", { month: "long" })} ${new Date().getFullYear()}`,
                            description: "Analysis of resource usage and allocation across the department.",
                          })
                          setIsCreatingReport(true)
                        }}
                      >
                        Use Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-all hover:-translate-y-1">
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center">
                      <UserCheck className="h-8 w-8 text-blue-500 mb-2" />
                      <h4 className="font-medium">Compliance Report</h4>
                      <p className="text-sm text-muted-foreground">Regulatory compliance tracking</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => {
                          setNewReport({
                            title: "Compliance Status Report",
                            period: `${new Date().getFullYear()}`,
                            description: "Status report on regulatory compliance and policy adherence.",
                          })
                          setIsCreatingReport(true)
                        }}
                      >
                        Use Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <div className="mt-6">
        <h4 className="text-xl font-semibold mb-4">Quick Actions</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionCard
            title="Manage Team"
            icon={<Users className="h-8 w-8 text-primary" />}
            href="#"
            onClick={() => setActiveTab("team")}
          />
          <ActionCard
            title="Approve Requests"
            icon={<ListTodo className="h-8 w-8 text-yellow-500" />}
            href="#"
            onClick={() => setActiveTab("requests")}
          />
          <ActionCard
            title="Generate Reports"
            icon={<ChartLine className="h-8 w-8 text-green-500" />}
            href="#"
            onClick={() => {
              setActiveTab("reports")
              setIsCreatingReport(true)
            }}
          />
          <ActionCard
            title="Schedule Meeting"
            icon={<Calendar className="h-8 w-8 text-blue-500" />}
            href="#"
            onClick={() => {
              toast({
                title: "Feature Coming Soon",
                description: "Meeting scheduler will be available in the next update.",
              })
            }}
          />
        </div>
      </div>

      {/* Rejection Dialog */}
      <Dialog open={isRejectionDialogOpen} onOpenChange={setIsRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request. This will be visible to the requester.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectionDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectRequest} disabled={!rejectionReason.trim()}>
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Detail Dialog */}
      <Dialog open={isRequestDetailDialogOpen} onOpenChange={setIsRequestDetailDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1 font-medium">Type:</div>
                <div className="col-span-3">{selectedRequest.type}</div>

                <div className="col-span-1 font-medium">From:</div>
                <div className="col-span-3">{selectedRequest.userName}</div>

                <div className="col-span-1 font-medium">Status:</div>
                <div className="col-span-3">{getStatusBadge(selectedRequest.status)}</div>

                <div className="col-span-1 font-medium">Date:</div>
                <div className="col-span-3">{formatDate(selectedRequest.createdAt)}</div>

                <div className="col-span-1 font-medium">Description:</div>
                <div className="col-span-3">{selectedRequest.description}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsRequestDetailDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Team Member Dialog */}
      <Dialog open={isAddTeamMemberDialogOpen} onOpenChange={setIsAddTeamMemberDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>Add a new team member to your department.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Enter full name"
                value={newTeamMember.name}
                onChange={(e) => setNewTeamMember({ ...newTeamMember, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={newTeamMember.email}
                onChange={(e) => setNewTeamMember({ ...newTeamMember, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newTeamMember.role}
                onChange={(e) => setNewTeamMember({ ...newTeamMember, role: e.target.value })}
              >
                <option value="employee">Employee</option>
                <option value="team-lead">Team Lead</option>
                <option value="specialist">Specialist</option>
                <option value="contractor">Contractor</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <select
                id="department"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newTeamMember.department}
                onChange={(e) => setNewTeamMember({ ...newTeamMember, department: e.target.value })}
              >
                <option value="General">General</option>
                <option value="Engineering">Engineering</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
                <option value="Support">Support</option>
                <option value="Finance">Finance</option>
                <option value="HR">HR</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTeamMemberDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTeamMember} disabled={!newTeamMember.name || !newTeamMember.email}>
              Add Team Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Report Dialog */}
      <Dialog open={isCreatingReport} onOpenChange={setIsCreatingReport}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Report</DialogTitle>
            <DialogDescription>Create a new report for your department.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="title">Report Title</Label>
              <Input
                id="title"
                placeholder="Enter report title"
                value={newReport.title}
                onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period">Reporting Period</Label>
              <Input
                id="period"
                placeholder="e.g., Q2 2023, January 2023, etc."
                value={newReport.period}
                onChange={(e) => setNewReport({ ...newReport, period: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter report description..."
                value={newReport.description}
                onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatingReport(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateReport} disabled={!newReport.title || !newReport.period}>
              Create Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function ActionCard({
  title,
  icon,
  href,
  onClick,
}: {
  title: string
  icon: React.ReactNode
  href: string
  onClick?: () => void
}) {
  return (
    <a
      href={href}
      className="block"
      onClick={(e) => {
        if (onClick) {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <Card className="hover:shadow-md transition-all hover:-translate-y-1 border border-gray-100">
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="mb-3">{icon}</div>
          <h5 className="font-semibold">{title}</h5>
        </CardContent>
      </Card>
    </a>
  )
}
