
"use client";

import { useState, useMemo } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
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
  User as UserIcon,
  RefreshCcw,
  Trash2,
  Users,
  Inbox,
  FolderArchive,
  Search,
  Filter
} from "lucide-react";
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
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, limit } from "firebase/firestore";
import { Role, Frequency, Task, Asset } from "@/lib/types";
import { useUserContext } from "@/context/UserContext";
import { useDataContext } from "@/context/DataContext";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { addDays, addMonths, format } from "date-fns";

export default function TasksPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [taskLimit, setTaskLimit] = useState(25);
  const tasksQuery = useMemoFirebase(() => 
    db ? query(collection(db, "tasks"), where("status", "!=", "Completed"), limit(taskLimit)) : null, 
  [db, taskLimit]);
  const { data: tasks = [], loading: tasksLoading } = useCollection<Task>(tasksQuery as any);

  const [archivedLimit, setArchivedLimit] = useState(25);
  const archivedTasksQuery = useMemoFirebase(() => 
    db ? query(collection(db, "tasks"), where("status", "==", "Completed"), limit(archivedLimit)) : null, 
  [db, archivedLimit]);
  const { data: archivedTasks = [], loading: archivedTasksLoading } = useCollection<Task>(archivedTasksQuery as any);

  const assetsQuery = useMemoFirebase(() => 
    db ? query(collection(db, "assets"), limit(500)) : null, 
  [db]);
  const { data: assets = [] } = useCollection<Asset>(assetsQuery as any);

  const { profile, permissions, isAdmin, currentUserRoles } = useUserContext();
  const { allUsers: users, allParks: allDetails } = useDataContext();
  const parks = useMemo(() => allDetails.map(p => p.name).sort(), [allDetails]);
  const isOperational = !permissions.viewAllTasks;

  const currentUserName = profile?.name || user?.displayName || user?.email || "";
  const userEffectiveName = currentUserName;

  const identities = useMemo(() => {
    const list = [currentUserName];
    if (user?.email) list.push(user.email.toLowerCase());
    if (user?.displayName) list.push(user.displayName);

    const userDepots = profile?.depots || (profile?.depot ? [profile.depot] : []);
    
    currentUserRoles.forEach((r: any) => {
      userDepots.forEach(d => {
        if (d?.trim?.()) list.push(`Group: ${r} @ ${d.trim()}`);
      });
    });
    
    return Array.from(new Set(list)).slice(0, 10);
  }, [currentUserName, user?.email, user?.displayName, profile, currentUserRoles]);

  const filteredTasksForUser = useMemo(() => {
    if (isAdmin) return tasks;
    
    const roles = currentUserRoles as string[];
    const isGlobalMgmt = roles.some(r => ['Area Manager', 'Operations Manager', 'Park Manager'].includes(r));
    const isDepotMgmt = roles.some(r => ['Head Gardener', 'Assistant Area Manager'].includes(r));
    const userDepots = profile?.depots?.length ? profile.depots : (profile?.depot ? [profile.depot] : []);
    
    return tasks.filter(t => {
      // 1. Direct Assignment (Always visible)
      const isDirectlyAssigned = identities.some(ident => 
        t.assignedTo?.toLowerCase() === ident.toLowerCase() || t.assignedTo === ident
      );
      if (isDirectlyAssigned) return true;

      // 2. Global Management (Sees everything)
      if (isGlobalMgmt) return true;

      // 3. Depot Management (Sees all in their depots)
      if (isDepotMgmt) {
        const parkDetail = allDetails.find(d => d.name === t.park);
        if (parkDetail?.depot && userDepots.includes(parkDetail.depot)) return true;
      }

      // 4. Operatives (Only see their own assignments - already caught by step 1)
      return false;
    });
  }, [tasks, isAdmin, currentUserRoles, profile, allDetails, identities]);

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showAllStaff, setShowAllStaff] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");

  const selectedTask = useMemo(() => tasks.find(t => t.id === selectedTaskId), [tasks, selectedTaskId]);
  const targetDepot = useMemo(() => {
    if (!selectedTask) return null;
    return allDetails.find(d => d.name === selectedTask.park)?.depot;
  }, [selectedTask, allDetails]);

  const assignableStaff = useMemo(() => {
    let list = users;
    
    if (assignSearch) {
        const search = assignSearch.toLowerCase();
        list = list.filter(u => 
            u.name.toLowerCase().includes(search) || 
            u.email.toLowerCase().includes(search) ||
            u.role?.toLowerCase().includes(search) ||
            u.roles?.some(r => r.toLowerCase().includes(search))
        );
    }

    if (showAllStaff) return list;

    if (!targetDepot) return list;
    return list.filter(u => {
        const userDepots = u.depots || (u.depot ? [u.depot] : []);
        return userDepots.includes(targetDepot);
    });
  }, [users, targetDepot, showAllStaff, assignSearch]);
  
  const [isGroupAssign, setIsGroupAssign] = useState(false);
  const [groupRole, setGroupRole] = useState<Role>("Keeper");
  const [groupPark, setGroupPark] = useState("");
  const [newTask, setNewTask] = useState({
    title: "",
    objective: "",
    park: "",
    assignedTo: "",
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    frequency: "One-off" as Frequency
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Todo': return 'bg-muted text-muted-foreground';
      case 'Doing': return 'bg-accent text-accent-foreground';
      case 'Pending Approval': return 'bg-yellow-500/20 text-yellow-700 border-yellow-200 animate-pulse';
      default: return '';
    }
  };

  const handleCreateTask = async () => {
    if (!db || isSubmitting) return;
    setIsSubmitting(true);
    const taskData = {
        title: newTask.title,
        objective: newTask.objective,
        park: newTask.park,
        assignedTo: isGroupAssign ? `Group: ${groupRole} @ ${groupPark}` : newTask.assignedTo,
        dueDate: newTask.dueDate,
        frequency: newTask.frequency !== 'One-off' ? newTask.frequency : null,
        status: 'Todo' as const,
    };

    try {
        await addDoc(collection(db, "tasks"), taskData);
        toast({ title: "Task Created", description: `Task assigned to ${taskData.assignedTo}.` });
        setIsTaskDialogOpen(false);
        setNewTask({ title: "", objective: "", park: "", assignedTo: "", dueDate: format(new Date(), 'yyyy-MM-dd'), frequency: "One-off" });
        setIsGroupAssign(false);
    } catch (error) {
        toast({ title: "Error", description: "Failed to create task.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
};

  const handleDeleteTask = async (taskId: string) => {
    if (!db || !isAdmin) return;
    try {
        await deleteDoc(doc(db, "tasks", taskId));
        toast({ title: "Task Deleted" });
    } catch (error) {
        toast({ title: "Error", description: "Failed to delete task.", variant: "destructive" });
    }
  };

  const calculateNextDueDate = (currentDate: string, frequency: Frequency) => {
    const date = new Date(currentDate);
    switch (frequency) {
      case 'Daily': return format(addDays(date, 1), 'yyyy-MM-dd');
      case 'Weekly': return format(addDays(date, 7), 'yyyy-MM-dd');
      case 'Monthly': return format(addMonths(date, 1), 'yyyy-MM-dd');
      case 'Six Monthly': return format(addMonths(date, 6), 'yyyy-MM-dd');
      case 'Yearly': return format(addMonths(date, 12), 'yyyy-MM-dd');
      default: return null;
    }
  };

  const handleOpenAssignDialog = (id: string) => {
    setSelectedTaskId(id);
    setShowAllStaff(false);
    setAssignSearch("");
    setIsAssignDialogOpen(true);
  };

  const handleAssign = async (operativeName: string) => {
    if (!db || !selectedTaskId || isSubmitting) return;
    setIsSubmitting(true);
    try {
        await updateDoc(doc(db, "tasks", selectedTaskId), { assignedTo: operativeName });
        setIsAssignDialogOpen(false);
        setSelectedTaskId(null);
        toast({ title: "Task Reassigned", description: `Task has been assigned to ${operativeName}.` });
    } catch (error) {
        toast({ title: "Error", description: "Failed to reassign task.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleApproveTask = async (taskId: string) => {
    if (!db || isSubmitting) return;
    setIsSubmitting(true);
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
        toast({ title: "Error", description: "Task not found.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    try {
        await updateDoc(doc(db, "tasks", taskId), { status: 'Completed' });

        if (task.frequency && task.frequency !== 'One-off') {
            const nextDate = calculateNextDueDate(task.dueDate, task.frequency);
            if (nextDate) {
                await addDoc(collection(db, "tasks"), {
                    title: task.title,
                    objective: task.objective,
                    park: task.park,
                    assignedTo: task.assignedTo,
                    dueDate: nextDate,
                    frequency: task.frequency,
                    status: 'Todo'
                });
            }
        }

        if (task.linkedIssueId) {
            await updateDoc(doc(db, "issues", task.linkedIssueId), { status: 'Resolved' });
        }

        toast({ title: "Task Approved", description: "Work verified and moved to archives." });
    } catch (error) {
        toast({ title: "Error", description: "Failed to approve task.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <DashboardShell 
      title={isOperational ? "Active Tasks" : "Tasks Management"} 
      description={isOperational ? "Operational work queue" : "Operational tasking and progress monitoring"}
      actions={permissions.createTask && (
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
                <Input placeholder="Task Title e.g. Mow North Lawn" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
                <Textarea placeholder="Objective: What needs to be achieved?" value={newTask.objective} onChange={e => setNewTask({...newTask, objective: e.target.value})} />
              <div className="space-y-4 pt-2 border-t mt-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Group Assignment</Label>
                    <p className="text-[10px] text-muted-foreground italic">Allocate to a whole team at a park</p>
                  </div>
                  <Switch checked={isGroupAssign} onCheckedChange={setIsGroupAssign} />
                </div>

                {isGroupAssign ? (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="grid gap-2">
                      <Label className="text-xs">Team / Role</Label>
                      <Select value={groupRole} onValueChange={(v: Role) => setGroupRole(v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Keeper">Keepers</SelectItem>
                          <SelectItem value="Gardener">Gardeners</SelectItem>
                          <SelectItem value="Litter Picker">Litter Pickers</SelectItem>
                          <SelectItem value="Bin Run">Bin Run Team</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs">Location / Depot</Label>
                      <Select value={groupPark} onValueChange={v => setGroupPark(v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select Depot" /></SelectTrigger>
                        <SelectContent>
                          {parks.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <Select value={newTask.park} onValueChange={v => setNewTask({...newTask, park: v})}>
                        <SelectTrigger><SelectValue placeholder="Select Park" /></SelectTrigger>
                        <SelectContent>
                            {parks.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={newTask.assignedTo} onValueChange={v => setNewTask({...newTask, assignedTo: v})}>
                        <SelectTrigger><SelectValue placeholder="Select Assignee" /></SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            {users.map(u => <SelectItem key={u.id} value={u.name}>{u.name} ({u.role || u.roles?.[0]})</SelectItem>)}
                        </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input type="date" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} />
                <Select value={newTask.frequency} onValueChange={(v: Frequency) => setNewTask({...newTask, frequency: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="One-off">One-off</SelectItem>
                        <SelectItem value="Daily">Daily</SelectItem>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Six Monthly">Six Monthly</SelectItem>
                        <SelectItem value="Yearly">Yearly</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button className="w-full" onClick={handleCreateTask} disabled={!newTask.title || (!isGroupAssign && (!newTask.park || !newTask.assignedTo)) || (isGroupAssign && (!groupRole || !groupPark)) || isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Task"}
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    >
      {!isOperational ? (
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="active" className="flex items-center gap-2"><ListTodo className="h-4 w-4" /> Active Tasks</TabsTrigger>
            <TabsTrigger value="approvals" className="flex items-center gap-2 relative">
              <Inbox className="h-4 w-4" /> Work Logs
              {filteredTasksForUser.filter(t => t.status === 'Pending Approval').length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold shadow-sm">
                  {filteredTasksForUser.filter(t => t.status === 'Pending Approval').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="recurring" className="flex items-center gap-2"><RotateCcw className="h-4 w-4" /> Recurring Schedules</TabsTrigger>
            <TabsTrigger value="archived" className="flex items-center gap-2"><FolderArchive className="h-4 w-4" /> Archived Log</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {tasksLoading ? (
              <div className="flex justify-center py-20"><Clock className="animate-spin h-8 w-8 text-primary" /></div>
            ) : filteredTasksForUser.filter(t => t.status !== 'Pending Approval').length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl opacity-50">
                 <ListTodo className="h-12 w-12 mb-4" />
                 <p className="font-bold">No active tasks for today</p>
              </div>
            ) : (
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {filteredTasksForUser.filter(t => t.status !== 'Pending Approval').map((task) => (
                  <Card key={task.id} className="group relative overflow-hidden border-2 hover:border-primary/40 transition-all shadow-sm flex flex-col">
                    <CardHeader className="pb-3 px-4 sm:px-6">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30 uppercase tracking-widest shrink-0 w-fit">{task.park}</Badge>
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/40 text-[10px] font-bold text-muted-foreground shrink-0"><Clock className="h-3 w-3" />{task.dueDate}</div>
                      </div>
                      <CardTitle className="font-headline text-lg sm:text-xl group-hover:text-primary break-words flex-1 min-w-0">{task.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4 px-4 sm:px-6 flex-1">
                      <p className="text-sm font-medium text-foreground/80 mb-4 line-clamp-2">{task.objective}</p>
                      <div className="space-y-4">
                        {task.status === 'Pending Approval' && (
                          <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 flex flex-col gap-2">
                            <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-yellow-600" /><span className="text-[10px] font-bold text-yellow-700 uppercase">Work Pending Approval</span></div>
                            {task.collaborators && task.collaborators.length > 0 && <div className="flex items-center gap-1.5 mb-1"><Users className="h-3 w-3 text-muted-foreground" /><span className="text-[10px] font-bold text-muted-foreground">Assisted by: {task.collaborators.join(', ')}</span></div>}
                            {task.completionImageUrl && <div className="relative aspect-video w-full rounded border overflow-hidden"><Image src={task.completionImageUrl} alt="Proof" fill className="object-cover" /></div>}
                            {task.completionNote && <p className="text-[10px] italic text-muted-foreground">"{task.completionNote}"</p>}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-bold mb-1.5"><span className="uppercase text-muted-foreground">Progress</span><span className="text-primary">{task.status === 'Pending Approval' ? '100%' : task.status === 'Doing' ? '45%' : '0%'}</span></div>
                          <Progress value={task.status === 'Pending Approval' ? 100 : task.status === 'Doing' ? 45 : 0} className="h-2" />
                        </div>
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
                          <div className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded-md transition-colors" onClick={() => handleOpenAssignDialog(task.id)}>
                            <div className="h-8 w-8 rounded-full bg-primary/10 border-primary/20 flex items-center justify-center shrink-0"><UserIcon className="h-4 w-4 text-primary" /></div>
                            <div className="flex flex-col min-w-0"><span className="text-[9px] font-bold uppercase text-muted-foreground leading-none">Assignee</span><span className="text-xs font-semibold truncate">{task.assignedTo}</span></div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className={`${getStatusColor(task.status)} font-bold text-[10px] px-3 py-1 rounded-sm`}>{task.status.toUpperCase()}</Badge>
                            {isAdmin && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="p-0 mt-auto border-t">
                      {task.status === 'Pending Approval' ? (
                        <Button variant="default" className="w-full rounded-none h-12 font-bold bg-primary hover:bg-primary/90 text-sm" onClick={() => handleApproveTask(task.id)} disabled={isSubmitting}><ThumbsUp className="mr-2 h-4 w-4" /> {isSubmitting ? "Approving..." : "Approve & Archive"}</Button>
                      ) : (
                        <Button variant="ghost" className="w-full rounded-none h-12 font-headline font-bold text-primary bg-primary/5 hover:bg-primary/10 text-sm">Monitor Progress <ChevronRight className="ml-2 h-4 w-4" /></Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approvals">
            {filteredTasksForUser.filter(t => t.status === 'Pending Approval').length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl opacity-50">
                 <Inbox className="h-12 w-12 mb-4" />
                 <p className="font-bold">No work logs pending approval</p>
                 <p className="text-xs text-muted-foreground mt-1 text-center">Operational reports from the field will appear here.</p>
              </div>
            ) : (
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {filteredTasksForUser.filter(t => t.status === 'Pending Approval').map((task) => (
                  <Card key={task.id} className="group relative overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-all shadow-md flex flex-col bg-accent/5">
                    <div className="absolute top-0 right-0 p-2">
                      {task.isLog ? (
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] uppercase font-bold tracking-widest shadow-sm">Ad-hoc Log</Badge>
                      ) : (
                        <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200 text-[9px] uppercase font-bold tracking-widest shadow-sm">Allocated Task</Badge>
                      )}
                    </div>
                    <CardHeader className="pb-3 px-4 sm:px-6 pr-20">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30 uppercase tracking-widest shrink-0 w-fit">{task.park}</Badge>
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/40 text-[10px] font-bold text-muted-foreground shrink-0"><Clock className="h-3 w-3" /> Submitted {task.dueDate}</div>
                      </div>
                      <CardTitle className="font-headline text-lg sm:text-xl text-foreground break-words flex-1 min-w-0">{task.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4 px-4 sm:px-6 flex-1">
                      <div className="space-y-4">
                        <div className="p-3 rounded-lg bg-card border shadow-sm flex flex-col gap-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                              <UserIcon className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold uppercase text-muted-foreground leading-none tracking-tight">Reported By</span>
                              <span className="text-sm font-bold text-foreground">{task.assignedTo}</span>
                            </div>
                          </div>
                          
                          {task.collaborators && task.collaborators.length > 0 && (
                            <div className="pt-2 border-t flex flex-wrap gap-1.5">
                               <div className="w-full text-[9px] font-bold uppercase text-muted-foreground mb-1 leading-none">Collaborators</div>
                               {task.collaborators.map(c => <Badge key={c} variant="secondary" className="text-[9px] px-2 py-0.5 font-bold uppercase bg-muted/50 border-muted-foreground/10">{c}</Badge>)}
                            </div>
                          )}
                          
                          <div className="pt-3 border-t">
                            <p className="text-xs font-medium text-foreground leading-relaxed italic">"{task.completionNote || task.objective}"</p>
                          </div>
                          
                          {task.completionImageUrl && (
                            <div className="relative aspect-video w-full rounded-xl border border-primary/10 overflow-hidden bg-muted/20 mt-1 ring-4 ring-white shadow-inner">
                              <Image src={task.completionImageUrl} alt="Proof" fill className="object-cover" />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="p-0 mt-auto border-t">
                      <Button variant="default" className="w-full rounded-none h-14 font-bold bg-primary hover:bg-primary/90 text-sm tracking-widest shadow-inner shadow-white/10" onClick={() => handleApproveTask(task.id)} disabled={isSubmitting}>
                        <ThumbsUp className="mr-2 h-5 w-5" /> {isSubmitting ? "Approving..." : "Approve & Archive"}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recurring">
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
               {filteredTasksForUser.filter(t => t.frequency).map((task) => (
                  <Card key={task.id} className="border-2 hover:border-accent transition-colors shadow-sm">
                  <CardHeader>
                    <div className="flex justify-between items-center mb-2">
                      <Badge className="bg-accent text-accent-foreground font-bold text-[10px] uppercase">{task.frequency}</Badge>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-bold">{task.park}</Badge>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteTask(task.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <CardTitle className="text-lg font-headline">{task.title}</CardTitle>
                    <CardDescription className="text-xs font-medium text-muted-foreground">Next instance due: <span className="text-foreground font-bold">{task.dueDate}</span></CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase py-2 border-y border-dashed"><span className="text-muted-foreground">Assigned To</span><span className="text-foreground">{task.assignedTo}</span></div>
                      <div className="flex items-center gap-2 p-2 rounded bg-muted/20 text-[10px] font-medium italic text-muted-foreground"><RefreshCcw className="h-3 w-3" /> This schedule will automatically renew upon completion.</div>
                    </div>
                  </CardContent>
                </Card>
               ))}
               {tasks.filter(t => t.frequency).length === 0 && <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl opacity-50"><p className="text-sm font-bold">No recurring task schedules active.</p></div>}
            </div>
          </TabsContent>
          <TabsContent value="archived">
            <Card className="overflow-hidden border-2">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-headline font-bold">Task Detail</TableHead>
                    <TableHead className="font-headline font-bold">Park</TableHead>
                    <TableHead className="font-headline font-bold">Operative</TableHead>
                    <TableHead className="font-headline font-bold">Completed Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archivedTasksLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                        <Clock className="h-6 w-6 animate-spin mx-auto mb-2" />
                        Loading archives...
                      </TableCell>
                    </TableRow>
                  ) : archivedTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                        No archived tasks found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    archivedTasks.map((task) => (
                      <TableRow key={task.id} className="hover:bg-accent/5 transition-colors">
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold line-clamp-1">{task.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs"><MapPin className="h-3.5 w-3.5 text-primary" />{task.park}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2"><UserIcon className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-xs font-medium">{task.assignedTo}</span></div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : task.dueDate}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6">
          {tasksLoading ? (
             <div className="flex justify-center py-20"><Clock className="animate-spin h-8 w-8 text-primary" /></div>
          ) : filteredTasksForUser.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl opacity-50 bg-muted/10">
               <ListTodo className="h-12 w-12 mb-4" />
               <p className="font-bold">No tasks allocated to you or your team</p>
               <p className="text-xs text-muted-foreground">Contact your manager if you're expecting work.</p>
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {filteredTasksForUser.map((task) => (
                <Card key={task.id} className="relative overflow-hidden border-2 hover:border-primary/40 transition-all flex flex-col">
                  <CardHeader className="pb-3 px-4">
                    <div className="flex justify-between items-center mb-2">
                       <Badge variant="outline" className="text-[10px] font-bold text-primary uppercase">{task.park}</Badge>
                       <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground"><Clock className="h-3 w-3" />{task.dueDate}</div>
                    </div>
                    <CardTitle className="font-headline text-lg group-hover:text-primary">{task.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4 px-4 flex-1">
                    <p className="text-sm font-medium text-foreground/80 line-clamp-3">{task.objective}</p>
                  </CardContent>
                  <CardFooter className="p-0 border-t mt-auto">
                    <div className="flex-1 flex items-center justify-center h-12 text-[10px] font-bold text-muted-foreground uppercase bg-muted/20 w-full rounded-b-lg">
                      {task.status === 'Pending Approval' ? 'Under Review' : task.status === 'Doing' ? 'In Progress' : 'Not Started'}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tasks.length >= taskLimit && !tasksLoading && (
        <div className="flex justify-center pt-6 pb-2">
          <Button variant="outline" className="w-full md:w-auto px-8" onClick={() => setTaskLimit(p => p + 25)}>
            Load More Assignments
          </Button>
        </div>
      )}


      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="font-headline">Reassign Task</DialogTitle>
            <DialogDescription>Change the staff member responsible for this task.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Select Staff Member</Label>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{showAllStaff ? 'Showing All' : `Depot: ${targetDepot || 'Any'}`}</span>
                    <Switch checked={showAllStaff} onCheckedChange={setShowAllStaff} />
                </div>
              </div>
              
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input 
                    placeholder="Search staff by name or role..." 
                    className="h-8 pl-8 text-xs" 
                    value={assignSearch}
                    onChange={e => setAssignSearch(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 mt-2">
                {assignableStaff.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded-xl hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => handleAssign(user.name)}>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border"><AvatarImage src={user.avatar} /><AvatarFallback>{user.name.charAt(0)}</AvatarFallback></Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{user.name}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted font-bold text-muted-foreground uppercase">{user.role || (user.roles?.[0])}</span>
                            <span className="text-[9px] text-muted-foreground truncate max-w-[150px]">{user.depots?.length ? user.depots.join(', ') : user.depot}</span>
                        </div>
                      </div>
                    </div>
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
                {assignableStaff.length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed rounded-xl">
                        <p className="text-xs text-muted-foreground italic mb-2">No staff found {showAllStaff ? '' : `for ${targetDepot}`}</p>
                        {!showAllStaff && (
                            <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => setShowAllStaff(true)}>Show All Staff</Button>
                        )}
                    </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
