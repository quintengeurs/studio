
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
import { MOCK_INSPECTIONS, MOCK_ASSETS, MOCK_USERS } from "@/lib/mock-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function InspectionsPage() {
  const { toast } = useToast();
  const [inspections, setInspections] = useState(MOCK_INSPECTIONS);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newInspection, setNewInspection] = useState({
    assetId: "",
    park: "",
    dueDate: new Date().toISOString().split('T')[0]
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 font-bold uppercase text-[10px]">Pending</Badge>;
      case 'Completed': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-bold uppercase text-[10px]">Completed</Badge>;
      case 'Overdue': return <Badge variant="destructive" className="font-bold uppercase text-[10px]">Overdue</Badge>;
      default: return null;
    }
  };

  const handleScheduleInspection = () => {
    const asset = MOCK_ASSETS.find(a => a.id === newInspection.assetId);
    if (!asset) return;

    const inspection = {
      id: `ins${Date.now()}`,
      assetId: asset.id,
      assetName: asset.name,
      park: asset.park,
      status: 'Pending' as const,
      dueDate: newInspection.dueDate
    };

    setInspections([inspection, ...inspections]);
    setIsDialogOpen(false);
    setNewInspection({ assetId: "", park: "", dueDate: new Date().toISOString().split('T')[0] });
    toast({ title: "Inspection Scheduled", description: `Safety check scheduled for ${asset.name}.` });
  };

  return (
    <DashboardShell 
      title="Asset Inspections" 
      description="Systematic condition and safety checks for all park infrastructure"
      actions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="font-headline font-bold">
              <Plus className="mr-2 h-4 w-4" /> Schedule Inspection
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="font-headline">Schedule New Inspection</DialogTitle>
              <DialogDescription>Assign a condition check for a specific asset.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Select Asset</Label>
                <Select value={newInspection.assetId} onValueChange={v => setNewInspection({...newInspection, assetId: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Search Assets" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_ASSETS.map(asset => (
                      <SelectItem key={asset.id} value={asset.id}>{asset.name} ({asset.park})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="i-date">Due Date</Label>
                <Input id="i-date" type="date" value={newInspection.dueDate} onChange={e => setNewInspection({...newInspection, dueDate: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button className="w-full" onClick={handleScheduleInspection} disabled={!newInspection.assetId}>Complete Schedule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
