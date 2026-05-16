import * as functions from "firebase-functions/v1";
import { onDocumentWritten, onDocumentCreated } from "firebase-functions/v2/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import axios from "axios";
import { format } from "date-fns";

admin.initializeApp();
const db = admin.firestore();

// Set global options for v2 functions
setGlobalOptions({ region: 'europe-west1' });

const NAMED_DB_ID = "ai-studio-046cc7f7-4cac-49bd-9295-55f90b8445f0";

/**
 * Scheduled Smart Evaluator (Gen 1)
 * Runs daily at 06:00 AM
 */
export const scheduledSmartEvaluator = functions.region("europe-west1").pubsub
  .schedule("every day 06:00")
  .timeZone("Europe/London")
  .onRun(async (context) => {
    console.log("Starting Scheduled Smart Evaluator...");
    return await processAllRules();
  });

/**
 * Manual Trigger for testing/UI (Gen 1)
 */
export const manualProcessRules = functions.region("europe-west1").https.onCall(async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  }
  return await processAllRules();
});

/**
 * Core Rule Processing Logic
 */
async function processAllRules() {
  const stats = { rulesProcessed: 0, matchesFound: 0, tasksProposed: 0, errors: 0, parksChecked: 0 };
  try {
    const orgsSnap = await db.collection("organizations").get();
    for (const orgDoc of orgsSnap.docs) {
      const orgId = orgDoc.id;
      const rulesSnap = await db.collection("smart_rules")
        .where("orgId", "==", orgId)
        .where("isActive", "==", true)
        .get();

      if (rulesSnap.empty) continue;
      const rules: any[] = [];
      rulesSnap.forEach((doc: any) => rules.push({ id: doc.id, ...doc.data() }));

      const parksSnap = await db.collection("parks_details").where("orgId", "==", orgId).get();
      for (const parkDoc of parksSnap.docs) {
        const parkData = parkDoc.data();
        const parkId = parkDoc.id;
        if (!parkData.latitude || !parkData.longitude) continue;
        stats.parksChecked++;

        try {
          const weatherResponse = await axios.get("https://api.open-meteo.com/v1/forecast", {
            params: {
              latitude: parkData.latitude,
              longitude: parkData.longitude,
              daily: "temperature_2m_max,precipitation_sum,wind_speed_10m_max",
              timezone: "Europe/London",
              forecast_days: 1
            }
          });

          const forecast = weatherResponse.data.daily;
          const currentContext: any = {
            temperature: forecast.temperature_2m_max[0],
            rain: forecast.precipitation_sum[0],
            windSpeed: forecast.wind_speed_10m_max[0],
            tags: []
          };

          if (currentContext.rain > 2) currentContext.tags.push("rain");
          if (currentContext.temperature > 25) currentContext.tags.push("sunny");
          if (currentContext.windSpeed > 20) currentContext.tags.push("windy");

          for (const rule of rules) {
            stats.rulesProcessed++;
            const evaluations = (rule.conditions || []).map((c: any) => {
              const actualValue = currentContext[c.field];
              if (actualValue === undefined) return false;
              if (c.operator === 'contains') return Array.isArray(actualValue) ? actualValue.includes(c.value) : false;
              const numVal = Number(actualValue);
              const targetVal = Number(c.value);
              if (c.operator === ">") return numVal > targetVal;
              if (c.operator === "<") return numVal < targetVal;
              if (c.operator === "==") return numVal === targetVal;
              if (c.operator === ">=") return numVal >= targetVal;
              if (c.operator === "<=") return numVal <= targetVal;
              return false;
            });

            let isMatch = rule.conditionLogic === 'AND' 
              ? evaluations.length > 0 && evaluations.every((v: boolean) => v === true)
              : evaluations.some((v: boolean) => v === true);

            if (isMatch) {
              stats.matchesFound++;
              const todayStr = format(new Date(), "yyyy-MM-dd");
              const existingProposal = await db.collection("proposed_tasks")
                .where("ruleId", "==", rule.id)
                .where("park", "==", parkData.name || parkId)
                .where("suggestedDate", "==", todayStr)
                .limit(1).get();

              if (!existingProposal.empty) continue;

              for (const taskTemplate of (rule.tasksToGenerate || [])) {
                const proposalId = `prop_${Date.now()}_${rule.id}_${Math.floor(Math.random() * 1000)}`;
                await db.collection("proposed_tasks").doc(proposalId).set({
                  id: proposalId,
                  ruleId: rule.id,
                  orgId: orgId,
                  ruleName: rule.name,
                  title: taskTemplate.title,
                  objective: taskTemplate.objective,
                  park: parkData.name || parkId,
                  assignedTo: taskTemplate.assignedTo,
                  suggestedDate: todayStr,
                  createdAt: new Date().toISOString(),
                  status: "pending",
                  triggerData: { temp: currentContext.temperature, rain: currentContext.rain, wind: currentContext.windSpeed }
                });
                stats.tasksProposed++;
              }
            }
          }
        } catch (err: any) {
          stats.errors++;
        }
      }
    }
    await db.collection("automation_logs").add({
      timestamp: new Date().toISOString(),
      type: "daily_evaluation",
      stats,
      status: stats.errors > 0 ? "warning" : "success"
    });
    return { status: "success", stats };
  } catch (err: any) {
    return { status: "error", message: err.message };
  }
}

/**
 * Smart Tasking Engine (Gen 2)
 */
export const onConditionLogged_v2 = onDocumentCreated({
  document: "daily_conditions/{docId}",
  database: NAMED_DB_ID
}, async (event) => {
    const condition = event.data?.data();
    if (!condition) return;

    try {
      const rulesSnap = await db.collection("smart_rules")
        .where("isActive", "==", true)
        .where("orgId", "==", condition.orgId || "hackney-council").get();

      if (rulesSnap.empty) return;
      const rules: any[] = [];
      rulesSnap.forEach((doc: any) => rules.push({ id: doc.id, ...doc.data() }));

      const allMachinery: any[] = [];
      const hasMachineryRule = rules.some(r => r.conditions && r.conditions.some((c: any) => c.field === "machineryHours"));
      if (hasMachineryRule) {
        const machSnap = await db.collection("machinery").where("orgId", "==", condition.orgId || "hackney-council").get();
        machSnap.forEach((doc: any) => allMachinery.push({ id: doc.id, ...doc.data() }));
      }

      const generatedTasks: any[] = [];
      for (const rule of rules) {
        const evaluations = rule.conditions.map((c: any) => {
          if (c.field === 'machineryHours') {
            const machine = allMachinery.find(m => m.id === c.machineryId);
            return machine ? evaluateSimpleCondition(machine.currentHours, c) : false;
          }
          return evaluateSimpleCondition(condition[c.field], c);
        });
        
        let isMatch = rule.conditionLogic === 'AND'
          ? evaluations.length > 0 && evaluations.every((v: boolean) => v === true)
          : evaluations.some((v: boolean) => v === true);

        if (isMatch) {
          for (const t of (rule.tasksToGenerate || [])) {
            generatedTasks.push({
              title: t.title, objective: t.objective, status: 'Todo',
              dueDate: new Date().toISOString().split('T')[0],
              assignedTo: t.assignedTo, displayTime: t.displayTime || null,
              park: condition.parkId, source: 'smart-engine', isLog: false, isArchived: false,
              isVolunteerEligible: t.isVolunteerEligible || false,
              orgId: condition.orgId || "hackney-council", createdAt: new Date().toISOString()
            });
          }
        }
      }

      if (generatedTasks.length > 0) {
        const batch = db.batch();
        const tasksRef = db.collection("tasks");
        for (const task of generatedTasks) batch.set(tasksRef.doc(), task);
        await batch.commit();
      }
    } catch (error) {
      console.error("Error in onConditionLogged:", error);
    }
  });

function evaluateSimpleCondition(conditionValue: any, ruleCondition: any): boolean {
  const value = Number(ruleCondition.value);
  const rawValue = ruleCondition.value;
  if (ruleCondition.operator === 'contains') {
    if (Array.isArray(conditionValue)) return conditionValue.includes(rawValue);
    if (typeof conditionValue === 'string') return conditionValue.includes(String(rawValue));
    return false;
  }
  const numValue = Number(conditionValue);
  switch (ruleCondition.operator) {
    case '==': return numValue == value;
    case '>': return numValue > value;
    case '<': return numValue < value;
    case '>=': return numValue >= value;
    case '<=': return numValue <= value;
    default: return false;
  }
}

/**
 * Immutable Audit Trails (Gen 2)
 */
function buildAuditFunction(collectionName: string) {
  return onDocumentWritten({
    document: `${collectionName}/{docId}`,
    database: NAMED_DB_ID
  }, async (event) => {
      const docId = event.params.docId;
      const after = event.data?.after.exists ? event.data.after.data() : null;
      const before = event.data?.before.exists ? event.data.before.data() : null;

      let action = !before && after ? `CREATED ${collectionName.toUpperCase()}` : (before && !after ? `DELETED ${collectionName.toUpperCase()}` : `UPDATED ${collectionName.toUpperCase()}`);
      let userStr = after?.updatedBy || after?.completedBy || after?.reportedBy || after?.requestedBy || before?.updatedBy || "System / Unknown";

      const logEntry = {
        timestamp: new Date().toISOString(), action, collection: collectionName, documentId: docId, userName: userStr,
        orgId: after?.orgId || before?.orgId || "hackney-council",
        details: { previousState: before ? JSON.stringify(before).substring(0, 500) : null, newState: after ? JSON.stringify(after).substring(0, 500) : null }
      };
      await db.collection("action_logs").add(logEntry);
    });
}

export const auditTasks_v2 = buildAuditFunction("tasks");
export const auditIssues_v2 = buildAuditFunction("issues");
export const auditRequests_v2 = buildAuditFunction("requests");
export const auditUsers_v2 = buildAuditFunction("users");

/**
 * Synchronize Firestore User Profile with Auth Custom Claims (Gen 2)
 */
export const syncUserClaims_v2 = onDocumentWritten({
  document: "users/{userId}",
  database: NAMED_DB_ID
}, async (event) => {
    const userId = event.params.userId;
    const userData = event.data?.after.exists ? event.data.after.data() : null;

    if (!userData) {
      console.log(`User ${userId} deleted.`);
      return;
    }

    const { orgId, role } = userData;
    const claims = { orgId: orgId || "hackney-council", role: role || "Staff" };

    try {
      let targetUid = userId;
      if (userId.includes('@')) {
        const userRecord = await admin.auth().getUserByEmail(userId);
        targetUid = userRecord.uid;
      }
      await admin.auth().setCustomUserClaims(targetUid, claims);
      console.log(`Set claims for ${targetUid} (${userId}):`, claims);
    } catch (error) {
      console.error(`Error setting claims for ${userId}:`, error);
    }
  });

/**
 * Admin: Create New User (Gen 1)
 */
export const adminCreateUser = functions.region("europe-west1").https.onCall(async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  const isAuthorized = context.auth.token.email?.includes('quinten.geurs') || context.auth.token.role === 'Admin';
  if (!isAuthorized) throw new functions.https.HttpsError("permission-denied", "Only admins can create users.");

  const { email, password, displayName, role, orgId } = data;
  try {
    const userRecord = await admin.auth().createUser({ email, password, displayName });
    await db.collection("users").doc(userRecord.uid).set({
      id: userRecord.uid, email: email.toLowerCase(), displayName,
      role: role || 'Staff', orgId: orgId || 'hackney-council',
      createdAt: new Date().toISOString(), status: 'Active'
    });
    return { uid: userRecord.uid };
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});
