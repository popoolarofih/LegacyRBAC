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
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth"
import { doc, setDoc, getDoc, serverTimestamp, enableNetwork, disableNetwork } from "firebase/firestore"
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
  isOffline: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, role: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  retryConnection: () => Promise<void>
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authStatus: "initializing",
  isOffline: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  retryConnection: async () => {},
})

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext)

// Auth provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOffline, setIsOffline] = useState(false)
  // Add a new state variable to track authentication status
  const [authStatus, setAuthStatus] = useState<"initializing" | "authenticated" | "unauthenticated">("initializing")
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  // Set up network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      console.log("App is online, enabling Firestore network")
      enableNetwork(db).catch((err) => console.error("Error enabling network:", err))
      setIsOffline(false)
    }

    const handleOffline = () => {
      console.log("App is offline, disabling Firestore network")
      disableNetwork(db).catch((err) => console.error("Error disabling network:", err))
      setIsOffline(true)
    }

    // Check initial status
    if (typeof window !== "undefined") {
      setIsOffline(!window.navigator.onLine)
    }

    // Add event listeners
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Set up auth persistence
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error("Error setting auth persistence:", error)
    })
  }, [])

  // Function to retry connection
  const retryConnection = async () => {
    try {
      console.log("Attempting to reconnect to Firestore...")
      await enableNetwork(db)
      setIsOffline(false)
      return true
    } catch (error) {
      console.error("Failed to reconnect:", error)
      setIsOffline(true)
      return false
    }
  }

  // Listen for auth state changes
  useEffect(() => {
    console.log("Setting up auth state listener")
    let isMounted = true
    const retryCount = 0
    const MAX_RETRIES = 3

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser?.uid)

      try {
        if (firebaseUser) {
          // Get user data from Firestore with retry logic
          let userData = null
          let error = null

          for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
              const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
              if (userDoc.exists()) {
                userData = userDoc.data()
                break
              } else if (attempt === MAX_RETRIES - 1) {
                // Create default user on last attempt if document doesn't exist
                userData = {
                  email: firebaseUser.email,
                  role: "employee",
                }
              }
            } catch (err) {
              error = err
              console.warn(`Firestore fetch attempt ${attempt + 1} failed:`, err)
              // Wait before retrying
              await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
            }
          }

          if (!userData && error) {
            console.error("All Firestore fetch attempts failed:", error)
            // Fall back to basic user info from auth
            userData = {
              email: firebaseUser.email,
              role: "employee",
            }
            setIsOffline(true)
          }

          if (isMounted) {
            console.log("Setting user with data:", userData)
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || userData.name,
              role: userData.role || "employee",
            })

            // Set auth status to authenticated
            setAuthStatus("authenticated")

            // Try to update last login timestamp, but don't block on it
            updateLastLogin(firebaseUser.uid).catch((err) =>
              console.warn("Failed to update last login timestamp:", err),
            )
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
      throw error
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

      // Try to log the sign in action, but don't block on it
      addAuditLog({
        user: email,
        action: "Sign In",
        module: "Authentication",
        details: `User ${email} signed in`,
      }).catch((err) => console.warn("Failed to add audit log:", err))

      // Get user role from Firestore with retry logic
      let userData = null
      let error = null

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
          if (userDoc.exists()) {
            userData = userDoc.data()
            break
          }
        } catch (err) {
          error = err
          console.warn(`Firestore fetch attempt ${attempt + 1} failed:`, err)
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      let role = "employee" // Default role

      if (userData) {
        role = userData.role || "employee"
        console.log("User role from Firestore:", role)
      } else {
        console.log("User document not found or offline, creating default and using employee role")
        // Create default user document when back online
        try {
          await setDoc(doc(db, "users", firebaseUser.uid), {
            email: firebaseUser.email,
            role: "employee",
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            status: "active",
          })
        } catch (err) {
          console.warn("Failed to create default user document:", err)
        }
      }

      // Update user state manually to ensure it's set before redirect
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || userData?.name,
        role: role,
      })

      // Set auth status to authenticated
      setAuthStatus("authenticated")

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

      // Try to save user data to Firestore
      try {
        await setDoc(doc(db, "users", firebaseUser.uid), {
          email: firebaseUser.email,
          role: role,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          status: "active",
        })
      } catch (err) {
        console.warn("Failed to save user data to Firestore:", err)
        // Continue anyway since we have the auth user
      }

      // Update user state manually to ensure it's set before redirect
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        role: role,
      })

      // Set auth status to authenticated
      setAuthStatus("authenticated")

      // Try to log the sign up action, but don't block on it
      addAuditLog({
        user: email,
        action: "Sign Up",
        module: "Authentication",
        details: `New user ${email} registered with role ${role}`,
      }).catch((err) => console.warn("Failed to add audit log:", err))

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
        // Try to log the sign out action, but don't block on it
        addAuditLog({
          user: user.email,
          action: "Sign Out",
          module: "Authentication",
          details: `User ${user.email} signed out`,
        }).catch((err) => console.warn("Failed to add audit log:", err))
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

      // Try to log the password reset action, but don't block on it
      addAuditLog({
        user: email,
        action: "Password Reset",
        module: "Authentication",
        details: `Password reset requested for ${email}`,
      }).catch((err) => console.warn("Failed to add audit log:", err))
    } catch (error: any) {
      console.error("Password reset error:", error)
      throw new Error(error.message || "Failed to send password reset email")
    }
  }

  // Update the value object to include isOffline and retryConnection
  const value = {
    user,
    loading,
    authStatus,
    isOffline,
    signIn,
    signUp,
    signOut,
    resetPassword,
    retryConnection,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
