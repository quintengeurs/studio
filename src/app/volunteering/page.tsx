"use client";

import { useState, useEffect, useMemo } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  MapPin, 
  Clock, 
  Calendar, 
  ArrowRight,
  Sparkles,
  Heart,
  CheckCircle2,
  Megaphone,
  Info,
  ExternalLink,
  HandMetal,
  UserCheck,
  ClipboardList,
  UserPlus,
  ShieldAlert,
  Search,
  Pencil,
  Trash2,
  Plus,
  Download,
  FileText,
  Mail,
  Home
} from "lucide-react";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, orderBy, limit, doc, updateDoc, arrayUnion, arrayRemove, getDocs } from "firebase/firestore";
import { Task } from "@/lib/types";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription 
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VolunteerRegistrationModal } from "@/components/modals/volunteer-registration-modal";
import { TaskDetailModal } from "@/components/modals/task-detail-modal";
import { InfoItemModal } from "@/components/modals/info-item-modal";
import { useDataContext } from "@/context/DataContext";

export default function VolunteeringPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { allUsers, allParks } = useDataContext();
  const { toast } = useToast();
  
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [volunteerEmail, setVolunteerEmail] = useState<string | null>(null);
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [editingNewsItem, setEditingNewsItem] = useState<any | null>(null);
  const [selectedItemForList, setSelectedItemForList] = useState<any | null>(null);

  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [editingTaskData, setEditingTaskData] = useState<any>(null);
  useEffect(() => {
    const savedEmail = localStorage.getItem("volunteerEmail");
    if (savedEmail) setVolunteerEmail(savedEmail);
    
    // Setup Bypass for Walkthrough
    const params = new URLSearchParams(window.location.search);
    if (params.get('setup') === 'true' && db) {
      const setupData = async () => {
        try {
          const { getDocs, setDoc, doc, collection, query, where, updateDoc } = await import("firebase/firestore");
          
          // 1. Approve tester@example.com if exists
          const q = query(collection(db, "users"), where("email", "==", "tester@example.com"));
          const snapshot = await getDocs(q);
          snapshot.forEach(async (d) => {
            await updateDoc(d.ref, { status: 'active', roles: ['Volunteer', 'Admin'] }); // Also make it Admin for bypass
          });

          // 2. Create 'Litter Pick Team' task if not exists
          const tq = query(collection(db, "tasks"), where("title", "==", "Litter Pick Team"));
          const tSnap = await getDocs(tq);
          if (tSnap.empty) {
            const taskId = "task_litter_pick_" + Date.now();
            await setDoc(doc(db, "tasks", taskId), {
              id: taskId,
              title: "Litter Pick Team",
              objective: "Community cleanup effort. Help us keep our parks clean!",
              status: "Todo",
              dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
              assignedTo: "Volunteer Team",
              park: "Hackney Marshes",
              isVolunteerEligible: true,
              maxVolunteers: 2,
              rewardDescription: "Free Coffee",
              rewardCode: "COFFEE123",
              createdAt: new Date().toISOString()
            });
          }

          // 3. Create 'Volunteer Training Day' info item if not exists
          const iq = query(collection(db, "info_items"), where("title", "==", "Volunteer Training Day"));
          const iSnap = await getDocs(iq);
          if (iSnap.empty) {
            const itemId = "info_training_" + Date.now();
            await setDoc(doc(db, "info_items", itemId), {
              id: itemId,
              type: "CTA",
              title: "Volunteer Training Day",
              content: "Introductory session for new volunteers. Learn the ropes and meet the team!",
              ctaLabel: "Register Interest",
              isVolunteerVisible: true,
              isStaffVisible: false,
              createdBy: "System",
              createdAt: new Date().toISOString(),
              isArchived: false,
              allowResponse: true
            });
          }
          
          toast({ title: "Walkthrough Data Seeded", description: "Volunteer approved and tasks created." });
        } catch (err) {
          console.error("Setup failed:", err);
        }
      };
      setupData();
    }
  }, [db]);

  // Public Portal Data - Using manual fetch to avoid permission-denied noise in console
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);


  const fetchTasks = async () => {
    if (!db) return;
    setTasksLoading(true);
    try {
      const { getDocs } = await import("firebase/firestore");
      // Use a simpler query to avoid index requirements for public/volunteer users
      const q = query(
        collection(db, "tasks"), 
        where("isVolunteerEligible", "==", true)
      );
      const snapshot = await getDocs(q);
      const allEligible = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task));
      
      // Filter status and limit in-memory for maximum reliability
      const activeTasks = allEligible
        .filter(t => ["Todo", "Doing"].includes(t.status))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 50);
        
      setTasks(activeTasks);
    } catch (err) {
      console.error("Public tasks fetch error:", err);
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  };

  const [myCompletedTasks, setMyCompletedTasks] = useState<Task[]>([]);

  const fetchMyWork = async () => {
    if (!db || !volunteerEmail) {
      setMyCompletedTasks([]);
      return;
    }
    try {
      const { getDocs } = await import("firebase/firestore");
      const q = query(
        collection(db, "tasks"), 
        where("completedByVolunteers", "array-contains", volunteerEmail),
        limit(50)
      );
      const snapshot = await getDocs(q);
      setMyCompletedTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Task));
    } catch (err) {
      console.error("My contributions fetch error:", err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [db]);

  useEffect(() => {
    fetchMyWork();
  }, [db, volunteerEmail]);


  // Staff Management Data (Volunteer Log)
  const staffLogQuery = useMemoFirebase(() => 
    (db && user) ? query(
      collection(db, "tasks"), 
      where("status", "==", "Completed"),
      where("isVolunteerEligible", "==", true),
      limit(100)
    ) : null, 
  [db, user]);
  const { data: logTasks = [], loading: logLoading } = useCollection<Task>(staffLogQuery as any);

  // Staff Task Management (Active Opportunities)
  const staffTasksQuery = useMemoFirebase(() => 
    (db && user) ? query(
      collection(db, "tasks"), 
      where("isVolunteerEligible", "==", true),
      orderBy("dueDate", "asc"),
      limit(100)
    ) : null, 
  [db, user]);
  const { data: allVolunteerTasks = [], loading: staffTasksLoading } = useCollection<Task>(staffTasksQuery as any);

  // Hub News
  const volunteerNewsQuery = useMemoFirebase(() => 
    db ? query(
      collection(db, "info_items"), 
      where("isVolunteerVisible", "==", true)
    ) : null, 
  [db]);
  const { data: volunteerNews = [], loading: newsLoading, error: newsError } = useCollection<any>(volunteerNewsQuery as any);

  const [cachedNews, setCachedNews] = useState<any[]>([]);
  const [fallbackNews, setFallbackNews] = useState<any[]>([]);
  const [hasPermissionError, setHasPermissionError] = useState(false);
  
  useEffect(() => {
    // Load cache on mount
    const saved = localStorage.getItem("volunteer_news_cache");
    if (saved) {
      try { setCachedNews(JSON.parse(saved)); } catch (e) {}
    }
  }, []);
  useEffect(() => {
    // If useCollection fails, try a manual fetch as a fallback
    if (newsError && db) {
      const isPermission = newsError?.message?.includes('permission') || (newsError as any)?.code === 'permission-denied';
      if (isPermission) setHasPermissionError(true);

      const fetchFallback = async () => {
        try {
          const snapshot = await getDocs(collection(db, "info_items"));
          const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          setFallbackNews(docs.filter((d: any) => d.isVolunteerVisible === true && !d.isArchived));
          setHasPermissionError(false); // Succeeded with fallback
        } catch (e: any) {
          console.error("News Fallback Failed:", e);
          if (e?.message?.includes('permission') || e?.code === 'permission-denied') {
            setHasPermissionError(true);
          }
        }
      };
      fetchFallback();
    } else if (!newsLoading && !newsError) {
      setHasPermissionError(false);
    }
  }, [newsError, newsLoading, db]);

  const effectiveNews = useMemo(() => {
    const baseItems = volunteerNews.length > 0 ? volunteerNews : (fallbackNews.length > 0 ? fallbackNews : cachedNews);
    const filtered = baseItems
      .filter((d: any) => d.isArchived !== true && d.isVolunteerVisible === true)
      .sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

    // Update cache if we got fresh data
    if ((volunteerNews.length > 0 || fallbackNews.length > 0) && filtered.length > 0) {
      localStorage.setItem("volunteer_news_cache", JSON.stringify(filtered));
    }

    return filtered;
  }, [volunteerNews, fallbackNews, cachedNews]);

  useEffect(() => {
    // fetchNews is now handled by useCollection
  }, [db]);

  const handleRefreshData = (showActivity = false) => {
    fetchTasks();
    fetchMyWork();
    // fetchNews is now handled by useCollection
    
    if (showActivity) {
      setTimeout(() => {
        const tabsList = document.querySelector('[role="tablist"]');
        const activityTab = tabsList?.querySelector('[value="activity"]') as HTMLButtonElement;
        activityTab?.click();
      }, 100);
    }
  };

  // Volunteer Directory (Staff Only)
  const volunteersQuery = useMemoFirebase(() => 
    (db && user) ? query(collection(db, "users"), where("isVolunteer", "==", true), orderBy("registeredAt", "desc")) : null, 
  [db, user]);
  const { data: allVolunteers = [], loading: volunteersLoading } = useCollection<any>(volunteersQuery as any);

  const currentVolunteerProfile = useMemo(() => 
    allVolunteers.find(v => v.email?.toLowerCase() === volunteerEmail?.toLowerCase()),
  [allVolunteers, volunteerEmail]);

  // Current Public Volunteer Status
  const [publicVolunteerData, setPublicVolunteerData] = useState<any[]>([]);
  const [isCheckingPublicStatus, setIsCheckingPublicStatus] = useState(false);

  useEffect(() => {
    if (!db || user || !volunteerEmail || volunteerEmail.length < 5) {
      setPublicVolunteerData([]);
      return;
    }

    const checkStatus = async () => {
      setIsCheckingPublicStatus(true);
      try {
        const { getDocs } = await import("firebase/firestore");
        const q = query(collection(db, "users"), where("isVolunteer", "==", true), where("email", "==", volunteerEmail));
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setPublicVolunteerData(docs);
      } catch (err) {
        console.warn("Public status check failed (likely permissions):", err);
        setPublicVolunteerData([]);
      } finally {
        setIsCheckingPublicStatus(false);
      }
    };

    checkStatus();
  }, [db, user, volunteerEmail]);

  const effectiveStatus = user ? 'active' : (publicVolunteerData[0]?.status || 'unregistered');

  const handleToggleInfoInterest = async (item: any) => {
    if (!db || !volunteerEmail) {
        setIsRegModalOpen(true);
        return;
    }
    
    const isInterested = item.interestedUserIds?.includes(volunteerEmail);
    const itemRef = doc(db, "info_items", item.id);

    try {
      await updateDoc(itemRef, {
        interestedUserIds: isInterested ? arrayRemove(volunteerEmail) : arrayUnion(volunteerEmail)
      });
      toast({ 
        title: isInterested ? "Interest Removed" : "Interest Recorded", 
        description: isInterested ? "You are no longer marked as interested." : "Your interest has been logged. We will contact you soon!" 
      });
    } catch (error: any) {
      console.error("Interest Update Error:", error);
      const isPermission = error?.message?.includes('permission') || error?.code === 'permission-denied';
      toast({ 
        title: "Registration Required", 
        description: isPermission 
            ? "Your interest couldn't be logged. Please ensure you are logged in or contact staff directly." 
            : "Failed to update interest. Please try again.", 
        variant: "destructive" 
      });
    }
  };

  // Filter tasks to show ones that are available
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
        // If already completed by me, hide from available list
        if (t.completedByVolunteers?.includes(volunteerEmail || "")) return false;
        
        // Hide if I'm already doing it (it will show in My Activity)
        if (t.doingByVolunteers?.includes(volunteerEmail || "")) return false;
        
        // Show all other available volunteer tasks
        return true;
    });
  }, [tasks, volunteerEmail]);

  const myInProgressTasks = useMemo(() => {
    if (!volunteerEmail) return [];
    return tasks.filter(t => t.doingByVolunteers?.includes(volunteerEmail));
  }, [tasks, volunteerEmail]);

  // Filter completed tasks to only show ones that have an unredeemed reward
  // OR show all if no reward was involved (maybe show for a limited time?)
  const contributionsWithRewards = useMemo(() => {
    if (!volunteerEmail) return [];
    return myCompletedTasks.filter(t => {
        // If no reward, clear off (user said "when volunteer indicates completed, it should clear off")
        if (!t.rewardDescription) return false;
        
        // If reward exists, only show if NOT redeemed by me
        return !t.redeemedByVolunteers?.includes(volunteerEmail);
    });
  }, [myCompletedTasks, volunteerEmail]);

  const recentlyCompletedTasks = useMemo(() => {
    if (!volunteerEmail) return [];
    // Show tasks completed in the last 24 hours OR ones with rewards
    return myCompletedTasks.filter(t => {
      if (t.rewardDescription && !t.redeemedByVolunteers?.includes(volunteerEmail)) return true;
      if (!t.completedAt) return false;
      const completedDate = new Date(t.completedAt).getTime();
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      return completedDate > oneDayAgo;
    });
  }, [myCompletedTasks, volunteerEmail]);

  const handleRegisterSuccess = (email: string) => {
    setVolunteerEmail(email);
  };

  const handleTaskAction = (taskId: string) => {
    if (!volunteerEmail) {
      setIsRegModalOpen(true);
      return;
    }
    if (effectiveStatus === 'pending') {
      toast({
        title: "Approval Pending",
        description: "Your registration is still being reviewed by our staff. You'll be able to claim tasks once approved.",
      });
      return;
    }
    setSelectedTaskId(taskId);
    setIsTaskModalOpen(true);
  };

  const handleApproveVolunteer = async (volunteerId: string) => {
    if (!db || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "users", volunteerId), { status: 'active' });
      toast({ title: "Volunteer Approved", description: "They can now see and claim tasks." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to approve volunteer.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVolunteer = async (volunteerId: string) => {
    if (!db || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "users", volunteerId), { status: 'rejected' });
      toast({ title: "Registration Rejected" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to reject registration.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRedeemReward = async (taskId: string) => {
    if (!db || !volunteerEmail || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "tasks", taskId), {
        redeemedByVolunteers: arrayUnion(volunteerEmail)
      });
      toast({ title: "Reward Redeemed!", description: "Thank you for your hard work. Enjoy your reward!" });
      handleRefreshData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to redeem reward.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTask = async () => {
    if (!db || !editingTaskData || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "tasks", editingTaskData.id), {
        title: editingTaskData.title,
        objective: editingTaskData.objective,
        park: editingTaskData.park,
        dueDate: editingTaskData.dueDate,
        displayTime: editingTaskData.displayTime || null,
        rewardDescription: editingTaskData.rewardDescription || null,
        rewardCode: editingTaskData.rewardCode || null,
        maxVolunteers: editingTaskData.maxVolunteers || null,
        volunteerPoints: editingTaskData.volunteerPoints || null,
        volunteerImageUrl: editingTaskData.volunteerImageUrl || null
      });
      toast({ title: "Task Updated", description: "The volunteer opportunity has been updated." });
      setIsEditTaskModalOpen(false);
      handleRefreshData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update task.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveInfo = async (itemId: string) => {
    if (!db || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "info_items", itemId), { isArchived: true });
      toast({ title: "News Item Archived" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to archive item.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportInterestedVolunteers = (item: any) => {
    if (!item.interestedUserIds || item.interestedUserIds.length === 0) return;
    
    const headers = ["Email", "Status"];
    const rows = item.interestedUserIds.map((email: string) => {
      const v = allVolunteers.find(vol => vol.email === email);
      return [email, v?.status || "Unregistered"];
    });
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Interested_Volunteers_${item.title.replace(/\\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: "Export Started", description: "Downloading volunteer list..." });
  };

  const selectedTask = useMemo(() => {
    const allPossible = [...tasks, ...logTasks, ...myCompletedTasks];
    return allPossible.find(t => t.id === selectedTaskId) || null;
  }, [tasks, logTasks, myCompletedTasks, selectedTaskId]);

  if (user) {
    // Staff View: Volunteer Management
    return (
      <DashboardShell 
        title="Volunteer Management" 
        description="Monitor contributions and approve new community volunteers."
      >
        <Tabs defaultValue="log" className="w-full">
          <TabsList className="mb-6 bg-muted/50 p-1 rounded-xl h-12 w-full">
            <TabsTrigger value="log" className="flex-1 flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white h-10 px-1 sm:px-6 font-bold text-[10px] sm:text-sm">
              <ClipboardList className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Contribution Log</span> <span className="sm:hidden">Log</span>
            </TabsTrigger>
            <TabsTrigger value="approvals" className="flex-1 flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white h-10 px-1 sm:px-6 font-bold relative text-[10px] sm:text-sm">
              <UserPlus className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Pending Approvals</span> <span className="sm:hidden">New</span>
              {allVolunteers.filter(v => v.status === 'pending').length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white font-bold shadow-sm border-2 border-white">
                  {allVolunteers.filter(v => v.status === 'pending').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="volunteers" className="flex-1 flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white h-10 px-1 sm:px-6 font-bold text-[10px] sm:text-sm">
              <Users className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Approved Volunteers</span> <span className="sm:hidden">Staff</span>
            </TabsTrigger>
            <TabsTrigger value="tasks_mgmt" className="flex-1 flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white h-10 px-1 sm:px-6 font-bold text-[10px] sm:text-sm">
              <Sparkles className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Opportunity Management</span> <span className="sm:hidden">Tasks</span>
            </TabsTrigger>
            <TabsTrigger value="news_mgmt" className="flex-1 flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white h-10 px-1 sm:px-6 font-bold text-[10px] sm:text-sm">
              <Megaphone className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Volunteer News Hub</span> <span className="sm:hidden">News</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="log">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2 text-orange-600">
                  <ClipboardList className="h-5 w-5" />
                  Recent Activity
                </h3>
                <Badge variant="outline" className="font-bold">{logTasks.length} Records</Badge>
              </div>

              {logLoading ? (
                <div className="flex justify-center py-20"><Clock className="animate-spin h-8 w-8 text-orange-500" /></div>
              ) : logTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-3xl bg-muted/20 opacity-60">
                  <Heart className="h-12 w-12 mb-4 text-orange-500 opacity-20" />
                  <p className="text-lg font-medium text-muted-foreground">No volunteer work logged yet.</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {logTasks.map(task => (
                    <Card key={task.id} className="group relative overflow-hidden border-2 border-orange-500/10 hover:border-orange-500/30 transition-all shadow-md flex flex-col cursor-pointer" onClick={() => { setSelectedTaskId(task.id); setIsTaskModalOpen(true); }}>
                      <div className="absolute top-0 right-0 p-3">
                        <Badge className="bg-green-500 text-white shadow-lg text-[9px] uppercase font-bold tracking-widest">Completed</Badge>
                      </div>
                      <CardHeader className="pb-3 px-6">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-[10px] font-bold text-orange-600 border-orange-200 uppercase tracking-widest shrink-0 w-fit">{task.park}</Badge>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/40 text-[10px] font-bold text-muted-foreground shrink-0">
                                <Clock className="h-3 w-3" /> 
                                {task.completedAt ? (() => {
                                    try { return format(new Date(task.completedAt), 'MMM d, yyyy'); }
                                    catch(e) { return 'Recently'; }
                                })() : 'Recently'}
                            </div>
                        </div>
                        <CardTitle className="font-headline text-lg group-hover:text-orange-600 break-words flex-1 min-w-0">{task.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="pb-6 px-6 flex-1">
                        <div className="space-y-4">
                          <div className="p-3 rounded-lg bg-orange-50/50 border border-orange-100 flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shrink-0">
                                <Heart className="h-4 w-4 text-orange-600" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[9px] font-bold uppercase text-muted-foreground leading-none tracking-tight">Volunteer</span>
                                <span className="text-sm font-bold text-foreground truncate max-w-[150px]">
                                  {task.completedByVolunteers?.[0] || 'Community Member'}
                                </span>
                              </div>
                            </div>
                            <div className="pt-3 border-t border-orange-100">
                              <p className="text-xs font-medium text-foreground leading-relaxed italic line-clamp-2">"{task.completionNote || task.objective}"</p>
                            </div>
                            {task.completionImageUrl && (
                              <div className="relative aspect-video w-full rounded-xl border border-orange-200 overflow-hidden bg-muted/20 mt-1 shadow-inner">
                                <Image src={task.completionImageUrl} alt="Proof" fill className="object-cover" />
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="approvals">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2 text-orange-600">
                  <UserPlus className="h-5 w-5" />
                  Pending Registrations
                </h3>
                <Badge variant="outline" className="font-bold">{allVolunteers.filter(v => v.status === 'pending').length} Requests</Badge>
              </div>

              {volunteersLoading ? (
                <div className="flex justify-center py-20"><Clock className="animate-spin h-8 w-8 text-orange-500" /></div>
              ) : allVolunteers.filter(v => v.status === 'pending').length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-3xl bg-muted/20 opacity-60">
                  <UserCheck className="h-12 w-12 mb-4 text-orange-500 opacity-20" />
                  <p className="text-lg font-medium text-muted-foreground">No pending registrations.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {allVolunteers.filter(v => v.status === 'pending').map(v => (
                    <Card key={v.id} className="p-4 flex items-center justify-between hover:bg-orange-50/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold uppercase">
                          {v.email.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{v.email}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Registered {format(new Date(v.registeredAt), 'MMM d, h:mm a')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteVolunteer(v.id)} disabled={isSubmitting}>
                          Reject
                        </Button>
                        <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={() => handleApproveVolunteer(v.id)} disabled={isSubmitting}>
                          Approve
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="volunteers">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2 text-green-600">
                  <Users className="h-5 w-5" />
                  Active Community Volunteers
                </h3>
                <Badge variant="outline" className="font-bold">{allVolunteers.filter(v => v.status === 'active').length} Active</Badge>
              </div>

              {allVolunteers.filter(v => v.status === 'active').length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-3xl bg-muted/20 opacity-60">
                  <Users className="h-12 w-12 mb-4 text-green-500 opacity-20" />
                  <p className="text-lg font-medium text-muted-foreground">No approved volunteers yet.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {allVolunteers.filter(v => v.status === 'active').map(v => (
                    <Card key={v.id} className="p-4 flex items-center justify-between hover:bg-green-50/30 transition-colors border-green-500/10">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold uppercase">
                          {v.email.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{v.email}</p>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="bg-green-100 text-green-700 text-[9px] uppercase font-bold tracking-widest border-none">Active Volunteer</Badge>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold tracking-widest border-l pl-2 border-muted-foreground/30">
                               <Sparkles className="h-3 w-3 text-orange-500" /> {v.totalPoints || 0} Points
                               <span className="mx-1 opacity-30">•</span>
                               <CheckCircle2 className="h-3 w-3 text-green-600" /> {v.completedTasksCount || 0} Tasks
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteVolunteer(v.id)} disabled={isSubmitting}>
                          Deactivate
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

           <TabsContent value="tasks_mgmt">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2 text-orange-600">
                  <Sparkles className="h-5 w-5" />
                  Active Volunteer Opportunities
                </h3>
                <Badge variant="outline" className="font-bold">
                  {allVolunteerTasks.filter(t => t.status !== 'Completed').length} Active
                </Badge>
              </div>

              {allVolunteerTasks.filter(t => t.status !== 'Completed').length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-3xl bg-muted/20 opacity-60">
                  <Sparkles className="h-12 w-12 mb-4 text-orange-500 opacity-20" />
                  <p className="text-lg font-medium text-muted-foreground">No active volunteer tasks found.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {allVolunteerTasks.filter(t => t.status !== 'Completed').map(task => (
                    <Card key={task.id} className="p-4 flex items-center justify-between hover:bg-orange-50/30 transition-colors border-orange-500/10">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                          task.status === 'Doing' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                        }`}>
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{task.title}</p>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className={`text-[9px] uppercase font-bold tracking-widest border-none ${
                              task.status === 'Doing' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {task.status}
                            </Badge>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{task.park}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-muted-foreground hover:text-orange-600 hover:bg-orange-100/50"
                          onClick={() => {
                            setEditingTaskData({...task});
                            setIsEditTaskModalOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" /> Edit Task
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="news_mgmt">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2 text-orange-600">
                  <Megaphone className="h-5 w-5" />
                  Volunteer Communication Hub
                </h3>
                <Button 
                  size="sm" 
                  className="bg-orange-500 hover:bg-orange-600 font-bold gap-2"
                  onClick={() => {
                    setEditingNewsItem(null);
                    setIsInfoModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" /> Add Volunteer News
                </Button>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {effectiveNews.length === 0 ? (
                  <div className="col-span-full py-20 border-2 border-dashed rounded-3xl bg-muted/20 opacity-60 flex flex-col items-center justify-center">
                    <Megaphone className="h-12 w-12 mb-4 text-orange-500 opacity-20" />
                    <p className="text-lg font-medium text-muted-foreground">No volunteer news items published.</p>
                  </div>
                ) : (
                  effectiveNews.map((item: any) => (
                    <Card key={item.id} className="group relative overflow-hidden border-2 border-orange-500/10 hover:border-orange-500/30 transition-all duration-500 shadow-md hover:shadow-xl bg-card flex flex-col h-full rounded-3xl">
                      <CardHeader className="pb-3 w-full">
                        <div className="flex justify-between items-start mb-3">
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-200 uppercase text-[9px] font-bold tracking-widest px-2">
                            {item.type}
                          </Badge>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.createdAt ? format(new Date(item.createdAt), 'MMM d, yyyy') : 'Recently'}</span>
                        </div>
                        <CardTitle className="text-xl font-headline group-hover:text-orange-600 transition-colors leading-tight">{item.title}</CardTitle>
                      </CardHeader>

                      <CardContent className="flex-1 w-full pb-6">
                        <p className="text-sm text-foreground/80 leading-relaxed italic line-clamp-4 group-hover:line-clamp-none transition-all duration-300">
                          "{item.content}"
                        </p>
                      </CardContent>

                      <CardFooter className="w-full pt-4 border-t bg-orange-50/30 mt-auto flex flex-col gap-3">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-orange-600"
                              onClick={() => {
                                setEditingNewsItem(item);
                                setIsInfoModalOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleArchiveInfo(item.id)}
                              disabled={isSubmitting}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          {(item.type === 'CTA' || item.allowResponse) && item.interestedUserIds && item.interestedUserIds.length > 0 && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-[10px] font-bold uppercase text-orange-600 h-8 gap-1.5"
                              onClick={() => setSelectedItemForList(item)}
                            >
                              <Users className="h-3.5 w-3.5" /> {item.interestedUserIds.length} Interested
                            </Button>
                          )}
                        </div>
                        
                        {(item.type === 'CTA' || item.allowResponse) && (
                           <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full text-[10px] font-bold uppercase border-orange-200 text-orange-600 hover:bg-orange-100/50 h-9 gap-2"
                            onClick={() => handleExportInterestedVolunteers(item)}
                            disabled={!item.interestedUserIds || item.interestedUserIds.length === 0}
                          >
                            <Download className="h-3.5 w-3.5" /> Export Volunteer List
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <TaskDetailModal
          open={isTaskModalOpen}
          onOpenChange={setIsTaskModalOpen}
          task={selectedTask}
          allUsers={allUsers}
          allParks={allParks}
        />

        <InfoItemModal
          open={isInfoModalOpen}
          onOpenChange={setIsInfoModalOpen}
          editItem={editingNewsItem}
        />

        <Dialog open={!!selectedItemForList} onOpenChange={(open) => !open && setSelectedItemForList(null)}>
          <DialogContent className="sm:max-w-[450px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl text-orange-600">Volunteer Engagement</DialogTitle>
              <DialogDescription>
                Registered interest for:
                <br/>
                <span className="font-bold text-foreground">"{selectedItemForList?.title}"</span>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 max-h-[480px] overflow-y-auto py-4 pr-2">
              {selectedItemForList?.interestedUserIds?.map((email: string) => {
                const v = allVolunteers.find(vol => vol.email === email);
                return (
                  <div key={email} className="flex flex-col gap-3 p-4 border-2 rounded-2xl bg-orange-50/30 border-orange-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-orange-200 shadow-sm">
                          <AvatarFallback className="bg-orange-500/10 text-orange-600 font-bold">{email.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground leading-tight truncate max-w-[200px]">{email}</span>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
                            {v ? `${v.status} Volunteer` : 'Unregistered Contact'}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-bold bg-orange-500/5 text-orange-700 border-orange-200 uppercase tracking-tighter">Interest Logged</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2 pt-2 border-t border-dashed border-orange-200">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="text-[10px] font-medium truncate">{email}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="pt-2">
              <Button 
                className="w-full bg-orange-500 hover:bg-orange-600 font-bold uppercase tracking-widest text-xs h-12 rounded-2xl"
                onClick={() => handleExportInterestedVolunteers(selectedItemForList)}
              >
                <Download className="h-4 w-4 mr-2" /> Download CSV List
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DashboardShell>
    );
  }

  // Public View
  return (
    <DashboardShell 
      title="Volunteer Opportunities" 
      description="Help us maintain and improve our local parks and green spaces."
      isPublic={true}
      hideHeader={true}
    >
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-500 to-pink-500 p-8 text-white shadow-xl">
          <div className="relative z-10 max-w-2xl">
            <Badge className="bg-white/20 text-white border-white/30 mb-4 backdrop-blur-sm">Community Hub</Badge>
            <h2 className="text-4xl font-bold mb-4">
              {volunteerEmail ? "Welcome Back, Volunteer!" : "Make a Difference in Your Local Park"}
            </h2>
            <p className="text-lg opacity-90 mb-6">
              {volunteerEmail 
                ? "You are registered and active. Explore the tabs below to help out today."
                : "Join our team of dedicated volunteers. From biodiversity surveys to seasonal maintenance, your contribution helps keep our parks beautiful for everyone."
              }
            </p>
            <div className="flex gap-4">
              {!volunteerEmail ? (
                <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 font-bold" onClick={() => setIsRegModalOpen(true)}>
                  Register as Volunteer
                </Button>
              ) : (
                <div className="flex items-center gap-3">
                  {effectiveStatus === 'pending' && (
                    <Badge variant="secondary" className="bg-yellow-500 text-white border-none animate-pulse">Waiting for Staff Approval</Badge>
                  )}
                  {effectiveStatus === 'active' && (
                    <div className="flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-full border border-green-500/30">
                      <Sparkles className="h-4 w-4 text-green-300" />
                      <span className="text-xs font-bold text-white">{myInProgressTasks.length} Tasks in Progress</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="absolute right-0 top-0 h-full w-1/3 bg-[url('https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay" />
          <Heart className="absolute -bottom-10 -right-10 h-64 w-64 text-white opacity-10 rotate-12" />
        </div>

        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="mb-6 bg-orange-50/50 p-1 rounded-xl h-12 w-full">
            <TabsTrigger value="tasks" className="flex-1 flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white h-10 px-2 sm:px-6 font-bold text-xs sm:text-sm">
              <Sparkles className="h-4 w-4 shrink-0" /> <span className="truncate">Available Tasks</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex-1 flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white h-10 px-2 sm:px-6 font-bold relative text-xs sm:text-sm">
              <UserCheck className="h-4 w-4 shrink-0" /> <span className="truncate">My Activity</span>
              {(myInProgressTasks.length > 0 || contributionsWithRewards.length > 0) && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-[10px] text-white font-bold shadow-sm">
                  {myInProgressTasks.length + contributionsWithRewards.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="news" className="flex-1 flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white h-10 px-2 sm:px-6 font-bold text-xs sm:text-sm">
              <Megaphone className="h-4 w-4 shrink-0" /> <span className="truncate">Hub News</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex-1 flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white h-10 px-2 sm:px-6 font-bold text-xs sm:text-sm">
              <Home className="h-4 w-4 shrink-0" /> <span className="truncate">My Profile</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                  <Sparkles className="h-6 w-6 text-orange-500" />
                  Active Opportunities
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{filteredTasks.length} roles available</span>
                </div>
              </div>

              {effectiveStatus === 'pending' && (
                <div className="p-8 rounded-3xl border-2 border-dashed border-orange-200 bg-orange-50/30 flex flex-col items-center text-center">
                  <ShieldAlert className="h-12 w-12 text-orange-500 mb-4 opacity-50" />
                  <h4 className="text-xl font-bold text-orange-900 mb-2">Approval Required</h4>
                  <p className="text-orange-800/70 max-w-md italic">
                    "Your registration has been received! Our staff will review your application shortly. Once approved, you'll be able to claim tasks and earn rewards."
                  </p>
                </div>
              )}

              {tasksLoading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map(i => (
                    <Card key={i} className="animate-pulse bg-muted h-[300px] rounded-3xl" />
                  ))}
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-3xl bg-muted/20">
                  <Users className="h-12 w-12 mb-4 opacity-20" />
                  <p className="text-lg font-medium">No active volunteer roles at the moment.</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredTasks.map(task => (
                    <Card 
                      key={task.id} 
                      className={`group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-orange-500/10 overflow-hidden flex flex-col cursor-pointer rounded-3xl ${effectiveStatus === 'pending' ? 'opacity-50 grayscale pointer-events-none' : ''}`}
                      onClick={() => handleTaskAction(task.id)}
                    >
                      {task.volunteerImageUrl && (
                        <div className="relative aspect-video w-full overflow-hidden">
                          <Image src={task.volunteerImageUrl} alt={task.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                        </div>
                      )}
                      <CardHeader className="pb-4 relative">
                        <div className="absolute top-0 right-0 p-4 flex flex-col items-end gap-2">
                           <Badge className={`${task.doingByVolunteers?.includes(volunteerEmail || "") ? 'bg-blue-500' : (task.maxVolunteers && (task.doingByVolunteers?.length || 0) >= task.maxVolunteers) ? 'bg-muted text-muted-foreground' : 'bg-orange-500'} text-white shadow-lg`}>
                             {task.doingByVolunteers?.includes(volunteerEmail || "") 
                               ? 'In Progress' 
                               : (task.maxVolunteers && (task.doingByVolunteers?.length || 0) >= task.maxVolunteers) 
                                 ? 'Role Full' 
                                 : 'Open Opportunity'}
                           </Badge>
                           {(task.doingByVolunteers?.length || 0) > 0 || task.maxVolunteers ? (
                             <Badge variant="secondary" className={`bg-white/90 ${task.maxVolunteers && (task.doingByVolunteers?.length || 0) >= task.maxVolunteers ? 'text-red-600 border-red-200' : 'text-orange-600 border-orange-200'} shadow-sm text-[9px] font-black`}>
                               <Users className="h-3 w-3 mr-1" /> 
                               {task.doingByVolunteers?.length || 0}{task.maxVolunteers ? `/${task.maxVolunteers}` : ''} ACTIVE
                             </Badge>
                           ) : null}
                           {task.rewardDescription && (
                             <Badge className="bg-pink-500 text-white shadow-md animate-pulse">🎁 Reward: {task.rewardDescription}</Badge>
                           )}
                        </div>
                        {!task.volunteerImageUrl && (
                          <div className="h-12 w-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-4 group-hover:scale-110 transition-transform">
                            <Users className="h-6 w-6" />
                          </div>
                        )}
                        <CardTitle className="text-xl leading-tight font-headline">{task.title}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1 text-orange-600 font-medium">
                          <MapPin className="h-3 w-3" />
                          {task.park}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-6 flex-1">
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-6 italic">
                          "{task.objective}"
                        </p>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg">
                            <Calendar className="h-3.5 w-3.5" />
                            <div className="flex flex-col">
                              <span>Available: {format(new Date(task.dueDate), 'PPP')}</span>
                              {task.displayTime && (
                                <span className="text-[10px] font-bold text-orange-600 flex items-center gap-1">
                                  <Clock className="h-2.5 w-2.5" /> Preferred Time: {task.displayTime}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0 mt-auto">
                        <Button 
                          className="w-full bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20 font-bold h-11 rounded-xl"
                          onClick={() => handleTaskAction(task.id)}
                          disabled={effectiveStatus === 'pending'}
                        >
                          {volunteerEmail ? "HELP WITH THIS TASK" : "REGISTER TO HELP"}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <div className="space-y-8">
              {/* In Progress Section */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Currently Helping With
                </h3>
                {myInProgressTasks.length === 0 ? (
                  <div className="p-8 border-2 border-dashed rounded-3xl bg-muted/20 text-center">
                    <p className="text-sm text-muted-foreground italic">You aren't currently working on any tasks. Claim one from the "Available Tasks" tab!</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {myInProgressTasks.map(task => (
                      <Card key={task.id} className="p-4 border-l-4 border-l-blue-500 flex items-center justify-between hover:bg-blue-50/30 transition-colors cursor-pointer" onClick={() => handleTaskAction(task.id)}>
                        <div>
                          <p className="font-bold text-foreground">{task.title}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{task.park}</p>
                        </div>
                        <Button size="sm" variant="outline" className="text-blue-600 border-blue-200">
                          View Details
                        </Button>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Rewards Section */}
              {contributionsWithRewards.length > 0 && (
                <div className="space-y-4 pt-4">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                    <Heart className="h-5 w-5 text-pink-500 fill-current" />
                    Your Available Rewards
                  </h3>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {contributionsWithRewards.map(task => (
                      <Card 
                        key={task.id} 
                        className="group border-pink-500/10 overflow-hidden flex flex-col bg-pink-50/20 cursor-pointer rounded-3xl"
                        onClick={() => handleTaskAction(task.id)}
                      >
                        <CardHeader className="pb-4 relative">
                          <div className="absolute top-0 right-0 p-4 flex flex-col items-end gap-2">
                             <Badge className="bg-green-500 text-white shadow-lg">Work Completed</Badge>
                             <Badge className="bg-pink-500 text-white shadow-md animate-bounce">🎁 Reward Ready!</Badge>
                          </div>
                          <div className="h-10 w-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500 mb-2">
                            <Heart className="h-5 w-5 fill-current" />
                          </div>
                          <CardTitle className="text-lg leading-tight font-headline">{task.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="pb-4 flex-1">
                          <div className="p-3 rounded-xl bg-white border-2 border-dashed border-pink-200 text-center shadow-inner">
                            <span className="text-[10px] font-bold uppercase text-pink-400 block mb-1 tracking-widest">Your Reward</span>
                            <span className="text-md font-black text-pink-700">{task.rewardDescription}</span>
                          </div>
                        </CardContent>
                        <CardFooter className="pt-0 mt-auto p-0">
                          <Button 
                            className="w-full bg-pink-500 hover:bg-pink-600 shadow-lg shadow-pink-500/20 font-bold h-10 rounded-none uppercase tracking-widest text-[10px]"
                            onClick={(e) => { e.stopPropagation(); handleRedeemReward(task.id); }}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? "Processing..." : "Mark as Redeemed"}
                            <CheckCircle2 className="ml-2 h-4 w-4" />
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* History Section */}
              <div className="space-y-4 pt-4">
                <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Recent Contributions
                </h3>
                {recentlyCompletedTasks.length === 0 ? (
                  <div className="p-8 border-2 border-dashed rounded-3xl bg-muted/20 text-center">
                    <p className="text-sm text-muted-foreground italic">No recent history. Your contributions will appear here for 24 hours.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {recentlyCompletedTasks.map(task => (
                      <div key={task.id} className="flex items-center justify-between p-4 rounded-2xl bg-green-50/50 border border-green-100">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-foreground">{task.title}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                                {task.park} • {task.completedAt ? (() => {
                                    try { return format(new Date(task.completedAt), 'MMM d, h:mm a'); }
                                    catch(e) { return 'Recently'; }
                                })() : 'Just now'}
                            </p>
                          </div>
                        </div>
                        {task.rewardDescription && (
                          <Badge variant="outline" className="text-pink-600 border-pink-200 bg-pink-50">
                            {task.redeemedByVolunteers?.includes(volunteerEmail || "") ? 'Reward Redeemed' : 'Reward Available'}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="news">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Megaphone className="h-6 w-6 text-orange-500" />
                <h3 className="text-2xl font-bold">Volunteer Hub News</h3>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {newsLoading && effectiveNews.length === 0 ? (
                   Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-48 rounded-3xl bg-muted animate-pulse" />
                  ))
                ) : (hasPermissionError && effectiveNews.length === 0) ? (
                  <div className="col-span-full py-12 px-6 flex flex-col items-center justify-center border-2 border-dashed rounded-3xl bg-orange-50/30 text-center">
                    <ShieldAlert className="h-12 w-12 mb-4 text-orange-500 opacity-50" />
                    <h4 className="text-lg font-bold text-foreground mb-2">Member Content Restricted</h4>
                    <p className="text-sm text-muted-foreground mb-6 max-w-sm">Some hub news and announcements are restricted to registered volunteers. Please sign in to view the full news feed.</p>
                    <Button 
                        variant="outline" 
                        className="border-orange-200 text-orange-600 hover:bg-orange-50 font-bold"
                        onClick={() => window.location.href = '/login'}
                    >
                        Volunteer Sign In
                    </Button>
                  </div>
                ) : effectiveNews.length === 0 ? (
                  <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed rounded-3xl opacity-50 bg-muted/20">
                    <Megaphone className="h-10 w-10 mb-3 text-orange-500" />
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No news updates for volunteers yet.</p>
                  </div>
                ) : (
                  effectiveNews.map((item: any) => {
                    const isInterested = item.interestedUserIds?.includes(volunteerEmail || "");
                    return (
                      <Card key={item.id} className="border-2 border-orange-100 bg-orange-50/20 hover:bg-orange-50/40 transition-colors rounded-3xl overflow-hidden">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-200 uppercase text-[9px] font-bold tracking-widest px-2">
                              {item.type === 'CTA' ? 'Special Event' : item.type}
                            </Badge>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.createdAt ? format(new Date(item.createdAt), 'MMM d, yyyy') : 'Recently'}</span>
                          </div>
                          <CardTitle className="text-xl font-headline mt-2">{item.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="pb-4">
                          <p className="text-sm text-foreground/80 leading-relaxed italic line-clamp-3">
                            "{item.content}"
                          </p>
                        </CardContent>
                        <CardFooter className="pt-2 border-t border-orange-100/50 p-0 flex flex-col">
                          {item.type === 'Document' && item.url ? (
                            <Button asChild className="w-full gap-2 font-bold uppercase tracking-widest text-xs h-12 bg-orange-500 hover:bg-orange-600 rounded-none border-none" variant="default">
                              <a href={item.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5" /> View Info Document
                              </a>
                            </Button>
                          ) : (item.type === 'CTA' || item.allowResponse) ? (
                            <Button 
                              onClick={() => handleToggleInfoInterest(item)}
                              variant={isInterested ? "secondary" : "default"}
                              className={`w-full gap-2 font-bold uppercase tracking-widest text-xs h-12 rounded-none border-none ${isInterested ? 'bg-green-600/10 text-green-700 hover:bg-green-600/20' : 'bg-orange-500 hover:bg-orange-600'}`}
                            >
                              {isInterested ? <UserCheck className="h-3.5 w-3.5" /> : <HandMetal className="h-3.5 w-3.5 text-white" />}
                              {isInterested ? "Interest Logged" : item.ctaLabel || "Register Interest"}
                            </Button>
                          ) : (
                            <div className="h-12 w-full flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic border-t">
                              <Info className="h-3.5 w-3.5 mr-2" /> General Hub Information
                            </div>
                          )}
                        </CardFooter>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Home className="h-6 w-6 text-orange-500" />
                <h3 className="text-2xl font-bold">Volunteer Profile</h3>
              </div>
              
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-1 p-6 border-2 border-orange-100 bg-orange-50/30 rounded-3xl flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 border-4 border-white shadow-xl mb-4">
                    <AvatarFallback className="bg-gradient-to-br from-orange-500 to-pink-500 text-white text-3xl font-black">
                      {volunteerEmail?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h4 className="text-xl font-bold text-foreground truncate w-full">{volunteerEmail}</h4>
                  <Badge className="bg-orange-500/10 text-orange-600 border-none uppercase text-[10px] font-bold tracking-widest mt-2 px-3">
                    Active Volunteer
                  </Badge>
                  <div className="w-full h-px bg-orange-200/50 my-6" />
                  <p className="text-xs text-muted-foreground italic leading-relaxed">
                    "Thank you for being part of our community. Every point you earn helps us keep our parks beautiful."
                  </p>
                </Card>

                <div className="md:col-span-2 grid gap-6 sm:grid-cols-2">
                  <Card className="p-6 border-2 border-orange-100 bg-white rounded-3xl shadow-sm group hover:border-orange-500/30 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-12 w-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <Badge variant="outline" className="text-orange-600 border-orange-200">Lifetime Points</Badge>
                    </div>
                    <div className="space-y-1">
                      <span className="text-5xl font-black text-foreground">{currentVolunteerProfile?.totalPoints || 0}</span>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Points Earned</p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-orange-50">
                       <Progress value={((currentVolunteerProfile?.totalPoints || 0) % 100)} className="h-1.5 bg-orange-100" />
                       <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-tighter">{(100 - ((currentVolunteerProfile?.totalPoints || 0) % 100))} points until next rank</p>
                    </div>
                  </Card>

                  <Card className="p-6 border-2 border-green-100 bg-white rounded-3xl shadow-sm group hover:border-green-500/30 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-12 w-12 rounded-2xl bg-green-100 flex items-center justify-center text-green-600">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-200">Total Impact</Badge>
                    </div>
                    <div className="space-y-1">
                      <span className="text-5xl font-black text-foreground">{currentVolunteerProfile?.completedTasksCount || 0}</span>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tasks Completed</p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-green-50">
                      <div className="flex -space-x-2">
                        {Array.from({ length: Math.min(5, currentVolunteerProfile?.completedTasksCount || 0) }).map((_, i) => (
                          <div key={i} className="h-6 w-6 rounded-full bg-green-500 border-2 border-white flex items-center justify-center">
                            <Heart className="h-3 w-3 text-white fill-current" />
                          </div>
                        ))}
                        {(currentVolunteerProfile?.completedTasksCount || 0) > 5 && (
                          <div className="h-6 w-6 rounded-full bg-muted border-2 border-white flex items-center justify-center text-[8px] font-bold">
                            +{(currentVolunteerProfile?.completedTasksCount || 0) - 5}
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-tighter">Your community contribution</p>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <VolunteerRegistrationModal 
        open={isRegModalOpen} 
        onOpenChange={setIsRegModalOpen} 
        onSuccess={handleRegisterSuccess}
        defaultEmail={user?.email || ""}
      />

      <TaskDetailModal
        open={isTaskModalOpen}
        onOpenChange={setIsTaskModalOpen}
        task={selectedTask}
        allUsers={allUsers}
        allParks={allParks}
        volunteerEmail={volunteerEmail}
        onSuccess={() => handleRefreshData(true)}
      />

      <Dialog open={isEditTaskModalOpen} onOpenChange={setIsEditTaskModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="font-headline">Edit Volunteer Opportunity</DialogTitle>
            <DialogDescription>Update the details for this community task.</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6">
            {editingTaskData && (
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Task Identity</Label>
                  <Input 
                    placeholder="Task Title" 
                    value={editingTaskData.title} 
                    onChange={e => setEditingTaskData({...editingTaskData, title: e.target.value})} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Objective</Label>
                  <Textarea 
                    placeholder="What needs to be achieved?" 
                    value={editingTaskData.objective} 
                    onChange={e => setEditingTaskData({...editingTaskData, objective: e.target.value})} 
                  />
                </div>

                <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-orange-700">Location</Label>
                      <Select value={editingTaskData.park} onValueChange={v => setEditingTaskData({...editingTaskData, park: v})}>
                        <SelectTrigger className="bg-white border-orange-200 h-9">
                          <SelectValue placeholder="Select Park" />
                        </SelectTrigger>
                        <SelectContent>
                          {(allParks.length > 0 ? allParks : [{name: editingTaskData.park}]).map((p: any) => (
                            <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-orange-700">Due Date</Label>
                      <Input 
                        type="date" 
                        value={editingTaskData.dueDate ? editingTaskData.dueDate.split('T')[0] : ''} 
                        onChange={e => setEditingTaskData({...editingTaskData, dueDate: e.target.value})} 
                        className="bg-white border-orange-200 h-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-orange-700">Volunteer Points Awarded</Label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(p => (
                        <Button 
                          key={p}
                          type="button"
                          variant={editingTaskData.volunteerPoints === p ? "default" : "outline"}
                          className={`flex-1 h-9 font-bold ${editingTaskData.volunteerPoints === p ? 'bg-orange-500 hover:bg-orange-600 border-none' : 'border-orange-200 text-orange-600 hover:bg-orange-50 bg-white'}`}
                          onClick={() => setEditingTaskData({...editingTaskData, volunteerPoints: p})}
                        >
                          {p}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-orange-700">Completion Reward (Optional)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input 
                        placeholder="Reward Name" 
                        value={editingTaskData.rewardDescription || ""}
                        onChange={e => setEditingTaskData({...editingTaskData, rewardDescription: e.target.value})}
                        className="bg-white border-orange-200 text-xs h-9"
                      />
                      <Input 
                        placeholder="Reward Code" 
                        value={editingTaskData.rewardCode || ""}
                        onChange={e => setEditingTaskData({...editingTaskData, rewardCode: e.target.value})}
                        className="bg-white border-orange-200 text-xs h-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-orange-700">Volunteer Capacity</Label>
                    <Input 
                      type="number"
                      placeholder="Unlimited" 
                      value={editingTaskData.maxVolunteers || ""}
                      onChange={e => setEditingTaskData({...editingTaskData, maxVolunteers: parseInt(e.target.value) || 0})}
                      className="bg-white border-orange-200 text-xs h-9"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 border-t bg-muted/20">
            <Button variant="ghost" onClick={() => setIsEditTaskModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button 
              className="bg-orange-500 hover:bg-orange-600 font-bold px-8" 
              onClick={handleUpdateTask} 
              disabled={isSubmitting || !editingTaskData?.title}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InfoItemModal
        open={isInfoModalOpen}
        onOpenChange={setIsInfoModalOpen}
        editItem={editingNewsItem}
      />
    </DashboardShell>
  );
}
