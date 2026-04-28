import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { DailyCondition, User } from './types';

export async function evaluateAndApplyConditions(condition: DailyCondition, user: User) {
  // 1. Save the daily condition
  await addDoc(collection(db, 'daily_conditions'), {
    ...condition,
    createdAt: new Date().toISOString(),
    loggedBy: user.id || user.email || 'Unknown',
  });

  const generatedTasks: any[] = [];
  const park = condition.parkId;

  // 2. Evaluate Rules
  // Rule 1: High Temperature & High Footfall
  if (condition.temperature > 25 && condition.expectedFootfall === 'High') {
    generatedTasks.push({
      title: 'Extra Bin Emptying (Smart Task)',
      objective: 'High footfall and temperature detected. Empty all main bins.',
      status: 'Todo',
      dueDate: new Date().toISOString().split('T')[0],
      assignedTo: 'Bin Run', // Default general team
      park: park,
      source: 'smart-engine',
      isLog: false,
      isArchived: false,
    });
    generatedTasks.push({
      title: 'Check Toilet Rolls (Smart Task)',
      objective: 'High footfall expected today. Check and restock all public toilets.',
      status: 'Todo',
      dueDate: new Date().toISOString().split('T')[0],
      assignedTo: 'Keeper',
      park: park,
      source: 'smart-engine',
      isLog: false,
      isArchived: false,
    });
  }

  // Rule 2: High Wind
  if (condition.windSpeed > 40) {
    generatedTasks.push({
      title: 'Check for Fallen Branches (Smart Task)',
      objective: 'High winds detected. Walk main paths and check for unsafe or fallen branches.',
      status: 'Todo',
      dueDate: new Date().toISOString().split('T')[0],
      assignedTo: 'Gardener',
      park: park,
      source: 'smart-engine',
      isLog: false,
      isArchived: false,
    });
  }
  
  // Rule 3: Watering (Hot and dry)
  if (condition.temperature > 25 && condition.humidity < 40) {
    generatedTasks.push({
      title: 'Water Young Saplings (Smart Task)',
      objective: 'Hot and dry conditions. Ensure recently planted saplings are watered.',
      status: 'Todo',
      dueDate: new Date().toISOString().split('T')[0],
      assignedTo: 'Gardener',
      park: park,
      source: 'smart-engine',
      isLog: false,
      isArchived: false,
    });
  }

  // 3. Create Tasks
  for (const task of generatedTasks) {
    await addDoc(collection(db, 'tasks'), task);
  }

  return `Logged successfully. Generated ${generatedTasks.length} smart tasks.`;
}
