import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

// Initialize verification codes in Firestore
export async function initializeVerificationCodes() {
  try {
    // Check if admin codes exist
    const adminCodesDoc = await getDoc(doc(db, "verificationCodes", "admin"))
    if (!adminCodesDoc.exists()) {
      await setDoc(doc(db, "verificationCodes", "admin"), {
        codes: ["666666"],
      })
    }

    // Check if manager codes exist
    const managerCodesDoc = await getDoc(doc(db, "verificationCodes", "manager"))
    if (!managerCodesDoc.exists()) {
      await setDoc(doc(db, "verificationCodes", "manager"), {
        codes: ["789012"],
      })
    }

    return true
  } catch (error) {
    console.error("Error initializing verification codes:", error)
    return false
  }
}

// Verify a code against Firestore
export async function verifyCode(role: string, code: string): Promise<boolean> {
  try {
    const codeDoc = await getDoc(doc(db, "verificationCodes", role))
    if (codeDoc.exists()) {
      const validCodes = codeDoc.data().codes
      return validCodes.includes(code)
    }
    return false
  } catch (error) {
    console.error(`Error verifying ${role} code:`, error)
    return false
  }
}
