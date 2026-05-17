export type ActivityKanbanStageId = 'Draft' | 'Confirmed';

export interface ActivityKanbanStage {
  id: ActivityKanbanStageId;
  title: string;
}

export const ACTIVITY_KANBAN_STAGES: ActivityKanbanStage[] = [
  { id: 'Draft', title: 'Drafts' },
  { id: 'Confirmed', title: 'Confirmed' }
];
