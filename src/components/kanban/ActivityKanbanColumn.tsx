"use client";

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ParkActivity } from '@/lib/types';
import { ActivityKanbanStageId } from '@/types/activity-kanban';
import { ActivityKanbanCard } from './ActivityKanbanCard';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ActivityKanbanColumnProps {
  id: ActivityKanbanStageId;
  title: string;
  activities: ParkActivity[];
  onActivityClick: (activity: ParkActivity) => void;
  onDeleteActivity: (id: string) => void;
}

export function ActivityKanbanColumn({ id, title, activities, onActivityClick, onDeleteActivity }: ActivityKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
    data: {
      type: 'Column',
      stage: id,
    },
  });

  return (
    <div className="flex flex-col w-[320px] shrink-0 h-full max-h-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-slate-700">{title}</h3>
          <Badge variant="secondary" className="bg-slate-200/50 text-slate-500 font-medium px-2 py-0">
            {activities.length}
          </Badge>
        </div>
      </div>

      <div 
        ref={setNodeRef}
        className={cn(
          "flex-1 bg-slate-100/50 rounded-xl p-2.5 transition-colors border-2 border-dashed border-transparent",
          isOver && "bg-slate-100 border-slate-300"
        )}
      >
        <ScrollArea className="h-[calc(100vh-280px)] min-h-[400px] w-full pr-3">
          <SortableContext 
            items={activities.map(a => a.id)} 
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2 pb-10">
              {activities.map(activity => (
                <ActivityKanbanCard 
                  key={activity.id} 
                  activity={activity} 
                  onClick={onActivityClick}
                  onDelete={onDeleteActivity}
                />
              ))}
            </div>
          </SortableContext>
        </ScrollArea>
      </div>
    </div>
  );
}
