import { doc, updateDoc, collection, query, where, getDocs, writeBatch, addDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function markNotificationAsRead(notificationId: string) {
  try {
    const notificationRef = doc(db, "notifications", notificationId)
    await updateDoc(notificationRef, {
      read: true,
    })
    return { success: true }
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return { success: false, error }
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  try {
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
    console.error("Error marking all notifications as read:", error)
    return { success: false, error }
  }
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: "info" | "warning" | "success" | "error" = "info",
) {
  try {
    const notificationsRef = collection(db, "notifications")
    await addDoc(notificationsRef, {
      userId,
      title,
      message,
      timestamp: Timestamp.now(),
      read: false,
      type,
    })
    return { success: true }
  } catch (error) {
    console.error("Error creating notification:", error)
    return { success: false, error }
  }
}
