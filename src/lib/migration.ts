import { collection, doc, getDocs, writeBatch, setDoc, serverTimestamp } from "firebase/firestore";
import { Firestore } from "firebase/firestore";
import { Organization, FeatureKey } from "./types";

export async function migrateToMultiTenancy(db: Firestore) {
  const DEFAULT_ORG_ID = "hackney-council";
  
  console.log("Starting migration to multi-tenancy...");

  // 1. Create Default Organization
  const orgRef = doc(db, "organizations", DEFAULT_ORG_ID);
  const defaultOrg: Organization = {
    id: DEFAULT_ORG_ID,
    name: "Hackney Council",
    slug: "hackney",
    activeFeatures: [
      'dashboard', 
      'assets', 
      'parks', 
      'depots', 
      'inspections', 
      'issues', 
      'requests', 
      'tasks', 
      'users', 
      'volunteering', 
      'smart_tasking', 
      'info_corner', 
      'map'
    ],
    createdAt: new Date().toISOString()
  };

  await setDoc(orgRef, defaultOrg);
  console.log("Created default organization: Hackney Council");

  // 2. Link all existing users to this organization
  const usersSnap = await getDocs(collection(db, "users"));
  const batch = writeBatch(db);
  
  let count = 0;
  usersSnap.forEach((userDoc) => {
    const userData = userDoc.data();
    if (!userData.orgId) {
      batch.update(userDoc.ref, { orgId: DEFAULT_ORG_ID });
      count++;
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`Updated ${count} users with orgId: ${DEFAULT_ORG_ID}`);
  } else {
    console.log("No users needed updating.");
  }

  // 3. (Optional) You could also migrate Parks, Tasks, etc. 
  // For now, linking users is the priority for the UserContext to work.
  
  console.log("Migration complete!");
}
