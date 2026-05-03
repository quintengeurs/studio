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
  UserCheck
} from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useUser, useFirebase } from "@/firebase";
import { collection, query, where, orderBy, limit, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { Task } from "@/lib/types";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { VolunteerRegistrationModal } from "@/components/modals/volunteer-registration-modal";
import { TaskDetailModal } from "@/components/modals/task-detail-modal";
import { useDataContext } from "@/context/DataContext";

export default function VolunteeringPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { auth } = useFirebase();
  const { allUsers, allParks } = useDataContext();
  const { toast } = useToast();
  
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [volunteerEmail, setVolunteerEmail] = useState<string | null>(null);
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Enable anonymous auth for volunteers if not already logged in
    if (!user) {
      signInAnonymously(auth).catch(err => console.error("Anon auth failed:", err));
    }

    const savedEmail = localStorage.getItem("volunteerEmail");
    if (savedEmail) setVolunteerEmail(savedEmail);
  }, [user, auth]);

  // Public Portal Data
  const volunteerTasksQuery = useMemoFirebase(() => 
    (db && user) ? query(
      collection(db, "tasks"), 
      where("isVolunteerEligible", "==", true),
      where("status", "==", "Todo"),
      limit(50)
    ) : null, 
  [db, user]);

  const { data: rawTasks = [], loading } = useCollection<Task>(volunteerTasksQuery as any);

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

  const infoQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "info_items"), where("isVolunteerVisible", "==", true), where("isArchived", "==", false));
  }, [db, user]);
  const { data: infoItems = [] } = useCollection<any>(infoQuery as any);

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

  const tasks = useMemo(() => {
    if (!volunteerEmail) return rawTasks;
    return rawTasks.filter(t => !t.completedByVolunteers?.includes(volunteerEmail));
  }, [rawTasks, volunteerEmail]);

  const handleRegisterSuccess = (email: string) => {
    setVolunteerEmail(email);
  };

  const handleTaskAction = (taskId: string) => {
    if (!volunteerEmail) {
      setIsRegModalOpen(true);
      return;
    }
    setSelectedTaskId(taskId);
    setIsTaskModalOpen(true);
  };

  const selectedTask = useMemo(() => {
    const allPossible = [...tasks, ...logTasks];
    return allPossible.find(t => t.id === selectedTaskId) || null;
  }, [tasks, logTasks, selectedTaskId]);

  if (user) {
    // Staff View: Volunteer Log
    return (
      <DashboardShell 
        title="Volunteer Log" 
        description="A complete record of community volunteer contributions across all sites."
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-500" />
              Volunteer Contribution History
            </h3>
            <Badge variant="outline" className="font-bold">{logTasks.length} Records</Badge>
          </div>

          {logLoading ? (
            <div className="flex justify-center py-20"><Clock className="animate-spin h-8 w-8 text-orange-500" /></div>
          ) : logTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-3xl bg-muted/20 opacity-60">
              <Heart className="h-12 w-12 mb-4 text-orange-500 opacity-20" />
              <p className="text-lg font-medium text-muted-foreground">No volunteer work logged yet.</p>
              <p className="text-sm text-muted-foreground">Completed community tasks will appear here for your records.</p>
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
                ? "You are registered and active. See the available tasks below to help out today."
                : "Join our team of dedicated volunteers. From biodiversity surveys to seasonal maintenance, your contribution helps keep our parks beautiful for everyone."
              }
            </p>
            <div className="flex gap-4">
              {!volunteerEmail ? (
                <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 font-bold" onClick={() => setIsRegModalOpen(true)}>
                  Register as Volunteer
                </Button>
              ) : (
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-md border border-white/30">
                  <CheckCircle2 className="h-5 w-5 text-green-300" />
                  <span className="font-bold text-sm">Registered: {volunteerEmail}</span>
                </div>
              )}
            </div>
          </div>
          <div className="absolute right-0 top-0 h-full w-1/3 bg-[url('https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay" />
          <Heart className="absolute -bottom-10 -right-10 h-64 w-64 text-white opacity-10 rotate-12" />
        </div>

        {/* Volunteer Hub News & Upcoming */}
        {infoItems.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-orange-500" />
              <h3 className="text-2xl font-bold">Volunteer Hub News</h3>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {infoItems.map((item: any) => {
                const isInterested = item.interestedUserIds?.includes(volunteerEmail || "");
                return (
                  <Card key={item.id} className="border-2 border-orange-100 bg-orange-50/20 hover:bg-orange-50/40 transition-colors">
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
                    <CardFooter className="pt-2 border-t border-orange-100/50">
                      {item.type === 'Document' && item.url ? (
                        <Button asChild className="w-full gap-2 font-bold uppercase tracking-widest text-xs h-10 bg-orange-500 hover:bg-orange-600 shadow-md shadow-orange-500/20" variant="default">
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" /> View Info Document
                          </a>
                        </Button>
                      ) : (item.type === 'CTA' || item.allowResponse) ? (
                        <Button 
                          onClick={() => handleToggleInfoInterest(item)}
                          variant={isInterested ? "secondary" : "default"}
                          className={`w-full gap-2 font-bold uppercase tracking-widest text-xs h-10 shadow-md ${isInterested ? 'bg-green-600/10 text-green-700 hover:bg-green-600/20' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'}`}
                        >
                          {isInterested ? <UserCheck className="h-3.5 w-3.5" /> : <HandMetal className="h-3.5 w-3.5 text-white" />}
                          {isInterested ? "Interest Logged" : item.ctaLabel || "Register Interest"}
                        </Button>
                      ) : (
                        <div className="h-10 w-full flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">
                          <Info className="h-3.5 w-3.5 mr-2" /> General Hub Information
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Opportunities Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-orange-500" />
              {volunteerEmail ? "Tasks For You" : "Active Opportunities"}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{tasks.length} roles available</span>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse bg-muted h-[300px]" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-3xl bg-muted/20">
              <Users className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">No active volunteer roles at the moment.</p>
              <p className="text-sm">Check back soon or follow us for updates!</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tasks.map(task => (
                <Card key={task.id} className="group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-orange-500/10 overflow-hidden flex flex-col">
                  <CardHeader className="pb-4 relative">
                    <div className="absolute top-0 right-0 p-4">
                       <Badge className="bg-orange-500 text-white shadow-lg">Open Role</Badge>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-4 group-hover:scale-110 transition-transform">
                      <Users className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl leading-tight">{task.title}</CardTitle>
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
                        <span>Available: {format(new Date(task.dueDate), 'PPP')}</span>
                      </div>
                      {task.displayTime && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Preferred Time: {task.displayTime}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 mt-auto">
                    <Button 
                      className="w-full bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20 font-bold h-11"
                      onClick={() => handleTaskAction(task.id)}
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
      />
    </DashboardShell>
  );
}
