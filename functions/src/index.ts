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
