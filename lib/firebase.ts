import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore"

// Your Firebase configuration
// Replace these with your actual Firebase project config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// Enable offline persistence
if (typeof window !== "undefined") {
  // Only enable persistence in client-side environments
  enableIndexedDbPersistence(db).catch((err) => {
    console.error("Error enabling offline persistence:", err)
    if (err.code === "failed-precondition") {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.warn("Persistence failed: Multiple tabs open")
    } else if (err.code === "unimplemented") {
      // The current browser does not support all of the features required for persistence
      console.warn("Persistence not supported by this browser")
    }
  })
}

export { app, auth, db }
