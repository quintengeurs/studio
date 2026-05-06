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

  // 3. Migrate Global Settings to Org Settings
  const globalRegistryRef = doc(db, "settings", "registry");
  const orgSettingsRef = doc(db, "settings", DEFAULT_ORG_ID);
  
  try {
    const globalSnap = await getDocs(collection(db, "settings"));
    const registryDoc = globalSnap.docs.find(d => d.id === "registry");
    if (registryDoc) {
      await setDoc(orgSettingsRef, registryDoc.data());
      console.log(`Cloned global registry to settings/${DEFAULT_ORG_ID}`);
    }
  } catch (err) {
    console.error("Failed to migrate settings:", err);
  }
  
  // 4. Link existing data records to the default organization
  const collectionsToMigrate = [
    "tasks", "issues", "requests", "assets", 
    "parks_details", "depots_details", "machinery", 
    "smart_rules", "info_items"
  ];
  
  for (const collName of collectionsToMigrate) {
    try {
      console.log(`Migrating collection: ${collName}...`);
      const snap = await getDocs(collection(db, collName));
      
      let collBatch = writeBatch(db);
      let collCount = 0;
      let totalInColl = 0;
      
      for (const d of snap.docs) {
        if (!d.data().orgId) {
          collBatch.update(d.ref, { orgId: DEFAULT_ORG_ID });
          collCount++;
          totalInColl++;
          
          // Firestore batch limit is 500. We commit at 400 for safety.
          if (collCount >= 400) {
            await collBatch.commit();
            collBatch = writeBatch(db);
            collCount = 0;
          }
        }
      }
      
      if (collCount > 0) {
        await collBatch.commit();
      }
      
      console.log(`Successfully updated ${totalInColl} documents in ${collName}.`);
    } catch (err) {
      console.error(`Failed to migrate collection ${collName}:`, err);
      throw err; // Re-throw to stop the migration and show error to user
    }
  }

  console.log("Migration complete!");
}
