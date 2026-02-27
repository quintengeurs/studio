
"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ClipboardCheck, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2,
  Plus,
  Filter
} from "lucide-react";
import { MOCK_INSPECTIONS } from "@/lib/mock-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function InspectionsPage() {
  const [inspections] = useState(MOCK_INSPECTIONS);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 font-bold uppercase text-[10px]">Pending</Badge>;
      case 'Completed': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-bold uppercase text-[10px]">Completed</Badge>;
      case 'Overdue': return <Badge variant="destructive" className="font-bold uppercase text-[10px]">Overdue</Badge>;
      default: return null;
    }
  };

  return (
    <DashboardShell 
      title="Asset Inspections" 
      description="Systematic condition and safety checks for all park infrastructure"
      actions={
        <Button className="font-headline font-bold">
          <Plus className="mr-2 h-4 w-4" /> Schedule Inspection
        </Button>
      }
    >
      <Tabs defaultValue="all" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="bg-muted/50 border">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" className="hidden md:flex">
            <Filter className="mr-2 h-4 w-4" /> Filter Assets
          </Button>
        </div>

        <TabsContent value="all" className="mt-0">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {inspections.map((inspection) => (
              <Card key={inspection.id} className="border-2 hover:border-primary/30 transition-all group">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-wider">{inspection.park}</Badge>
                    {getStatusBadge(inspection.status)}
                  </div>
                  <CardTitle className="text-lg font-headline group-hover:text-primary transition-colors">{inspection.assetName}</CardTitle>
                  <CardDescription className="flex items-center gap-1.5 text-xs font-medium">
                    <Calendar className="h-3 w-3" /> Due {inspection.dueDate}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between py-2 border-y border-dashed">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Last Run</span>
                      <span className="text-[10px] font-medium">{inspection.completedAt || 'Never'}</span>
                    </div>
                    
                    {inspection.status === 'Completed' ? (
                      <Button variant="ghost" className="w-full h-9 text-xs font-bold text-green-600 bg-green-50 hover:bg-green-100">
                        <CheckCircle2 className="mr-2 h-4 w-4" /> View Results
                      </Button>
                    ) : (
                      <Button className="w-full h-9 text-xs font-bold">
                        <ClipboardCheck className="mr-2 h-4 w-4" /> Start Inspection
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="pending" className="mt-0">
           <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
             <ClipboardCheck className="h-12 w-12 mb-4 opacity-20" />
             <p className="text-sm font-medium">Filter view for pending inspections</p>
           </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-0">
           <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
             <CheckCircle2 className="h-12 w-12 mb-4 opacity-20" />
             <p className="text-sm font-medium">Filter view for completed inspections</p>
           </div>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}
