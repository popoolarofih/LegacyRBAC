import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface Task {
  id: string
  title: string
  description: string
  status: "pending" | "in_progress" | "completed" | "overdue"
  dueDate: Date
  priority: "low" | "medium" | "high"
  assignedTo: string
  createdBy: string
  createdAt: Date
}

export async function createTask(task: Omit<Task, "id" | "createdAt">): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "tasks"), {
      ...task,
      createdAt: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error("Error creating task:", error)
    throw error
  }
}

export async function updateTask(id: string, data: Partial<Task>): Promise<void> {
  try {
    const taskRef = doc(db, "tasks", id)
    await updateDoc(taskRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error updating task:", error)
    throw error
  }
}

export async function deleteTask(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "tasks", id))
  } catch (error) {
    console.error("Error deleting task:", error)
    throw error
  }
}

export async function getUserTasks(userId: string): Promise<Task[]> {
  try {
    const tasksQuery = query(collection(db, "tasks"), where("assignedTo", "==", userId), orderBy("dueDate"))
    const snapshot = await getDocs(tasksQuery)

    const tasks: Task[] = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      tasks.push({
        id: doc.id,
        title: data.title,
        description: data.description,
        status: data.status,
        dueDate: data.dueDate?.toDate(),
        priority: data.priority,
        assignedTo: data.assignedTo,
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate(),
      })
    })

    return tasks
  } catch (error) {
    console.error("Error fetching user tasks:", error)
    throw error
  }
}

export async function markTaskComplete(id: string): Promise<void> {
  try {
    const taskRef = doc(db, "tasks", id)
    await updateDoc(taskRef, {
      status: "completed",
      completedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error marking task as complete:", error)
    throw error
  }
}
