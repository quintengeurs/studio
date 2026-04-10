
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
  AlertCircle,
  Trash2,
  Edit2
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy } from "firebase/firestore";
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
import { User, Frequency, Inspection, Asset, OPERATIVE_ROLES } from "@/lib/types";
import { addDays, addMonths, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { getNextBespokeOccurrence } from "@/lib/scheduling-utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

const InspectionCard = ({ inspection, onStart, onDelete, onEdit, isAdmin }: { 
  inspection: Inspection, 
  onStart: (inspection: Inspection) => void, 
  onDelete: (id: string) => void, 
  onEdit: (inspection: Inspection) => void,
  isAdmin: boolean 
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 font-bold uppercase text-[10px]">Pending</Badge>;
      case 'Completed': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-bold uppercase text-[10px]">Completed</Badge>;
      case 'Overdue': return <Badge variant="destructive" className="font-bold uppercase text-[10px]">Overdue</Badge>;
      default: return null;
    }
  };

  return (
    <Card className="border-2 hover:border-primary/30 transition-all group">
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
          <div className="flex items-center gap-1">
            {getStatusBadge(inspection.status)}
            {isAdmin && (
              <div className="flex items-center">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => onEdit(inspection)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(inspection.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
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
            <Button className="w-full h-9 text-xs font-bold" onClick={() => onStart(inspection)}>
              <ClipboardCheck className="mr-2 h-4 w-4" /> Start Inspection
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function InspectionsPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  
  const assetsQuery = useMemoFirebase(() => db ? query(collection(db, "assets"), orderBy("name")) : null, [db]);
  const { data: assets = [] } = useCollection<Asset>(assetsQuery as any);

  const inspectionsQuery = useMemoFirebase(() => db ? query(collection(db, "inspections"), orderBy("dueDate", "desc")) : null, [db]);
  const { data: inspections = [], loading } = useCollection<Inspection>(inspectionsQuery as any);

  const usersQuery = useMemoFirebase(() => db ? query(collection(db, "users"), where("isArchived", "==", false)) : null, [db]);
  const { data: users = [] } = useCollection<User>(usersQuery as any);
  
  const currentUserData = users.find(u => u.email?.toLowerCase() === user?.email?.toLowerCase());
  const isAdmin = currentUserData?.role === 'Admin' || user?.email?.toLowerCase() === 'quinten.geurs@gmail.com';
  const isOperational = useMemo(() => 
    currentUserData?.role && OPERATIVE_ROLES.includes(currentUserData.role),
  [currentUserData]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newInspection, setNewInspection] = useState({
    assetId: "",
    frequency: "One-off" as Frequency,
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: "",
    daysOfWeek: [] as number[],
    isBespoke: false
  });
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

  const [inspectionResults, setInspectionResults] = useState<{item: string, passed: boolean, notes: string}[]>([]);

  const handleScheduleInspection = async () => {
    if (!db || isSubmitting) return;
    setIsSubmitting(true);
    
    const assetsToSchedule = selectedAssetIds.length > 0 
      ? assets.filter(a => selectedAssetIds.includes(a.id))
      : assets.filter(a => a.id === newInspection.assetId);

    if (assetsToSchedule.length === 0) {
        toast({ title: "Error", description: "No assets selected.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    try {
      for (const asset of assetsToSchedule) {
        const inspectionData = {
          assetId: asset.id,
          assetName: asset.name,
          park: asset.park,
          status: 'Pending',
          dueDate: newInspection.dueDate,
          frequency: newInspection.isBespoke ? 'Bespoke' : (newInspection.frequency !== 'One-off' ? newInspection.frequency : null),
          ...(newInspection.isBespoke && {
            isBespoke: true,
            startDate: newInspection.startDate,
            endDate: newInspection.endDate,
            daysOfWeek: newInspection.daysOfWeek
          })
        };
        await addDoc(collection(db, "inspections"), inspectionData);
      }

      setIsDialogOpen(false);
      setNewInspection({ 
        assetId: "", frequency: "One-off", dueDate: format(new Date(), 'yyyy-MM-dd'),
        startDate: format(new Date(), 'yyyy-MM-dd'), endDate: "",
        daysOfWeek: [], isBespoke: false 
      });
      setSelectedAssetIds([]);
      toast({ 
        title: "Inspections Scheduled", 
        description: `Successfully scheduled ${assetsToSchedule.length} safety check(s).` 
      });
    } catch (error) {
        toast({ title: "Error", description: "Could not schedule inspections. Please try again.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleUpdateInspection = async () => {
    if (!db || !editingInspection || isSubmitting) return;
    setIsSubmitting(true);
    try {
        const { id, ...data } = editingInspection;
        await updateDoc(doc(db, "inspections", id), data as any);
        setIsEditDialogOpen(false);
        setEditingInspection(null);
        toast({ title: "Inspection Updated", description: "Schedule changes have been saved." });
    } catch (e) {
        toast({ title: "Error", description: "Failed to update inspection.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const openCompleteDialog = (inspection: Inspection) => {
    setSelectedInspection(inspection);
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

  const handleFinishInspection = async () => {
    if (!db || !selectedInspection || !user || isSubmitting) return;
    setIsSubmitting(true);

    try {
        await updateDoc(doc(db, "inspections", selectedInspection.id), {
            status: 'Completed',
            completedAt: new Date().toISOString(),
            inspectedBy: user.displayName || user.email,
            results: inspectionResults
        });

        if (selectedInspection.frequency && selectedInspection.frequency !== 'One-off') {
            let nextDate: string | null = null;
            
            if (selectedInspection.isBespoke && selectedInspection.daysOfWeek) {
              nextDate = getNextBespokeOccurrence(selectedInspection.dueDate, selectedInspection.daysOfWeek, selectedInspection.endDate || undefined);
            } else if (selectedInspection.frequency) {
              nextDate = calculateNextDueDate(selectedInspection.dueDate, selectedInspection.frequency);
            }

            if (nextDate) {
                await addDoc(collection(db, "inspections"), {
                    assetId: selectedInspection.assetId,
                    assetName: selectedInspection.assetName,
                    park: selectedInspection.park,
                    status: 'Pending',
                    dueDate: nextDate,
                    frequency: selectedInspection.frequency,
                    ...(selectedInspection.isBespoke && {
                        isBespoke: true,
                        startDate: selectedInspection.startDate,
                        endDate: selectedInspection.endDate,
                        daysOfWeek: selectedInspection.daysOfWeek
                    })
                });
            }
        }

        const assetRef = doc(db, "assets", selectedInspection.assetId);
        await updateDoc(assetRef, { lastInspected: format(new Date(), 'yyyy-MM-dd') });

        setIsCompleteDialogOpen(false);
        toast({ 
            title: "Inspection Logged", 
            description: `Check results for ${selectedInspection.assetName} have been permanently recorded.` 
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteInspection = async (id: string) => {
    if (!db || !isAdmin) return;
    try {
        await deleteDoc(doc(db, "inspections", id));
        toast({ title: "Inspection Deleted" });
    } catch (error) {
        toast({ title: "Error", description: "Failed to delete inspection.", variant: "destructive" });
    }
  };

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const isWithinWindow = (inspection: Inspection) => {
    if (inspection.status === 'Completed') return true;
    
    // Manual/Overdue check
    const dueDateStr = inspection.dueDate;
    if (dueDateStr <= todayStr) return true;

    if (inspection.frequency === 'Weekly') {
      const dDateNum = parseISO(dueDateStr);
      return isWithinInterval(dDateNum, { 
        start: startOfWeek(today, { weekStartsOn: 1 }), 
        end: endOfWeek(today, { weekStartsOn: 1 }) 
      });
    }

    if (inspection.frequency === 'Monthly') {
      const dDateNum = parseISO(dueDateStr);
      return isWithinInterval(dDateNum, { 
        start: startOfMonth(today), 
        end: endOfMonth(today) 
      });
    }

    return false;
  };

  const pendingInspections = inspections.filter(i => i.status === 'Pending' && isWithinWindow(i));

  return (
    <DashboardShell 
      title={isOperational ? "Daily Inspections" : "Asset Inspections"} 
      description={isOperational ? "Safety and condition checks for today" : "Systematic condition and safety checks for all park infrastructure"}
      actions={!isOperational && (
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
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Target Assets (Select Multiple)</Label>
                <div className="border rounded-xl bg-muted/10 overflow-hidden">
                  <ScrollArea className="h-[150px] p-3">
                    {Array.from(new Set(assets.map(a => a.park))).sort().map(park => (
                      <div key={park} className="mb-4">
                        <h4 className="text-[10px] font-bold uppercase text-primary mb-2 border-b border-primary/10 pb-1">{park}</h4>
                        <div className="grid gap-2">
                          {assets.filter(a => a.park === park).map(asset => (
                            <div key={asset.id} className="flex items-center gap-2">
                              <Checkbox 
                                id={`asset-${asset.id}`} 
                                checked={selectedAssetIds.includes(asset.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) setSelectedAssetIds(prev => [...prev, asset.id]);
                                  else setSelectedAssetIds(prev => prev.filter(id => id !== asset.id));
                                }}
                              />
                              <Label htmlFor={`asset-${asset.id}`} className="text-xs font-medium cursor-pointer">{asset.name}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-xl bg-muted/20">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Bespoke Schedule</span>
                  <span className="text-[10px] text-muted-foreground">Custom days and date range</span>
                </div>
                <Switch checked={newInspection.isBespoke} onCheckedChange={(v: boolean) => setNewInspection({...newInspection, isBespoke: v})} />
              </div>

              {newInspection.isBespoke ? (
                <div className="p-4 border-2 border-primary/20 rounded-2xl bg-primary/5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Start Date</Label>
                      <Input type="date" value={newInspection.startDate} onChange={e => setNewInspection({...newInspection, startDate: e.target.value})} className="h-9" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">End Date (Optional)</Label>
                      <Input type="date" value={newInspection.endDate} onChange={e => setNewInspection({...newInspection, endDate: e.target.value})} className="h-9" />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Frequency: Repeat Every</Label>
                    <div className="flex flex-wrap gap-3 pt-1">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
                        const dayValue = (idx + 1) % 7;
                        return (
                          <div key={idx} className="flex flex-col items-center gap-1">
                            <Checkbox 
                              checked={newInspection.daysOfWeek.includes(dayValue)}
                              onCheckedChange={(checked) => {
                                if (checked) setNewInspection(prev => ({ ...prev, daysOfWeek: [...prev.daysOfWeek, dayValue] }));
                                else setNewInspection(prev => ({ ...prev, daysOfWeek: prev.daysOfWeek.filter(d => d !== dayValue) }));
                              }}
                            />
                            <span className="text-[9px] font-bold opacity-60">{day}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="i-date" className="text-[10px] font-bold uppercase tracking-widest opacity-60">Due Date</Label>
                    <Input id="i-date" type="date" value={newInspection.dueDate} onChange={e => setNewInspection({...newInspection, dueDate: e.target.value})} className="h-11 shadow-sm" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Frequency</Label>
                    <Select value={newInspection.frequency} onValueChange={(v: Frequency) => setNewInspection({...newInspection, frequency: v})}>
                      <SelectTrigger className="h-11 shadow-sm">
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
              )}
            </div>
            <DialogFooter>
              <Button className="w-full" onClick={handleScheduleInspection} disabled={!newInspection.assetId || isSubmitting}>
                {isSubmitting ? "Scheduling..." : "Complete Schedule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    >
      {!isOperational ? (
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

          {loading ? (
            <div className="flex justify-center py-12"><Clock className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <>
              <TabsContent value="all" className="mt-0">
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {inspections.map((inspection) => (
                    <InspectionCard 
                        key={inspection.id} 
                        inspection={inspection} 
                        onStart={openCompleteDialog} 
                        isAdmin={isAdmin} 
                        onDelete={handleDeleteInspection} 
                        onEdit={(i) => { setEditingInspection(i); setIsEditDialogOpen(true); }}
                    />
                  ))}
                  {inspections.length === 0 && <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">No inspection records found.</div>}
                </div>
              </TabsContent>
              <TabsContent value="pending" className="mt-0">
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {pendingInspections.map((inspection) => (
                    <InspectionCard 
                        key={inspection.id} 
                        inspection={inspection} 
                        onStart={openCompleteDialog} 
                        isAdmin={isAdmin} 
                        onDelete={handleDeleteInspection} 
                        onEdit={(i) => { setEditingInspection(i); setIsEditDialogOpen(true); }}
                    />
                  ))}
                  {pendingInspections.length === 0 && <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">No pending inspections for this timeframe.</div>}
                </div>
              </TabsContent>
              <TabsContent value="completed" className="mt-0">
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {inspections.filter(i => i.status === 'Completed').map((inspection) => (
                    <InspectionCard 
                        key={inspection.id} 
                        inspection={inspection} 
                        onStart={openCompleteDialog} 
                        isAdmin={isAdmin} 
                        onDelete={handleDeleteInspection} 
                        onEdit={(i) => { setEditingInspection(i); setIsEditDialogOpen(true); }}
                    />
                  ))}
                  {inspections.filter(i => i.status === 'Completed').length === 0 && <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">No completed inspection records.</div>}
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between py-2 border-b">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Pending Safety Checks</h3>
            <Badge variant="secondary" className="font-bold">{pendingInspections.filter(i => i.dueDate <= todayStr).length} DUE TODAY</Badge>
          </div>
          {loading ? (
             <div className="flex justify-center py-20"><Clock className="animate-spin h-8 w-8 text-primary" /></div>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {pendingInspections.filter(i => i.dueDate <= todayStr).map((inspection) => (
                <InspectionCard 
                  key={inspection.id} 
                  inspection={inspection} 
                  onStart={openCompleteDialog} 
                  isAdmin={isAdmin} 
                  onDelete={handleDeleteInspection} 
                  onEdit={(i) => { setEditingInspection(i); setIsEditDialogOpen(true); }}
                />
              ))}
              {pendingInspections.filter(i => i.dueDate <= todayStr).length === 0 && (
                <div className="col-span-full py-20 text-center text-muted-foreground border-2 border-dashed rounded-xl flex flex-col items-center gap-3">
                  <CheckCircle2 className="h-10 w-10 opacity-20" />
                  <p className="font-bold">No inspections due today.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
            <Button className="w-full font-bold" onClick={handleFinishInspection} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Finish Inspection"}
              <CheckCircle2 className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Inspection Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="font-headline">Edit Scheduled Inspection</DialogTitle>
            <DialogDescription>Modify the due date or frequency for: {editingInspection?.assetName}</DialogDescription>
          </DialogHeader>
          {editingInspection && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Due Date</Label>
                  <Input 
                    type="date" 
                    value={editingInspection.dueDate} 
                    onChange={e => setEditingInspection({...editingInspection, dueDate: e.target.value})} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Frequency</Label>
                  <Select 
                    value={editingInspection.frequency || "One-off"} 
                    onValueChange={(v: Frequency) => setEditingInspection({...editingInspection, frequency: v === 'One-off' ? undefined : v})}
                  >
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
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button className="font-bold" onClick={handleUpdateInspection} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
