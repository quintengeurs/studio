"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ParkActivity } from '@/lib/types';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, MapPin, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityKanbanCardProps {
  activity: ParkActivity;
  onClick: (activity: ParkActivity) => void;
  onDelete: (id: string) => void;
}

export function ActivityKanbanCard({ activity, onClick, onDelete }: ActivityKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id, data: { type: 'Activity', activity } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card click / drag from firing
    if (confirm(`Delete "${activity.title}"? This cannot be undone.`)) {
      onDelete(activity.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab active:cursor-grabbing mb-3 touch-manipulation group/card",
        isDragging && "opacity-40"
      )}
      onClick={() => onClick(activity)}
    >
      <Card className="hover:shadow-md transition-shadow duration-200 border-l-4" style={{ borderLeftColor: activity.status === 'Confirmed' ? '#22c55e' : '#cbd5e1' }}>
        <CardHeader className="p-3 pb-0 space-y-1">
          <div className="flex justify-between items-start gap-2">
            <span className="font-semibold text-sm leading-tight text-slate-900 line-clamp-2 flex-1">
              {activity.title}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0",
                activity.impactLevel === 'High' ? "bg-red-100 text-red-700" :
                activity.impactLevel === 'Medium' ? "bg-amber-100 text-amber-700" :
                "bg-green-100 text-green-700"
              )}>
                {activity.impactLevel}
              </Badge>
              {/* Delete button — appears on card hover, stops drag listeners via stopPropagation */}
              <button
                onClick={handleDelete}
                onPointerDown={(e) => e.stopPropagation()} // prevent dnd-kit from treating this as a drag start
                className="opacity-0 group-hover/card:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="flex items-center text-xs text-muted-foreground pt-1">
            <MapPin className="h-3 w-3 mr-1 shrink-0" />
            <span className="truncate">{activity.parkId}</span>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-2 space-y-2">
          <div className="flex items-center justify-end mt-2">
            {activity.startDate && (
              <div className="flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-50 text-slate-500">
                <CalendarClock className="h-3 w-3 mr-1" />
                {format(new Date(activity.startDate), 'MMM d, yyyy')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
