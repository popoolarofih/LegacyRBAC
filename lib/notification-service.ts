import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface Notification {
  id: string
  title: string
  message: string
  timestamp: Date
  read: boolean
  type: "info" | "warning" | "success" | "error"
  userId: string
}

export async function createNotification(
  notification: Omit<Notification, "id" | "timestamp" | "read">,
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "notifications"), {
      ...notification,
      timestamp: serverTimestamp(),
      read: false,
    })
    return docRef.id
  } catch (error) {
    console.error("Error creating notification:", error)
    throw error
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    const notificationRef = doc(db, "notifications", id)
    await updateDoc(notificationRef, {
      read: true,
      readAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error marking notification as read:", error)
    throw error
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("read", "==", false),
    )
    const snapshot = await getDocs(notificationsQuery)

    const batch = db.batch()
    snapshot.forEach((doc) => {
      batch.update(doc.ref, {
        read: true,
        readAt: serverTimestamp(),
      })
    })

    await batch.commit()
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    throw error
  }
}

export async function getUserNotifications(userId: string, count = 5): Promise<Notification[]> {
  try {
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("timestamp", "desc"),
      limit(count),
    )
    const snapshot = await getDocs(notificationsQuery)

    const notifications: Notification[] = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      notifications.push({
        id: doc.id,
        title: data.title,
        message: data.message,
        timestamp: data.timestamp?.toDate(),
        read: data.read,
        type: data.type,
        userId: data.userId,
      })
    })

    return notifications
  } catch (error) {
    console.error("Error fetching user notifications:", error)
    throw error
  }
}

export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  try {
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("read", "==", false),
    )
    const snapshot = await getDocs(notificationsQuery)
    return snapshot.size
  } catch (error) {
    console.error("Error fetching unread notifications count:", error)
    throw error
  }
}
