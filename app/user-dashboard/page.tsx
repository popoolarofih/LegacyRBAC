"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/context/auth-context"
import DashboardLayout from "@/components/dashboard-layout"
import {
  CheckCircle,
  Clock,
  ListTodo,
  User,
  Calendar,
  FileText,
  Bell,
  Users,
  BarChart,
  ChevronRight,
  AlertCircle,
  Plus,
  Search,
  Download,
  Upload,
  Trash2,
  Eye,
} from "lucide-react"
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  Timestamp,
  writeBatch,
  getDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { logAuditEvent } from "@/lib/audit-service"

// Define interfaces for our data types
interface Task {
  id: string
  title: string
  description: string
  status: "pending" | "in_progress" | "completed" | "overdue"
  dueDate: Date
  priority: "low" | "medium" | "high"
}

interface Notification {
  id: string
  title: string
  message: string
  timestamp: Date
  read: boolean
  type: "info" | "warning" | "success" | "error"
}

interface Document {
  id: string
  title: string
  type: string
  lastModified: Date
  size: string
}

interface Event {
  id: string
  title: string
  date: Date
  type: string
  location?: string
}

interface Request {
  id: string
  type: string
  description: string
  status: "pending" | "approved" | "rejected"
  createdAt: Date
  response?: string
}

export default function UserDashboard() {
  const router = useRouter()
  const { user, loading, authStatus } = useAuth()
  const { toast } = useToast()
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
  })
  const [tasks, setTasks] = useState<Task[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [searchTerm, setSearchTerm] = useState("")
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false)
  const [isDocumentUploadDialogOpen, setIsDocumentUploadDialogOpen] = useState(false)
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: new Date().toISOString().split("T")[0],
  })
  const [newEvent, setNewEvent] = useState({
    title: "",
    type: "Meeting",
    date: new Date().toISOString().split("T")[0],
    location: "",
  })
  const [newRequest, setNewRequest] = useState({
    type: "Access Request",
    description: "",
  })
  const [newDocument, setNewDocument] = useState({
    title: "",
    type: "Document",
  })
  const [hasInitialized, setHasInitialized] = useState(false)
  const [redirectAttempted, setRedirectAttempted] = useState(false)

  useEffect(() => {
    // This effect handles authentication and redirection
    if (!loading) {
      console.log("User dashboard: Auth state loaded", { user, role: user?.role, authStatus })

      // If authentication is complete and user is not authenticated, redirect to auth
      if (authStatus === "unauthenticated") {
        console.log("User dashboard: No user found, redirecting to auth")
        router.push("/auth")
        return
      }

      // If authentication is complete and user is authenticated
      if (authStatus === "authenticated" && user) {
        // Check if user has the correct role
        if (user.role !== "employee") {
          console.log("User dashboard: User is not an employee, redirecting based on role", user.role)

          if (!redirectAttempted) {
            setRedirectAttempted(true)

            // Add a small delay to ensure state is stable before redirect
            const redirectTimer = setTimeout(() => {
              if (user.role === "admin") {
                router.push("/dashboard")
              } else if (user.role === "manager") {
                router.push("/manager-dashboard")
              } else {
                // If role is unknown, redirect to auth
                router.push("/auth")
              }
            }, 100)

            return () => clearTimeout(redirectTimer)
          }
          return
        }

        // If we get here, user is an employee and we should load their data
        if (!hasInitialized && user.uid) {
          console.log("User dashboard: Initializing dashboard for employee", user.uid)
          setHasInitialized(true)
          fetchUserData(user.uid)
        }
      }
    }
  }, [user, loading, authStatus, router, hasInitialized, redirectAttempted])

  const fetchUserData = async (userId: string) => {
    console.log("Fetching user data for:", userId)
    setIsLoading(true)
    try {
      // Fetch tasks
      await fetchTasks(userId)

      // Fetch notifications
      await fetchNotifications(userId)

      // Fetch documents
      await fetchDocuments(userId)

      // Fetch events
      await fetchEvents(userId)

      // Fetch requests
      await fetchRequests(userId)

      console.log("All user data fetched successfully")
    } catch (error) {
      console.error("Error fetching user data:", error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTasks = async (userId: string) => {
    try {
      // Get all tasks
      const tasksQuery = query(collection(db, "tasks"), where("assignedTo", "==", userId), orderBy("dueDate"))
      const tasksSnapshot = await getDocs(tasksQuery)

      const tasksList: Task[] = []
      let completed = 0
      let pending = 0
      let overdue = 0

      tasksSnapshot.forEach((doc) => {
        const data = doc.data()
        const task: Task = {
          id: doc.id,
          title: data.title || "",
          description: data.description || "",
          status: data.status || "pending",
          dueDate: data.dueDate?.toDate() || new Date(),
          priority: data.priority || "medium",
        }

        // Count by status
        if (task.status === "completed") {
          completed++
        } else if (task.status === "overdue") {
          overdue++
        } else {
          pending++
        }

        tasksList.push(task)
      })

      setTasks(tasksList)
      setStats({
        totalTasks: tasksList.length,
        completedTasks: completed,
        pendingTasks: pending,
        overdueTasks: overdue,
      })
    } catch (error) {
      console.error("Error fetching tasks:", error)
      throw error
    }
  }

  const fetchNotifications = async (userId: string) => {
    try {
      const notificationsQuery = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        orderBy("timestamp", "desc"),
        limit(5),
      )
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

      setNotifications(notificationsList)
    } catch (error) {
      console.error("Error fetching notifications:", error)
      throw error
    }
  }

  const fetchDocuments = async (userId: string) => {
    try {
      const documentsQuery = query(
        collection(db, "documents"),
        where("userId", "==", userId),
        orderBy("lastModified", "desc"),
        limit(5),
      )
      const documentsSnapshot = await getDocs(documentsQuery)

      const documentsList: Document[] = []
      documentsSnapshot.forEach((doc) => {
        const data = doc.data()
        documentsList.push({
          id: doc.id,
          title: data.title || "",
          type: data.type || "",
          lastModified: data.lastModified?.toDate() || new Date(),
          size: data.size || "0 KB",
        })
      })

      setDocuments(documentsList)
    } catch (error) {
      console.error("Error fetching documents:", error)
      throw error
    }
  }

  const fetchEvents = async (userId: string) => {
    try {
      // Get current date at midnight
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const eventsQuery = query(
        collection(db, "events"),
        where("userId", "==", userId),
        where("date", ">=", today),
        orderBy("date"),
        limit(5),
      )
      const eventsSnapshot = await getDocs(eventsQuery)

      const eventsList: Event[] = []
      eventsSnapshot.forEach((doc) => {
        const data = doc.data()
        eventsList.push({
          id: doc.id,
          title: data.title || "",
          date: data.date?.toDate() || new Date(),
          type: data.type || "",
          location: data.location,
        })
      })

      setEvents(eventsList)
    } catch (error) {
      console.error("Error fetching events:", error)
      throw error
    }
  }

  const fetchRequests = async (userId: string) => {
    try {
      const requestsQuery = query(
        collection(db, "requests"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
      )
      const requestsSnapshot = await getDocs(requestsQuery)

      const requestsList: Request[] = []
      requestsSnapshot.forEach((doc) => {
        const data = doc.data()
        requestsList.push({
          id: doc.id,
          type: data.type || "",
          description: data.description || "",
          status: data.status || "pending",
          createdAt: data.createdAt?.toDate() || new Date(),
          response: data.response,
        })
      })

      setRequests(requestsList)
    } catch (error) {
      console.error("Error fetching requests:", error)
      throw error
    }
  }

  const handleCreateTask = async () => {
    if (!user) return

    try {
      setIsLoading(true)

      // Validate inputs
      if (!newTask.title || !newTask.dueDate) {
        toast({
          title: "Missing Information",
          description: "Please provide title and due date for the new task.",
          variant: "destructive",
        })
        return
      }

      // Add new task to Firestore
      const tasksRef = collection(db, "tasks")
      await addDoc(tasksRef, {
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        dueDate: Timestamp.fromDate(new Date(newTask.dueDate)),
        status: "pending",
        assignedTo: user.uid,
        createdAt: Timestamp.now(),
      })

      toast({
        title: "Task Created",
        description: "New task has been created successfully.",
      })

      // Log audit event
      await logAuditEvent({
        action: "task_created",
        userId: user.uid,
        targetId: newTask.title,
        details: `New task "${newTask.title}" created by user ${user.uid}`,
        timestamp: new Date(),
      })

      // Refresh tasks data
      await fetchTasks(user.uid)

      // Reset form and close dialog
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        dueDate: new Date().toISOString().split("T")[0],
      })
      setIsTaskDialogOpen(false)
    } catch (error) {
      console.error("Error creating task:", error)
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateEvent = async () => {
    if (!user) return

    try {
      setIsLoading(true)

      // Validate inputs
      if (!newEvent.title || !newEvent.date) {
        toast({
          title: "Missing Information",
          description: "Please provide title and date for the new event.",
          variant: "destructive",
        })
        return
      }

      // Add new event to Firestore
      const eventsRef = collection(db, "events")
      await addDoc(eventsRef, {
        title: newEvent.title,
        type: newEvent.type,
        date: Timestamp.fromDate(new Date(newEvent.date)),
        location: newEvent.location,
        userId: user.uid,
        createdAt: Timestamp.now(),
      })

      toast({
        title: "Event Created",
        description: "New event has been created successfully.",
      })

      // Refresh events data
      await fetchEvents(user.uid)

      // Reset form and close dialog
      setNewEvent({
        title: "",
        type: "Meeting",
        date: new Date().toISOString().split("T")[0],
        location: "",
      })
      setIsEventDialogOpen(false)
    } catch (error) {
      console.error("Error creating event:", error)
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateRequest = async () => {
    if (!user) return

    try {
      setIsLoading(true)

      // Validate inputs
      if (!newRequest.description) {
        toast({
          title: "Missing Information",
          description: "Please provide a description for your request.",
          variant: "destructive",
        })
        return
      }

      // Get manager ID (assuming user has managerId field)
      const userDoc = await doc(db, "users", user.uid)
      const userSnapshot = await getDoc(userDoc)
      const managerId = userSnapshot.data()?.managerId || "admin" // Default to admin if no manager

      // Add new request to Firestore
      const requestsRef = collection(db, "requests")
      await addDoc(requestsRef, {
        type: newRequest.type,
        description: newRequest.description,
        status: "pending",
        userId: user.uid,
        userName: user.displayName || user.email || "Employee",
        managerId: managerId,
        createdAt: Timestamp.now(),
      })

      toast({
        title: "Request Submitted",
        description: "Your request has been submitted successfully.",
      })

      // Refresh requests data
      await fetchRequests(user.uid)

      // Reset form and close dialog
      setNewRequest({
        type: "Access Request",
        description: "",
      })
      setIsRequestDialogOpen(false)
    } catch (error) {
      console.error("Error creating request:", error)
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUploadDocument = async () => {
    if (!user) return

    try {
      setIsLoading(true)

      // Validate inputs
      if (!newDocument.title) {
        toast({
          title: "Missing Information",
          description: "Please provide a title for your document.",
          variant: "destructive",
        })
        return
      }

      // In a real app, you would handle file upload to storage here
      // For now, we'll just create a document record

      // Add new document to Firestore
      const documentsRef = collection(db, "documents")
      await addDoc(documentsRef, {
        title: newDocument.title,
        type: newDocument.type,
        userId: user.uid,
        lastModified: Timestamp.now(),
        size: "10 KB", // Mock size
        createdAt: Timestamp.now(),
      })

      toast({
        title: "Document Uploaded",
        description: "Your document has been uploaded successfully.",
      })

      // Refresh documents data
      await fetchDocuments(user.uid)

      // Reset form and close dialog
      setNewDocument({
        title: "",
        type: "Document",
      })
      setIsDocumentUploadDialogOpen(false)
    } catch (error) {
      console.error("Error uploading document:", error)
      toast({
        title: "Error",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    if (!user) return

    try {
      setIsLoading(true)

      // Update task status in Firestore
      const taskRef = doc(db, "tasks", taskId)
      await updateDoc(taskRef, {
        status: "completed",
        completedAt: Timestamp.now(),
      })

      toast({
        title: "Task Completed",
        description: "The task has been marked as completed.",
      })

      // Refresh tasks data
      await fetchTasks(user.uid)
    } catch (error) {
      console.error("Error completing task:", error)
      toast({
        title: "Error",
        description: "Failed to complete task. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!user) return

    try {
      setIsLoading(true)

      // Delete document from Firestore
      const documentRef = doc(db, "documents", documentId)
      await deleteDoc(documentRef)

      toast({
        title: "Document Deleted",
        description: "The document has been deleted successfully.",
      })

      // Refresh documents data
      await fetchDocuments(user.uid)
    } catch (error) {
      console.error("Error deleting document:", error)
      toast({
        title: "Error",
        description: "Failed to delete document. Please try again.",
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

      // Update all notifications for this user
      const batch = writeBatch(db)

      notifications.forEach((notification) => {
        if (!notification.read) {
          const notificationRef = doc(db, "notifications", notification.id)
          batch.update(notificationRef, { read: true })
        }
      })

      await batch.commit()

      // Update local state
      setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))

      toast({
        title: "Notifications Marked as Read",
        description: "All notifications have been marked as read.",
      })
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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>
      case "in_progress":
        return <Badge className="bg-blue-500">In Progress</Badge>
      case "overdue":
        return <Badge className="bg-red-500">Overdue</Badge>
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>
      case "rejected":
        return <Badge className="bg-red-500">Rejected</Badge>
      default:
        return <Badge className="bg-yellow-500">Pending</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge className="bg-red-500">High</Badge>
      case "medium":
        return <Badge className="bg-yellow-500">Medium</Badge>
      default:
        return <Badge className="bg-blue-500">Low</Badge>
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

  const filteredTasks = tasks.filter(
    (task) =>
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.type.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredEvents = events.filter(
    (event) =>
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.location && event.location.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  // Show a loading screen while authentication is being checked
  if (loading || authStatus === "initializing") {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium">Loading authentication state...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If no user is found, show a message and redirect
  if (!user) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium">You need to be logged in. Redirecting to login page...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If user has wrong role, show a message and redirect
  if (user.role !== "employee") {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium">Redirecting to the appropriate dashboard for your role...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading state while fetching data
  if (isLoading) {
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-xl font-semibold mr-4">
              {user?.displayName?.substring(0, 2).toUpperCase() || user?.email?.substring(0, 2).toUpperCase() || "EM"}
            </div>
            <div>
              <h2 className="text-2xl font-bold">Welcome, {user?.displayName || user?.email || "Employee"}</h2>
              <div className="flex gap-2">
                <span className="bg-primary text-white text-xs px-2 py-1 rounded">Employee</span>
                <span className="bg-blue-400 text-white text-xs px-2 py-1 rounded">View</span>
              </div>
            </div>
          </div>
          <div>
            <Button variant="outline" onClick={() => setIsRequestDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard Tabs */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid grid-cols-5 w-full md:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Overview Tab */}
      <TabsContent value="overview" className="space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Tasks" value={stats.totalTasks} icon={<ListTodo className="h-6 w-6 text-primary" />} />
          <StatCard
            title="Completed Tasks"
            value={stats.completedTasks}
            icon={<CheckCircle className="h-6 w-6 text-green-500" />}
          />
          <StatCard
            title="Pending Tasks"
            value={stats.pendingTasks}
            icon={<Clock className="h-6 w-6 text-yellow-500" />}
          />
          <StatCard
            title="Overdue Tasks"
            value={stats.overdueTasks}
            icon={<AlertCircle className="h-6 w-6 text-red-500" />}
          />
        </div>

        {/* Recent Tasks and Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Tasks */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle>Recent Tasks</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("tasks")}>
                  View All <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No tasks found</p>
              ) : (
                <div className="space-y-4">
                  {tasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="flex items-start justify-between border-b pb-3">
                      <div>
                        <h4 className="font-medium">{task.title}</h4>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                        <div className="flex gap-2 mt-1">
                          {getStatusBadge(task.status)}
                          {getPriorityBadge(task.priority)}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">Due: {formatDate(task.dueDate)}</div>
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
                    <div key={notification.id} className="flex gap-3 border-b pb-3">
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

        {/* Upcoming Events and Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Events */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle>Upcoming Events</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("calendar")}>
                  View Calendar <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No upcoming events</p>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => (
                    <div key={event.id} className="flex items-start justify-between border-b pb-3">
                      <div>
                        <h4 className="font-medium">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">{event.type}</p>
                        {event.location && <p className="text-xs text-muted-foreground">Location: {event.location}</p>}
                      </div>
                      <div className="text-sm font-medium">{formatDate(event.date)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Your current performance indicators</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Task Completion Rate</span>
                  <span className="text-sm font-medium">
                    {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
                  </span>
                </div>
                <Progress
                  value={stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0}
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">On-time Delivery</span>
                  <span className="text-sm font-medium">
                    {stats.totalTasks > 0
                      ? Math.round(((stats.totalTasks - stats.overdueTasks) / stats.totalTasks) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <Progress
                  value={stats.totalTasks > 0 ? ((stats.totalTasks - stats.overdueTasks) / stats.totalTasks) * 100 : 0}
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Team Collaboration</span>
                  <span className="text-sm font-medium">85%</span>
                </div>
                <Progress value={85} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Tasks Tab */}
      <TabsContent value="tasks" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>My Tasks</CardTitle>
              <div className="flex gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button onClick={() => setIsTaskDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Task
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredTasks.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {searchTerm ? "No matching tasks found" : "No tasks found"}
              </p>
            ) : (
              <div className="space-y-4">
                {filteredTasks.map((task) => (
                  <div key={task.id} className="flex items-start justify-between border-b pb-4">
                    <div className="space-y-1">
                      <h4 className="font-medium">{task.title}</h4>
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                      <div className="flex gap-2 mt-2">
                        {getStatusBadge(task.status)}
                        {getPriorityBadge(task.priority)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">Due: {formatDate(task.dueDate)}</div>
                      <div className="flex gap-2 mt-2">
                        {task.status !== "completed" && (
                          <Button variant="outline" size="sm" onClick={() => handleCompleteTask(task.id)}>
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Complete
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <Eye className="mr-1 h-4 w-4" />
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Calendar Tab */}
      <TabsContent value="calendar" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Calendar</CardTitle>
              <div className="flex gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search events..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button onClick={() => setIsEventDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Event
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Calendar className="h-16 w-16 mx-auto text-primary mb-4" />
              <h3 className="text-lg font-medium">Calendar View Coming Soon</h3>
              <p className="text-muted-foreground">
                We're working on a full calendar view for your events and deadlines.
              </p>
            </div>

            <div className="mt-6">
              <h4 className="font-medium mb-4">Upcoming Events</h4>
              {filteredEvents.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  {searchTerm ? "No matching events found" : "No upcoming events"}
                </p>
              ) : (
                <div className="space-y-4">
                  {filteredEvents.map((event) => (
                    <div key={event.id} className="flex items-start justify-between border-b pb-4">
                      <div>
                        <h4 className="font-medium">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">{event.type}</p>
                        {event.location && <p className="text-xs text-muted-foreground">Location: {event.location}</p>}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatDate(event.date)}</div>
                        <Button variant="outline" size="sm" className="mt-2">
                          <Eye className="mr-1 h-4 w-4" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Documents Tab */}
      <TabsContent value="documents" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>My Documents</CardTitle>
              <div className="flex gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button onClick={() => setIsDocumentUploadDialogOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredDocuments.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {searchTerm ? "No matching documents found" : "No documents found"}
              </p>
            ) : (
              <div className="space-y-4">
                {filteredDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center">
                      <FileText className="h-8 w-8 text-primary mr-3" />
                      <div>
                        <h4 className="font-medium">{doc.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {doc.type} • {doc.size}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground mb-2">Modified: {formatDate(doc.lastModified)}</div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="mr-1 h-4 w-4" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="mr-1 h-4 w-4" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteDocument(doc.id)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Requests Tab */}
      <TabsContent value="requests" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>My Requests</CardTitle>
              <Button onClick={() => setIsRequestDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Request
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No requests found</p>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div key={request.id} className="flex items-start justify-between border-b pb-4">
                    <div className="space-y-1">
                      <h4 className="font-medium">{request.type}</h4>
                      <p className="text-sm text-muted-foreground">{request.description}</p>
                      <div className="flex gap-2 mt-2">{getStatusBadge(request.status)}</div>
                      {request.response && (
                        <div className="mt-2 p-2 bg-gray-50 rounded-md">
                          <p className="text-sm font-medium">Response:</p>
                          <p className="text-sm text-muted-foreground">{request.response}</p>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">Submitted: {formatDate(request.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Quick Actions */}
      <div className="mt-6">
        <h4 className="text-xl font-semibold mb-4">Quick Actions</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionCard title="My Profile" icon={<User className="h-8 w-8 text-primary" />} href="/my-profile" />
          <ActionCard
            title="My Tasks"
            icon={<ListTodo className="h-8 w-8 text-green-500" />}
            href="#"
            onClick={() => setActiveTab("tasks")}
          />
          <ActionCard
            title="Team Directory"
            icon={<Users className="h-8 w-8 text-blue-500" />}
            href="/team-directory"
          />
          <ActionCard title="Performance" icon={<BarChart className="h-8 w-8 text-purple-500" />} href="/performance" />
        </div>
      </div>

      {/* Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>Add a new task to your list. Click save when you're done.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="priority" className="text-right">
                Priority
              </Label>
              <select
                id="priority"
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-right">
                Due Date
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTask}>Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Dialog */}
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Event</DialogTitle>
            <DialogDescription>Create a new event in your calendar. Click save when you're done.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="eventTitle" className="text-right">
                Title
              </Label>
              <Input
                id="eventTitle"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="eventType" className="text-right">
                Type
              </Label>
              <select
                id="eventType"
                value={newEvent.type}
                onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="Meeting">Meeting</option>
                <option value="Deadline">Deadline</option>
                <option value="Training">Training</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="eventDate" className="text-right">
                Date
              </Label>
              <Input
                id="eventDate"
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="eventLocation" className="text-right">
                Location
              </Label>
              <Input
                id="eventLocation"
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEventDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateEvent}>Add Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Dialog */}
      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Submit New Request</DialogTitle>
            <DialogDescription>Submit a new request to your manager. Provide all necessary details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="requestType" className="text-right">
                Type
              </Label>
              <select
                id="requestType"
                value={newRequest.type}
                onChange={(e) => setNewRequest({ ...newRequest, type: e.target.value })}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="Access Request">Access Request</option>
                <option value="Time Off">Time Off</option>
                <option value="Equipment">Equipment</option>
                <option value="Training">Training</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="requestDescription" className="text-right">
                Description
              </Label>
              <Textarea
                id="requestDescription"
                value={newRequest.description}
                onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                className="col-span-3"
                placeholder="Please provide details about your request..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRequest}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Upload Dialog */}
      <Dialog open={isDocumentUploadDialogOpen} onOpenChange={setIsDocumentUploadDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Upload a new document to your workspace.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="documentTitle" className="text-right">
                Title
              </Label>
              <Input
                id="documentTitle"
                value={newDocument.title}
                onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="documentType" className="text-right">
                Type
              </Label>
              <select
                id="documentType"
                value={newDocument.type}
                onChange={(e) => setNewDocument({ ...newDocument, type: e.target.value })}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="Document">Document</option>
                <option value="Spreadsheet">Spreadsheet</option>
                <option value="Presentation">Presentation</option>
                <option value="PDF">PDF</option>
                <option value="Image">Image</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="documentFile" className="text-right">
                File
              </Label>
              <Input id="documentFile" type="file" className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDocumentUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadDocument}>Upload</Button>
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
  if (onClick) {
    return (
      <button onClick={onClick} className="w-full text-left">
        <Card className="hover:shadow-md transition-all hover:-translate-y-1 border border-gray-100">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <div className="mb-3">{icon}</div>
            <h5 className="font-semibold">{title}</h5>
          </CardContent>
        </Card>
      </button>
    )
  }

  return (
    <a href={href} className="block">
      <Card className="hover:shadow-md transition-all hover:-translate-y-1 border border-gray-100">
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="mb-3">{icon}</div>
          <h5 className="font-semibold">{title}</h5>
        </CardContent>
      </Card>
    </a>
  )
}
