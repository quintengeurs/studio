"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/lib/types';
import { format, isPast, isToday } from 'date-fns';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, MapPin, CheckCircle2, User, PlayCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KanbanCardProps {
  task: Task;
  onClick: (task: Task) => void;
}

export function KanbanCard({ task, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'Task', task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'Todo': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Doing': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Pending Approval': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && task.status !== 'Completed';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab active:cursor-grabbing mb-3 touch-manipulation",
        isDragging && "opacity-40"
      )}
      onClick={() => onClick(task)}
    >
      <Card className="hover:shadow-md transition-shadow duration-200 border-l-4" style={{ borderLeftColor: task.status === 'Completed' ? '#22c55e' : task.status === 'Doing' ? '#3b82f6' : '#cbd5e1' }}>
        <CardHeader className="p-3 pb-0 space-y-1">
          <div className="flex justify-between items-start gap-2">
            <span className="font-semibold text-sm leading-tight text-slate-900 line-clamp-2">
              {task.title}
            </span>
            {task.isVolunteerEligible && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-purple-100 text-purple-700 shrink-0">
                Vol
              </Badge>
            )}
          </div>
          <div className="flex items-center text-xs text-muted-foreground pt-1">
            <MapPin className="h-3 w-3 mr-1 shrink-0" />
            <span className="truncate">{task.park}</span>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-2 space-y-2">
          
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              <AvatarIcon name={task.assignedTo} />
              <span className="text-[11px] font-medium text-slate-600 truncate max-w-[80px]">
                {task.assignedTo || 'Unassigned'}
              </span>
            </div>
            
            {task.dueDate && (
              <div className={cn(
                "flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded",
                isOverdue ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-500"
              )}>
                <CalendarClock className="h-3 w-3 mr-1" />
                {format(new Date(task.dueDate), 'MMM d')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AvatarIcon({ name }: { name?: string }) {
  if (!name) return <div className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center"><User className="h-3 w-3 text-slate-400" /></div>;
  return (
    <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
