"use client";

import { useState } from "react";
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
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MOCK_ASSETS, MOCK_ISSUES, MOCK_TASKS } from "@/lib/mock-data";
import Link from "next/link";

const taskData = [
  { name: 'Completed', value: MOCK_TASKS.filter(t => t.status === 'Done').length, color: 'hsl(var(--primary))' },
  { name: 'In Progress', value: MOCK_TASKS.filter(t => t.status === 'Doing').length, color: 'hsl(var(--accent))' },
  { name: 'Pending', value: MOCK_TASKS.filter(t => t.status === 'Todo').length, color: 'hsl(var(--muted))' },
];

const trendData = {
  daily: [
    { label: 'Mon', count: 12 },
    { label: 'Tue', count: 18 },
    { label: 'Wed', count: 15 },
    { label: 'Thu', count: 22 },
    { label: 'Fri', count: 14 },
    { label: 'Sat', count: 8 },
    { label: 'Sun', count: 5 },
  ],
  weekly: [
    { label: 'Week 1', count: 85 },
    { label: 'Week 2', count: 92 },
    { label: 'Week 3', count: 78 },
    { label: 'Week 4', count: 110 },
  ],
  monthly: [
    { label: 'Jan', count: 320 },
    { label: 'Feb', count: 280 },
    { label: 'Mar', count: 450 },
    { label: 'Apr', count: 390 },
    { label: 'May', count: 410 },
    { label: 'Jun', count: 520 },
  ],
  yearly: [
    { label: '2021', count: 3200 },
    { label: '2022', count: 3800 },
    { label: '2023', count: 4500 },
    { label: '2024', count: 2100 },
  ]
};

export default function Dashboard() {
  const [trendView, setTrendView] = useState<keyof typeof trendData>('daily');
  
  const openIssues = MOCK_ISSUES.filter(i => i.status !== 'Closed').length;
  const criticalAssets = MOCK_ASSETS.filter(a => a.condition === 'Poor' || a.condition === 'Critical').length;
  const activeTasks = MOCK_TASKS.filter(t => t.status !== 'Done').length;

  const currentTrendData = trendData[trendView];

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
              <div className="text-3xl font-bold font-headline">{MOCK_ASSETS.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Managed across 12 parks</p>
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
              <p className="text-xs text-destructive mt-1 font-medium">3 Emergency priority</p>
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
              <p className="text-xs text-muted-foreground mt-1">Next due in 4 hours</p>
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
              <p className="text-xs text-muted-foreground mt-1">Assets requiring urgent repair</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-6">
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-headline">Issue Reporting Trends</CardTitle>
              <CardDescription>Volume of reported issues over time</CardDescription>
            </div>
            <Select value={trendView} onValueChange={(v: any) => setTrendView(v)}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentTrendData}>
                  <XAxis 
                    dataKey="label" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}} 
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    content={({active, payload}) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <p className="text-[10px] font-bold uppercase">{payload[0].payload.label}</p>
                            <p className="text-xs font-bold text-primary">{payload[0].value} Issues</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {currentTrendData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index === currentTrendData.length - 1 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.2)'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
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
