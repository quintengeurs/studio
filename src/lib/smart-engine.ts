import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { DailyCondition, User, SmartRule, RuleCondition, Machinery, ParkActivity } from './types';

function evaluateCondition(conditionValue: any, ruleCondition: RuleCondition): boolean {
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

export function simulateConditions(condition: DailyCondition, rules: SmartRule[], allMachinery?: Machinery[]) {
  const generatedTasks: any[] = [];
  const park = condition.parkId;

  for (const rule of rules) {
    if (!rule.isActive) continue;

    const evaluations = rule.conditions.map(c => {
      if (c.field === 'machineryHours') {
        const machine = allMachinery?.find(m => m.id === c.machineryId);
        return machine ? evaluateCondition(machine.currentHours, c) : false;
      }
      return evaluateCondition(condition[c.field as keyof DailyCondition], c);
    });
    
    let isMatch = false;
    if (rule.conditionLogic === 'AND') {
      isMatch = evaluations.length > 0 && evaluations.every(v => v === true);
    } else {
      isMatch = evaluations.some(v => v === true);
    }

    if (isMatch) {
      for (const t of rule.tasksToGenerate) {
        generatedTasks.push({
          title: t.title,
          objective: t.objective,
          status: 'Todo',
          dueDate: new Date().toISOString().split('T')[0],
          assignedTo: t.assignedTo,
          displayTime: t.displayTime,
          park: park,
          source: 'smart-engine',
          isLog: false,
          isArchived: false,
        });
      }
    }
  }
  return generatedTasks;
}

export async function evaluateAndApplyConditions(condition: DailyCondition, user: User, rules: SmartRule[], allMachinery?: Machinery[]) {
  // 1. Fetch active activities for this park to inject as "Virtual Tags"
  const activitiesRef = collection(db, "park_activities");
  const q = query(
    activitiesRef, 
    where("orgId", "==", condition.orgId || "hackney-council"),
    where("parkId", "==", condition.parkId),
    where("status", "==", "Confirmed")
  );
  
  const querySnapshot = await getDocs(q);
  const activities = querySnapshot.docs.map(doc => doc.data() as ParkActivity);
  
  // Filter for activities active today
  const today = new Date().toISOString().split('T')[0];
  const activeToday = activities.filter(a => {
    const start = a.startDate.split('T')[0];
    const end = (a.endDate || a.startDate).split('T')[0];
    return today >= start && today <= end;
  });

  // Inject tags based on active activities
  const virtualTags = activeToday.map(a => a.type.toLowerCase());
  const impactTags = activeToday.filter(a => a.impactLevel === 'High').map(a => `${a.type.toLowerCase()}_high_impact`);
  
  const mergedCondition = {
    ...condition,
    tags: Array.from(new Set([...(condition.tags || []), ...virtualTags, ...impactTags]))
  };

  // 2. Save the daily condition
  await addDoc(collection(db, 'daily_conditions'), {
    ...mergedCondition,
    createdAt: new Date().toISOString(),
    loggedBy: user.id || user.email || 'Unknown',
  });

  // Calculate what was passed off to the server for UI feedback
  const generatedTasks = simulateConditions(mergedCondition, rules, allMachinery);

  return `Logged successfully. The engine detected ${activeToday.length} active registry items and is generating ${generatedTasks.length} smart tasks.`;
}
