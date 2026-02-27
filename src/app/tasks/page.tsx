
"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckSquare, 
  Calendar, 
  User, 
  Plus, 
  MoreVertical,
  ChevronRight,
  Clock
} from "lucide-react";
import { MOCK_TASKS, MOCK_USERS } from "@/lib/mock-data";
import { Progress } from "@/components/ui/progress";

export default function TasksPage() {
  const [tasks, setTasks] = useState(MOCK_TASKS);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Todo': return 'bg-muted text-muted-foreground';
      case 'Doing': return 'bg-accent text-accent-foreground';
      case 'Done': return 'bg-primary text-primary-foreground';
      default: return '';
    }
  };

  return (
    <DashboardShell 
      title="Task Management" 
      description="Active work assignments for Hackney parks teams"
      actions={
        <Button className="font-headline font-bold">
          <Plus className="mr-2 h-4 w-4" /> New Task Card
        </Button>
      }
    >
      <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
        <Button variant="outline" className="rounded-full bg-card border-primary/20 text-primary">All Tasks</Button>
        <Button variant="ghost" className="rounded-full">My Assignments</Button>
        <Button variant="ghost" className="rounded-full">Overdue</Button>
        <Button variant="ghost" className="rounded-full">Park: Clissold</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {tasks.map((task) => (
          <Card key={task.id} className="group relative overflow-hidden border-2 hover:border-primary/40 transition-all shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start mb-2">
                <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30 uppercase tracking-widest">
                  {task.park}
                </Badge>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/40 text-[10px] font-bold text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {task.dueDate}
                </div>
              </div>
              <CardTitle className="font-headline text-xl flex justify-between group-hover:text-primary">
                {task.title}
                <MoreVertical className="h-5 w-5 text-muted-foreground cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription className="text-sm font-medium text-foreground/80 mt-1">
                {task.objective}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="uppercase text-muted-foreground">Completion Progress</span>
                  <span className="text-primary">{task.status === 'Done' ? '100%' : task.status === 'Doing' ? '45%' : '0%'}</span>
                </div>
                <Progress value={task.status === 'Done' ? 100 : task.status === 'Doing' ? 45 : 0} className="h-2" />
                
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 border-primary/20 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground leading-none">Assigned To</span>
                      <span className="text-xs font-semibold">{task.assignedTo}</span>
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(task.status)} font-bold text-[10px] px-3 py-1 rounded-sm`}>
                    {task.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-0">
              <Button variant="ghost" className="w-full rounded-none h-12 border-t font-headline font-bold text-primary bg-primary/5 hover:bg-primary/10">
                View Task Details <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
