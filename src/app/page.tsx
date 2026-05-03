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
import { collection, query, where, doc, updateDoc, limit } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Issue, Task, Role, OFFICE_ROLES, OPS_ROLES, SENIOR_OPS_ROLES, SENIOR_MGMT_ROLES, OPERATIVE_ROLES, RegistryConfig } from "@/lib/types";
import { useUserContext } from "@/context/UserContext";
import Link from "next/link";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { RequestModal } from "@/components/modals/request-modal";
import { LogWorkModal } from "@/components/modals/log-work-modal";
import { TrainingUpdateModal } from "@/components/modals/training-update-modal";
import { TaskDetailModal } from "@/components/modals/task-detail-modal";
import { IssueModal } from "@/components/modals/issue-modal";
import { AssetModal } from "@/components/modals/asset-modal";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useDataContext } from "@/context/DataContext";

export default function Dashboard() {
  const db = useFirestore();
  const { user } = useUser();
  const isMobile = useIsMobile();
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [logWorkModalOpen, setLogWorkModalOpen] = useState(false);
  const [trainingModalOpen, setTrainingModalOpen] = useState(false);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const userDisplayName = user?.displayName || user?.email || "";
  const { toast } = useToast();
  const { allUsers } = useDataContext();

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

  const { profile, isAdmin, isManagement, currentUserRoles, permissions } = useUserContext();
  
  const isOperative = profile?.role && (OPERATIVE_ROLES as any).includes(profile.role);

  const isContractor = currentUserRoles.includes('Contractor') && currentUserRoles.length === 1 && !isAdmin;
  const isUserGroup = currentUserRoles.includes('User Group Chair') && currentUserRoles.length === 1 && !isAdmin;
  
  const isOfficeStaff = currentUserRoles.some(r => OFFICE_ROLES.includes(r as any)) || isAdmin;
  const isOpsStaff = currentUserRoles.some(r => OPS_ROLES.includes(r as any)) || isAdmin;
  const isSeniorOps = currentUserRoles.some(r => SENIOR_OPS_ROLES.includes(r as any)) || isAdmin;
  const isSeniorMgmt = currentUserRoles.some(r => SENIOR_MGMT_ROLES.includes(r as any)) || isAdmin;

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
    // Fetch all unresolved issues; we filter client-side for personal users
    // to handle multiple possible identity values (name vs email vs displayName)
    return query(collection(db, "issues"), where("status", "!=", "Resolved"), limit(50));
  }, [db]);

  const { data: myIssues = [], loading: issuesLoading } = useCollection<Issue>(myIssuesQuery as any);

  const myRequestsQuery = useMemoFirebase(() => {
    if (!db) return null;
    // Notifications should only be for those who raised it or updated it as manager
    // We use a broader query and filter client-side if needed, but for now we'll restrict the fetch
    if (isManagement) {
      // Managers see everything they are involved in
      return query(collection(db, "requests"), where("status", "!=", "Collected"), limit(30));
    }
    if (userEffectiveName) return query(collection(db, "requests"), where("requestedBy", "==", userEffectiveName), where("status", "!=", "Collected"), limit(10));
    return null;
  }, [db, userEffectiveName, isManagement]);

  const { data: rawMyRequests = [], loading: requestsLoading } = useCollection<any>(myRequestsQuery);

  const myRequests = useMemo(() => {
    if (isManagement || isAdmin) {
      return rawMyRequests.filter(r => 
        r.requestedBy === userEffectiveName || 
        r.updatedBy === userEffectiveName
      );
    }
    return rawMyRequests;
  }, [rawMyRequests, isManagement, isAdmin, userEffectiveName]);

  // Optimized: Use context for summaries if management, or personalized queries if operative
  const { allIssues, allParks } = useDataContext();
  const userDepots = useMemo(() => {
    const list = [...(profile?.depots || []), profile?.depot].filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [profile]);

  const roles = currentUserRoles as string[];
  const isDepotMgmt = roles.some(r => ['Head Gardener', 'Assistant Area Manager'].includes(r));
  const isGlobalMgmt = roles.some(r => ['Area Manager', 'Operations Manager', 'Park Manager'].includes(r));

  // Computed Values using role-based visibility
  const visibleIssues = useMemo(() => {
    if (isAdmin || isGlobalMgmt) return allIssues;
    if (isDepotMgmt) {
      return allIssues.filter(i => {
        const parkDetail = allParks.find(p => p.name === i.park);
        return parkDetail?.depot && userDepots.includes(parkDetail.depot);
      });
    }
    // For personal users, return all so openMyIssues can filter by identity
    return allIssues;
  }, [isAdmin, isGlobalMgmt, isDepotMgmt, allIssues, allParks, userDepots]);

  const openMyIssues = useMemo(() => {
    const open = visibleIssues.filter(i => i.status !== 'Resolved' && !i.isArchived);
    // For non-management, additionally filter to only issues the user is personally involved with
    if (isAdmin || isGlobalMgmt || isDepotMgmt) return open;
    // Personal: reported by or assigned to any of the user's identities
    return open.filter(i => 
      identities.some(id => 
        i.reportedBy?.toLowerCase() === id.toLowerCase() ||
        i.assignedTo?.toLowerCase() === id.toLowerCase()
      )
    );
  }, [visibleIssues, isAdmin, isGlobalMgmt, isDepotMgmt, identities]);
  const unassignedCount = openMyIssues.filter(i => !i.assignedTo).length;
  
  // Tasks remain personal on dashboard unless in full page
  const activeMyTasks = myTasks.filter(t => t.status !== 'Completed');
  
  const readyRequests = myRequests.filter(r => r.status === 'Available' || r.status === 'Ready');
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
          <div className="space-y-6">
            {/* Common Actions (Office & Field) */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight ml-1 leading-none">Quick Actions</span>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col gap-2 justify-center border-primary/20 hover:border-primary/50 hover:bg-primary/5 shadow-sm"
                  onClick={() => setIssueModalOpen(true)}
                >
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                  <span className="text-xs font-bold uppercase tracking-wider">Raise Issue</span>
                </Button>
                
                {permissions.viewMyTasks && (
                  <Button asChild variant="outline" className="h-20 flex flex-col gap-2 justify-center border-primary/20 hover:border-primary/50 hover:bg-primary/5 shadow-sm">
                    <Link href="/my-tasks">
                      <ListTodo className="h-6 w-6 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider">My Tasks</span>
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            {/* Operations Section */}
            {(permissions.viewInspections || permissions.createIssue) && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight ml-1 leading-none">Operational Checks</span>
                <div className="grid grid-cols-2 gap-3">
                  {permissions.viewInspections && (
                    <Button asChild variant="outline" className="h-20 flex flex-col gap-2 justify-center border-primary/20 hover:border-primary/50 hover:bg-primary/5 shadow-sm">
                      <Link href="/inspections">
                        <ClipboardCheck className="h-6 w-6 text-green-600" />
                        <span className="text-xs font-bold uppercase tracking-wider">Inspections</span>
                      </Link>
                    </Button>
                  )}
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

            {/* Advanced Actions */}
            {(permissions.manageAssets || isAdmin) && (
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
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2 justify-center border-primary/20 hover:border-primary/50 hover:bg-primary/5 shadow-sm"
                    onClick={() => setAssetModalOpen(true)}
                  >
                    <PlusCircle className="h-6 w-6 text-green-600" />
                    <span className="text-xs font-bold uppercase tracking-wider">Add Asset</span>
                  </Button>
                 </div>
              </div>
            )}

            {/* Management Section */}
            {(permissions.viewAllTasks || permissions.viewIssues || isAdmin) && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight ml-1 leading-none">Strategic Management</span>
                <div className="grid grid-cols-2 gap-3">
                  {permissions.viewAllTasks && (
                    <Button asChild variant="outline" className="h-20 flex flex-col gap-2 justify-center border-primary/20 hover:border-primary/50 hover:bg-primary/5 shadow-sm">
                      <Link href="/tasks">
                        <ListTodo className="h-6 w-6 text-primary" />
                        <span className="text-xs font-bold uppercase tracking-wider">All Tasks</span>
                      </Link>
                    </Button>
                  )}
                  {permissions.viewIssues && (
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
                  )}
                </div>
              </div>
            )}
          </div>

          <IssueModal open={issueModalOpen} onOpenChange={setIssueModalOpen} />
          <AssetModal open={assetModalOpen} onOpenChange={setAssetModalOpen} />
          <RequestModal open={requestModalOpen} onOpenChange={setRequestModalOpen} />
          <LogWorkModal open={logWorkModalOpen} onOpenChange={setLogWorkModalOpen} />
          <TrainingUpdateModal open={trainingModalOpen} onOpenChange={setTrainingModalOpen} users={allUsers} />
          
          <TaskDetailModal 
            open={taskDetailOpen} 
            onOpenChange={setTaskDetailOpen} 
            task={selectedTask} 
            linkedIssue={myIssues.find((i: Issue) => i.id === selectedTask?.linkedIssueId)}
            allUsers={profile ? [profile] : []}
          />

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
                  <div key={req.id || i} className="flex flex-col gap-2 rounded bg-background p-3 shadow-sm text-sm border border-green-100 dark:border-green-900/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold">{req.category}</p>
                        <p className="text-xs text-muted-foreground">{req.depot}</p>
                      </div>
                      <Button size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => handleCollectItem(req.id)}>Collect</Button>
                    </div>
                    {req.managerNote && (
                      <div className="text-xs bg-muted/50 p-2 rounded border border-muted">
                        <span className="font-bold text-[10px] uppercase text-muted-foreground block mb-1">Note</span>
                        {req.managerNote}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Notification bar for mobile */}
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
        {!isUserGroup && (
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
        )}
        {(!isContractor && !isUserGroup) && (
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
        )}
        {!isUserGroup && (
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
        )}
        {!isContractor && (
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
        )}
         <Button 
            variant="outline" 
            className="w-full h-16 justify-start gap-4 px-6 border-primary/10 hover:border-primary/30 hover:bg-primary/5 shadow-sm"
            onClick={() => setIssueModalOpen(true)}
          >
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold">Raise an Issue</div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold">Report Maintenance</div>
            </div>
          </Button>

        {/* Management Quick Access */}
        {(isAdmin || permissions.viewAllTasks || permissions.viewAssets || permissions.viewIssues) && (
          <>
            {permissions.viewAllTasks && (
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
            )}
            {permissions.viewAssets && (
              <Button 
                variant="outline" 
                className="w-full h-16 justify-start gap-4 px-6 border-primary/10 hover:border-primary/30 hover:bg-primary/5 shadow-sm"
                onClick={() => setAssetModalOpen(true)}
              >
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold">Asset Register</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">Infrastructure Inventory</div>
                </div>
              </Button>
            )}
            {permissions.viewIssues && (
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
            )}
          </>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {!isUserGroup && (
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
        )}

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
        
        {!isContractor && (
          <>
            <Link href="/requests" className="block">
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
            </Link>

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
                      <div key={req.id || i} className="flex flex-col gap-2 rounded bg-background p-3 shadow-md text-sm border border-green-100 dark:border-green-900/50 hover:border-green-300 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold">{req.category}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" /> {req.depot}
                            </p>
                          </div>
                          <Button size="sm" className="h-8 text-[11px] uppercase font-bold" onClick={() => handleCollectItem(req.id)}>Collect</Button>
                        </div>
                        {req.managerNote && (
                          <div className="text-xs bg-muted/50 p-2 rounded border border-muted">
                            <span className="font-bold text-[10px] uppercase text-muted-foreground block mb-1">Note</span>
                            {req.managerNote}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      <RequestModal open={requestModalOpen} onOpenChange={setRequestModalOpen} />
      <LogWorkModal open={logWorkModalOpen} onOpenChange={setLogWorkModalOpen} />
      <TrainingUpdateModal open={trainingModalOpen} onOpenChange={setTrainingModalOpen} users={allUsers} />

      <IssueModal open={issueModalOpen} onOpenChange={setIssueModalOpen} />
      <AssetModal open={assetModalOpen} onOpenChange={setAssetModalOpen} />
    </DashboardShell>
  );
}
