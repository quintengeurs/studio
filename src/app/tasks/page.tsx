
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
  Clock,
  RotateCcw,
  ListTodo
} from "lucide-react";
import { MOCK_TASKS, MOCK_RECURRING_SCHEDULES, MOCK_ASSETS, MOCK_USERS } from "@/lib/mock-data";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const PARKS = Array.from(new Set(MOCK_ASSETS.map(a => a.park))).sort();
const OPERATIVES = MOCK_USERS.map(u => u.name);

export default function TasksPage() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [schedules, setSchedules] = useState(MOCK_RECURRING_SCHEDULES);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    objective: "",
    park: "",
    assignedTo: "",
    dueDate: new Date().toISOString().split('T')[0]
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Todo': return 'bg-muted text-muted-foreground';
      case 'Doing': return 'bg-accent text-accent-foreground';
      case 'Done': return 'bg-primary text-primary-foreground';
      default: return '';
    }
  };

  const handleCreateTask = () => {
    const task = {
      ...newTask,
      id: `t${Date.now()}`,
      status: 'Todo' as const
    };
    setTasks([task, ...tasks]);
    setIsTaskDialogOpen(false);
    setNewTask({ title: "", objective: "", park: "", assignedTo: "", dueDate: new Date().toISOString().split('T')[0] });
    toast({ title: "Task Created", description: "The new task has been added to the queue." });
  };

  return (
    <DashboardShell 
      title="Tasks Management" 
      description="Operational tasking and recurring maintenance schedules"
      actions={
        <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
          <DialogTrigger asChild>
            <Button className="font-headline font-bold w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="font-headline">Create New Task</DialogTitle>
              <DialogDescription>Assign a new operational task to the team.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="t-title">Task Title</Label>
                <Input id="t-title" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} placeholder="e.g. Mow North Lawn" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="t-obj">Objective</Label>
                <Textarea id="t-obj" value={newTask.objective} onChange={e => setNewTask({...newTask, objective: e.target.value})} placeholder="What needs to be achieved?" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Park</Label>
                  <Select value={newTask.park} onValueChange={v => setNewTask({...newTask, park: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Park" />
                    </SelectTrigger>
                    <SelectContent>
                      {PARKS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Assignee</Label>
                  <Select value={newTask.assignedTo} onValueChange={v => setNewTask({...newTask, assignedTo: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select User" />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATIVES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="t-date">Due Date</Label>
                <Input id="t-date" type="date" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button className="w-full" onClick={handleCreateTask} disabled={!newTask.title || !newTask.park || !newTask.assignedTo}>Create Task</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <ListTodo className="h-4 w-4" /> Active Tasks
          </TabsTrigger>
          <TabsTrigger value="recurring" className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" /> Recurring Schedules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {tasks.map((task) => (
              <Card key={task.id} className="group relative overflow-hidden border-2 hover:border-primary/40 transition-all shadow-sm w-full">
                <CardHeader className="pb-3 px-4 sm:px-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30 uppercase tracking-widest shrink-0">
                      {task.park}
                    </Badge>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/40 text-[10px] font-bold text-muted-foreground shrink-0">
                      <Clock className="h-3 w-3" />
                      {task.dueDate}
                    </div>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="font-headline text-lg sm:text-xl group-hover:text-primary break-words flex-1 min-w-0">
                      {task.title}
                    </CardTitle>
                    <MoreVertical className="h-5 w-5 text-muted-foreground cursor-pointer opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                  <CardDescription className="text-sm font-medium text-foreground/80 mt-1 line-clamp-2">
                    {task.objective}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4 px-4 sm:px-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold mb-1.5">
                        <span className="uppercase text-muted-foreground">Completion Progress</span>
                        <span className="text-primary">{task.status === 'Done' ? '100%' : task.status === 'Doing' ? '45%' : '0%'}</span>
                      </div>
                      <Progress value={task.status === 'Done' ? 100 : task.status === 'Doing' ? 45 : 0} className="h-2" />
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 border-primary/20 flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[9px] font-bold uppercase text-muted-foreground leading-none">Assigned To</span>
                          <span className="text-xs font-semibold truncate">{task.assignedTo}</span>
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(task.status)} font-bold text-[10px] px-3 py-1 rounded-sm shrink-0`}>
                        {task.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-0 mt-auto">
                  <Button variant="ghost" className="w-full rounded-none h-12 border-t font-headline font-bold text-primary bg-primary/5 hover:bg-primary/10 text-sm">
                    View Task Details <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recurring">
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {schedules.map((schedule) => (
              <Card key={schedule.id} className="border-2 hover:border-accent transition-colors shadow-sm">
                <CardHeader>
                  <div className="flex justify-between items-center mb-2">
                    <Badge className="bg-accent text-accent-foreground font-bold text-[10px] uppercase">{schedule.frequency}</Badge>
                    <Badge variant="outline" className="text-[10px] font-bold">{schedule.park}</Badge>
                  </div>
                  <CardTitle className="text-lg font-headline">{schedule.title}</CardTitle>
                  <CardDescription className="text-xs font-medium text-muted-foreground">
                    Next run: <span className="text-foreground font-bold">{schedule.nextRun}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase py-2 border-y border-dashed">
                      <span className="text-muted-foreground">Responsible</span>
                      <span className="text-foreground">{schedule.assignedTo}</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full font-bold text-xs">
                      <Clock className="mr-2 h-3.5 w-3.5" /> Edit Frequency
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}
