import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { addAuditLog } from "@/lib/audit-service"

export interface Request {
  id: string
  userId: string
  userName: string
  managerId: string
  type: string
  status: "pending" | "approved" | "rejected"
  createdAt: Date
  description: string
  approvedAt?: Date
  rejectedAt?: Date
  approvedBy?: string
  rejectedBy?: string
  comments?: string
}

// Get requests by manager ID
export async function getRequestsByManager(managerId: string): Promise<Request[]> {
  try {
    const requestsQuery = query(
      collection(db, "requests"),
      where("managerId", "==", managerId),
      orderBy("createdAt", "desc"),
    )
    const requestsSnapshot = await getDocs(requestsQuery)

    const requests: Request[] = []
    requestsSnapshot.forEach((doc) => {
      const data = doc.data()
      requests.push({
        id: doc.id,
        userId: data.userId || "",
        userName: data.userName || "Unknown User",
        managerId: data.managerId || "",
        type: data.type || "General Request",
        status: data.status || "pending",
        createdAt: data.createdAt?.toDate() || new Date(),
        description: data.description || "",
        approvedAt: data.approvedAt?.toDate(),
        rejectedAt: data.rejectedAt?.toDate(),
        approvedBy: data.approvedBy,
        rejectedBy: data.rejectedBy,
        comments: data.comments,
      })
    })

    return requests
  } catch (error) {
    console.error("Error fetching requests:", error)
    throw error
  }
}

// Get requests by user ID
export async function getRequestsByUser(userId: string): Promise<Request[]> {
  try {
    const requestsQuery = query(collection(db, "requests"), where("userId", "==", userId), orderBy("createdAt", "desc"))
    const requestsSnapshot = await getDocs(requestsQuery)

    const requests: Request[] = []
    requestsSnapshot.forEach((doc) => {
      const data = doc.data()
      requests.push({
        id: doc.id,
        userId: data.userId || "",
        userName: data.userName || "Unknown User",
        managerId: data.managerId || "",
        type: data.type || "General Request",
        status: data.status || "pending",
        createdAt: data.createdAt?.toDate() || new Date(),
        description: data.description || "",
        approvedAt: data.approvedAt?.toDate(),
        rejectedAt: data.rejectedAt?.toDate(),
        approvedBy: data.approvedBy,
        rejectedBy: data.rejectedBy,
        comments: data.comments,
      })
    })

    return requests
  } catch (error) {
    console.error("Error fetching requests:", error)
    throw error
  }
}

// Create a new request
export async function createRequest(request: Omit<Request, "id" | "createdAt">): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "requests"), {
      ...request,
      createdAt: serverTimestamp(),
      status: "pending",
    })

    // Log the action
    await addAuditLog({
      user: request.userName,
      action: "Create Request",
      module: "Requests",
      details: `Created a new ${request.type} request`,
    })

    return docRef.id
  } catch (error) {
    console.error("Error creating request:", error)
    throw error
  }
}

// Approve a request
export async function approveRequest(id: string, approverEmail: string, comments?: string): Promise<void> {
  try {
    const requestRef = doc(db, "requests", id)

    // Get current data for audit log
    const requestDoc = await getDoc(requestRef)
    const currentData = requestDoc.data()

    // Update the document
    await updateDoc(requestRef, {
      status: "approved",
      approvedAt: serverTimestamp(),
      approvedBy: approverEmail,
      comments: comments || "",
    })

    // Log the action
    await addAuditLog({
      user: approverEmail,
      action: "Approve Request",
      module: "Requests",
      details: `Approved ${currentData?.type || "unknown"} request from ${currentData?.userName || "unknown user"}`,
    })
  } catch (error) {
    console.error("Error approving request:", error)
    throw error
  }
}

// Reject a request
export async function rejectRequest(id: string, rejectorEmail: string, comments?: string): Promise<void> {
  try {
    const requestRef = doc(db, "requests", id)

    // Get current data for audit log
    const requestDoc = await getDoc(requestRef)
    const currentData = requestDoc.data()

    // Update the document
    await updateDoc(requestRef, {
      status: "rejected",
      rejectedAt: serverTimestamp(),
      rejectedBy: rejectorEmail,
      comments: comments || "",
    })

    // Log the action
    await addAuditLog({
      user: rejectorEmail,
      action: "Reject Request",
      module: "Requests",
      details: `Rejected ${currentData?.type || "unknown"} request from ${currentData?.userName || "unknown user"}`,
    })
  } catch (error) {
    console.error("Error rejecting request:", error)
    throw error
  }
}

// Get request by ID
export async function getRequestById(id: string): Promise<Request | null> {
  try {
    const requestDoc = await getDoc(doc(db, "requests", id))

    if (requestDoc.exists()) {
      const data = requestDoc.data()
      return {
        id: requestDoc.id,
        userId: data.userId || "",
        userName: data.userName || "Unknown User",
        managerId: data.managerId || "",
        type: data.type || "General Request",
        status: data.status || "pending",
        createdAt: data.createdAt?.toDate() || new Date(),
        description: data.description || "",
        approvedAt: data.approvedAt?.toDate(),
        rejectedAt: data.rejectedAt?.toDate(),
        approvedBy: data.approvedBy,
        rejectedBy: data.rejectedBy,
        comments: data.comments,
      }
    }

    return null
  } catch (error) {
    console.error("Error fetching request:", error)
    throw error
  }
}
