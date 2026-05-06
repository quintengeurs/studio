
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
  try {
    await addDoc(collection(db, "action_logs"), {
      userId,
      userName,
      orgId,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to log action:", error);
  }
}
