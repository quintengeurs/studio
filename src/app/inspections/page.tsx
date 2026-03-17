
"use client";

import { useState, useMemo } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ClipboardCheck, 
  Calendar, 
  Clock, 
  CheckCircle2,
  Plus,
  Filter,
  RefreshCcw,
  AlertCircle
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, addDoc, updateDoc, doc, query, orderBy } from "firebase/firestore";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Frequency, Inspection, Asset } from "@/lib/types";
import { addDays, addMonths, format } from "date-fns";

export default function InspectionsPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  
  // Fetch Assets for scheduling
  const assetsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "assets"), orderBy("name"));
  }, [db]);
  const { data: assets = [] } = useCollection<Asset>(assetsQuery);

  // Fetch Inspections
  const inspectionsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "inspections"), orderBy("dueDate", "desc"));
  }, [db]);
  const { data: inspections = [], loading } = useCollection<Inspection>(inspectionsQuery);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  
  const [newInspection, setNewInspection] = useState({
    assetId: "",
    frequency: "One-off" as Frequency,
    dueDate: format(new Date(), 'yyyy-MM-dd')
  });

  const [inspectionResults, setInspectionResults] = useState<{item: string, passed: boolean, notes: string}[]>([]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 font-bold uppercase text-[10px]">Pending</Badge>;
      case 'Completed': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-bold uppercase text-[10px]">Completed</Badge>;
      case 'Overdue': return <Badge variant="destructive" className="font-bold uppercase text-[10px]">Overdue</Badge>;
      default: return null;
    }
  };

  const handleScheduleInspection = () => {
    if (!db) return;
    const asset = assets.find(a => a.id === newInspection.assetId);
    if (!asset) return;

    const inspectionData = {
      assetId: asset.id,
      assetName: asset.name,
      park: asset.park,
      status: 'Pending',
      dueDate: newInspection.dueDate,
      frequency: newInspection.frequency !== 'One-off' ? newInspection.frequency : null
    };

    addDoc(collection(db, "inspections"), inspectionData);
    setIsDialogOpen(false);
    setNewInspection({ assetId: "", frequency: "One-off", dueDate: format(new Date(), 'yyyy-MM-dd') });
    toast({ 
      title: "Inspection Scheduled", 
      description: `${inspectionData.frequency ? `Recurring (${inspectionData.frequency})` : 'One-off'} safety check scheduled for ${asset.name}.` 
    });
  };

  const openCompleteDialog = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    // Simple mock checklist items based on asset type or generic
    setInspectionResults([
      { item: "General Structural Integrity", passed: true, notes: "" },
      { item: "Cleanliness and Hygiene", passed: true, notes: "" },
      { item: "Safe for Public Use", passed: true, notes: "" }
    ]);
    setIsCompleteDialogOpen(true);
  };

  const calculateNextDueDate = (currentDate: string, frequency: Frequency) => {
    const date = new Date(currentDate);
    switch (frequency) {
      case 'Weekly': return format(addDays(date, 7), 'yyyy-MM-dd');
      case 'Monthly': return format(addMonths(date, 1), 'yyyy-MM-dd');
      case 'Six Monthly': return format(addMonths(date, 6), 'yyyy-MM-dd');
      case 'Yearly': return format(addMonths(date, 12), 'yyyy-MM-dd');
      default: return null;
    }
  };

  const handleFinishInspection = () => {
    if (!db || !selectedInspection || !user) return;

    // 1. Mark current instance as Completed with results
    updateDoc(doc(db, "inspections", selectedInspection.id), {
      status: 'Completed',
      completedAt: new Date().toISOString(),
      inspectedBy: user.displayName || user.email,
      results: inspectionResults
    });

    // 2. If it's recurring, schedule the next instance as a new record
    if (selectedInspection.frequency && selectedInspection.frequency !== 'One-off') {
      const nextDate = calculateNextDueDate(selectedInspection.dueDate, selectedInspection.frequency);
      if (nextDate) {
        addDoc(collection(db, "inspections"), {
          assetId: selectedInspection.assetId,
          assetName: selectedInspection.assetName,
          park: selectedInspection.park,
          status: 'Pending',
          dueDate: nextDate,
          frequency: selectedInspection.frequency
        });
      }
    }

    // 3. Update asset's last inspected date
    const assetRef = doc(db, "assets", selectedInspection.assetId);
    updateDoc(assetRef, { lastInspected: format(new Date(), 'yyyy-MM-dd') });

    setIsCompleteDialogOpen(false);
    toast({ 
      title: "Inspection Logged", 
      description: `Check results for ${selectedInspection.assetName} have been permanently recorded.` 
    });
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
                    {assets.map(asset => (
                      <SelectItem key={asset.id} value={asset.id}>{asset.name} ({asset.park})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="i-date">Due Date</Label>
                  <Input id="i-date" type="date" value={newInspection.dueDate} onChange={e => setNewInspection({...newInspection, dueDate: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label>Frequency</Label>
                  <Select value={newInspection.frequency} onValueChange={(v: Frequency) => setNewInspection({...newInspection, frequency: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="One-off">One-off</SelectItem>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Six Monthly">Six Monthly</SelectItem>
                      <SelectItem value="Yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
            <TabsTrigger value="all">All Logs</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="completed">Completed History</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" className="hidden md:flex">
            <Filter className="mr-2 h-4 w-4" /> Filter Assets
          </Button>
        </div>

        <TabsContent value="all" className="mt-0">
          {loading ? (
             <div className="flex justify-center py-12"><Clock className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {inspections.map((inspection) => (
                <Card key={inspection.id} className="border-2 hover:border-primary/30 transition-all group">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col gap-1">
                        <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-wider w-fit">{inspection.park}</Badge>
                        {inspection.frequency && inspection.status !== 'Completed' && (
                          <div className="flex items-center gap-1 text-[8px] font-bold text-primary uppercase">
                            <RefreshCcw className="h-2.5 w-2.5" />
                            Recurring: {inspection.frequency}
                          </div>
                        )}
                      </div>
                      {getStatusBadge(inspection.status)}
                    </div>
                    <CardTitle className="text-lg font-headline group-hover:text-primary transition-colors">{inspection.assetName}</CardTitle>
                    <CardDescription className="flex items-center gap-1.5 text-xs font-medium">
                      <Calendar className="h-3 w-3" /> {inspection.status === 'Completed' ? `Finished ${format(new Date(inspection.completedAt!), 'dd MMM')}` : `Due ${inspection.dueDate}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between py-2 border-y border-dashed">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Reference</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{inspection.id.substring(0, 8)}</span>
                      </div>
                      
                      {inspection.status === 'Completed' ? (
                        <div className="space-y-2">
                           <div className="flex items-center gap-2 text-[10px] text-green-700 font-bold">
                             <CheckCircle2 className="h-3.5 w-3.5" /> Inspection Record Logged
                           </div>
                           <p className="text-[10px] text-muted-foreground">Inspected by: {inspection.inspectedBy}</p>
                        </div>
                      ) : (
                        <Button className="w-full h-9 text-xs font-bold" onClick={() => openCompleteDialog(inspection)}>
                          <ClipboardCheck className="mr-2 h-4 w-4" /> Start Inspection
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {inspections.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                  No inspection records found.
                </div>
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="pending" className="mt-0">
           {/* Similar structure filtered by Pending */}
        </TabsContent>

        <TabsContent value="completed" className="mt-0">
           {/* Similar structure filtered by Completed */}
        </TabsContent>
      </Tabs>

      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-headline">Perform Asset Inspection</DialogTitle>
            <DialogDescription>Recording separate instance log for: {selectedInspection?.assetName}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-4">
              {inspectionResults.map((res, idx) => (
                <div key={idx} className="p-4 border rounded-lg bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold">{res.item}</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{res.passed ? 'Pass' : 'Fail'}</span>
                      <Checkbox 
                        checked={res.passed} 
                        onCheckedChange={(v) => {
                          const newRes = [...inspectionResults];
                          newRes[idx].passed = !!v;
                          setInspectionResults(newRes);
                        }} 
                      />
                    </div>
                  </div>
                  <Input 
                    placeholder="Notes (optional)" 
                    className="h-8 text-xs" 
                    value={res.notes}
                    onChange={(e) => {
                      const newRes = [...inspectionResults];
                      newRes[idx].notes = e.target.value;
                      setInspectionResults(newRes);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full font-bold" onClick={handleFinishInspection}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Log Completed Inspection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
