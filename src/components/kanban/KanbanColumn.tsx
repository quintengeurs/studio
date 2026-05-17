"use client";

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task } from '@/lib/types';
import { KanbanStage } from '@/types/kanban';
import { KanbanCard } from './KanbanCard';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface KanbanColumnProps {
  id: KanbanStage;
  title: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function KanbanColumn({ id, title, tasks, onTaskClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
    data: {
      type: 'Column',
      id
    }
  });

  return (
    <div className="flex flex-col flex-1 min-w-[280px] max-w-[350px] h-full bg-slate-50/50 rounded-xl border border-slate-200/60 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-slate-200/60 bg-slate-100/50">
        <h3 className="font-semibold text-sm text-slate-700">{title}</h3>
        <Badge variant="secondary" className="bg-white text-slate-500 hover:bg-white text-xs px-2 py-0.5 shadow-sm">
          {tasks.length}
        </Badge>
      </div>

      <div 
        ref={setNodeRef}
        className={cn(
          "flex-1 p-3 overflow-y-auto transition-colors duration-200",
          isOver ? "bg-slate-100/80" : ""
        )}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2 min-h-[150px]">
            {tasks.map((task) => (
              <KanbanCard key={task.id} task={task} onClick={onTaskClick} />
            ))}
            {tasks.length === 0 && (
              <div className="h-full min-h-[100px] flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs font-medium">
                Drop tasks here
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
