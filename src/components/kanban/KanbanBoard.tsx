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
import { Task } from '@/lib/types';
import { KanbanStage, KANBAN_STAGES } from '@/types/kanban';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  orgId: string;
}

export function KanbanBoard({ tasks: initialTasks, onTaskClick, orgId }: KanbanBoardProps) {
  const { toast } = useToast();
  const db = useFirestore();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Sync with external updates
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const columns = useMemo(() => {
    return KANBAN_STAGES.map(stage => ({
      ...stage,
      tasks: tasks.filter(t => t.status === stage.id)
    }));
  }, [tasks]);

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

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveTask) return;

    // Moving task over another task
    if (isActiveTask && isOverTask) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const overIndex = tasks.findIndex((t) => t.id === overId);
        
        if (tasks[activeIndex].status !== tasks[overIndex].status) {
          const newTasks = [...tasks];
          newTasks[activeIndex] = { ...newTasks[activeIndex], status: tasks[overIndex].status as KanbanStage };
          return newTasks;
        }
        return tasks;
      });
    }

    // Moving task to an empty column
    if (isActiveTask && isOverColumn) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const newTasks = [...tasks];
        newTasks[activeIndex] = { ...newTasks[activeIndex], status: overId as KanbanStage };
        return newTasks;
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    // Determine target status
    let targetStatus: KanbanStage | null = null;
    
    if (over.data.current?.type === 'Column') {
      targetStatus = overId as KanbanStage;
    } else if (over.data.current?.type === 'Task') {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) targetStatus = overTask.status;
    }

    if (!targetStatus || targetStatus === active.data.current?.task?.status) {
      return; // No change in status
    }

    // Optimistically update local state (already partially handled by over, but ensure final state)
    setTasks(currentTasks => 
      currentTasks.map(t => t.id === activeId ? { ...t, status: targetStatus as KanbanStage } : t)
    );

    // Save to Firestore
    if (db) {
      try {
        await updateDoc(doc(db, "tasks", activeId.toString()), {
          status: targetStatus
        });
      } catch (error) {
        console.error("Error updating task status:", error);
        toast({ title: "Update Failed", description: "Could not save task status.", variant: "destructive" });
        // Revert on failure
        setTasks(initialTasks);
      }
    }
  };

  const activeTask = useMemo(
    () => tasks.find((task) => task.id === activeId),
    [activeId, tasks]
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
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            tasks={col.tasks}
            onTaskClick={onTaskClick}
          />
        ))}
        
        <DragOverlay>
          {activeTask ? (
            <div className="rotate-3 scale-105 opacity-90 shadow-2xl cursor-grabbing">
              <KanbanCard task={activeTask} onClick={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
