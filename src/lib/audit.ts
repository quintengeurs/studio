
import { collection, addDoc } from "firebase/firestore";
import { Firestore } from "firebase/firestore";

export async function logAction(
  db: Firestore, 
  userId: string, 
  userName: string, 
  orgId: string, 
  action: string, 
  details: any
) {
  // Client-side logging has been DISABLED.
  // Immutable Audit Trails are now handled exclusively by Firebase Cloud Functions.
  return;
}
