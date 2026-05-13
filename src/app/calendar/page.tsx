
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
import { Separator } from "@/components/ui/separator";
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
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('month');

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
  const { calendarDays, title, currentMonthStart } = useMemo(() => {
    const mStart = startOfMonth(currentDate);
    if (viewMode === 'day') {
      return {
        calendarDays: [currentDate],
        title: format(currentDate, "MMMM d, yyyy"),
        currentMonthStart: mStart
      };
    }
    
    if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return {
        calendarDays: eachDayOfInterval({ start: weekStart, end: weekEnd }),
        title: `Week of ${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`,
        currentMonthStart: mStart
      };
    }

    // Month view (default)
    const monthEnd = endOfMonth(mStart);
    const startDate = startOfWeek(mStart);
    const endDate = endOfWeek(monthEnd);
    
    return {
      calendarDays: eachDayOfInterval({ start: startDate, end: endDate }),
      title: format(currentDate, "MMMM yyyy"),
      currentMonthStart: mStart
    };
  }, [currentDate, viewMode]);

  const handleNext = () => {
    if (viewMode === 'day') setCurrentDate(d => new Date(d.getTime() + 24 * 60 * 60 * 1000));
    else if (viewMode === 'week') setCurrentDate(d => new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000));
    else setCurrentDate(addMonths(currentDate, 1));
  };

  const handlePrev = () => {
    if (viewMode === 'day') setCurrentDate(d => new Date(d.getTime() - 24 * 60 * 60 * 1000));
    else if (viewMode === 'week') setCurrentDate(d => new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000));
    else setCurrentDate(subMonths(currentDate, 1));
  };

  const getActivitiesForDay = (day: Date) => {
    return filteredActivities.filter(a => {
      const start = parseISO(a.startDate);
      const end = a.endDate ? parseISO(a.endDate) : start;
      // Normalise to start of day for comparison
      const checkDay = new Date(day);
      checkDay.setHours(0, 0, 0, 0);
      const startDay = new Date(start);
      startDay.setHours(0, 0, 0, 0);
      const endDay = new Date(end);
      endDay.setHours(0, 0, 0, 0);
      
      return isSameDay(checkDay, startDay) || (checkDay >= startDay && checkDay <= endDay);
    });
  };

  return (
    <DashboardShell 
      title="Master Calendar" 
      description="Integrated schedule of all park events, projects, and developments."
    >
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-card p-4 rounded-2xl border shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
            <h2 className="text-xl font-bold font-headline min-w-[200px] text-center sm:text-left">
              {title}
            </h2>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="ml-2 font-bold text-xs uppercase">
                Today
              </Button>
            </div>
            
            <Separator orientation="vertical" className="hidden sm:block h-8 mx-2" />
            
            <div className="flex bg-muted/50 p-1 rounded-lg border">
              {(['day', 'week', 'month'] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-8 px-4 text-[10px] font-bold uppercase transition-all",
                    viewMode === mode ? "shadow-sm" : "hover:bg-background/50"
                  )}
                  onClick={() => setViewMode(mode)}
                >
                  {mode}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full xl:w-auto justify-center sm:justify-end">
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
          {viewMode !== 'day' && (
            <div className="grid grid-cols-7 border-b bg-muted/30">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
          )}
          
          {viewMode === 'day' && (
            <div className="px-6 py-3 border-b bg-muted/30">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <CalendarIcon className="h-3 w-3" /> {format(currentDate, "EEEE")}
              </span>
            </div>
          )}

          {/* Days Grid */}
          <div className={cn(
            "grid auto-rows-[120px] md:auto-rows-[160px]",
            viewMode === 'day' ? "grid-cols-1" : "grid-cols-7"
          )}>
            {calendarDays.map((day, idx) => {
              const dayActivities = getActivitiesForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonthStart);
              const isToday = isSameDay(day, new Date());

              return (
                <div 
                  key={idx} 
                  className={cn(
                    "border-r border-b p-2 transition-colors hover:bg-muted/10 overflow-hidden",
                    viewMode === 'month' && !isCurrentMonth && "bg-muted/5 opacity-40",
                    isToday && "bg-primary/5 ring-1 ring-inset ring-primary/20",
                    viewMode === 'day' && "md:auto-rows-auto p-6"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={cn(
                      "text-xs font-bold h-6 w-6 flex items-center justify-center rounded-full",
                      isToday ? "bg-primary text-white shadow-lg shadow-primary/30" : "text-muted-foreground",
                      viewMode === 'day' && "h-10 w-10 text-xl"
                    )}>
                      {format(day, "d")}
                    </span>
                    <div className="flex flex-col items-end gap-1">
                      {viewMode === 'day' && (
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">{format(day, "MMMM")}</span>
                      )}
                      {dayActivities.length > 0 && (
                        <Badge variant="outline" className={cn(
                          "text-[9px] h-4 px-1 opacity-50 font-bold border-none",
                          viewMode === 'day' && "text-xs h-6 px-2 opacity-100"
                        )}>
                          {dayActivities.length} {dayActivities.length === 1 ? 'item' : 'items'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className={cn(
                    "space-y-1 overflow-y-auto scrollbar-none",
                    viewMode === 'day' ? "max-h-none grid grid-cols-1 md:grid-cols-2 gap-4" : "max-h-[80%]"
                  )}>
                    {dayActivities.slice(0, viewMode === 'day' ? 20 : 4).map(activity => {
                      const colors = ACTIVITY_COLORS[activity.type] || ACTIVITY_COLORS.Maintenance;
                      return (
                        <Link 
                          key={activity.id}
                          href={`/${activity.type.toLowerCase() === 'development' ? 'development' : activity.type.toLowerCase() + 's'}`}
                          className={cn(
                            "block px-1.5 py-0.5 rounded text-[9px] font-bold truncate transition-transform hover:scale-105",
                            colors.bg,
                            colors.text,
                            viewMode === 'day' && "p-4 text-sm"
                          )}
                        >
                          <div className="flex items-center gap-2">
                             <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", colors.dot, viewMode === 'day' && "h-2 w-2")} />
                             <div className="flex flex-col">
                               <span className="truncate">{activity.title}</span>
                               {viewMode === 'day' && (
                                 <span className="text-[10px] opacity-60 font-medium flex items-center gap-1 mt-1">
                                   <MapPin className="h-3 w-3" /> {activity.parkId}
                                 </span>
                               )}
                             </div>
                          </div>
                        </Link>
                      );
                    })}
                    {dayActivities.length > (viewMode === 'day' ? 20 : 4) && (
                      <p className="text-[8px] text-center text-muted-foreground font-bold italic mt-1">
                        + {dayActivities.length - (viewMode === 'day' ? 20 : 4)} more
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

