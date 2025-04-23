import { doc, updateDoc, collection, query, where, getDocs, writeBatch, addDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { logAuditEvent } from "@/lib/audit-service"

export async function approveRequest(requestId: string, managerId: string, managerName: string, userId: string) {
  try {
    const requestRef = doc(db, "requests", requestId)

    // Update the request status
    await updateDoc(requestRef, {
      status: "approved",
      approvedBy: managerId,
      approvedByName: managerName,
      approvedAt: Timestamp.now(),
    })

    // Create a notification for the user
    const notificationsRef = collection(db, "notifications")
    await addDoc(notificationsRef, {
      userId: userId,
      title: "Request Approved",
      message: "Your request has been approved by your manager.",
      timestamp: Timestamp.now(),
      read: false,
      type: "success",
    })

    // Log the audit event
    await logAuditEvent({
      action: "request_approved",
      userId: managerId,
      targetId: requestId,
      details: `Request ${requestId} approved by manager ${managerId}`,
      timestamp: new Date(),
    })

    return { success: true }
  } catch (error) {
    console.error("Error approving request:", error)
    return { success: false, error }
  }
}

export async function rejectRequest(
  requestId: string,
  managerId: string,
  managerName: string,
  userId: string,
  reason = "No reason provided",
) {
  try {
    const requestRef = doc(db, "requests", requestId)

    // Update the request status
    await updateDoc(requestRef, {
      status: "rejected",
      rejectedBy: managerId,
      rejectedByName: managerName,
      rejectedAt: Timestamp.now(),
      rejectionReason: reason,
    })

    // Create a notification for the user
    const notificationsRef = collection(db, "notifications")
    await addDoc(notificationsRef, {
      userId: userId,
      title: "Request Rejected",
      message: `Your request has been rejected. Reason: ${reason}`,
      timestamp: Timestamp.now(),
      read: false,
      type: "error",
    })

    // Log the audit event
    await logAuditEvent({
      action: "request_rejected",
      userId: managerId,
      targetId: requestId,
      details: `Request ${requestId} rejected by manager ${managerId}. Reason: ${reason}`,
      timestamp: new Date(),
    })

    return { success: true }
  } catch (error) {
    console.error("Error rejecting request:", error)
    return { success: false, error }
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  try {
    // Get all unread notifications for the user
    const batch = writeBatch(db)
    const notificationsRef = collection(db, "notifications")
    const q = query(notificationsRef, where("userId", "==", userId), where("read", "==", false))
    const querySnapshot = await getDocs(q)

    querySnapshot.forEach((doc) => {
      batch.update(doc.ref, { read: true })
    })

    await batch.commit()

    return { success: true, count: querySnapshot.size }
  } catch (error) {
    console.error("Error marking notifications as read:", error)
    return { success: false, error }
  }
}
