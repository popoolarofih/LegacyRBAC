import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore"
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth"
import { db } from "@/lib/firebase"

export type UserRole = "admin" | "manager" | "employee"
export type UserStatus = "active" | "inactive" | "pending"

export interface UserData {
  id: string
  email: string
  role: UserRole
  status: UserStatus
  createdAt: Date
  lastLogin?: Date
}

// Get all users
export async function getAllUsers(): Promise<UserData[]> {
  try {
    const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"))
    const usersSnapshot = await getDocs(usersQuery)

    const usersData: UserData[] = []
    usersSnapshot.forEach((doc) => {
      const data = doc.data()
      usersData.push({
        id: doc.id,
        email: data.email || "",
        role: data.role || "employee",
        status: data.status || "active",
        createdAt: data.createdAt?.toDate() || new Date(),
        lastLogin: data.lastLogin?.toDate(),
      })
    })

    return usersData
  } catch (error) {
    console.error("Error fetching users:", error)
    throw error
  }
}

// Get users by role
export async function getUsersByRole(role: UserRole): Promise<UserData[]> {
  try {
    const usersQuery = query(collection(db, "users"), where("role", "==", role), orderBy("createdAt", "desc"))
    const usersSnapshot = await getDocs(usersQuery)

    const usersData: UserData[] = []
    usersSnapshot.forEach((doc) => {
      const data = doc.data()
      usersData.push({
        id: doc.id,
        email: data.email || "",
        role: data.role || "employee",
        status: data.status || "active",
        createdAt: data.createdAt?.toDate() || new Date(),
        lastLogin: data.lastLogin?.toDate(),
      })
    })

    return usersData
  } catch (error) {
    console.error(`Error fetching ${role} users:`, error)
    throw error
  }
}

// Get user by ID
export async function getUserById(userId: string): Promise<UserData | null> {
  try {
    const userDoc = await getDoc(doc(db, "users", userId))

    if (userDoc.exists()) {
      const data = userDoc.data()
      return {
        id: userDoc.id,
        email: data.email || "",
        role: data.role || "employee",
        status: data.status || "active",
        createdAt: data.createdAt?.toDate() || new Date(),
        lastLogin: data.lastLogin?.toDate(),
      }
    }

    return null
  } catch (error) {
    console.error("Error fetching user:", error)
    throw error
  }
}

// Create a new user
export async function createUser(email: string, password: string, role: UserRole, status: UserStatus): Promise<string> {
  try {
    const auth = getAuth()
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Add user to Firestore
    await setDoc(doc(db, "users", user.uid), {
      email,
      role,
      status,
      createdAt: serverTimestamp(),
    })

    return user.uid
  } catch (error) {
    console.error("Error creating user:", error)
    throw error
  }
}

// Update user
export async function updateUser(userId: string, data: { role?: UserRole; status?: UserStatus }): Promise<void> {
  try {
    const updateData: any = {
      ...data,
      updatedAt: serverTimestamp(),
    }

    await updateDoc(doc(db, "users", userId), updateData)
  } catch (error) {
    console.error("Error updating user:", error)
    throw error
  }
}

// Delete user
export async function deleteUserById(userId: string): Promise<void> {
  try {
    // Delete from Firestore
    await deleteDoc(doc(db, "users", userId))

    // Note: Deleting the actual Firebase Auth user requires admin SDK
    // or a Cloud Function. This is just deleting the Firestore document.
  } catch (error) {
    console.error("Error deleting user:", error)
    throw error
  }
}
