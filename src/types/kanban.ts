import { Task } from '@/lib/types';

export type KanbanStage = Task['status'];

// We define our board columns based on the existing Task statuses
export const KANBAN_STAGES: { id: KanbanStage; title: string }[] = [
  { id: 'Todo', title: 'To Do' },
  { id: 'Doing', title: 'In Progress' },
  { id: 'Pending Approval', title: 'Review' },
  { id: 'Completed', title: 'Completed' }
];
