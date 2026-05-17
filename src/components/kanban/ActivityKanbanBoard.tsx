"use client";

import React, { useState, useEffect, useMemo } from 'react';
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

  // Sync with external updates
  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  const columns = useMemo(() => {
    return ACTIVITY_KANBAN_STAGES.map(stage => ({
      ...stage,
      activities: activities.filter(a => a.status === stage.id)
    }));
  }, [activities]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required before dragging starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
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

    // Moving activity over another activity
    if (isActiveActivity && isOverActivity) {
      setActivities((activities) => {
        const activeIndex = activities.findIndex((a) => a.id === activeId);
        const overIndex = activities.findIndex((a) => a.id === overId);
        
        if (activities[activeIndex].status !== activities[overIndex].status) {
          const newActivities = [...activities];
          newActivities[activeIndex] = { ...newActivities[activeIndex], status: activities[overIndex].status as ActivityKanbanStageId };
          return newActivities;
        }
        return activities;
      });
    }

    // Moving activity to an empty column
    if (isActiveActivity && isOverColumn) {
      setActivities((activities) => {
        const activeIndex = activities.findIndex((a) => a.id === activeId);
        const newActivities = [...activities];
        newActivities[activeIndex] = { ...newActivities[activeIndex], status: overId as ActivityKanbanStageId };
        return newActivities;
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const activeActivity = activities.find(a => a.id === activeId);
    if (!activeActivity) return;

    // Determine target status
    let targetStatus: ActivityKanbanStageId | null = null;
    
    if (over.data.current?.type === 'Column') {
      targetStatus = overId as ActivityKanbanStageId;
    } else if (over.data.current?.type === 'Activity') {
      const overActivity = activities.find(a => a.id === overId);
      if (overActivity) targetStatus = overActivity.status as ActivityKanbanStageId;
    }

    if (!targetStatus || targetStatus === active.data.current?.activity?.status) {
      return; // No change in status
    }

    // Optimistically update local state
    setActivities(currentActivities => 
      currentActivities.map(a => a.id === activeId ? { ...a, status: targetStatus as ActivityKanbanStageId } : a)
    );

    // Save to Firestore
    if (db) {
      try {
        await updateDoc(doc(db, "park_activities", activeId.toString()), {
          status: targetStatus,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error("Error updating activity status:", error);
        toast({ title: "Update Failed", description: "Could not save status.", variant: "destructive" });
        // Revert on failure
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
