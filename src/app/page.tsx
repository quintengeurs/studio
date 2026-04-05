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
  ClipboardList
} from "lucide-react";
import { 
  ResponsiveContainer, 
  Tooltip,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Issue, Task, User, MANAGEMENT_ROLES, Role } from "@/lib/types";
import Link from "next/link";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { RequestModal } from "@/components/modals/request-modal";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Dashboard() {
  const db = useFirestore();
  const { user } = useUser();
  const isMobile = useIsMobile();
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  const userDisplayName = user?.displayName || user?.email || "";
  const { toast } = useToast();

  const handleCollectItem = async (id: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "requests", id), { status: "Collected" });
      toast({ title: "Item Collected", description: "Your request has been marked as collected." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to mark as collected.", variant: "destructive" });
    }
  };

  // Setup role context
  const usersQuery = useMemoFirebase(() => db ? query(collection(db, "users")) : null, [db]);
  const { data: allUsers = [] } = useCollection<User>(usersQuery);
  const currentUserData = allUsers.find(u => u.email?.toLowerCase() === user?.email?.toLowerCase());
  const isManagement = currentUserData ? MANAGEMENT_ROLES.includes(currentUserData.role as Role) : false;

  // Personalized Queries
  const myTasksQuery = useMemoFirebase(() => {
    if (!db) return null;
    if (isManagement) return query(collection(db, "tasks"));
    if (userDisplayName) return query(collection(db, "tasks"), where("assignedTo", "==", userDisplayName));
    return null;
  }, [db, userDisplayName, isManagement]);

  const { data: myTasks = [], loading: tasksLoading } = useCollection<Task>(myTasksQuery);

  const myIssuesQuery = useMemoFirebase(() => {
    if (!db) return null;
    if (isManagement) return query(collection(db, "issues"));
    if (userDisplayName) return query(collection(db, "issues"), where("reportedBy", "==", userDisplayName));
    return null;
  }, [db, userDisplayName, isManagement]);

  const { data: myIssues = [], loading: issuesLoading } = useCollection<Issue>(myIssuesQuery);

  const myRequestsQuery = useMemoFirebase(() => {
    if (!db) return null;
    if (isManagement) return query(collection(db, "requests"));
    if (userDisplayName) return query(collection(db, "requests"), where("requestedBy", "==", userDisplayName));
    return null;
  }, [db, userDisplayName, isManagement]);

  const { data: myRequests = [], loading: requestsLoading } = useCollection<any>(myRequestsQuery);

  // Computed Values
  const activeMyTasks = myTasks.filter(t => t.status !== 'Completed');
  const openMyIssues = myIssues.filter(i => i.status !== 'Closed');
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
          
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button asChild variant="outline" className="h-20 flex flex-col gap-2 justify-center border-primary/20 hover:border-primary/50 hover:bg-primary/5 shadow-sm">
              <Link href="/issues">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <span className="text-xs font-bold uppercase tracking-wider">Raise Issue</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex flex-col gap-2 justify-center border-primary/20 hover:border-primary/50 hover:bg-primary/5 shadow-sm">
              <Link href="/tasks">
                <ClipboardList className="h-6 w-6 text-accent-foreground" />
                <span className="text-xs font-bold uppercase tracking-wider">Log Task</span>
              </Link>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2 justify-center col-span-2 border-primary/20 hover:border-primary/50 hover:bg-primary/5 shadow-sm"
              onClick={() => setRequestModalOpen(true)}
            >
              <Package className="h-6 w-6 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider">Request Material</span>
            </Button>
          </div>

          <RequestModal open={requestModalOpen} onOpenChange={setRequestModalOpen} />

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
                <CardTitle className="text-lg font-headline">{isManagement ? "Allocated Tasks" : "Allocated To Me"}</CardTitle>
                <CardDescription className="text-xs">{isManagement ? "Tasks assigned to the team" : "Tasks currently assigned to you"}</CardDescription>
              </div>
              <Badge variant="secondary" className="font-bold">{activeMyTasks.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeMyTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No active tasks assigned.</p>
              ) : (
                activeMyTasks.slice(0, 5).map(task => (
                  <Link href="/tasks" key={task.id} className="block group">
                    <div className="flex flex-col gap-1 rounded bg-muted/30 p-3 hover:bg-muted/50 transition-colors border">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-sm tracking-tight">{task.title}</span>
                        <Badge variant="outline" className="text-[10px]">{task.status}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground truncate">{task.park} • {task.dueDate}</span>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
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

      <RequestModal open={requestModalOpen} onOpenChange={setRequestModalOpen} />

      <div className="grid gap-6 mt-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">{isManagement ? "Global Task Distribution" : "My Task Distribution"}</CardTitle>
            <CardDescription>{isManagement ? "Breakdown of team workload" : "Breakdown of your current and completed workload"}</CardDescription>
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
        
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="font-headline">Recent Allocated Tasks</CardTitle>
            <CardDescription>Latest tasks requiring your attention</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y">
               {activeMyTasks.length === 0 ? (
                 <p className="text-center py-8 text-muted-foreground">No active tasks.</p>
               ) : (
                 activeMyTasks.slice(0, 5).map(task => (
                   <div key={task.id} className="p-4 hover:bg-muted/10 flex justify-between items-center transition-colors">
                     <div>
                       <p className="font-bold text-sm">{task.title}</p>
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
