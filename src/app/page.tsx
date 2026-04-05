
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
  Clock
} from "lucide-react";
import { 
  ResponsiveContainer, 
  Tooltip,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Asset, Issue, Task } from "@/lib/types";
import Link from "next/link";

export default function Dashboard() {
  const db = useFirestore();

  const { data: assets = [], loading: assetsLoading } = useCollection<Asset>(
    useMemoFirebase(() => db ? collection(db, "assets") : null, [db])
  );
  
  const { data: issues = [], loading: issuesLoading } = useCollection<Issue>(
    useMemoFirebase(() => db ? collection(db, "issues") : null, [db])
  );

  const { data: tasks = [], loading: tasksLoading } = useCollection<Task>(
    useMemoFirebase(() => db ? collection(db, "tasks") : null, [db])
  );

  const openIssues = issues.filter(i => i.status !== 'Closed').length;
  const emergencyIssues = issues.filter(i => i.priority === 'Emergency').length;
  const criticalAssets = assets.filter(a => a.condition === 'Poor' || a.condition === 'Critical').length;
  const activeTasks = tasks.filter(t => t.status !== 'Completed').length;

  const taskData = useMemo(() => {
    if (!tasks) return [];
    return [
      { name: 'Completed', value: tasks.filter(t => t.status === 'Completed').length, color: 'hsl(var(--primary))' },
      { name: 'In Progress', value: tasks.filter(t => t.status === 'Doing').length, color: 'hsl(var(--accent))' },
      { name: 'Pending', value: tasks.filter(t => t.status === 'Todo' || t.status === 'Pending Approval').length, color: 'hsl(var(--muted))' },
    ];
  }, [tasks]);

  const isLoading = assetsLoading || issuesLoading || tasksLoading;

  if (isLoading) {
    return (
      <DashboardShell 
        title="Performance Overview" 
        description="Real-time monitoring of Hackney Green Spaces operations"
      >
        <div className="flex items-center justify-center h-96">
          <Clock className="h-12 w-12 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell 
      title="Performance Overview" 
      description="Real-time monitoring of Hackney Green Spaces operations"
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/assets" className="block">
          <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all hover:bg-muted/30 cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Assets</CardTitle>
              <MapPin className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-headline">{assets.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Total managed assets</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/issues" className="block">
          <Card className="border-l-4 border-l-destructive shadow-sm hover:shadow-md transition-all hover:bg-muted/30 cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Open Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-headline">{openIssues}</div>
              {emergencyIssues > 0 && <p className="text-xs text-destructive mt-1 font-medium">{emergencyIssues} Emergency priority</p>}
            </CardContent>
          </Card>
        </Link>

        <Link href="/tasks" className="block">
          <Card className="border-l-4 border-l-accent shadow-sm hover:shadow-md transition-all hover:bg-muted/30 cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Tasks</CardTitle>
              <Clock className="h-4 w-4 text-accent-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-headline">{activeTasks}</div>
              <p className="text-xs text-muted-foreground mt-1">Tasks currently in progress or pending</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/assets" className="block">
          <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all hover:bg-muted/30 cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Condition Alert</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-headline">{criticalAssets}</div>
              <p className="text-xs text-muted-foreground mt-1">Assets requiring urgent attention</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Task Completion Status</CardTitle>
            <CardDescription>Current operative workload distribution</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
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
      </div>
    </DashboardShell>
  );
}
