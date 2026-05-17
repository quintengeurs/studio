"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { ParkActivity } from '@/lib/types';
import { ActivityKanbanStageId, ACTIVITY_KANBAN_STAGES } from '@/types/activity-kanban';
import { ActivityKanbanColumn } from './ActivityKanbanColumn';
import { ActivityKanbanCard } from './ActivityKanbanCard';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface ActivityKanbanBoardProps {
  activities: ParkActivity[];
  onActivityClick: (activity: ParkActivity) => void;
  orgId: string;
}

export function ActivityKanbanBoard({ activities: initialActivities, onActivityClick, orgId }: ActivityKanbanBoardProps) {
  const { toast } = useToast();
  const db = useFirestore();
  const [activities, setActivities] = useState<ParkActivity[]>(initialActivities);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Track the status the card had BEFORE the drag began.
  // This is the source of truth for detecting a real column change,
  // since handleDragOver optimistically mutates local state mid-drag.
  const dragOriginStatus = useRef<ActivityKanbanStageId | null>(null);

  // Sync external Firestore changes into local state, but NEVER during a drag
  // (that would cause the card to snap back mid-drag).
  useEffect(() => {
    if (!activeId) {
      setActivities(initialActivities);
    }
  }, [initialActivities, activeId]);

  const columns = useMemo(() => {
    return ACTIVITY_KANBAN_STAGES.map(stage => ({
      ...stage,
      activities: activities.filter(a => a.status === stage.id)
    }));
  }, [activities]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    setActiveId(id);
    // Snapshot the card's real Firestore status at drag-start
    const activity = activities.find(a => a.id === id);
    dragOriginStatus.current = (activity?.status as ActivityKanbanStageId) ?? null;
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;

    const isActiveActivity = active.data.current?.type === 'Activity';
    const isOverActivity = over.data.current?.type === 'Activity';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveActivity) return;

    // Hovering over a card in a different column
    if (isOverActivity) {
      setActivities((prev) => {
        const activeIndex = prev.findIndex((a) => a.id === activeId);
        const overIndex = prev.findIndex((a) => a.id === overId);
        if (prev[activeIndex].status !== prev[overIndex].status) {
          const next = [...prev];
          next[activeIndex] = { ...next[activeIndex], status: prev[overIndex].status as ActivityKanbanStageId };
          return next;
        }
        return prev;
      });
    }

    // Hovering over an empty column
    if (isOverColumn) {
      setActivities((prev) => {
        const activeIndex = prev.findIndex((a) => a.id === activeId);
        const next = [...prev];
        next[activeIndex] = { ...next[activeIndex], status: overId as ActivityKanbanStageId };
        return next;
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const currentActiveId = activeId;
    setActiveId(null);

    const { over } = event;
    if (!over || !currentActiveId) {
      // Drop cancelled — revert to original
      dragOriginStatus.current = null;
      setActivities(initialActivities);
      return;
    }

    // What status does the card NOW have after all the optimistic handleDragOver moves?
    const movedActivity = activities.find(a => a.id === currentActiveId);
    const finalStatus = movedActivity?.status as ActivityKanbanStageId | undefined;
    const originalStatus = dragOriginStatus.current;
    dragOriginStatus.current = null;

    // No real column change — nothing to persist
    if (!finalStatus || !originalStatus || finalStatus === originalStatus) {
      return;
    }

    // Persist to Firestore
    if (db) {
      try {
        await updateDoc(doc(db, "park_activities", currentActiveId), {
          status: finalStatus,
          updatedAt: new Date().toISOString()
        });
        toast({ title: "Status updated", description: `Moved to ${finalStatus}.` });
      } catch (error) {
        console.error("Error updating activity status:", error);
        toast({ title: "Update Failed", description: "Could not save status change.", variant: "destructive" });
        // Revert the optimistic update
        setActivities(initialActivities);
      }
    }
  };

  const activeActivity = useMemo(
    () => activities.find((a) => a.id === activeId),
    [activeId, activities]
  );

  return (
    <div className="flex h-full w-full overflow-x-auto overflow-y-hidden pb-4 gap-4 px-1">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {columns.map((col) => (
          <ActivityKanbanColumn
            key={col.id}
            id={col.id as ActivityKanbanStageId}
            title={col.title}
            activities={col.activities}
            onActivityClick={onActivityClick}
          />
        ))}
        
        <DragOverlay>
          {activeActivity ? (
            <div className="rotate-3 scale-105 opacity-90 shadow-2xl cursor-grabbing">
              <ActivityKanbanCard activity={activeActivity} onClick={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
