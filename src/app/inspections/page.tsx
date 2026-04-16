
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
  Edit2,
  Camera,
  Upload,
  Image as ImageIcon,
  X
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, limit } from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { compressImage } from "@/lib/image-compress";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { User, Frequency, Inspection, Asset, OPERATIVE_ROLES } from "@/lib/types";
import { getDefaultPermissionsForUser } from "@/lib/permissions";
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
  
  const assetsQuery = useMemoFirebase(() => 
    db ? query(collection(db, "assets"), limit(500)) : null, 
  [db]);
  const { data: assets = [] } = useCollection<Asset>(assetsQuery as any);

  const [inspectionLimit, setInspectionLimit] = useState(25);
  const inspectionsQuery = useMemoFirebase(() => 
    db ? query(collection(db, "inspections"), limit(inspectionLimit)) : null, 
  [db, inspectionLimit]);
  const { data: inspections = [], loading } = useCollection<Inspection>(inspectionsQuery as any);

  // Optimized: Targeted current user lookup
  const userProfileQuery = useMemoFirebase(() => 
    db && user?.email ? query(collection(db, "users"), where("email", "==", user.email)) : null,
  [db, user?.email]);
  const { data: profileResults = [] } = useCollection<User>(userProfileQuery as any);
  const currentUserData = profileResults[0];

  const permissions = useMemo(() => getDefaultPermissionsForUser(currentUserData), [currentUserData]);
  const isAdmin = permissions.approveResolution;
  const isOperational = !permissions.scheduleInspection;

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
    isBespoke: false,
    assetNotes: "",
    customChecks: [] as string[]
  });
  const [newCustomCheck, setNewCustomCheck] = useState("");
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

  const [inspectionResults, setInspectionResults] = useState<{ 
    item: string, 
    passed: boolean, 
    notes: string,
    imageUrl?: string 
  }[]>([]);

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
            daysOfWeek: newInspection.daysOfWeek,
            assetNotes: newInspection.assetNotes,
            customChecks: newInspection.customChecks
          })
        };
        await addDoc(collection(db, "inspections"), inspectionData);
      }

      setIsDialogOpen(false);
      setNewInspection({ 
        assetId: "", frequency: "One-off", dueDate: format(new Date(), 'yyyy-MM-dd'),
        startDate: format(new Date(), 'yyyy-MM-dd'), endDate: "",
        daysOfWeek: [], isBespoke: false, assetNotes: "", customChecks: []
      });
      setNewCustomCheck("");
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
    
    // Check if we already have a checklist in the inspection object (from custom fields)
    if (inspection.checklist && inspection.checklist.length > 0) {
      setInspectionResults(inspection.checklist.map(c => ({
        item: c.item,
        passed: c.status === 'Pass',
        notes: c.notes,
        imageUrl: c.imageUrl
      })));
    } else {
      setInspectionResults([
        { item: "General Structural Integrity", passed: true, notes: "" },
        { item: "Cleanliness and Hygiene", passed: true, notes: "" },
        { item: "Safe for Public Use", passed: true, notes: "" }
      ]);
    }
    setIsCompleteDialogOpen(true);
  };

  const [isUploading, setIsUploading] = useState<number | null>(null);

  const handleCheckImageUpload = async (file: File, index: number) => {
    if (!db) return;
    setIsUploading(index);
    try {
      const compressed = await compressImage(file);
      const storage = getStorage();
      const storageRef = ref(storage, `inspections/${selectedInspection?.id}/check_${index}_${Date.now()}.jpg`);
      await uploadString(storageRef, compressed, 'data_url');
      const url = await getDownloadURL(storageRef);
      
      const newResults = [...inspectionResults];
      newResults[index].imageUrl = url;
      setInspectionResults(newResults);
      toast({ title: "Image Uploaded", description: "Reference photo attached to this check." });
    } catch (error) {
      toast({ title: "Upload Error", description: "Failed to upload inspection image.", variant: "destructive" });
    } finally {
      setIsUploading(null);
    }
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
            inspectedBy: currentUserData?.name || user.email,
            checklist: inspectionResults.map(res => ({
                item: res.item,
                status: res.passed ? 'Pass' : 'Fail',
                notes: res.notes,
                imageUrl: res.imageUrl || null
            }))
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
          <DialogContent className="sm:max-w-[450px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-2 border-b">
              <DialogTitle className="font-headline">Schedule New Inspection</DialogTitle>
              <DialogDescription>Assign a condition check for a specific asset.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 p-6">
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
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Specific Inspection Notes</Label>
                      <Textarea 
                        placeholder="e.g. Check the playground for needles or sharp objects." 
                        value={newInspection.assetNotes} 
                        onChange={e => setNewInspection({...newInspection, assetNotes: e.target.value})}
                        className="text-xs min-h-[60px]"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Additional Custom Checks</Label>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Add a specific check..." 
                          value={newCustomCheck} 
                          onChange={e => setNewCustomCheck(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newCustomCheck.trim()) {
                                setNewInspection(prev => ({...prev, customChecks: [...prev.customChecks, newCustomCheck.trim()]}));
                                setNewCustomCheck("");
                              }
                            }
                          }}
                          className="h-9 text-xs"
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          className="h-9 w-9 p-0"
                          onClick={() => {
                            if (newCustomCheck.trim()) {
                              setNewInspection(prev => ({...prev, customChecks: [...prev.customChecks, newCustomCheck.trim()]}));
                              setNewCustomCheck("");
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {newInspection.customChecks.map((check, idx) => (
                          <Badge key={idx} variant="secondary" className="text-[9px] py-0 px-2 flex items-center gap-1 group">
                            {check}
                            <X 
                              className="h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" 
                              onClick={() => setNewInspection(prev => ({...prev, customChecks: prev.customChecks.filter((_, i) => i !== idx)}))} 
                            />
                          </Badge>
                        ))}
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
            </ScrollArea>
            <DialogFooter className="p-6 border-t bg-muted/50">
              <Button className="w-full" onClick={handleScheduleInspection} disabled={(!newInspection.assetId && selectedAssetIds.length === 0) || isSubmitting}>
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

      {inspections.length >= inspectionLimit && !loading && (
        <div className="flex justify-center pt-6 pb-2">
          <Button variant="outline" className="w-full md:w-auto px-8" onClick={() => setInspectionLimit(p => p + 25)}>
            Load More Inspections
          </Button>
        </div>
      )}

      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 pb-2 bg-gradient-to-br from-primary/5 to-primary/10 border-b">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <ClipboardCheck className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <DialogTitle className="font-headline text-xl">
                  {selectedInspection?.status === 'Completed' ? "Inspection Record" : "Perform Safety Check"}
                </DialogTitle>
                <DialogDescription className="text-xs font-medium opacity-70">
                  {selectedInspection?.status === 'Completed' ? `Historical record for: ${selectedInspection?.assetName}` : `Log instance for asset: ${selectedInspection?.assetName}`}
                </DialogDescription>
              </div>
            </div>
            
            {(selectedInspection as any)?.assetNotes && (
               <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
                  <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Specific Inspection Instructions</p>
                    <p className="text-xs font-semibold leading-relaxed">{(selectedInspection as any).assetNotes}</p>
                  </div>
               </div>
            )}
          </DialogHeader>

          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-6 pb-6">
              {inspectionResults.map((res, idx) => (
                <div key={idx} className={`p-5 rounded-2xl border-2 transition-all ${res.passed ? 'bg-background border-primary/5' : 'bg-destructive/5 border-destructive/20 shadow-sm'}`}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <div className="flex flex-col gap-1">
                          <Label className="font-bold text-sm tracking-tight">{res.item}</Label>
                          {res.passed ? (
                            <div className="flex items-center gap-1 text-[10px] text-primary font-bold uppercase">
                              <CheckCircle2 className="h-3 w-3" /> Pass
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[10px] text-destructive font-bold uppercase">
                              <AlertCircle className="h-3 w-3" /> Fail
                            </div>
                          )}
                       </div>
                    </div>

                    {selectedInspection?.status !== 'Completed' && (
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          type="button"
                          variant={res.passed ? 'default' : 'outline'}
                          className={`h-12 font-bold transition-all ${res.passed ? 'shadow-lg shadow-primary/20' : 'opacity-60'}`}
                          onClick={() => {
                            const newRes = [...inspectionResults];
                            newRes[idx].passed = true;
                            setInspectionResults(newRes);
                          }}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" /> PASS
                        </Button>
                        <Button
                          type="button"
                          variant={!res.passed ? 'destructive' : 'outline'}
                          className={`h-12 font-bold transition-all ${!res.passed ? 'shadow-lg shadow-destructive/20' : 'opacity-60'}`}
                          onClick={() => {
                            const newRes = [...inspectionResults];
                            newRes[idx].passed = false;
                            setInspectionResults(newRes);
                          }}
                        >
                          <AlertCircle className="mr-2 h-4 w-4" /> FAIL
                        </Button>
                      </div>
                    )}

                    <div className="space-y-3 pt-1">
                      <div className="flex items-center gap-3">
                         <div className="relative flex-1">
                            {selectedInspection?.status === 'Completed' ? (
                              res.notes ? (
                                <div className="p-3 bg-muted/40 rounded-lg text-xs font-medium italic border">
                                  "{res.notes}"
                                </div>
                              ) : null
                            ) : (
                              <Input 
                                placeholder="Add observation notes..." 
                                className="h-10 text-xs pl-4 bg-muted/40 border-none rounded-lg" 
                                value={res.notes}
                                onChange={(e) => {
                                  const newRes = [...inspectionResults];
                                  newRes[idx].notes = e.target.value;
                                  setInspectionResults(newRes);
                                }}
                              />
                            )}
                         </div>
                         {selectedInspection?.status !== 'Completed' && (
                           <div className="shrink-0">
                              <input 
                                type="file" 
                                accept="image/*" 
                                id={`upload-${idx}`} 
                                className="hidden" 
                                capture="environment"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleCheckImageUpload(file, idx);
                                }}
                              />
                              <Button 
                                type="button" 
                                variant="secondary" 
                                size="icon" 
                                className={`h-10 w-10 rounded-lg ${res.imageUrl ? 'bg-primary/20 text-primary border-primary/20' : ''}`}
                                disabled={isUploading === idx}
                                asChild
                              >
                                 <label htmlFor={`upload-${idx}`} className="cursor-pointer">
                                    {isUploading === idx ? <Clock className="h-4 w-4 animate-spin" /> : 
                                     res.imageUrl ? <ImageIcon className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                                 </label>
                              </Button>
                           </div>
                         )}
                      </div>
                      
                      {res.imageUrl && (
                        <div className={`relative ${selectedInspection?.status === 'Completed' ? 'h-48' : 'h-32'} w-full rounded-xl overflow-hidden border bg-muted animate-in zoom-in-95 duration-200`}>
                           <img src={res.imageUrl} className="h-full w-full object-contain bg-black/5" alt="Verification" />
                           {selectedInspection?.status !== 'Completed' && (
                             <Button 
                                type="button"
                                variant="destructive" 
                                size="icon" 
                                className="absolute top-2 right-2 h-6 w-6 rounded-full"
                                onClick={() => {
                                  const newRes = [...inspectionResults];
                                  delete newRes[idx].imageUrl;
                                  setInspectionResults(newRes);
                                }}
                              >
                                <Plus className="h-3 w-3 rotate-45" />
                             </Button>
                           )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-6 bg-muted/30 border-t mt-auto">
            {selectedInspection?.status === 'Completed' ? (
              <Button className="w-full font-bold h-12 text-md" variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>
                Close Record
              </Button>
            ) : (
              <Button className="w-full font-bold h-12 text-md shadow-xl" onClick={handleFinishInspection} disabled={isSubmitting || isUploading !== null}>
                {isSubmitting ? "Finalizing Report..." : "Complete Overall Safety Check"}
                <CheckCircle2 className="ml-2 h-5 w-5" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 border-b">
            <DialogTitle className="font-headline">Edit Scheduled Inspection</DialogTitle>
            <DialogDescription>Modify the due date or frequency for: {editingInspection?.assetName}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 p-6">
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
          </ScrollArea>
          <DialogFooter className="p-6 border-t bg-muted/50">
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
