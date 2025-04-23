"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth"
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { addAuditLog } from "@/lib/audit-service"

// Define user type
type User = {
  uid: string
  email: string | null
  displayName?: string | null
  role: "admin" | "manager" | "employee"
}

// Define auth context type
type AuthContextType = {
  user: User | null
  loading: boolean
  authStatus: "initializing" | "authenticated" | "unauthenticated"
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, role: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authStatus: "initializing",
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
})

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext)

// Auth provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  // Add a new state variable to track authentication status
  const [authStatus, setAuthStatus] = useState<"initializing" | "authenticated" | "unauthenticated">("initializing")
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  // Listen for auth state changes
  useEffect(() => {
    console.log("Setting up auth state listener")
    let isMounted = true

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser?.uid)

      try {
        if (firebaseUser) {
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))

          if (isMounted) {
            if (userDoc.exists()) {
              const userData = userDoc.data()
              console.log("User data from Firestore:", userData)

              // Ensure role is set, default to employee if not present
              const userRole = userData.role || "employee"

              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || userData.name,
                role: userRole,
              })

              // Update last login timestamp
              await updateLastLogin(firebaseUser.uid)
            } else {
              // If user document doesn't exist, create a default one
              console.log("User document doesn't exist, creating default")
              const defaultUser = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                role: "employee",
              }
              setUser(defaultUser)

              // Save default user to Firestore
              await setDoc(doc(db, "users", firebaseUser.uid), {
                email: firebaseUser.email,
                name: firebaseUser.displayName || firebaseUser.email?.split("@")[0],
                role: "employee",
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
              })
            }

            // Set auth status to authenticated after user is set
            setAuthStatus("authenticated")
          }
        } else {
          console.log("No firebase user, setting user to null")
          if (isMounted) {
            setUser(null)
            setAuthStatus("unauthenticated")
          }
        }
      } catch (error) {
        console.error("Error setting user data:", error)
        // Even if there's an error, set a basic user object to prevent login loops
        if (firebaseUser && isMounted) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            role: "employee",
          })
          setAuthStatus("authenticated")
        } else if (isMounted) {
          setUser(null)
          setAuthStatus("unauthenticated")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    })

    // Cleanup subscription and prevent state updates if component unmounted
    return () => {
      console.log("Cleaning up auth state listener")
      isMounted = false
      unsubscribe()
    }
  }, [])

  // Update last login timestamp
  const updateLastLogin = async (userId: string) => {
    try {
      await setDoc(
        doc(db, "users", userId),
        {
          lastLogin: serverTimestamp(),
        },
        { merge: true },
      )
    } catch (error) {
      console.error("Error updating last login:", error)
    }
  }

  // Sign in function
  const signIn = async (email: string, password: string) => {
    if (isRedirecting) {
      console.log("Already redirecting, ignoring sign in request")
      return
    }

    try {
      setIsRedirecting(true)
      console.log("Signing in with email:", email)

      // Set loading state to true during sign in
      setLoading(true)

      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user
      console.log("Sign in successful for user:", firebaseUser.uid)

      // Log the sign in action
      await addAuditLog({
        user: email,
        action: "Sign In",
        module: "Authentication",
        details: `User ${email} signed in`,
      })

      // Get user role from Firestore
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
      let role = "employee" // Default role

      if (userDoc.exists()) {
        const userData = userDoc.data()
        role = userData.role || "employee"
        console.log("User role from Firestore:", role)

        // Update user state manually to ensure it's set before redirect
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || userData.name,
          role: role,
        })

        // Set auth status to authenticated
        setAuthStatus("authenticated")
      } else {
        console.log("User document not found, creating default with employee role")
        // Create default user document
        await setDoc(doc(db, "users", firebaseUser.uid), {
          email: firebaseUser.email,
          role: "employee",
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          status: "active",
        })

        // Set user with default role
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          role: "employee",
        })

        // Set auth status to authenticated
        setAuthStatus("authenticated")
      }

      // Wait a moment to ensure state is updated
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Redirect based on role
      if (role === "admin") {
        console.log("Redirecting to admin dashboard")
        router.push("/dashboard")
      } else if (role === "manager") {
        console.log("Redirecting to manager dashboard")
        router.push("/manager-dashboard")
      } else {
        console.log("Redirecting to user dashboard")
        router.push("/user-dashboard")
      }
    } catch (error: any) {
      console.error("Sign in error:", error)
      setIsRedirecting(false)
      setLoading(false)
      throw new Error(error.message || "Failed to sign in")
    }
  }

  // Sign up function
  const signUp = async (email: string, password: string, role: string) => {
    if (isRedirecting) {
      console.log("Already redirecting, ignoring sign up request")
      return
    }

    try {
      setIsRedirecting(true)
      console.log("Signing up with email:", email, "and role:", role)

      // Set loading state to true during sign up
      setLoading(true)

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user
      console.log("Sign up successful for user:", firebaseUser.uid)

      // Save user data to Firestore
      await setDoc(doc(db, "users", firebaseUser.uid), {
        email: firebaseUser.email,
        role: role,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        status: "active",
      })

      // Update user state manually to ensure it's set before redirect
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        role: role,
      })

      // Set auth status to authenticated
      setAuthStatus("authenticated")

      // Log the sign up action
      await addAuditLog({
        user: email,
        action: "Sign Up",
        module: "Authentication",
        details: `New user ${email} registered with role ${role}`,
      })

      // Wait a moment to ensure state is updated
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Redirect based on role
      if (role === "admin") {
        console.log("Redirecting to admin dashboard")
        router.push("/dashboard")
      } else if (role === "manager") {
        console.log("Redirecting to manager dashboard")
        router.push("/manager-dashboard")
      } else {
        console.log("Redirecting to user dashboard")
        router.push("/user-dashboard")
      }
    } catch (error: any) {
      console.error("Sign up error:", error)
      setIsRedirecting(false)
      setLoading(false)
      throw new Error(error.message || "Failed to sign up")
    }
  }

  // Sign out function
  const signOut = async () => {
    try {
      if (user?.email) {
        // Log the sign out action
        await addAuditLog({
          user: user.email,
          action: "Sign Out",
          module: "Authentication",
          details: `User ${user.email} signed out`,
        })
      }

      console.log("Signing out")
      await firebaseSignOut(auth)
      console.log("Sign out successful, redirecting to auth page")
      router.push("/auth")
    } catch (error: any) {
      console.error("Sign out error:", error)
      throw new Error(error.message || "Failed to sign out")
    }
  }

  // Reset password function
  const resetPassword = async (email: string) => {
    try {
      console.log("Sending password reset email to:", email)
      await sendPasswordResetEmail(auth, email)
      console.log("Password reset email sent successfully")

      // Log the password reset action
      await addAuditLog({
        user: email,
        action: "Password Reset",
        module: "Authentication",
        details: `Password reset requested for ${email}`,
      })
    } catch (error: any) {
      console.error("Password reset error:", error)
      throw new Error(error.message || "Failed to send password reset email")
    }
  }

  // Update the value object to include authStatus
  const value = {
    user,
    loading,
    authStatus,
    signIn,
    signUp,
    signOut,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
