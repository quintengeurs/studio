import * as functions from "firebase-functions/v1";
import { onDocumentWritten, onDocumentCreated } from "firebase-functions/v2/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import axios from "axios";
import { format } from "date-fns";

admin.initializeApp();

// Set global options for v2 functions
setGlobalOptions({ region: 'europe-west1' });

const NAMED_DB_ID = "ai-studio-046cc7f7-4cac-49bd-9295-55f90b8445f0";

// All Firestore operations (v1 and v2) target the same named database.
const db = getFirestore(NAMED_DB_ID);

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
      console.log(`Retrieved ${parksSnap.docs.length} parks for orgId: ${orgId}`);

      for (const parkDoc of parksSnap.docs) {
        const parkData = parkDoc.data();
        const parkId = parkDoc.id;
        
        let latitude = Number(parkData.latitude);
        let longitude = Number(parkData.longitude);

        console.log(`Park: ${parkData.name || parkId}, raw lat: ${parkData.latitude}, raw lng: ${parkData.longitude}`);

        if (!parkData.latitude || !parkData.longitude) {
          console.log(`Skipping park ${parkData.name || parkId} due to missing latitude or longitude.`);
          continue;
        }

        // Validate and sanitize coordinates
        if (Math.abs(longitude) > 180 || Math.abs(latitude) > 90) {
          console.warn(`Park ${parkData.name || parkId} has invalid coordinates (lat: ${latitude}, lng: ${longitude}). Attempting to sanitize...`);
          if (parkId === "Clissold Park" || parkData.name === "Clissold Park") {
            latitude = 51.561408;
            longitude = -0.08211; // Correcting 8211 to -0.08211 based on Hackney location
            await db.collection("parks_details").doc(parkId).update({ latitude, longitude });
            console.log(`Successfully sanitized and updated Clissold Park coordinates in DB: lat: ${latitude}, lng: ${longitude}`);
          } else {
            // General fallback sanitization: if longitude is > 180, check if it's a shifted decimal
            if (Math.abs(longitude) > 180) {
              const strLng = String(parkData.longitude);
              if (strLng.includes("8211")) {
                longitude = -0.08211;
                await db.collection("parks_details").doc(parkId).update({ longitude });
                console.log(`Sanitized longitude for ${parkData.name || parkId} to: ${longitude}`);
              } else {
                console.log(`Skipping park ${parkData.name || parkId} due to unsanitizable coordinates.`);
                continue;
              }
            } else {
              console.log(`Skipping park ${parkData.name || parkId} due to invalid coordinates.`);
              continue;
            }
          }
        }

        stats.parksChecked++;

        try {
          console.log(`Fetching weather for park ${parkData.name || parkId} at lat: ${latitude}, lng: ${longitude}`);
          const weatherResponse = await axios.get("https://api.open-meteo.com/v1/forecast", {
            params: {
              latitude: latitude,
              longitude: longitude,
              daily: "temperature_2m_max,precipitation_sum,wind_speed_10m_max",
              timezone: "Europe/London",
              forecast_days: 1
            }
          });

          const forecast = weatherResponse.data.daily;
          if (!forecast) {
            throw new Error("No daily forecast data returned from Open-Meteo");
          }

          const currentContext: any = {
            temperature: forecast.temperature_2m_max?.[0] ?? 0,
            rain: forecast.precipitation_sum?.[0] ?? 0,
            windSpeed: forecast.wind_speed_10m_max?.[0] ?? 0,
            tags: []
          };

          if (currentContext.rain > 2) currentContext.tags.push("rain");
          if (currentContext.temperature > 25) currentContext.tags.push("sunny");
          if (currentContext.windSpeed > 20) currentContext.tags.push("windy");

          console.log(`Weather fetch successful for ${parkData.name || parkId}. Context:`, JSON.stringify(currentContext));

            const parkProposals: any[] = [];

            for (const rule of rules) {
              stats.rulesProcessed++;

              // If the rule has a park scope, skip parks not in the list
              if (rule.targetParkIds && rule.targetParkIds.length > 0) {
                const parkName = parkData.name || parkId;
                if (!rule.targetParkIds.includes(parkName)) continue;
              }

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

                // 1. Suppression Check (3 Days)
                const threeDaysAgo = new Date();
                threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
                const threeDaysAgoStr = threeDaysAgo.toISOString();

                const recentProposals = await db.collection("proposed_tasks")
                  .where("ruleId", "==", rule.id)
                  .where("park", "==", parkData.name || parkId)
                  .where("createdAt", ">=", threeDaysAgoStr)
                  .get();

                const recentTasks = await db.collection("tasks")
                  .where("ruleId", "==", rule.id)
                  .where("park", "==", parkData.name || parkId)
                  .where("createdAt", ">=", threeDaysAgoStr)
                  .get();

                if (!recentProposals.empty || !recentTasks.empty) {
                  console.log(`Suppressed suggestion for rule "${rule.name}" at park "${parkData.name || parkId}" due to active 3-day suppression window.`);
                  continue;
                }

                // 2. Score Calculation
                const { score, reasons } = calculateSmartScore(currentContext, rule, parkData);

                for (const taskTemplate of (rule.tasksToGenerate || [])) {
                  // 3. Interpolation
                  const interpolatedTitle = interpolateTemplate(taskTemplate.title, currentContext, parkData.name || parkId);
                  const interpolatedObjective = interpolateTemplate(taskTemplate.objective, currentContext, parkData.name || parkId);

                  // 4. Consolidation (check if duplicate already generated for this park during this loop)
                  const existingIdx = parkProposals.findIndex(p => p.title.toLowerCase() === interpolatedTitle.toLowerCase());
                  if (existingIdx !== -1) {
                    const existing = parkProposals[existingIdx];
                    existing.smartScore = Math.max(existing.smartScore, score);
                    existing.reasons = Array.from(new Set([...existing.reasons, ...reasons]));
                    existing.ruleName = `${existing.ruleName} + ${rule.name}`;
                    console.log(`Consolidated suggestions for "${interpolatedTitle}" at park "${parkData.name || parkId}". New score: ${existing.smartScore}`);
                  } else {
                    parkProposals.push({
                      ruleId: rule.id,
                      orgId: orgId,
                      ruleName: rule.name,
                      title: interpolatedTitle,
                      objective: interpolatedObjective,
                      park: parkData.name || parkId,
                      assignedTo: taskTemplate.assignedTo,
                      suggestedDate: todayStr,
                      createdAt: new Date().toISOString(),
                      status: "pending",
                      triggerData: { temp: currentContext.temperature, rain: currentContext.rain, wind: currentContext.windSpeed },
                      smartScore: score,
                      reasons: reasons
                    });
                  }
                }
              }
            }

            // Write all consolidated proposals to Firestore
            for (const proposal of parkProposals) {
              const existingProposal = await db.collection("proposed_tasks")
                .where("ruleId", "==", proposal.ruleId)
                .where("park", "==", proposal.park)
                .where("suggestedDate", "==", proposal.suggestedDate)
                .limit(1).get();

              if (!existingProposal.empty) continue;

              const proposalId = `prop_${Date.now()}_${proposal.ruleId}_${Math.floor(Math.random() * 1000)}`;
              await db.collection("proposed_tasks").doc(proposalId).set({
                id: proposalId,
                ...proposal
              });
              stats.tasksProposed++;
            }
        } catch (err: any) {
          console.error(`Error processing weather/rules for park ${parkData.name || parkId}:`, err?.message || err);
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

function calculateSmartScore(context: any, rule: any, park: any) {
  let score = 60;
  const reasons: string[] = [];

  // Weather urgency
  if (context.rain > 8) {
    score += 25;
    reasons.push(`Heavy rain expected today (${context.rain}mm)`);
  } else if (context.rain > 3) {
    score += 15;
    reasons.push(`Moderate rain expected (${context.rain}mm)`);
  }

  if (context.temperature > 28) {
    score += 15;
    reasons.push(`Extreme heat forecasted (${context.temperature}°C)`);
  } else if (context.temperature > 22) {
    score += 5;
    reasons.push(`Warm temperature (${context.temperature}°C)`);
  }

  if (context.windSpeed > 20) {
    score += 15;
    reasons.push(`High wind warning (${context.windSpeed} km/h)`);
  }

  // Rule importance
  const priorityMap: Record<string, number> = { "High": 3, "Medium": 2, "Low": 1 };
  const rulePriority = rule.priority || "Medium";
  const priorityValue = priorityMap[rulePriority] ?? 2;
  score += priorityValue * 4;
  reasons.push(`Rule Priority: ${rulePriority}`);

  // Park criticality
  const isGreenFlag = park.greenflag === true || park.greenFlagStatus === "Active";
  const hasSports = park.features && park.features.some((f: string) => f.toLowerCase().includes("sports") || f.toLowerCase().includes("muga") || f.toLowerCase().includes("play"));

  if (isGreenFlag) {
    score += 10;
    reasons.push("Award-winning Green Flag site");
  }
  if (hasSports) {
    score += 10;
    reasons.push("High-footfall sports/play amenities present");
  }

  const finalScore = Math.min(100, Math.max(0, Math.round(score)));
  return { score: finalScore, reasons };
}

function interpolateTemplate(template: string, context: any, parkName: string): string {
  if (!template) return "";
  return template
    .replace(/\{\{park\}\}/gi, parkName)
    .replace(/\{\{temperature\}\}/gi, `${context.temperature || 0}°C`)
    .replace(/\{\{rain\}\}/gi, `${context.rain || 0}mm`)
    .replace(/\{\{wind\}\}/gi, `${context.windSpeed || 0} km/h`);
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
 * Helper to check if caller is an absolute master
 */
function isMaster(token: any): boolean {
  return !!token.email?.match(/quinten\.geurs@gmail\.com|quinten\.geurs@hackney\.gov\.uk/i);
}

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
    const newClaims = { orgId: orgId || "hackney-council", role: role || "Staff" };

    try {
      let targetUid = userId;
      if (userId.includes('@')) {
        const userRecord = await admin.auth().getUserByEmail(userId);
        targetUid = userRecord.uid;
      }
      
      const targetUserRecord = await admin.auth().getUser(targetUid);
      const currentClaims = targetUserRecord.customClaims || {};
      
      const updatedClaims = { ...currentClaims, ...newClaims };
      await admin.auth().setCustomUserClaims(targetUid, updatedClaims);
      console.log(`Set claims for ${targetUid} (${userId}):`, updatedClaims);
    } catch (error) {
      console.error(`Error setting claims for ${userId}:`, error);
    }
  });

/**
 * Admin: Create New User (Gen 1)
 */
export const adminCreateUser = functions.region("europe-west1").https.onCall(async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  
  const callerToken = context.auth.token;
  const isCallerMaster = isMaster(callerToken);
  const isCallerAdmin = callerToken.role === 'Admin';
  
  const { email, password, displayName, role, orgId, uid } = data;
  const targetOrgId = orgId || 'hackney-council';

  // MULTI-TENANCY CHECK
  if (!isCallerMaster && (!isCallerAdmin || callerToken.orgId !== targetOrgId)) {
    throw new functions.https.HttpsError("permission-denied", "Admins can only create users within their own organization.");
  }

  try {
    let userUid = uid;
    
    if (!userUid) {
      const userRecord = await admin.auth().createUser({ email, password, displayName });
      userUid = userRecord.uid;
    }

    // Set custom claims securely
    const newClaims = { orgId: targetOrgId, role: role || 'Staff' };
    try {
      const existingUser = await admin.auth().getUser(userUid);
      const currentClaims = existingUser.customClaims || {};
      await admin.auth().setCustomUserClaims(userUid, { ...currentClaims, ...newClaims });
    } catch (e) {
      await admin.auth().setCustomUserClaims(userUid, newClaims);
    }

    await db.collection("users").doc(userUid).set({
      id: userUid, email: email.toLowerCase(), displayName: displayName || email,
      role: role || 'Staff', orgId: targetOrgId,
      createdAt: new Date().toISOString(), status: 'Active'
    }, { merge: true });
    
    return { uid: userUid, success: true };
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Update User Role / Organization (Gen 1)
 */
export const updateUserClaims = functions.region("europe-west1").https.onCall(async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");

  const { uid, orgId, role } = data;
  const callerToken = context.auth.token;

  if (!uid) {
    throw new functions.https.HttpsError("invalid-argument", "uid is required");
  }

  try {
    let targetUserOrgId: string | undefined;
    let currentClaims: any = {};
    let isUserInAuth = true;

    try {
      const targetUserRecord = await admin.auth().getUser(uid);
      currentClaims = targetUserRecord.customClaims || {};
      targetUserOrgId = currentClaims.orgId;
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        isUserInAuth = false;
        // User not in auth, check Firestore to enforce cross-org rules
        const userDoc = await db.collection("users").doc(uid).get();
        if (userDoc.exists) {
          targetUserOrgId = userDoc.data()?.orgId;
        } else {
          throw new functions.https.HttpsError("not-found", "User not found in Auth or Database.");
        }
      } else {
        throw e;
      }
    }

    const isCallerMaster = isMaster(callerToken);
    const isCallerAdmin = callerToken.role === 'Admin';
    
    if (!isCallerMaster) {
      if (!isCallerAdmin) {
        throw new functions.https.HttpsError("permission-denied", "Only Admins or Masters can update users.");
      }
      if (targetUserOrgId && targetUserOrgId !== callerToken.orgId) {
        throw new functions.https.HttpsError("permission-denied", "You can only update users within your own organization.");
      }
      if (orgId && orgId !== callerToken.orgId) {
        throw new functions.https.HttpsError("permission-denied", "You cannot move a user to a different organization.");
      }
    }

    if (isUserInAuth) {
      const updatedClaims = { ...currentClaims };
      if (orgId !== undefined) updatedClaims.orgId = orgId;
      if (role !== undefined) updatedClaims.role = role;

      await admin.auth().setCustomUserClaims(uid, updatedClaims);
    }

    await db.collection("users").doc(uid).update({
      ...(orgId && { orgId }),
      ...(role && { role }),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: context.auth.uid,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error updating claims:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

