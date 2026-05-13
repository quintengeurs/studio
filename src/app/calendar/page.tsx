
"use client";

import { useState, useMemo } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useUserContext } from "@/context/UserContext";
import { useDataContext } from "@/context/DataContext";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { ParkActivity } from "@/lib/types";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO
} from "date-fns";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Filter,
  MapPin,
  Clock,
  Info,
  ExternalLink
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import Link from "next/link";

const ACTIVITY_COLORS: Record<string, { bg: string, text: string, dot: string }> = {
  Event: { bg: "bg-green-500/10", text: "text-green-700", dot: "bg-green-600" },
  Project: { bg: "bg-blue-500/10", text: "text-blue-700", dot: "bg-blue-600" },
  Development: { bg: "bg-purple-500/10", text: "text-purple-700", dot: "bg-purple-600" },
  Volunteering: { bg: "bg-orange-500/10", text: "text-orange-700", dot: "bg-orange-600" },
  Maintenance: { bg: "bg-slate-500/10", text: "text-slate-700", dot: "bg-slate-600" }
};

export default function CalendarPage() {
  const { effectiveOrgId } = useUserContext();
  const { allParks } = useDataContext();
  const db = useFirestore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPark, setSelectedPark] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Query for all activities
  const activitiesQuery = useMemoFirebase(() => 
    (db && effectiveOrgId) ? query(
      collection(db, "park_activities"), 
      where("orgId", "==", effectiveOrgId),
      where("status", "!=", "Archived")
    ) : null, 
  [db, effectiveOrgId]);

  const { data: allActivities = [], loading } = useCollection<ParkActivity>(activitiesQuery as any);

  const filteredActivities = useMemo(() => {
    return allActivities.filter(a => {
      const matchesPark = selectedPark === "all" || a.parkId === selectedPark;
      const matchesType = typeFilter === "all" || a.type === typeFilter;
      return matchesPark && matchesType;
    });
  }, [allActivities, selectedPark, typeFilter]);

  // Calendar Logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const getActivitiesForDay = (day: Date) => {
    return filteredActivities.filter(a => {
      const start = parseISO(a.startDate);
      const end = a.endDate ? parseISO(a.endDate) : start;
      return isSameDay(day, start) || (day >= start && day <= end);
    });
  };

  return (
    <DashboardShell 
      title="Master Calendar" 
      description="Integrated schedule of all park events, projects, and developments."
    >
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-2xl border shadow-sm">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold font-headline min-w-[200px]">
              {format(currentDate, "MMMM yyyy")}
            </h2>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="ml-2 font-bold text-xs uppercase">
                Today
              </Button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Select value={selectedPark} onValueChange={setSelectedPark}>
              <SelectTrigger className="w-[180px]">
                <MapPin className="mr-2 h-4 w-4 opacity-50" />
                <SelectValue placeholder="All Parks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Parks</SelectItem>
                {allParks.map(p => (
                  <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4 opacity-50" />
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Event">Events</SelectItem>
                <SelectItem value="Project">Projects</SelectItem>
                <SelectItem value="Development">Development</SelectItem>
                <SelectItem value="Volunteering">Volunteering</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-card border rounded-3xl overflow-hidden shadow-xl shadow-primary/5">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-[120px] md:auto-rows-[160px]">
            {calendarDays.map((day, idx) => {
              const dayActivities = getActivitiesForDay(day);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isToday = isSameDay(day, new Date());

              return (
                <div 
                  key={idx} 
                  className={cn(
                    "border-r border-b p-2 transition-colors hover:bg-muted/10 overflow-hidden",
                    !isCurrentMonth && "bg-muted/5 opacity-40",
                    isToday && "bg-primary/5 ring-1 ring-inset ring-primary/20"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={cn(
                      "text-xs font-bold h-6 w-6 flex items-center justify-center rounded-full",
                      isToday ? "bg-primary text-white shadow-lg shadow-primary/30" : "text-muted-foreground"
                    )}>
                      {format(day, "d")}
                    </span>
                    {dayActivities.length > 0 && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1 opacity-50 font-bold border-none">
                        {dayActivities.length} {dayActivities.length === 1 ? 'item' : 'items'}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-[80%] scrollbar-none">
                    {dayActivities.slice(0, 4).map(activity => {
                      const colors = ACTIVITY_COLORS[activity.type] || ACTIVITY_COLORS.Maintenance;
                      return (
                        <Link 
                          key={activity.id}
                          href={`/${activity.type.toLowerCase() === 'development' ? 'development' : activity.type.toLowerCase() + 's'}`}
                          className={cn(
                            "block px-1.5 py-0.5 rounded text-[9px] font-bold truncate transition-transform hover:scale-105",
                            colors.bg,
                            colors.text
                          )}
                        >
                          <div className="flex items-center gap-1">
                             <div className={cn("h-1 w-1 rounded-full shrink-0", colors.dot)} />
                             <span className="truncate">{activity.title}</span>
                          </div>
                        </Link>
                      );
                    })}
                    {dayActivities.length > 4 && (
                      <p className="text-[8px] text-center text-muted-foreground font-bold italic mt-1">
                        + {dayActivities.length - 4} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend & Summary */}
        <div className="flex flex-wrap gap-4 justify-center py-4">
           {Object.entries(ACTIVITY_COLORS).map(([type, colors]) => (
             <div key={type} className="flex items-center gap-2">
               <div className={cn("h-3 w-3 rounded-full", colors.dot)} />
               <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{type}s</span>
             </div>
           ))}
        </div>
      </div>
    </DashboardShell>
  );
}

