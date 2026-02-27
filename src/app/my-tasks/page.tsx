
"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ChevronRight, 
  AlertCircle,
  PlayCircle
} from "lucide-react";
import { MOCK_TASKS, MOCK_USERS } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MyTasksPage() {
  const { toast } = useToast();
  const currentUser = MOCK_USERS[1]; // Sarah Smith
  const [tasks, setTasks] = useState(MOCK_TASKS.filter(t => t.assignedTo === currentUser.name));

  const handleStatusUpdate = (taskId: string, newStatus: 'Todo' | 'Doing' | 'Done') => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    toast({
      title: "Task Updated",
      description: `Status changed to ${newStatus}.`,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Todo': return <Badge variant="outline" className="bg-muted text-muted-foreground font-bold text-[10px] uppercase">To Do</Badge>;
      case 'Doing': return <Badge className="bg-accent text-accent-foreground font-bold text-[10px] uppercase">In Progress</Badge>;
      case 'Done': return <Badge className="bg-primary text-primary-foreground font-bold text-[10px] uppercase">Completed</Badge>;
      default: return null;
    }
  };

  const activeTasks = tasks.filter(t => t.status !== 'Done');
  const completedTasks = tasks.filter(t => t.status === 'Done');

  return (
    <DashboardShell 
      title="My Daily Tasks" 
      description={`Personal work queue for ${currentUser.name}`}
    >
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="active">Active ({activeTasks.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {activeTasks.length > 0 ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {activeTasks.map((task) => (
                <Card key={task.id} className="border-2 hover:border-primary/40 transition-all group">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-wider">
                        <MapPin className="h-3 w-3" />
                        {task.park}
                      </div>
                      {getStatusBadge(task.status)}
                    </div>
                    <CardTitle className="text-xl font-headline group-hover:text-primary transition-colors">{task.title}</CardTitle>
                    <CardDescription className="text-sm font-medium text-foreground/70 line-clamp-2">
                      {task.objective}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Due {task.dueDate}</span>
                        <span>{task.status === 'Doing' ? '45%' : '0%'}</span>
                      </div>
                      <Progress value={task.status === 'Doing' ? 45 : 0} className="h-2" />
                    </div>
                  </CardContent>
                  <CardFooter className="p-0 border-t flex divide-x">
                    {task.status === 'Todo' ? (
                      <Button 
                        variant="ghost" 
                        className="flex-1 rounded-none h-12 text-xs font-bold hover:bg-accent/10"
                        onClick={() => handleStatusUpdate(task.id, 'Doing')}
                      >
                        <PlayCircle className="mr-2 h-4 w-4" /> Start Task
                      </Button>
                    ) : (
                      <Button 
                        variant="ghost" 
                        className="flex-1 rounded-none h-12 text-xs font-bold text-primary hover:bg-primary/5"
                        onClick={() => handleStatusUpdate(task.id, 'Done')}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Complete
                      </Button>
                    )}
                    <Button variant="ghost" className="px-4 rounded-none h-12 border-l">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
              <CheckCircle2 className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-bold">All caught up!</p>
              <p className="text-sm">No active tasks assigned to you right now.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          <div className="grid gap-4">
            {completedTasks.map((task) => (
              <Card key={task.id} className="bg-muted/30 border-dashed">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{task.title}</h4>
                      <p className="text-xs text-muted-foreground">{task.park} • Completed {task.dueDate}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] opacity-60">FINISHED</Badge>
                </CardContent>
              </Card>
            ))}
            {completedTasks.length === 0 && (
              <p className="text-center py-12 text-sm text-muted-foreground">No completed tasks recorded for this period.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}
