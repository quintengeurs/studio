import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { DailyCondition, User, SmartRule, RuleCondition, Machinery } from './types';

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
  // 1. Save the daily condition
  await addDoc(collection(db, 'daily_conditions'), {
    ...condition,
    createdAt: new Date().toISOString(),
    loggedBy: user.id || user.email || 'Unknown',
  });

  // 2. Generate Tasks
  const generatedTasks = simulateConditions(condition, rules, allMachinery);

  // 3. Create Tasks
  for (const task of generatedTasks) {
    await addDoc(collection(db, 'tasks'), task);
  }

  return `Logged successfully. Generated ${generatedTasks.length} smart tasks.`;
}
