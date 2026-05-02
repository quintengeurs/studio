import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { DailyCondition, User, SmartRule, RuleCondition } from './types';

function evaluateCondition(conditionValue: any, ruleCondition: RuleCondition): boolean {
  const value = ruleCondition.value;
  
  if (ruleCondition.operator === 'contains') {
    if (Array.isArray(conditionValue)) {
      return conditionValue.includes(value);
    }
    if (typeof conditionValue === 'string') {
      return conditionValue.includes(String(value));
    }
    return false;
  }

  switch (ruleCondition.operator) {
    case '==': return conditionValue == value;
    case '>': return conditionValue > value;
    case '<': return conditionValue < value;
    case '>=': return conditionValue >= value;
    case '<=': return conditionValue <= value;
    default: return false;
  }
}

export async function evaluateAndApplyConditions(condition: DailyCondition, user: User, rules: SmartRule[]) {
  // 1. Save the daily condition
  await addDoc(collection(db, 'daily_conditions'), {
    ...condition,
    createdAt: new Date().toISOString(),
    loggedBy: user.id || user.email || 'Unknown',
  });

  const generatedTasks: any[] = [];
  const park = condition.parkId;

  // 2. Evaluate Dynamic Rules
  for (const rule of rules) {
    if (!rule.isActive) continue;

    const evaluations = rule.conditions.map(c => evaluateCondition(condition[c.field], c));
    
    let isMatch = false;
    if (rule.conditionLogic === 'AND') {
      isMatch = evaluations.length > 0 && evaluations.every(v => v === true);
    } else {
      isMatch = evaluations.some(v => v === true);
    }

    if (isMatch) {
      for (const t of rule.tasksToGenerate) {
        generatedTasks.push({
          title: `${t.title} (Smart Task)`,
          objective: t.objective,
          status: 'Todo',
          dueDate: new Date().toISOString().split('T')[0],
          assignedTo: t.assignedTo,
          park: park,
          source: 'smart-engine',
          isLog: false,
          isArchived: false,
        });
      }
    }
  }

  // 3. Create Tasks
  for (const task of generatedTasks) {
    await addDoc(collection(db, 'tasks'), task);
  }

  return `Logged successfully. Generated ${generatedTasks.length} smart tasks.`;
}
