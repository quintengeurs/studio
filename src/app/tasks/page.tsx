
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
  User as UserIcon,
  RefreshCcw,
  Trash2,
  Users,
  Inbox,
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
import { useFirestore, useCollection, useMemoFirebase, useDoc, useUser } from "@/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy } from "firebase/firestore";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { User, Task, Frequency, Asset, OPERATIVE_ROLES, Role, RegistryConfig, ParkDetail } from "@/lib/types";
import { addDays, addMonths, format, parseISO } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { getNextBespokeOccurrence } from "@/lib/scheduling-utils";

export default function TasksPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isGroupAssign, setIsGroupAssign] = useState(false);
  const [groupRole, setGroupRole] = useState<Role>("Keeper");
  const [groupPark, setGroupPark] = useState("");

  const tasksQuery = useMemoFirebase(() => db ? query(collection(db, "tasks"), where("status", "!=", "Completed"), orderBy("status")) : null, [db]);
  const { data: tasks = [], loading: tasksLoading } = useCollection<Task>(tasksQuery as any);

  const assetsQuery = useMemoFirebase(() => db ? query(collection(db, "assets"), orderBy("name")) : null, [db]);
  const { data: assets = [] } = useCollection<Asset>(assetsQuery as any);

  const usersQuery = useMemoFirebase(() => db ? query(collection(db, "users"), where("isArchived", "==", false)) : null, [db]);
  const { data: users = [] } = useCollection<User>(usersQuery as any);

  const registryConfigRef = useMemo(() => db ? doc(db, "settings", "registry") : null, [db]);
  const { data: registryConfig } = useDoc<RegistryConfig>(registryConfigRef as any);

  const detailsQuery = useMemoFirebase(() => db ? query(collection(db, "parks_details")) : null, [db]);
  const { data: allDetails = [] } = useCollection<ParkDetail>(detailsQuery as any);
  
  const currentUserData = users.find(u => u.email?.toLowerCase() === user?.email?.toLowerCase());
  const isAdmin = currentUserData?.role === 'Admin' || user?.email?.toLowerCase() === 'quinten.geurs@gmail.com';
  const isOperational = useMemo(() => 
    currentUserData?.role && OPERATIVE_ROLES.includes(currentUserData.role),
  [currentUserData]);

  const currentUserName = useMemo(() => {
    if (currentUserData?.name) return currentUserData.name;
    if (user?.email?.toLowerCase() === 'quinten.geurs@gmail.com') return "Quinten (Admin)";
    return user?.displayName || user?.email || "";
  }, [currentUserData, user]);

  const colleagues = useMemo(() => {
    if (!currentUserData) return [];
    return users.filter(u => 
      u.depot === currentUserData.depot && 
      u.name !== currentUserName && 
      !u.isArchived
    );
  }, [users, currentUserData, currentUserName]);

  const groupIdentity = useMemo(() => {
    if (!currentUserData?.role || !currentUserData?.depot) return null;
    return `Group: ${currentUserData.role} @ ${currentUserData.depot}`;
  }, [currentUserData]);

  const filteredTasksForUser = useMemo(() => {
    return tasks.filter(t => {
      // 1. Check Search Match
      const search = searchQuery.toLowerCase();
      const matchesSearch = 
        t.title.toLowerCase().includes(search) ||
        t.park.toLowerCase().includes(search) ||
        t.assignedTo.toLowerCase().includes(search) ||
        (t.objective || "").toLowerCase().includes(search);

      if (!matchesSearch) return false;

      // 2. Original Permission Checks
      if (isAdmin) return true;
      
      const userDepots = currentUserData?.depots?.length ? currentUserData.depots : (currentUserData?.depot ? [currentUserData.depot] : []);
      
      // Direct assignment
      const identities = [currentUserName];
      if (user?.email) identities.push(user.email.toLowerCase());
      if (user?.displayName) identities.push(user.displayName);
      if (groupIdentity) identities.push(groupIdentity);
      
      const isDirectlyAssigned = identities.some(ident => 
        t.assignedTo?.toLowerCase() === ident.toLowerCase() || t.assignedTo === ident
      );
      
      if (isDirectlyAssigned) return true;

      // Depot containment
      const parkDetail = allDetails.find(d => d.name === t.park);
      if (parkDetail?.depot && userDepots.includes(parkDetail.depot)) return true;

      if (userDepots.length === 0) return identities.includes(t.assignedTo);

      return false;
    });
  }, [tasks, isAdmin, currentUserData, allDetails, currentUserName, groupIdentity, searchQuery]);

  const assignableUsers = users;
  const parks = registryConfig?.parks?.sort() ?? Array.from(new Set(assets.map(a => a.park))).sort();


  
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const [newTask, setNewTask] = useState({
    title: "",
    objective: "",
    park: "",
    assignedTo: "",
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    frequency: "One-off" as Frequency,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: "",
    daysOfWeek: [] as number[],
    isBespoke: false
  });
  const [selectedParks, setSelectedParks] = useState<string[]>([]);

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
    const parksToCreate = selectedParks.length > 0 ? selectedParks : [newTask.park];
    
    try {
        for (const park of parksToCreate) {
            if (!park) continue;
            
            const taskData = {
                title: newTask.title,
                objective: newTask.objective,
                park: park,
                assignedTo: isGroupAssign ? `Group: ${groupRole} @ ${groupPark}` : newTask.assignedTo,
                dueDate: newTask.dueDate,
                frequency: newTask.isBespoke ? 'Bespoke' : (newTask.frequency !== 'One-off' ? newTask.frequency : null),
                status: 'Todo' as const,
                ...(newTask.isBespoke && {
                    isBespoke: true,
                    startDate: newTask.startDate,
                    endDate: newTask.endDate,
                    daysOfWeek: newTask.daysOfWeek
                })
            };
            await addDoc(collection(db, "tasks"), taskData);
        }
        
        toast({ title: "Task(s) Created", description: `Task(s) assigned for ${parksToCreate.length} site(s).` });
        setIsTaskDialogOpen(false);
        setNewTask({ 
            title: "", objective: "", park: "", assignedTo: "", 
            dueDate: format(new Date(), 'yyyy-MM-dd'), frequency: "One-off",
            startDate: format(new Date(), 'yyyy-MM-dd'), endDate: "",
            daysOfWeek: [], isBespoke: false
        });
        setSelectedParks([]);
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
            let nextDate: string | null = null;
            
            if (task.isBespoke && task.daysOfWeek) {
                nextDate = getNextBespokeOccurrence(task.dueDate, task.daysOfWeek, task.endDate || undefined);
            } else if (task.frequency) {
                nextDate = calculateNextDueDate(task.dueDate, task.frequency as Frequency);
            }

            if (nextDate) {
                await addDoc(collection(db, "tasks"), {
                    title: task.title,
                    objective: task.objective,
                    park: task.park,
                    assignedTo: task.assignedTo,
                    dueDate: nextDate,
                    frequency: task.frequency,
                    status: 'Todo',
                    ...(task.isBespoke && {
                        isBespoke: true,
                        startDate: task.startDate,
                        endDate: task.endDate,
                        daysOfWeek: task.daysOfWeek
                    })
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
      actions={!isOperational && (
        <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
          <DialogTrigger asChild>
            <Button className="font-headline font-bold w-full md:w-auto shadow-lg hover:shadow-xl transition-all">
              <Plus className="mr-2 h-4 w-4" /> Create New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] w-[95vw] shadow-2xl rounded-3xl">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl tracking-tight">Allocate Task</DialogTitle>
              <DialogDescription>Assign objectives to specific operatives or teams.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title" className="text-[10px] font-bold uppercase tracking-widest opacity-60">Task Label</Label>
                <Input id="title" placeholder="e.g. Broken Fence Repair" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="h-11 px-4 text-sm font-medium focus-visible:ring-primary shadow-sm" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="objective" className="text-[10px] font-bold uppercase tracking-widest opacity-60">Instructions</Label>
                <Textarea id="objective" placeholder="Detailed objectives..." value={newTask.objective} onChange={e => setNewTask({...newTask, objective: e.target.value})} className="min-h-[100px] text-sm font-medium focus-visible:ring-primary shadow-sm" />
              </div>
              
              <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Site Locations (Select Multiple)</Label>
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-xl max-h-[120px] overflow-y-auto bg-muted/10">
                  {parks.map(p => (
                    <div key={p} className="flex items-center gap-2">
                      <Checkbox 
                        id={`park-${p}`} 
                        checked={selectedParks.includes(p)} 
                        onCheckedChange={(checked: boolean) => {
                          if (checked) setSelectedParks(prev => [...prev, p]);
                          else setSelectedParks(prev => prev.filter(item => item !== p));
                        }}
                      />
                      <Label htmlFor={`park-${p}`} className="text-xs font-medium cursor-pointer">{p}</Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Allocation Type</Label>
                  <div className="flex items-center gap-2 h-11 border px-3 rounded-md bg-muted/20">
                    <Switch checked={isGroupAssign} onCheckedChange={setIsGroupAssign} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Group</span>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Schedule Type</Label>
                  <div className="flex items-center gap-2 h-11 border px-3 rounded-md bg-muted/20">
                    <Switch checked={newTask.isBespoke} onCheckedChange={(v: boolean) => setNewTask({...newTask, isBespoke: v})} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Bespoke</span>
                  </div>
                </div>
              </div>

              {newTask.isBespoke && (
                <div className="p-4 border-2 border-primary/20 rounded-2xl bg-primary/5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Start Date</Label>
                      <Input type="date" value={newTask.startDate} onChange={e => setNewTask({...newTask, startDate: e.target.value})} className="h-9" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">End Date (Optional)</Label>
                      <Input type="date" value={newTask.endDate} onChange={e => setNewTask({...newTask, endDate: e.target.value})} className="h-9" />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Frequency: Repeat Every</Label>
                    <div className="flex flex-wrap gap-3 pt-1">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
                        const dayValue = (idx + 1) % 7;
                        return (
                          <div key={idx} className="flex flex-col items-center gap-1">
                            <Checkbox 
                              checked={newTask.daysOfWeek.includes(dayValue)}
                              onCheckedChange={(checked: boolean) => {
                                if (checked) setNewTask(prev => ({ ...prev, daysOfWeek: [...prev.daysOfWeek, dayValue] }));
                                else setNewTask(prev => ({ ...prev, daysOfWeek: prev.daysOfWeek.filter(d => d !== dayValue) }));
                              }}
                            />
                            <span className="text-[9px] font-bold opacity-60">{day}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {!newTask.isBespoke && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Due Date</Label>
                    <Input type="date" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} className="h-11 shadow-sm" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Recurrence</Label>
                    <Select value={newTask.frequency} onValueChange={(v: Frequency) => setNewTask({...newTask, frequency: v})}>
                      <SelectTrigger className="h-11 shadow-sm"><SelectValue placeholder="Frequency" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="One-off">One-off</SelectItem>
                        <SelectItem value="Daily">Daily</SelectItem>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {!isGroupAssign ? (
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Assign To Operative</Label>
                    <Select value={newTask.assignedTo} onValueChange={v => setNewTask({...newTask, assignedTo: v})}>
                      <SelectTrigger className="h-11 shadow-sm"><SelectValue placeholder="Search operatives..." /></SelectTrigger>
                      <SelectContent>
                          {assignableUsers.map(u => <SelectItem key={u.id} value={u.name || (u.email as string)}>{u.name || u.email}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Role Group</Label>
                    <Select value={groupRole} onValueChange={(v: any) => setGroupRole(v)}>
                      <SelectTrigger className="h-11 shadow-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Keeper">Keepers</SelectItem>
                        <SelectItem value="Gardener">Gardeners</SelectItem>
                        <SelectItem value="Litter Picker">Litter Pickers</SelectItem>
                        <SelectItem value="Bin Run">Bin Runs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Depot Target</Label>
                    <Select value={groupPark} onValueChange={setGroupPark}>
                      <SelectTrigger className="h-11 shadow-sm"><SelectValue placeholder="Depot" /></SelectTrigger>
                      <SelectContent>
                        {Array.from(new Set(allDetails.map(d => d.depot).filter(Boolean))).map(depot => (
                          <SelectItem key={depot} value={depot as string}>{depot}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreateTask} disabled={!newTask.title || isSubmitting} className="w-full h-12 font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                {isSubmitting ? "Creating..." : "Confirm Deployment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    >
      <div className="space-y-6 pb-20">
        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Filter tasks by site, operative, or title..." 
            className="pl-10 h-12 bg-background border-2 focus-visible:ring-primary shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {tasksLoading ? (
          <div className="flex justify-center py-20"><Clock className="animate-spin h-8 w-8 text-primary" /></div>
        ) : !isOperational ? (
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-6 h-12 p-1 bg-muted/50 border rounded-xl">
            <TabsTrigger value="active" className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest rounded-lg data-[state=active]:bg-background"><ListTodo className="h-4 w-4" /> Active Tasks</TabsTrigger>
            <TabsTrigger value="approvals" className="flex items-center gap-2 relative font-bold text-xs uppercase tracking-widest rounded-lg data-[state=active]:bg-background">
              <Inbox className="h-4 w-4" /> Work Logs
              {tasks.filter(t => t.status === 'Pending Approval').length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold shadow-sm">
                  {tasks.filter(t => t.status === 'Pending Approval').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="recurring" className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest rounded-lg data-[state=active]:bg-background"><RotateCcw className="h-4 w-4" /> Recurring Schedules</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {tasksLoading ? (
              <div className="flex justify-center py-20"><Clock className="animate-spin h-8 w-8 text-primary" /></div>
            ) : filteredTasksForUser.filter(t => t.status !== 'Pending Approval' && t.status !== 'Completed' && t.dueDate <= today).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-3xl bg-muted/5 opacity-50">
                 <ListTodo className="h-12 w-12 mb-4" />
                 <p className="font-bold">No active tasks found matching criteria</p>
              </div>
            ) : (
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {filteredTasksForUser.filter(t => t.status !== 'Pending Approval' && t.status !== 'Completed' && t.dueDate <= today).map((task) => (
                  <Card key={task.id} className="group relative overflow-hidden border-2 hover:border-primary/40 hover:shadow-xl transition-all shadow-sm flex flex-col rounded-2xl">
                    <CardHeader className="pb-3 px-4 sm:px-6">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30 uppercase tracking-widest shrink-0 w-fit">{task.park}</Badge>
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/40 text-[10px] font-bold text-muted-foreground shrink-0"><Clock className="h-3 w-3" />{task.dueDate}</div>
                      </div>
                      <CardTitle className="font-headline text-lg sm:text-xl group-hover:text-primary transition-colors break-words flex-1 min-w-0 tracking-tight">{task.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4 px-4 sm:px-6 flex-1">
                      <p className="text-sm font-medium text-foreground/80 mb-4 line-clamp-2 leading-relaxed">{task.objective}</p>
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
            {tasks.filter(t => t.status === 'Pending Approval').length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl opacity-50">
                 <Inbox className="h-12 w-12 mb-4" />
                 <p className="font-bold">No work logs pending approval</p>
                 <p className="text-xs text-muted-foreground mt-1 text-center">Operational reports from the field will appear here.</p>
              </div>
            ) : (
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {tasks.filter(t => t.status === 'Pending Approval').map((task) => (
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
               {tasks.filter(t => t.frequency).map((task) => (
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


      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Reassign Task</DialogTitle>
            <DialogDescription>Select a new operative for this task.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              {assignableUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => handleAssign(user.name)}>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border"><AvatarImage src={user.avatar} /><AvatarFallback>{user.name.charAt(0)}</AvatarFallback></Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{user.name}</span>
                      <span className="text-[10px] text-muted-foreground">{user.depots?.length ? user.depots.join(', ') : user.depot}</span>
                    </div>
                  </div>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
              {assignableUsers.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">No active staff assignable.</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </DashboardShell>
  );
}
