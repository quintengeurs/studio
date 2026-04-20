"use client";

import { useState, useMemo } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertTriangle, 
  CheckCircle2, 
  MapPin, 
  Users, 
  TrendingUp,
  Clock,
  Package,
  PlusCircle,
  ClipboardList,
  ListTodo,
  ClipboardCheck,
  Building2
} from "lucide-react";
import { 
  ResponsiveContainer, 
  Tooltip,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, where, doc, updateDoc, orderBy, limit, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Issue, Task, User, Role, OFFICE_ROLES, OPS_ROLES, SENIOR_OPS_ROLES, SENIOR_MGMT_ROLES, OPERATIVE_ROLES } from "@/lib/types";
import Link from "next/link";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { RequestModal } from "@/components/modals/request-modal";
import { LogWorkModal } from "@/components/modals/log-work-modal";
import { TrainingUpdateModal } from "@/components/modals/training-update-modal";
import { TaskDetailModal } from "@/components/modals/task-detail-modal";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { RegistryConfig } from "@/lib/types";

export default function Dashboard() {
  const db = useFirestore();
  const { user } = useUser();
  const isMobile = useIsMobile();
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [logWorkModalOpen, setLogWorkModalOpen] = useState(false);
  const [trainingModalOpen, setTrainingModalOpen] = useState(false);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const userDisplayName = user?.displayName || user?.email || "";
  const { toast } = useToast();

  const registryRef = useMemo(() => db ? doc(db, "settings", "registry") : null, [db]);
  const { data: registryConfig } = useDoc<RegistryConfig>(registryRef as any);

  const handleCollectItem = async (id: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "requests", id), { status: "Collected" });
      toast({ title: "Item Collected", description: "Your request has been marked as collected." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to mark as collected.", variant: "destructive" });
    }
  };

  // Optimized user lookup: Targeted query instead of fetching the entire collection
  const emailId = useMemo(() => user?.email?.toLowerCase().replace(/[.#$[\]]/g, "_") || "", [user?.email]);
  const userProfileRef = useMemo(() => (db && emailId) ? doc(db, "users", emailId) : null, [db, emailId]);
  const { data: profile } = useDoc<User>(userProfileRef as any);
  
  const profileResults = profile ? [profile] : [];
  
  const isOperative = profile?.role && (OPERATIVE_ROLES as any).includes(profile.role);

  const currentUserRoles = useMemo(() => 
    profile?.roles || (profile?.role ? [profile.role] : []),
  [profile]);

  const isAdmin = currentUserRoles.includes('Admin') || user?.email?.toLowerCase() === 'quinten.geurs@gmail.com';
  const isContractor = currentUserRoles.includes('Contractor') && currentUserRoles.length === 1 && !isAdmin;
  const isManagement = currentUserRoles.some((r: Role) => ['Area Manager', 'Assistant Area Manager', 'Operations Manager', 'Head Gardener', 'Park Manager'].includes(r)) || isAdmin;
  
  const isOfficeStaff = currentUserRoles.some(r => OFFICE_ROLES.includes(r)) || isAdmin;
  const isOpsStaff = currentUserRoles.some(r => OPS_ROLES.includes(r)) || isAdmin;
  const isSeniorOps = currentUserRoles.some(r => SENIOR_OPS_ROLES.includes(r)) || isAdmin;
  const isSeniorMgmt = currentUserRoles.some(r => SENIOR_MGMT_ROLES.includes(r)) || isAdmin;
  
  const isStandard = !isAdmin && !isContractor && !isManagement;

  const userEffectiveName = profile?.name || userDisplayName;

  const today = format(new Date(), 'yyyy-MM-dd');
  const identities = useMemo(() => {
    const list = [userEffectiveName];
    if (user?.email) list.push(user.email.toLowerCase());
    if (user?.displayName) list.push(user.displayName);

    const userDepots = profile?.depots || (profile?.depot ? [profile.depot] : []);
    currentUserRoles.forEach(r => {
      userDepots.forEach(d => {
        if (d?.trim?.()) list.push(`Group: ${r} @ ${d.trim()}`);
      });
    });
    // Ensure uniqueness and limit to 10 for Firestore 'in' query safety
    return Array.from(new Set(list)).slice(0, 10);
  }, [userEffectiveName, user?.email, user?.displayName, currentUserRoles, profile?.depots, profile?.depot]);

  // Personalized Queries
  const myTasksQuery = useMemoFirebase(() => {
    if (!db || identities.length === 0) return null;
    return query(collection(db, "tasks"), where("assignedTo", "in", identities));
  }, [db, identities]);

  const { data: myTasks = [], loading: tasksLoading } = useCollection<Task>(myTasksQuery as any);

  const myIssuesQuery = useMemoFirebase(() => {
    if (!db) return null;
    if (isManagement) return query(collection(db, "issues"), where("status", "!=", "Resolved"), limit(15));
    if (userEffectiveName) return query(collection(db, "issues"), where("reportedBy", "==", userEffectiveName), where("status", "!=", "Resolved"), limit(10));
    return null;
  }, [db, userEffectiveName, isManagement]);

  const { data: myIssues = [], loading: issuesLoading } = useCollection<Issue>(myIssuesQuery as any);

  const myRequestsQuery = useMemoFirebase(() => {
    if (!db) return null;
    if (isManagement) return query(collection(db, "requests"), where("status", "!=", "Collected"), limit(15));
    if (userEffectiveName) return query(collection(db, "requests"), where("requestedBy", "==", userEffectiveName), where("status", "!=", "Collected"), limit(10));
    return null;
  }, [db, userEffectiveName, isManagement]);

  const { data: myRequests = [], loading: requestsLoading } = useCollection<any>(myRequestsQuery);

  // Optimized: Removed the global allIssuesQuery fetch, as summaries can be derived from myIssues

  // Computed Values
  const activeMyTasks = myTasks.filter(t => t.status !== 'Completed' && t.dueDate <= today);
  const openMyIssues = myIssues.filter(i => i.status !== 'Resolved');
  const unassignedCount = myIssues.filter(i => i.status !== 'Resolved' && !i.assignedTo).length;
  const readyRequests = myRequests.filter(r => r.status === 'Available');
  const pendingRequests = myRequests.filter(r => r.status === 'Open' || r.status === 'In Progress');

  const taskData = useMemo(() => {
    if (!myTasks || myTasks.length === 0) return [];
    return [
      { name: 'Completed', value: myTasks.filter(t => t.status === 'Completed').length, color: 'hsl(var(--primary))' },
      { name: 'In Progress', value: myTasks.filter(t => t.status === 'Doing').length, color: 'hsl(var(--accent))' },
      { name: 'Pending', value: myTasks.filter(t => t.status === 'Todo' || t.status === 'Pending Approval').length, color: 'hsl(var(--muted))' },
    ].filter(d => d.value > 0);
  }, [myTasks]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setTaskDetailOpen(true);
  };

  const isLoading = tasksLoading || issuesLoading || requestsLoading;

  if (isLoading) {
    return (
      <DashboardShell 
        title="Personal Dashboard" 
        description="Loading your workspace..."
      >
        <div className="flex items-center justify-center h-96">
          <Clock className="h-12 w-12 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  }

  // --- MOBILE VIEW ---
  if (isMobile) {
    return (
      <DashboardShell 
        title="My Dashboard" 
        description="Your personalized workspace"
      >
        <div className="flex flex-col gap-6 pb-20">
          
          {/* Quick Actions - Granular Role Logic */}
          {!isContractor && (
            <div className="space-y-6">
              {/* Common Actions (Office & Field) */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight ml-1 leading-none">Quick Actions</span>
                <div className="grid grid-cols-2 gap-3">
                  <Button asChild variant="outline" className="h-20 flex flex-col gap-2 justify-center border-primary/20 hover:border-primary/50 hover:bg-primary/5 shadow-sm">
                    <Link href="/issues">
                      <AlertTriangle className="h-6 w-6 text-destructive" />
                      <span className="text-xs font-bold uppercase tracking-wider">Raise Issue</span>
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2 justify-center border-primary/20 hover:border-primary/50 hover:bg-primary/5 shadow-sm"
                    onClick={() => setRequestModalOpen(true)}
                  >
                    <Package className="h-6 w-6 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider">Request Something</span>
                  </Button>
                </div>
              </div>

              {/* Operations Section - Visible to Ops, Senior Ops, and Mgmt */}
              {(isOpsStaff || isSeniorOps || isSeniorMgmt) && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight ml-1 leading-none">Operational Checks</span>
                  <div className="grid grid-cols-2 gap-3">
                    <Button asChild variant="outline" className="h-20 flex flex-col gap-2 justify-center border-primary/20 hover:border-primary/50 hover:bg-primary/5 shadow-sm">
                      <Link href="/inspections">
                        <ClipboardCheck className="h-6 w-6 text-green-600" />
                        <span className="text-xs font-bold uppercase tracking-wider">Inspections</span>
                      </Link>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 flex flex-col gap-2 justify-center border-primary/20 hover:border-primary/50 hover:bg-primary/5 shadow-sm"
                      onClick={() => setLogWorkModalOpen(true)}
                    >
                      <ClipboardList className="h-6 w-6 text-accent-foreground" />
                      <span className="text-xs font-bold uppercase tracking-wider">Log Ad-Hoc Work</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Advanced Actions - Visible to Senior Ops and Mgmt */}
              {(isSeniorOps || isSeniorMgmt) && (
                <div className="space-y-3">
                   <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight ml-1 leading-none">Administrative Tools</span>
                   <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      className="h-20 flex flex-col gap-2 justify-center border-primary/20 hover:border-primary/50 hover:bg-primary/5 shadow-sm"
                      onClick={() => setTrainingModalOpen(true)}
                    >
                      <Users className="h-6 w-4 text-orange-500" />
                      <span className="text-xs font-bold uppercase tracking-wider">Add Training</span>
                    </Button>
                    <Button asChild variant="outline" className="h-20 flex flex-col gap-2 justify-center border-primary/20 hover:border-primary/50 hover:bg-primary/5 shadow-sm">
                      <Link href="/assets">
                        <PlusCircle className="h-6 w-6 text-green-600" />
                        <span className="text-xs font-bold uppercase tracking-wider">Add Asset</span>
                      </Link>
                    </Button>
                   </div>
                </div>
              )}

              {/* Management Section - Visible to Mgmt only */}
              {(isSeniorMgmt) && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight ml-1 leading-none">Strategic Management</span>
                  <div className="grid grid-cols-2 gap-3">
                    <Button asChild variant="outline" className="h-20 flex flex-col gap-2 justify-center border-primary/20 hover:border-primary/50 hover:bg-primary/5 shadow-sm">
                      <Link href="/tasks">
                        <ListTodo className="h-6 w-6 text-primary" />
                        <span className="text-xs font-bold uppercase tracking-wider">All Tasks</span>
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="h-20 flex flex-col gap-2 justify-center border-destructive/20 hover:border-destructive/40 hover:bg-destructive/5 shadow-sm relative overflow-visible">
                      <Link href="/issues?tab=unassigned">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                        <span className="text-xs font-bold uppercase tracking-wider">Unassigned Issues</span>
                        {unassignedCount > 0 && (
                          <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white shadow-lg animate-bounce">
                            {unassignedCount}
                          </span>
                        )}
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <RequestModal open={requestModalOpen} onOpenChange={setRequestModalOpen} />
          <LogWorkModal open={logWorkModalOpen} onOpenChange={setLogWorkModalOpen} />
          <TrainingUpdateModal open={trainingModalOpen} onOpenChange={setTrainingModalOpen} users={profileResults} />
          
          <TaskDetailModal 
            open={taskDetailOpen} 
            onOpenChange={setTaskDetailOpen} 
            task={selectedTask} 
            linkedIssue={myIssues.find((i: Issue) => i.id === selectedTask?.linkedIssueId)}
            allUsers={profileResults}
          />

          {/* Admin Quick Actions */}
          {isAdmin && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight ml-1 leading-none">System Management</span>
              <div className="grid grid-cols-3 gap-3">
                <Button asChild variant="outline" className="h-20 flex flex-col gap-2 justify-center border-primary/20 hover:border-primary/50 hover:bg-primary/5 shadow-sm">
                  <Link href="/assets">
                    <MapPin className="h-6 w-6 text-primary" />
                    <span className="text-[10px] font-bold uppercase truncate w-full px-1">Add Asset</span>
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col gap-2 justify-center border-primary/20 hover:border-primary/50 hover:bg-primary/5 shadow-sm"
                  onClick={() => setTrainingModalOpen(true)}
                >
                  <Users className="h-6 w-6 text-accent-foreground" />
                  <span className="text-[10px] font-bold uppercase truncate w-full px-1">Add Training</span>
                </Button>
              </div>
            </div>
          )}

          {/* Notifications: Ready for Collection */}
          {readyRequests.length > 0 && (
            <Card className="border-l-4 border-l-green-500 shadow-md bg-green-50/50 dark:bg-green-950/20 max-h-60 overflow-y-auto">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-headline flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" /> Ready For Collection!
                </CardTitle>
                <CardDescription className="text-xs">Your materials are sorted and ready to be picked up.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                {readyRequests.map((req, i) => (
                  <div key={req.id || i} className="flex justify-between items-center rounded bg-background p-3 shadow-sm text-sm border border-green-100 dark:border-green-900/50">
                    <div>
                      <p className="font-bold">{req.category}</p>
                      <p className="text-xs text-muted-foreground">{req.depot}</p>
                    </div>
                    <Button size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => handleCollectItem(req.id)}>Collect</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Allocated Tasks */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-headline">My Assigned and Pending Tasks</CardTitle>
                <CardDescription className="text-xs">Tasks currently assigned to you or your team</CardDescription>
              </div>
              <Badge variant="secondary" className="font-bold">{activeMyTasks.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeMyTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No active tasks assigned.</p>
              ) : (
                activeMyTasks.slice(0, 5).map(task => (
                  <div 
                    key={task.id} 
                    className="block group"
                    onClick={() => handleTaskClick(task)}
                  >
                    <div className="flex flex-col gap-1 rounded bg-muted/30 p-3 hover:bg-muted/50 transition-colors border cursor-pointer">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-sm tracking-tight">{task.title}</span>
                        <Badge variant="outline" className="text-[10px] uppercase">{task.status}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground truncate">{task.park} • {task.dueDate}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* My Open Issues - Hidden on Mobile per request */}
          {/* {!isManagement && !isContractor && ( */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-headline">My Open Issues</CardTitle>
                  <CardDescription className="text-xs">Status of your reported issues</CardDescription>
                </div>
                <Badge variant="destructive" className="font-bold">{openMyIssues.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {openMyIssues.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No open issues reported.</p>
                ) : (
                  openMyIssues.slice(0, 3).map(issue => (
                    <Link href="/issues" key={issue.id} className="block group">
                      <div className="flex flex-col gap-1 rounded bg-muted/30 p-3 hover:bg-muted/50 transition-colors border">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-sm tracking-tight">{issue.title}</span>
                          <Badge variant="outline" className="text-[10px] tracking-widest">{issue.status.toUpperCase()}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground truncate">{issue.park} • {issue.category}</span>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          {/* Section removed */}
        </div>
      </DashboardShell>
    );
  }

  // --- DESKTOP VIEW ---
  return (
    <DashboardShell 
      title="My Workspace" 
      description="Overview of your assigned tasks, issues, and requests"
    >
      <div className="grid gap-6 mb-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Quick Access Groups for Desktop */}
        <div className="col-span-full mb-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
               <TrendingUp className="h-3 w-3" /> Quick Access
            </h3>
        </div>
        
        <Link href="/my-tasks" className="block">
          <Button variant="outline" className="w-full h-16 justify-start gap-4 px-6 border-primary/10 hover:border-primary/30 hover:bg-primary/5 shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ListTodo className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold">My Tasks</div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold">Current Assignments</div>
            </div>
          </Button>
        </Link>
        <Link href="/inspections" className="block">
          <Button variant="outline" className="w-full h-16 justify-start gap-4 px-6 border-primary/10 hover:border-primary/30 hover:bg-primary/5 shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold">Inspections Tracker</div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold">Safety Checks</div>
            </div>
          </Button>
        </Link>
        <Button 
          variant="outline" 
          className="w-full h-16 justify-start gap-4 px-6 border-primary/10 hover:border-primary/30 hover:bg-primary/5 shadow-sm"
          onClick={() => setLogWorkModalOpen(true)}
        >
          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-accent-foreground" />
          </div>
          <div className="text-left">
            <div className="text-sm font-bold">Log Ad-Hoc Work</div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold">Report completed task</div>
          </div>
        </Button>
        <Button 
          variant="outline" 
          className="w-full h-16 justify-start gap-4 px-6 border-primary/10 hover:border-primary/30 hover:bg-primary/5 shadow-sm"
          onClick={() => setRequestModalOpen(true)}
        >
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <div className="text-sm font-bold">Request Something</div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold">Materials & Help</div>
          </div>
        </Button>
         <Link href="/issues" className="block">
          <Button variant="outline" className="w-full h-16 justify-start gap-4 px-6 border-primary/10 hover:border-primary/30 hover:bg-primary/5 shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold">Raise an Issue</div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold">Report Maintenance</div>
            </div>
          </Button>
        </Link>

        {/* Management Quick Access */}
        {(isManagement || isAdmin) && (
          <>
            <Link href="/tasks" className="block">
              <Button variant="outline" className="w-full h-16 justify-start gap-4 px-6 border-primary/10 hover:border-primary/30 hover:bg-primary/5 shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-accent-foreground" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold">All Tasks Hub</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">Management Overview</div>
                </div>
              </Button>
            </Link>
            <Link href="/assets" className="block">
              <Button variant="outline" className="w-full h-16 justify-start gap-4 px-6 border-primary/10 hover:border-primary/30 hover:bg-primary/5 shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold">Asset Register</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">Infrastructure Inventory</div>
                </div>
              </Button>
            </Link>
            <Link href="/issues?tab=unassigned" className="block">
              <Button variant="outline" className="w-full h-16 justify-start gap-4 px-6 border-destructive/20 hover:border-destructive/40 hover:bg-destructive/5 shadow-sm relative group">
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div className="text-left flex-1">
                  <div className="text-sm font-bold flex items-center justify-between">
                    Unassigned Issues
                    {unassignedCount > 0 && (
                      <Badge variant="destructive" className="ml-2 animate-pulse">{unassignedCount} NEW</Badge>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold text-destructive/80">Awaiting Allocation</div>
                </div>
              </Button>
            </Link>
          </>
        )}
      </div>

      {!isContractor && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/tasks" className="block">
            <Card className="border-l-4 border-l-accent shadow-sm hover:shadow-md transition-all hover:bg-muted/30 cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{isManagement ? "Global Active Tasks" : "My Active Tasks"}</CardTitle>
                <Clock className="h-4 w-4 text-accent-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-headline">{activeMyTasks.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Assigned tasks currently pending</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/issues" className="block">
            <Card className="border-l-4 border-l-destructive shadow-sm hover:shadow-md transition-all hover:bg-muted/30 cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{isManagement ? "Global Open Issues" : "My Open Issues"}</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-headline">{openMyIssues.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Issues reported by you</p>
              </CardContent>
            </Card>
          </Link>
          
          <div className="block" onClick={() => setRequestModalOpen(true)}>
            <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all hover:bg-muted/30 cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{isManagement ? "Global Pending Requests" : "My Pending Requests"}</CardTitle>
                <Package className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-headline">{pendingRequests.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Material requests in progress</p>
              </CardContent>
            </Card>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <div className="block relative cursor-pointer hover:shadow-md transition-all">
                <Card className="border-l-4 border-l-green-500 shadow-sm transition-all h-full bg-green-50/30 dark:bg-green-950/20 hover:bg-green-50/60 dark:hover:bg-green-900/30">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-green-700 uppercase tracking-wider dark:text-green-400">Ready for Collection</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold font-headline text-green-600 dark:text-green-300">{readyRequests.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Requests sorted and ready to pickup</p>
                  </CardContent>
                </Card>
              </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-green-700 dark:text-green-400 font-headline">
                  <CheckCircle2 className="h-5 w-5" /> Ready for Collection
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3 py-4 max-h-[400px] overflow-y-auto pr-2">
                {readyRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-xl">
                    No items currently waiting for collection!
                  </div>
                ) : (
                  readyRequests.map((req, i) => (
                    <div key={req.id || i} className="flex justify-between items-center rounded bg-background p-3 shadow-md text-sm border border-green-100 dark:border-green-900/50 hover:border-green-300 transition-colors">
                      <div>
                        <p className="font-bold">{req.category}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" /> {req.depot}
                        </p>
                      </div>
                      <Button size="sm" className="h-8 text-[11px] uppercase font-bold" onClick={() => handleCollectItem(req.id)}>Collect</Button>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <RequestModal open={requestModalOpen} onOpenChange={setRequestModalOpen} />

      <div className="grid gap-6 mt-6 md:grid-cols-2">
        {!isContractor && (
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">{(isManagement || isAdmin) ? "Global Task Distribution" : "My Task Distribution"}</CardTitle>
              <CardDescription>{(isManagement || isAdmin) ? "Breakdown of team workload" : "Breakdown of your current and completed workload"}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
               {taskData.length > 0 ? (
                 <div className="h-[250px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie
                         data={taskData}
                         cx="50%"
                         cy="50%"
                         innerRadius={60}
                         outerRadius={80}
                         paddingAngle={5}
                         dataKey="value"
                       >
                         {taskData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color} />
                         ))}
                       </Pie>
                       <Tooltip />
                     </PieChart>
                   </ResponsiveContainer>
                 </div>
               ) : (
                 <div className="h-[250px] w-full flex items-center justify-center text-muted-foreground">
                   No task data available.
                 </div>
               )}
              <div className="grid grid-cols-3 w-full gap-4 mt-4">
                {taskData.map((item) => (
                  <div key={item.name} className="flex flex-col items-center">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">{item.name}</span>
                    <span className="text-lg font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="font-headline">My Assigned and Pending Tasks</CardTitle>
            <CardDescription>Latest tasks requiring your attention</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y">
               {activeMyTasks.length === 0 ? (
                 <p className="text-center py-8 text-muted-foreground">No active tasks.</p>
               ) : (
                 activeMyTasks.slice(0, 5).map(task => (
                   <div 
                     key={task.id} 
                     className="p-4 hover:bg-muted/10 flex justify-between items-center transition-colors cursor-pointer group"
                     onClick={() => handleTaskClick(task)}
                   >
                     <div>
                       <p className="font-bold text-sm group-hover:text-primary transition-colors">{task.title}</p>
                       <p className="text-xs text-muted-foreground mt-0.5">{task.park}</p>
                     </div>
                     <Badge variant="outline">{task.status}</Badge>
                   </div>
                 ))
               )}
             </div>
             <div className="p-4 bg-muted/5 border-t text-center">
               <Button asChild variant="ghost" className="w-full text-sm">
                 <Link href="/tasks">View All My Tasks</Link>
               </Button>
             </div>
          </CardContent>
        </Card>
      </div>

    </DashboardShell>
  );
}
