"use client";

import { useState, useEffect } from "react";
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
  CheckCircle2
} from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import { Task } from "@/lib/types";
import { format } from "date-fns";
import { VolunteerRegistrationModal } from "@/components/modals/volunteer-registration-modal";
import { TaskDetailModal } from "@/components/modals/task-detail-modal";
import { useDataContext } from "@/context/DataContext";

export default function VolunteeringPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { allUsers, allParks } = useDataContext();
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [volunteerEmail, setVolunteerEmail] = useState<string | null>(null);
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    const savedEmail = localStorage.getItem("volunteerEmail");
    if (savedEmail) setVolunteerEmail(savedEmail);
  }, []);

  const volunteerTasksQuery = useMemoFirebase(() => 
    db ? query(
      collection(db, "tasks"), 
      where("isVolunteerEligible", "==", true),
      where("status", "==", "Todo"),
      limit(50)
    ) : null, 
  [db]);

  const { data: rawTasks = [], loading } = useCollection<Task>(volunteerTasksQuery as any);

  // Filter out tasks this specific volunteer has already completed
  const tasks = useMemo(() => {
    if (!volunteerEmail) return rawTasks;
    return rawTasks.filter(t => !t.completedByVolunteers?.includes(volunteerEmail));
  }, [rawTasks, volunteerEmail]);

  const selectedTask = useMemo(() => tasks.find(t => t.id === selectedTaskId) || null, [tasks, selectedTaskId]);

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

  return (
    <DashboardShell 
      title="Volunteer Opportunities" 
      description="Help us maintain and improve our local parks and green spaces."
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
