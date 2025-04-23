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
import { db } from "@/lib/firebase"
import { addAuditLog } from "@/lib/audit-service"

export interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  department: string
  managerId: string
  status: "active" | "inactive" | "pending"
  joinDate: Date
}

// Get team members by manager ID
export async function getTeamMembers(managerId: string): Promise<TeamMember[]> {
  try {
    const teamQuery = query(collection(db, "users"), where("managerId", "==", managerId), orderBy("createdAt", "desc"))
    const teamSnapshot = await getDocs(teamQuery)

    const members: TeamMember[] = []
    teamSnapshot.forEach((doc) => {
      const data = doc.data()
      members.push({
        id: doc.id,
        name: data.name || "Unnamed User",
        email: data.email || "",
        role: data.role || "employee",
        department: data.department || "General",
        managerId: data.managerId || "",
        status: data.status || "active",
        joinDate: data.createdAt?.toDate() || new Date(),
      })
    })

    return members
  } catch (error) {
    console.error("Error fetching team members:", error)
    throw error
  }
}

// Add a team member
export async function addTeamMember(member: Omit<TeamMember, "id" | "joinDate">, adminEmail: string): Promise<string> {
  try {
    // Create a new document reference
    const memberRef = doc(collection(db, "users"))

    // Set the document data
    await setDoc(memberRef, {
      name: member.name,
      email: member.email,
      role: member.role,
      department: member.department,
      managerId: member.managerId,
      status: member.status,
      createdAt: serverTimestamp(),
    })

    // Log the action
    await addAuditLog({
      user: adminEmail,
      action: "Add Team Member",
      module: "Team Management",
      details: `Added ${member.name} (${member.email}) to the team`,
    })

    return memberRef.id
  } catch (error) {
    console.error("Error adding team member:", error)
    throw error
  }
}

// Update a team member
export async function updateTeamMember(id: string, data: Partial<TeamMember>, adminEmail: string): Promise<void> {
  try {
    const memberRef = doc(db, "users", id)

    // Get current data for audit log
    const memberDoc = await getDoc(memberRef)
    const currentData = memberDoc.data()

    // Update the document
    await updateDoc(memberRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })

    // Log the action
    await addAuditLog({
      user: adminEmail,
      action: "Update Team Member",
      module: "Team Management",
      details: `Updated ${currentData?.name || id} (${currentData?.email || "unknown email"})`,
    })
  } catch (error) {
    console.error("Error updating team member:", error)
    throw error
  }
}

// Remove a team member
export async function removeTeamMember(id: string, adminEmail: string): Promise<void> {
  try {
    const memberRef = doc(db, "users", id)

    // Get current data for audit log
    const memberDoc = await getDoc(memberRef)
    const currentData = memberDoc.data()

    // Delete the document
    await deleteDoc(memberRef)

    // Log the action
    await addAuditLog({
      user: adminEmail,
      action: "Remove Team Member",
      module: "Team Management",
      details: `Removed ${currentData?.name || id} (${currentData?.email || "unknown email"}) from the team`,
    })
  } catch (error) {
    console.error("Error removing team member:", error)
    throw error
  }
}

// Get team member by ID
export async function getTeamMemberById(id: string): Promise<TeamMember | null> {
  try {
    const memberDoc = await getDoc(doc(db, "users", id))

    if (memberDoc.exists()) {
      const data = memberDoc.data()
      return {
        id: memberDoc.id,
        name: data.name || "Unnamed User",
        email: data.email || "",
        role: data.role || "employee",
        department: data.department || "General",
        managerId: data.managerId || "",
        status: data.status || "active",
        joinDate: data.createdAt?.toDate() || new Date(),
      }
    }

    return null
  } catch (error) {
    console.error("Error fetching team member:", error)
    throw error
  }
}
