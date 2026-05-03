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
  Search
} from "lucide-react";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, orderBy, limit, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { Task } from "@/lib/types";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { VolunteerRegistrationModal } from "@/components/modals/volunteer-registration-modal";
import { TaskDetailModal } from "@/components/modals/task-detail-modal";
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
  useEffect(() => {
    const savedEmail = localStorage.getItem("volunteerEmail");
    if (savedEmail) setVolunteerEmail(savedEmail);
  }, []);

  // Public Portal Data - Using manual fetch to avoid permission-denied noise in console
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  const fetchTasks = async () => {
    if (!db) return;
    setTasksLoading(true);
    try {
      const { getDocs } = await import("firebase/firestore");
      const q = query(
        collection(db, "tasks"), 
        where("isVolunteerEligible", "==", true),
        where("status", "==", "Todo"),
        limit(50)
      );
      const snapshot = await getDocs(q);
      setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Task));
    } catch (err) {
      console.warn("Public tasks fetch failed (check Firestore rules):", err);
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
      // Silent fail for contributions
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [db]);

  useEffect(() => {
    fetchMyWork();
  }, [db, volunteerEmail]);

  const handleRefreshData = () => {
    fetchTasks();
    fetchMyWork();
  };

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

  // Hub News
  const [infoItems, setInfoItems] = useState<any[]>([]);
  useEffect(() => {
    if (!db) return;
    const fetchNews = async () => {
      try {
        const { getDocs } = await import("firebase/firestore");
        const q = query(collection(db, "info_items"), where("isVolunteerVisible", "==", true), where("isArchived", "==", false));
        const snapshot = await getDocs(q);
        setInfoItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        // Silent fail for news
      }
    };
    fetchNews();
  }, [db]);

  // Volunteer Directory (Staff Only)
  const volunteersQuery = useMemoFirebase(() => 
    (db && user) ? query(collection(db, "users"), where("isVolunteer", "==", true), orderBy("registeredAt", "desc")) : null, 
  [db, user]);
  const { data: allVolunteers = [], loading: volunteersLoading } = useCollection<any>(volunteersQuery as any);

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
    } catch (error) {
      toast({ title: "Error", description: "Failed to update interest.", variant: "destructive" });
    }
  };

  // Filter tasks to hide ones already completed by this volunteer
  const filteredTasks = useMemo(() => {
    if (!volunteerEmail) return tasks;
    return tasks.filter(t => !t.completedByVolunteers?.includes(volunteerEmail));
  }, [tasks, volunteerEmail]);

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
          <TabsList className="mb-6">
            <TabsTrigger value="log" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Contribution Log
            </TabsTrigger>
            <TabsTrigger value="approvals" className="flex items-center gap-2 relative">
              <UserPlus className="h-4 w-4" /> Pending Approvals
              {allVolunteers.filter(v => v.status === 'pending').length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white font-bold shadow-sm">
                  {allVolunteers.filter(v => v.status === 'pending').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="volunteers" className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Approved Volunteers
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
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/40 text-[10px] font-bold text-muted-foreground shrink-0"><Clock className="h-3 w-3" /> {task.completedAt ? format(new Date(task.completedAt), 'MMM d, yyyy') : 'Recently'}</div>
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
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-green-100 text-green-700 text-[9px] uppercase font-bold tracking-widest border-none">Active Volunteer</Badge>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Joined {v.registeredAt ? format(new Date(v.registeredAt), 'MMM d, yyyy') : 'Unknown'}</p>
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
        </Tabs>

        <TaskDetailModal
          open={isTaskModalOpen}
          onOpenChange={setIsTaskModalOpen}
          task={selectedTask}
          allUsers={allUsers}
          allParks={allParks}
        />
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
                   <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-md border border-white/30">
                    {effectiveStatus === 'active' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-300" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-300" />
                    )}
                    <span className="font-bold text-sm">
                      {effectiveStatus === 'active' ? `Approved: ${volunteerEmail}` : `Pending: ${volunteerEmail}`}
                    </span>
                  </div>
                  {effectiveStatus === 'pending' && (
                    <Badge variant="secondary" className="bg-yellow-500 text-white border-none animate-pulse">Waiting for Staff Approval</Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="absolute right-0 top-0 h-full w-1/3 bg-[url('https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay" />
          <Heart className="absolute -bottom-10 -right-10 h-64 w-64 text-white opacity-10 rotate-12" />
        </div>

        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="mb-6 bg-orange-50/50 p-1 rounded-xl h-12">
            <TabsTrigger value="tasks" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white h-10 px-6 font-bold">
              <Sparkles className="h-4 w-4" /> Available Tasks
            </TabsTrigger>
            <TabsTrigger value="news" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white h-10 px-6 font-bold">
              <Megaphone className="h-4 w-4" /> Hub News
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
                           <Badge className="bg-orange-500 text-white shadow-lg">Open Opportunity</Badge>
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

          <TabsContent value="news">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Megaphone className="h-6 w-6 text-orange-500" />
                <h3 className="text-2xl font-bold">Volunteer Hub News</h3>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {infoItems.map((item: any) => {
                  const isInterested = item.interestedUserIds?.includes(volunteerEmail || "");
                  return (
                    <Card key={item.id} className="border-2 border-orange-100 bg-orange-50/20 hover:bg-orange-50/40 transition-colors rounded-3xl overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-200 uppercase text-[9px] font-bold tracking-widest px-2">
                            {item.type === 'CTA' ? 'Special Event' : item.type}
                          </Badge>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">{format(new Date(item.createdAt), 'MMM d, yyyy')}</span>
                        </div>
                        <CardTitle className="text-xl font-headline mt-2">{item.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <p className="text-sm text-foreground/80 leading-relaxed italic line-clamp-3">
                          "{item.content}"
                        </p>
                      </CardContent>
                      <CardFooter className="pt-2 border-t border-orange-100/50 p-0">
                        {item.type === 'Document' && item.url ? (
                          <Button asChild className="w-full gap-2 font-bold uppercase tracking-widest text-xs h-12 bg-orange-500 hover:bg-orange-600 rounded-none" variant="default">
                            <a href={item.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" /> View Info Document
                            </a>
                          </Button>
                        ) : (item.type === 'CTA' || item.allowResponse) ? (
                          <Button 
                            onClick={() => handleToggleInfoInterest(item)}
                            variant={isInterested ? "secondary" : "default"}
                            className={`w-full gap-2 font-bold uppercase tracking-widest text-xs h-12 rounded-none ${isInterested ? 'bg-green-600/10 text-green-700 hover:bg-green-600/20' : 'bg-orange-500 hover:bg-orange-600'}`}
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
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Completed Contributions & Rewards */}
        {myCompletedTasks.length > 0 && (
          <div className="space-y-6 pt-8 border-t">
            <div className="flex items-center gap-2">
              <Heart className="h-6 w-6 text-pink-500 fill-current" />
              <h3 className="text-2xl font-bold">Your Contributions & Rewards</h3>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {myCompletedTasks.map(task => (
                <Card 
                  key={task.id} 
                  className="group border-pink-500/10 overflow-hidden flex flex-col bg-pink-50/20 cursor-pointer"
                  onClick={() => handleTaskAction(task.id)}
                >
                  <CardHeader className="pb-4 relative">
                    <div className="absolute top-0 right-0 p-4 flex flex-col items-end gap-2">
                       <Badge className="bg-green-500 text-white shadow-lg">Completed</Badge>
                       {task.rewardDescription && (
                         <Badge className="bg-pink-500 text-white shadow-md animate-bounce">🎁 Reward Ready!</Badge>
                       )}
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-pink-500/10 flex items-center justify-center text-pink-500 mb-4">
                      <Heart className="h-6 w-6 fill-current" />
                    </div>
                    <CardTitle className="text-xl leading-tight">{task.title}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1 text-pink-600 font-medium">
                      <MapPin className="h-3 w-3" />
                      {task.park}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-6 flex-1">
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 italic">
                      "{task.completionNote || task.objective}"
                    </p>
                    {task.rewardDescription && (
                      <div className="p-3 rounded-lg bg-white border-2 border-dashed border-pink-200 text-center">
                        <span className="text-[10px] font-bold uppercase text-pink-400 block mb-1">Your Reward</span>
                        <span className="text-sm font-bold text-pink-600">{task.rewardDescription}</span>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="pt-0 mt-auto">
                    <Button 
                      className="w-full bg-pink-500 hover:bg-pink-600 shadow-lg shadow-pink-500/20 font-bold h-11"
                      onClick={(e) => { e.stopPropagation(); handleTaskAction(task.id); }}
                    >
                      {task.rewardDescription ? "COLLECT REWARD" : "VIEW CONTRIBUTION"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}
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
        onSuccess={handleRefreshData}
      />
    </DashboardShell>
  );
}
