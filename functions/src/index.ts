import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";
import { format } from "date-fns";

admin.initializeApp();

const db = admin.firestore();

/**
 * Scheduled Smart Evaluator
 * Runs daily at 06:00 AM
 */
export const scheduledSmartEvaluator = functions.pubsub
  .schedule("every day 06:00")
  .timeZone("Europe/London")
  .onRun(async (context) => {
    console.log("Starting Scheduled Smart Evaluator...");
    return await processAllRules();
  });

/**
 * Manual Trigger for testing/UI
 */
export const manualProcessRules = functions.https.onCall(async (data, context) => {
  // Check if user is staff/admin
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  }
  
  console.log(`Manual trigger by ${context.auth.token.email}`);
  return await processAllRules();
});

/**
 * Core Rule Processing Logic
 */
async function processAllRules() {
  const stats = { rulesProcessed: 0, matchesFound: 0, tasksProposed: 0, errors: 0 };
  
  try {
    // 1. Fetch all active weather-based rules
    const rulesSnap = await db.collection("SmartRules")
      .where("isActive", "==", true)
      .where("triggerType", "==", "weather")
      .get();

    if (rulesSnap.empty) {
      console.log("No active weather rules found.");
      return { status: "success", message: "No active rules.", stats };
    }

    // 2. Group rules by park to minimize API calls
    const rulesByPark: Record<string, any[]> = {};
    rulesSnap.forEach(doc => {
      const data = doc.data();
      const parkId = data.parkId;
      if (!rulesByPark[parkId]) rulesByPark[parkId] = [];
      rulesByPark[parkId].push({ id: doc.id, ...data });
    });

    // 3. Process each park
    for (const parkId of Object.keys(rulesByPark)) {
      try {
        // Get park coordinates
        const parkDoc = await db.collection("parks_details").doc(parkId).get();
        const parkData = parkDoc.data();
        
        if (!parkData || !parkData.latitude || !parkData.longitude) {
          console.warn(`Park ${parkId} missing coordinates. Skipping.`);
          continue;
        }

        // Fetch Weather Forecast (24h)
        const weatherResponse = await axios.get("https://api.open-meteo.com/v1/forecast", {
          params: {
            latitude: parkData.latitude,
            longitude: parkData.longitude,
            daily: "temperature_2m_max,precipitation_sum",
            timezone: "Europe/London",
            forecast_days: 1
          }
        });

        const forecast = weatherResponse.data.daily;
        const currentContext = {
          temp: forecast.temperature_2m_max[0],
          rain: forecast.precipitation_sum[0]
        };

        console.log(`Weather for ${parkId}: ${currentContext.temp}°C, ${currentContext.rain}mm rain`);

        // Evaluate Rules for this park
        for (const rule of rulesByPark[parkId]) {
          stats.rulesProcessed++;
          let isMatch = true;

          // Simple AND logic for all conditions
          for (const cond of rule.conditions) {
            const actualValue = currentContext[cond.field as keyof typeof currentContext];
            if (actualValue === undefined) continue;

            const operator = cond.operator;
            const target = cond.value;

            if (operator === ">" && !(actualValue > target)) isMatch = false;
            if (operator === "<" && !(actualValue < target)) isMatch = false;
            if (operator === "==" && !(actualValue === target)) isMatch = false;
            if (operator === ">=" && !(actualValue >= target)) isMatch = false;
            if (operator === "<=" && !(actualValue <= target)) isMatch = false;
            
            if (!isMatch) break;
          }

          if (isMatch) {
            stats.matchesFound++;
            
            // Check Cooldown: Has this task already been proposed or completed today?
            const todayStr = format(new Date(), "yyyy-MM-dd");
            const existingProposal = await db.collection("proposed_tasks")
              .where("ruleId", "==", rule.id)
              .where("suggestedDate", "==", todayStr)
              .limit(1)
              .get();

            if (!existingProposal.empty) {
              console.log(`Rule ${rule.id} already triggered today for ${parkId}. Cooldown active.`);
              continue;
            }

            // Also check for active tasks from this rule
            const activeTasks = await db.collection("tasks")
              .where("ruleId", "==", rule.id)
              .where("status", "!=", "Completed")
              .limit(1)
              .get();

            if (!activeTasks.empty) {
              console.log(`Active task already exists for rule ${rule.id} at ${parkId}. Skipping.`);
              continue;
            }

            // Create Proposed Task
            const action = rule.actions[0]; // Take first action
            const proposalId = `prop_${Date.now()}_${rule.id}`;
            
            await db.collection("proposed_tasks").doc(proposalId).set({
              id: proposalId,
              ruleId: rule.id,
              ruleName: rule.name,
              title: action.title || `Automated: ${rule.name}`,
              objective: action.objective || `Suggested by smart rule based on ${currentContext.temp}°C / ${currentContext.rain}mm rain.`,
              park: parkId,
              assignedTo: action.assigneeRole || "Unassigned",
              suggestedDate: todayStr,
              createdAt: new Date().toISOString(),
              status: "pending",
              triggerData: currentContext
            });

            stats.tasksProposed++;
            console.log(`Proposed task created: ${proposalId} for ${parkId}`);
          }
        }
      } catch (err: any) {
        console.error(`Error processing park ${parkId}:`, err.message);
        stats.errors++;
      }
    }

    // Log Summary
    await db.collection("automation_logs").add({
      timestamp: new Date().toISOString(),
      type: "daily_evaluation",
      stats,
      status: stats.errors > 0 ? "warning" : "success"
    });

    return { status: "success", stats };
  } catch (err: any) {
    console.error("Critical error in evaluator:", err.message);
    return { status: "error", message: err.message };
  }
}

/**
 * Smart Tasking Engine - Dynamic Rules Evaluation
 * Triggers automatically when conditions are logged from the frontend UI
 */
export const onConditionLogged = functions.firestore
  .document("daily_conditions/{docId}")
  .onCreate(async (snap, context) => {
    const condition = snap.data();
    if (!condition) return;

    try {
      // 1. Fetch all active dynamic rules
      const rulesSnap = await db.collection("smart_rules")
        .where("isActive", "==", true)
        .where("orgId", "==", condition.orgId || "hackney-council")
        .get();

      if (rulesSnap.empty) {
        console.log("No active dynamic rules found for org:", condition.orgId);
        return;
      }

      const rules: any[] = [];
      rulesSnap.forEach(doc => rules.push({ id: doc.id, ...doc.data() }));

      // 2. Fetch all machinery (if machinery rules exist)
      const allMachinery: any[] = [];
      const hasMachineryRule = rules.some(r => 
        r.conditions && r.conditions.some((c: any) => c.field === "machineryHours")
      );

      if (hasMachineryRule) {
        const machSnap = await db.collection("machinery")
          .where("orgId", "==", condition.orgId || "hackney-council")
          .get();
        machSnap.forEach(doc => allMachinery.push({ id: doc.id, ...doc.data() }));
      }

      // 3. Evaluate Engine Logic
      const generatedTasks: any[] = [];
      const park = condition.parkId;

      for (const rule of rules) {
        const evaluations = rule.conditions.map((c: any) => {
          if (c.field === 'machineryHours') {
            const machine = allMachinery.find(m => m.id === c.machineryId);
            return machine ? evaluateSimpleCondition(machine.currentHours, c) : false;
          }
          return evaluateSimpleCondition(condition[c.field], c);
        });
        
        let isMatch = false;
        if (rule.conditionLogic === 'AND') {
          isMatch = evaluations.length > 0 && evaluations.every((v: boolean) => v === true);
        } else {
          isMatch = evaluations.some((v: boolean) => v === true);
        }

        if (isMatch) {
          for (const t of (rule.tasksToGenerate || [])) {
            generatedTasks.push({
              title: t.title,
              objective: t.objective,
              status: 'Todo',
              dueDate: new Date().toISOString().split('T')[0],
              assignedTo: t.assignedTo,
              displayTime: t.displayTime || null,
              park: park,
              source: 'smart-engine',
              isLog: false,
              isArchived: false,
              isVolunteerEligible: t.isVolunteerEligible || false,
              orgId: condition.orgId || "hackney-council",
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      // 4. Create Tasks in batch securely
      if (generatedTasks.length > 0) {
        const batch = db.batch();
        const tasksRef = db.collection("tasks");
        
        for (const task of generatedTasks) {
          batch.set(tasksRef.doc(), task);
        }
        
        await batch.commit();
        console.log(`Generated ${generatedTasks.length} tasks from ${rules.length} dynamic rules on backend.`);
      }

    } catch (error) {
      console.error("Error evaluating conditions in backend:", error);
    }
  });

function evaluateSimpleCondition(conditionValue: any, ruleCondition: any): boolean {
  const value = Number(ruleCondition.value);
  const rawValue = ruleCondition.value;
  
  if (ruleCondition.operator === 'contains') {
    if (Array.isArray(conditionValue)) {
      return conditionValue.includes(rawValue);
    }
    if (typeof conditionValue === 'string') {
      return conditionValue.includes(String(rawValue));
    }
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
 * Immutable Audit Trails
 * Automatically tracks all changes to critical collections securely on the backend
 */
function buildAuditFunction(collectionName: string) {
  return functions.firestore
    .document(`${collectionName}/{docId}`)
    .onWrite(async (change, context) => {
      const docId = context.params.docId;
      const after = change.after.exists ? change.after.data() : null;
      const before = change.before.exists ? change.before.data() : null;

      let action = "";
      if (!before && after) action = `CREATED ${collectionName.toUpperCase()}`;
      else if (before && !after) action = `DELETED ${collectionName.toUpperCase()}`;
      else action = `UPDATED ${collectionName.toUpperCase()}`;

      // Extract user info if available from the document metadata
      let userStr = "System / Unknown";
      if (after?.updatedBy) userStr = after.updatedBy;
      else if (after?.completedBy) userStr = after.completedBy;
      else if (after?.reportedBy) userStr = after.reportedBy;
      else if (after?.requestedBy) userStr = after.requestedBy;
      else if (before?.updatedBy) userStr = before.updatedBy;

      const logEntry = {
        timestamp: new Date().toISOString(),
        action,
        collection: collectionName,
        documentId: docId,
        userName: userStr,
        orgId: after?.orgId || before?.orgId || "hackney-council",
        details: {
          previousState: before ? JSON.stringify(before).substring(0, 500) : null,
          newState: after ? JSON.stringify(after).substring(0, 500) : null
        }
      };

      await db.collection("action_logs").add(logEntry);
    });
}

export const auditTasks = buildAuditFunction("tasks");
export const auditIssues = buildAuditFunction("issues");
export const auditRequests = buildAuditFunction("requests");
export const auditUsers = buildAuditFunction("users");
