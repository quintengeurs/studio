
"use client";

import { useState, useMemo } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  MoreVertical,
  ChevronRight,
  Clock,
  RotateCcw,
  ListTodo,
  UserPlus,
  ThumbsUp,
  AlertCircle,
  MapPin,
  User as UserIcon
} from "lucide-react";
import { MOCK_RECURRING_SCHEDULES, MOCK_ASSETS } from "@/lib/mock-data";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, updateDoc, doc, query, where, orderBy } from "firebase/firestore";
import Image from "next/image";
import { User } from "@/lib/types";

const PARKS = Array.from(new Set(MOCK_ASSETS.map(a => a.park))).sort();

export default function TasksPage() {
  const { toast } = useToast();
  const db = useFirestore();

  // Firebase Queries
  const tasksQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "tasks"), where("status", "!=", "Completed"), orderBy("status"));
  }, [db]);
  const { data: tasks = [], loading: tasksLoading } = useCollection(tasksQuery);

  // Live Users for assignment
  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "users"), where("isArchived", "==", false));
  }, [db]);
  const { data: users = [] } = useCollection<User>(usersQuery);

  const operatives = users.filter(u => u.role === 'operative' || u.role === 'supervisor');

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
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
      case 'Pending Approval': return 'bg-yellow-500/20 text-yellow-700 border-yellow-200 animate-pulse';
      default: return '';
    }
  };

  const handleCreateTask = () => {
    if (!db) return;
    const task = {
      ...newTask,
      status: 'Todo'
    };
    addDoc(collection(db, "tasks"), task);
    setIsTaskDialogOpen(false);
    setNewTask({ title: "", objective: "", park: "", assignedTo: "", dueDate: new Date().toISOString().split('T')[0] });
    toast({ title: "Task Created", description: "The new task has been added to the queue." });
  };

  const handleOpenAssignDialog = (id: string) => {
    setSelectedTaskId(id);
    setIsAssignDialogOpen(true);
  };

  const handleAssign = (operativeName: string) => {
    if (!db || !selectedTaskId) return;
    updateDoc(doc(db, "tasks", selectedTaskId), { assignedTo: operativeName });
    setIsAssignDialogOpen(false);
    setSelectedTaskId(null);
    toast({ title: "Task Reassigned", description: `Task has been assigned to ${operativeName}.` });
  };

  const handleApproveTask = (taskId: string) => {
    if (!db) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // 1. Mark task as Completed (Archives it)
    updateDoc(doc(db, "tasks", taskId), { status: 'Completed' });

    // 2. If it was linked to an issue, verify that issue is also resolved
    if (task.linkedIssueId) {
      updateDoc(doc(db, "issues", task.linkedIssueId), { status: 'Resolved' });
    }

    toast({ title: "Task Approved", description: "Work verified and moved to archives." });
  };

  return (
    <DashboardShell 
      title="Tasks Management" 
      description="Operational tasking and progress monitoring"
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
                      {operatives.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                      {operatives.length === 0 && <SelectItem value="none" disabled>No active operatives</SelectItem>}
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
          {tasksLoading ? (
            <div className="flex justify-center py-20"><Clock className="animate-spin h-8 w-8 text-primary" /></div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl opacity-50">
               <ListTodo className="h-12 w-12 mb-4" />
               <p className="font-bold">No active tasks</p>
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {tasks.map((task) => (
                <Card key={task.id} className="group relative overflow-hidden border-2 hover:border-primary/40 transition-all shadow-sm flex flex-col">
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
                    <CardTitle className="font-headline text-lg sm:text-xl group-hover:text-primary break-words flex-1 min-w-0">
                      {task.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4 px-4 sm:px-6 flex-1">
                    <p className="text-sm font-medium text-foreground/80 mb-4 line-clamp-2">{task.objective}</p>
                    
                    <div className="space-y-4">
                      {task.status === 'Pending Approval' && (
                        <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <span className="text-[10px] font-bold text-yellow-700 uppercase">Work Pending Approval</span>
                          </div>
                          {task.completionImageUrl && (
                            <div className="relative aspect-video w-full rounded border overflow-hidden">
                              <Image src={task.completionImageUrl} alt="Proof" fill className="object-cover" />
                            </div>
                          )}
                          {task.completionNote && (
                            <p className="text-[10px] italic text-muted-foreground">"{task.completionNote}"</p>
                          )}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between text-[10px] font-bold mb-1.5">
                          <span className="uppercase text-muted-foreground">Progress</span>
                          <span className="text-primary">{task.status === 'Pending Approval' ? '100%' : task.status === 'Doing' ? '45%' : '0%'}</span>
                        </div>
                        <Progress value={task.status === 'Pending Approval' ? 100 : task.status === 'Doing' ? 45 : 0} className="h-2" />
                      </div>
                      
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <div 
                          className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded-md transition-colors"
                          onClick={() => handleOpenAssignDialog(task.id)}
                        >
                          <div className="h-8 w-8 rounded-full bg-primary/10 border-primary/20 flex items-center justify-center shrink-0">
                            <UserIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[9px] font-bold uppercase text-muted-foreground leading-none">Assignee</span>
                            <span className="text-xs font-semibold truncate">{task.assignedTo}</span>
                          </div>
                        </div>
                        <Badge className={`${getStatusColor(task.status)} font-bold text-[10px] px-3 py-1 rounded-sm shrink-0`}>
                          {task.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-0 mt-auto border-t">
                    {task.status === 'Pending Approval' ? (
                      <Button 
                        variant="default" 
                        className="w-full rounded-none h-12 font-bold bg-primary hover:bg-primary/90 text-sm"
                        onClick={() => handleApproveTask(task.id)}
                      >
                        <ThumbsUp className="mr-2 h-4 w-4" /> Approve & Archive
                      </Button>
                    ) : (
                      <Button variant="ghost" className="w-full rounded-none h-12 font-headline font-bold text-primary bg-primary/5 hover:bg-primary/10 text-sm">
                        Monitor Progress <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="recurring">
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {MOCK_RECURRING_SCHEDULES.map((schedule) => (
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

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Reassign Task</DialogTitle>
            <DialogDescription>Select a new operative for this task.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              {operatives.map(user => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleAssign(user.name)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{user.name}</span>
                      <span className="text-[10px] text-muted-foreground">{user.team}</span>
                    </div>
                  </div>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
              {operatives.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-4">No active operatives available.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
