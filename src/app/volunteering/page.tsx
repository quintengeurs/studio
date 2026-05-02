"use client";

import { useMemo } from "react";
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
  Heart
} from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import { Task } from "@/lib/types";
import { format } from "date-fns";

export default function VolunteeringPage() {
  const db = useFirestore();
  
  const volunteerTasksQuery = useMemoFirebase(() => 
    db ? query(
      collection(db, "tasks"), 
      where("isVolunteerEligible", "==", true),
      where("status", "==", "Todo"),
      limit(50)
    ) : null, 
  [db]);

  const { data: tasks = [], loading } = useCollection<Task>(volunteerTasksQuery as any);

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
            <h2 className="text-4xl font-bold mb-4">Make a Difference in Your Local Park</h2>
            <p className="text-lg opacity-90 mb-6">
              Join our team of dedicated volunteers. From biodiversity surveys to seasonal maintenance, 
              your contribution helps keep our parks beautiful for everyone.
            </p>
            <div className="flex gap-4">
              <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50">
                Register as Volunteer
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white/30 hover:bg-white/10">
                Impact Reports
              </Button>
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
              Active Opportunities
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
                <Card key={task.id} className="group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-orange-500/10 overflow-hidden">
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
                  <CardContent className="pb-6">
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-6">
                      {task.objective}
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
                  <CardFooter className="pt-0">
                    <Button className="w-full bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20">
                      Express Interest
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
