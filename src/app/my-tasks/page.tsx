
"use client";

import { useState, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { compressImage } from "@/lib/image-compress";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ChevronRight, 
  AlertCircle,
  PlayCircle,
  X,
  Camera,
  Send,
  Users,
  Search,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskDetailModal } from "@/components/modals/task-detail-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Image from "next/image";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, updateDoc, doc, query, where, limit } from "firebase/firestore";
import { User as UserType, OPERATIVE_ROLES } from "@/lib/types";
import { format, isToday, isThisWeek, isThisMonth, parseISO, isBefore, startOfDay } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDataContext } from "@/context/DataContext";

export default function MyTasksPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();
  
  // Fetch all users to find colleagues and current profile
  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "users"), limit(100));
  }, [db]);
  const { data: allUsers = [] } = useCollection<UserType>(usersQuery as any);
  const { allParks } = useDataContext();

  // Dynamic current user profile
  const currentUserProfile = useMemo(() => 
    allUsers.find(u => u.email?.toLowerCase() === user?.email?.toLowerCase()),
  [allUsers, user?.email]);
  
  const currentUserName = useMemo(() => {
    if (currentUserProfile?.name) return currentUserProfile.name;
    if (user?.email?.toLowerCase() === 'quinten.geurs@gmail.com') return "Quinten (Admin)";
    return user?.displayName || user?.email || "";
  }, [currentUserProfile, user]);

  const isAdmin = useMemo(() => 
    currentUserProfile?.role === 'Admin' || user?.email?.toLowerCase() === 'quinten.geurs@gmail.com',
  [currentUserProfile, user?.email]);
  
  const isOperational = useMemo(() => 
    currentUserProfile?.role && OPERATIVE_ROLES.includes(currentUserProfile.role),
  [currentUserProfile]);

  const identities = useMemo(() => {
    const list = [currentUserName];
    if (user?.email) list.push(user.email.toLowerCase());
    if (user?.displayName) list.push(user.displayName);

    const userDepots = currentUserProfile?.depots || (currentUserProfile?.depot ? [currentUserProfile.depot] : []);
    const roles = currentUserProfile?.roles || (currentUserProfile?.role ? [currentUserProfile.role] : []);
    
    roles.forEach(r => {
      userDepots.forEach(d => {
        if (d?.trim?.()) list.push(`Group: ${r} @ ${d.trim()}`);
      });
    });
    
    return Array.from(new Set(list)).slice(0, 10);
  }, [currentUserName, user?.email, user?.displayName, currentUserProfile]);

  const colleagues = useMemo(() => {
    if (!currentUserProfile) return [];
    return allUsers.filter(u => 
      u.depot === currentUserProfile.depot && 
      u.name !== currentUserName && 
      !u.isArchived
    );
  }, [allUsers, currentUserProfile, currentUserName]);


  const tasksQuery = useMemoFirebase(() => {
    if (!db || !currentUserName || identities.length === 0) return null;
    return query(collection(db, "tasks"), where("assignedTo", "in", identities));
  }, [db, currentUserName, identities]);

  const { data: tasks = [], loading } = useCollection<any>(tasksQuery);

  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = tasks.find(t => t.id === selectedTaskId);
  const linkedIssueRef = useMemo(() => db && selectedTask?.linkedIssueId ? doc(db, "issues", selectedTask.linkedIssueId) : null, [db, selectedTask?.linkedIssueId]);
  const { data: linkedIssue } = useDoc<any>(linkedIssueRef as any);

  const [showColleagueSelection, setShowColleagueSelection] = useState(false);
  const [selectedColleagues, setSelectedColleagues] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [completionData, setCompletionData] = useState({
    note: "",
    imageUrl: ""
  });

  const handleStatusUpdate = (taskId: string, newStatus: string) => {
    if (!db) return;
    if (newStatus === 'Pending Approval') {
      setSelectedTaskId(taskId);
      setCompletionData({ note: "", imageUrl: "" });
      setSelectedColleagues([]);
      setShowColleagueSelection(false);
      setIsDetailDialogOpen(true);
      return;
    }

    updateDoc(doc(db, "tasks", taskId), { status: newStatus });
    toast({ title: "Task Updated", description: `Status set to ${newStatus}.` });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedDataUrl = await compressImage(file, 800, 800, 0.7);
        setCompletionData(prev => ({ ...prev, imageUrl: compressedDataUrl }));
      } catch (error) {
        toast({ title: "Image Error", description: "Could not process image.", variant: "destructive" });
      }
    }
  };

  const handleCompleteTask = async () => {
    if (!db || !selectedTaskId) return;

    // 1. Update Task to Pending Approval
    await updateDoc(doc(db, "tasks", selectedTaskId), { 
      status: 'Pending Approval',
      completionNote: completionData.note,
      completionImageUrl: completionData.imageUrl,
      collaborators: selectedColleagues
    });

    // 2. Set Issue to Pending Approval if linked
    if (selectedTask?.linkedIssueId) {
      await updateDoc(doc(db, "issues", selectedTask.linkedIssueId), { 
        status: 'Pending Approval',
        collaborators: selectedColleagues,
        resolutionNote: completionData.note,
        resolutionImageUrl: completionData.imageUrl,
        resolutionDate: new Date().toISOString()
      });
    }

    setIsDetailDialogOpen(false);
    setSelectedTaskId(null);
    toast({ 
      title: "Task Submitted", 
      description: "Work proof sent to supervisor for approval." 
    });
  };

  const toggleColleague = (name: string) => {
    setSelectedColleagues(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const getStatusBadge = (status: string) => {
    if (isOperational) {
      switch (status) {
        case 'Todo': return <Badge variant="outline" className="bg-muted text-muted-foreground font-bold text-[10px] uppercase tracking-wider px-2">Not yet started</Badge>;
        case 'Doing': return <Badge className="bg-accent text-accent-foreground font-bold text-[10px] uppercase tracking-wider px-2">In Progress</Badge>;
        case 'Pending Approval': return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-200 font-bold text-[10px] uppercase tracking-wider px-2 animate-pulse">Under Review</Badge>;
        default: return null;
      }
    }

    switch (status) {
      case 'Todo': return <Badge variant="outline" className="bg-muted text-muted-foreground font-bold text-[10px] uppercase">To Do</Badge>;
      case 'Doing': return <Badge className="bg-accent text-accent-foreground font-bold text-[10px] uppercase">In Progress</Badge>;
      case 'Pending Approval': return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-200 font-bold text-[10px] uppercase animate-pulse">Reviewing</Badge>;
      case 'Completed': return <Badge className="bg-primary text-primary-foreground font-bold text-[10px] uppercase">Archived</Badge>;
      default: return null;
    }
  };

  const today = format(new Date(), 'yyyy-MM-dd');
  
  const filteredTasks = tasks.filter(t => {
    const search = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(search) ||
      t.park.toLowerCase().includes(search) ||
      (t.objective || "").toLowerCase().includes(search)
    );
  });

  const activeTasks = filteredTasks.filter(t => t.status !== 'Completed');
  const archivedTasks = filteredTasks.filter(t => t.status === 'Completed' && t.dueDate === today);

  const isMobile = useIsMobile();
  const todayDate = startOfDay(new Date());

  const mobileTasks = activeTasks.filter(t => {
      if (!t.dueDate) return true;
      const d = parseISO(t.dueDate);
      return isBefore(d, todayDate) || isToday(d);
  });

  const desktopToday = activeTasks.filter(t => {
      if (!t.dueDate) return true;
      const d = parseISO(t.dueDate);
      return isBefore(d, todayDate) || isToday(d);
  });
  const desktopThisWeek = activeTasks.filter(t => {
      if (!t.dueDate) return false;
      const d = parseISO(t.dueDate);
      return !isBefore(d, todayDate) && !isToday(d) && isThisWeek(d, { weekStartsOn: 1 });
  });
  const desktopThisMonth = activeTasks.filter(t => {
      if (!t.dueDate) return false;
      const d = parseISO(t.dueDate);
      return !isBefore(d, todayDate) && !isToday(d) && !isThisWeek(d, { weekStartsOn: 1 }) && isThisMonth(d);
  });
  const desktopLater = activeTasks.filter(t => {
      if (!t.dueDate) return false;
      const d = parseISO(t.dueDate);
      return !isBefore(d, todayDate) && !isToday(d) && !isThisWeek(d, { weekStartsOn: 1 }) && !isThisMonth(d);
  });

  const renderTaskCard = (task: any) => (
    <Card 
      key={task.id} 
      className="border-2 hover:border-primary/40 transition-all group flex flex-col cursor-pointer"
      onClick={() => {
        setSelectedTaskId(task.id);
        setIsDetailDialogOpen(true);
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-wider">
            <MapPin className="h-3 w-3" />
            {task.park}
          </div>
          {getStatusBadge(task.status)}
        </div>
        <CardTitle className="text-xl font-headline group-hover:text-primary transition-colors">{task.title}</CardTitle>
        <CardDescription className="text-sm font-medium text-foreground/70 line-clamp-3 min-h-[4rem]">
          {task.objective}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4 flex-1">
        <div className="space-y-4">
          {task.linkedIssueId && (
            <div className="p-2 rounded bg-yellow-50 border border-yellow-100 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-[10px] font-bold text-yellow-700 uppercase">Linked to Issue</span>
            </div>
          )}
          {!isOperational && (
            <>
              <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Due {task.dueDate}</span>
                <span>{task.status === 'Doing' ? '45%' : task.status === 'Pending Approval' ? '100%' : '0%'}</span>
              </div>
              <Progress value={task.status === 'Doing' ? 45 : task.status === 'Pending Approval' ? 100 : 0} className="h-2" />
            </>
          )}
          {isOperational && (
              <div className="flex items-center text-[10px] font-bold text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Due {task.dueDate}</span>
              </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-0 border-t flex divide-x mt-auto">
        {task.status === 'Todo' ? (
          <Button 
            variant="ghost" 
            className="flex-1 rounded-none h-12 text-xs font-bold hover:bg-accent/10"
            onClick={(e) => {
              e.stopPropagation();
              handleStatusUpdate(task.id, 'Doing');
            }}
          >
            <PlayCircle className="mr-2 h-4 w-4" /> Start Task
          </Button>
        ) : task.status === 'Doing' ? (
          <Button 
            variant="ghost" 
            className="flex-1 rounded-none h-12 text-xs font-bold text-primary hover:bg-primary/5"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTaskId(task.id);
              setIsDetailDialogOpen(true);
            }}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" /> Submit Proof
          </Button>
        ) : (
          <div className="flex-1 flex items-center justify-center h-12 text-[10px] font-bold text-muted-foreground uppercase bg-muted/20 w-full rounded-b-lg">
            Reviewing Details
          </div>
        )}
      </CardFooter>
    </Card>
  );

  return (
    <DashboardShell 
      title={isOperational ? "Your Tasks" : "My Daily Tasks"} 
      description={isOperational ? "Active work queue" : `Personal work queue for ${currentUserName}`}
    >

      <div className="space-y-6">
        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search tasks by title, park, or objective..." 
            className="pl-10 h-10 bg-background border-2 focus-visible:ring-primary shadow-sm rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="active">Active ({activeTasks.length})</TabsTrigger>
          {!isOperational && <TabsTrigger value="archived">Archived ({archivedTasks.length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="active">
          {loading ? (
             <div className="flex justify-center py-20"><Clock className="animate-spin h-8 w-8 text-primary" /></div>
          ) : isMobile ? (
             mobileTasks.length > 0 ? (
               <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                 {mobileTasks.map(renderTaskCard)}
               </div>
             ) : (
               <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
                 <CheckCircle2 className="h-12 w-12 mb-4 opacity-20" />
                 <p className="font-bold">All caught up for today!</p>
               </div>
             )
          ) : (
             activeTasks.length > 0 ? (
               <div className="space-y-10">
                 {desktopToday.length > 0 && (
                   <section>
                     <h3 className="text-sm font-bold text-destructive uppercase tracking-wider mb-4 flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Due Today or Overdue</h3>
                     <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                       {desktopToday.map(renderTaskCard)}
                     </div>
                   </section>
                 )}
                 {desktopThisWeek.length > 0 && (
                   <section>
                     <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-4 flex items-center gap-2"><Clock className="h-4 w-4" /> Due This Week</h3>
                     <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                       {desktopThisWeek.map(renderTaskCard)}
                     </div>
                   </section>
                 )}
                 {desktopThisMonth.length > 0 && (
                   <section>
                     <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Due This Month</h3>
                     <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                       {desktopThisMonth.map(renderTaskCard)}
                     </div>
                   </section>
                 )}
                 {desktopLater.length > 0 && (
                   <section>
                     <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 opacity-60">Later</h3>
                     <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                       {desktopLater.map(renderTaskCard)}
                     </div>
                   </section>
                 )}
               </div>
             ) : (
               <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
                 <CheckCircle2 className="h-12 w-12 mb-4 opacity-20" />
                 <p className="font-bold">All caught up!</p>
               </div>
             )
          )}
        </TabsContent>

        <TabsContent value="archived">
          <div className="grid gap-4">
            {archivedTasks.map((task) => (
              <Card key={task.id} className="bg-muted/30 border-dashed">
                <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{task.title}</h4>
                      <p className="text-xs text-muted-foreground">{task.park} • Archived {task.dueDate}</p>
                      {task.collaborators && task.collaborators.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">Assisted by: {task.collaborators.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {task.completionImageUrl && (
                    <div className="relative h-12 w-12 rounded border overflow-hidden">
                      <Image src={task.completionImageUrl} alt="Evidence" fill className="object-cover" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <TaskDetailModal
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        task={selectedTask}
        linkedIssue={linkedIssue}
        allUsers={allUsers}
        allParks={allParks}
      />
      </div>
    </DashboardShell>
  );
}
