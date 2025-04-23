import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface AuditLogEntry {
  user: string
  action: string
  module: string
  details: string
}

export async function addAuditLog(entry: AuditLogEntry): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "auditLogs"), {
      ...entry,
      timestamp: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error("Error adding audit log:", error)
    throw error
  }
}

export async function addActivityLog(entry: AuditLogEntry): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "activities"), {
      ...entry,
      timestamp: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error("Error adding activity log:", error)
    throw error
  }
}

export async function logAuditEvent(entry: {
  action: string
  userId: string
  targetId: string
  details: string
  timestamp: Date
}): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "auditEvents"), {
      ...entry,
      timestamp: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error("Error adding audit event:", error)
    throw error
  }
}
