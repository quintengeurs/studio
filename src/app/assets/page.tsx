
"use client";

import { useState, useMemo } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  CalendarCheck,
  ClipboardList,
  Edit2,
  X,
  MapPin,
  Clock,
  History,
  CheckCircle2,
  AlertCircle,
  Trash2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Asset, Inspection, Task, RegistryConfig, Frequency, User } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFirestore, useCollection, useMemoFirebase, useDoc, useUser } from "@/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, limit } from "firebase/firestore";
import { format } from "date-fns";
import { getDefaultPermissionsForUser } from "@/lib/permissions";

export default function AssetRegister() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  
  // Live Users (to check roles)
  const usersQuery = useMemoFirebase(() => db ? query(collection(db, "users"), where("isArchived", "==", false)) : null, [db]);
  const { data: allUsers = [] } = useCollection<User>(usersQuery as any);
  
  const currentUserData = useMemo(() => 
    allUsers.find(u => u.email?.toLowerCase() === user?.email?.toLowerCase()),
  [allUsers, user?.email]);
  
  const permissions = useMemo(() => getDefaultPermissionsForUser(currentUserData, user?.email), [currentUserData, user?.email]);
  const isAdmin = permissions.manageAssets; // Proxy for top level controls

  // Live Assets
  const [assetLimit, setAssetLimit] = useState(25);
  const assetsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "assets"), where("isArchived", "==", false), limit(assetLimit));
  }, [db, assetLimit]);
  const { data: assets = [], loading: assetsLoading } = useCollection<Asset>(assetsQuery as any);

  // Live All Inspections (for history)
  const inspectionsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "inspections"), limit(500));
  }, [db]);
  const { data: allInspections = [] } = useCollection<Inspection>(inspectionsQuery as any);

  // Live All Tasks (for history)
  const tasksQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "tasks"), limit(500));
  }, [db]);
  const { data: allTasks = [] } = useCollection<Task>(tasksQuery as any);

  const registryConfigRef = useMemo(() => db ? doc(db, "settings", "registry") : null, [db]);
  const { data: registryConfig, loading: configLoading } = useDoc<RegistryConfig>(registryConfigRef as any);
  const parks = useMemo(() => 
    registryConfig?.parks ? [...registryConfig.parks].sort() : [], 
  [registryConfig?.parks]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRegimeId, setEditingRegimeId] = useState<string | null>(null);
  const [tempRegime, setTempRegime] = useState<{ frequency: Frequency, dueDate: string }>({ frequency: 'Monthly', dueDate: '' });
  
  const [newAsset, setNewAsset] = useState({
    name: '',
    type: '',
    park: '',
    location: '',
    condition: 'Excellent' as const,
    expectedLifespan: '',
    setupInspection: false,
    inspectionFrequency: 'Monthly' as Frequency,
    inspectionStartDate: format(new Date(), 'yyyy-MM-dd'),
    inspectionNotes: '',
    customChecks: [] as string[],
    gpsLocation: null as { latitude: number, longitude: number } | null
  });

  const [newCustomCheck, setNewCustomCheck] = useState("");

  const filteredAssets = useMemo(() => assets.filter(a => {
    const s = search.toLowerCase();
    return (
      (a.name?.toLowerCase() || "").includes(s) || 
      (a.park?.toLowerCase() || "").includes(s) ||
      (a.type?.toLowerCase() || "").includes(s)
    );
  }), [assets, search]);

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Excellent': return 'bg-primary text-primary-foreground';
      case 'Good': return 'bg-accent text-accent-foreground';
      case 'Fair': return 'bg-secondary text-secondary-foreground';
      case 'Poor': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'Critical': return 'bg-destructive text-destructive-foreground';
      default: return '';
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Not Supported", description: "Geolocation is not supported by your browser.", variant: "destructive" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        if (isEditing && selectedAsset) {
          setSelectedAsset(prev => prev ? { ...prev, gpsLocation: coords } : null);
        } else {
          setNewAsset(prev => ({ ...prev, gpsLocation: coords }));
        }
        toast({ title: "Location Captured", description: "GPS coordinates added to asset report." });
      },
      (error) => {
        toast({ title: "Location Error", description: "Could not retrieve location. Please check permissions.", variant: "destructive" });
      },
      { enableHighAccuracy: true }
    );
  };

  const handleAddAsset = async () => {
    if (!db || isSubmitting) return;
    setIsSubmitting(true);
    const assetData = {
      name: newAsset.name,
      type: newAsset.type,
      park: newAsset.park,
      location: newAsset.location,
      condition: newAsset.condition,
      expectedLifespan: newAsset.expectedLifespan,
      isArchived: false,
      lastInspected: 'Never',
      gpsLocation: newAsset.gpsLocation
    };

    try {
      const docRef = await addDoc(collection(db, "assets"), assetData);
      if (newAsset.setupInspection) {
        // Standard checks + Custom checks
        const baseChecklist = [
          { item: "General Structural Integrity", status: 'N/A' as const, notes: '' },
          { item: "Cleanliness and Hygiene", status: 'N/A' as const, notes: '' },
          { item: "Safe for Public Use", status: 'N/A' as const, notes: '' }
        ];
        
        const customChecklist = (newAsset.customChecks || []).map(item => ({
          item, status: 'N/A' as const, notes: ''
        }));

        await addDoc(collection(db, "inspections"), {
          assetId: docRef.id,
          assetName: assetData.name,
          park: assetData.park,
          status: 'Pending',
          dueDate: newAsset.inspectionStartDate,
          frequency: newAsset.inspectionFrequency,
          assetNotes: newAsset.inspectionNotes,
          checklist: [...baseChecklist, ...customChecklist]
        });
      }
      setIsAddDialogOpen(false);
      setNewAsset({ 
        name: '', 
        type: '', 
        park: '', 
        location: '', 
        condition: 'Excellent', 
        expectedLifespan: '',
        setupInspection: false,
        inspectionFrequency: 'Monthly',
        inspectionStartDate: format(new Date(), 'yyyy-MM-dd'),
        inspectionNotes: '',
        customChecks: [],
        gpsLocation: null
      });
      toast({ title: "Asset Added", description: `${assetData.name} registered successfully.` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAsset = async () => {
    if (!db || !selectedAsset || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "assets", selectedAsset.id), selectedAsset as any);
      setIsEditing(false);
      toast({ title: "Asset Updated", description: "Changes saved successfully." });
    } catch (error) {
      toast({ title: "Error", description: "An error occurred while updating the asset.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveAsset = async () => {
    if (!db || !selectedAsset || isSubmitting) return;
    if (!confirm(`Are you sure you want to archive ${selectedAsset.name}? This will remove it from the active register.`)) return;
    
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "assets", selectedAsset.id), { isArchived: true });
      
      // Cancel pending inspections
      const pendingInspections = allInspections.filter(i => i.assetId === selectedAsset.id && i.status === 'Pending');
      for (const insp of pendingInspections) {
        await deleteDoc(doc(db, "inspections", insp.id));
      }

      setIsDetailsDialogOpen(false);
      toast({ title: "Asset Archived", description: "Asset and upcoming inspections removed." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to archive asset.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRegime = async (inspectionId: string, newFrequency: Frequency, newDueDate: string) => {
    if (!db || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "inspections", inspectionId), { 
        frequency: newFrequency,
        dueDate: newDueDate
      });
      toast({ title: "Schedule Updated", description: "The inspection regime has been modified." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update schedule.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAssetDetails = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsEditing(false);
    setIsDetailsDialogOpen(true);
  };

  const assetTasks = useMemo(() => {
    if (!selectedAsset) return [];
    const firstNamePart = (selectedAsset.name || "").split(' ')[0].toLowerCase();
    return allTasks.filter(t => 
      t.park === selectedAsset.park && 
      (t.title?.toLowerCase() || "").includes(firstNamePart)
    );
  }, [selectedAsset, allTasks]);

  const assetInspections = useMemo(() => 
    selectedAsset ? allInspections.filter(i => i.assetId === selectedAsset.id) : [],
    [selectedAsset, allInspections]
  );

  return (
    <DashboardShell 
      title="Asset Register" 
      description="Comprehensive inventory of Hackney parks infrastructure"
      actions={
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="font-headline font-bold w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Add Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-2 border-b">
              <DialogTitle className="font-headline">Add New Asset</DialogTitle>
              <DialogDescription>Register a new piece of infrastructure.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 p-6">
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Input value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} placeholder="e.g. South End Play Frame" />
                </div>
                <div className="grid gap-2">
                  <Label>Location / Landmark (Text)</Label>
                  <div className="flex gap-2">
                    <Input className="flex-1" value={newAsset.location} onChange={e => setNewAsset({...newAsset, location: e.target.value})} placeholder="e.g. Near East Gate" />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleGetLocation}
                      className={newAsset.gpsLocation ? "text-primary border-primary bg-primary/5 font-bold" : "font-bold"}
                    >
                      <MapPin className={`h-4 w-4 ${newAsset.gpsLocation ? '' : 'mr-2'}`} />
                      {newAsset.gpsLocation ? "Captured" : "Get GPS"}
                    </Button>
                  </div>
                  {newAsset.gpsLocation && (
                    <p className="text-[10px] text-muted-foreground italic">Lat: {newAsset.gpsLocation.latitude.toFixed(4)}, Lon: {newAsset.gpsLocation.longitude.toFixed(4)}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Category</Label>
                    <Select value={newAsset.type} onValueChange={v => setNewAsset({...newAsset, type: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sports and Leisure">Sports and Leisure</SelectItem>
                        <SelectItem value="Planting">Planting</SelectItem>
                        <SelectItem value="Trees">Trees</SelectItem>
                        <SelectItem value="Electrical">Electrical</SelectItem>
                        <SelectItem value="Water and drainage">Water and drainage</SelectItem>
                        <SelectItem value="Bins and litter">Bins and litter</SelectItem>
                        <SelectItem value="H&S">H&S</SelectItem>
                        <SelectItem value="Toilet">Toilet</SelectItem>
                        <SelectItem value="Playground Equipment">Playground Equipment</SelectItem>
                        <SelectItem value="Park Furniture">Park Furniture</SelectItem>
                        <SelectItem value="Lighting">Lighting</SelectItem>
                        <SelectItem value="Waste Management">Waste Management</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Park</Label>
                     <Select value={newAsset.park} onValueChange={v => setNewAsset({...newAsset, park: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {parks.map((p: string) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Condition</Label>
                    <Select value={newAsset.condition} onValueChange={(v: any) => setNewAsset({...newAsset, condition: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Excellent">Excellent</SelectItem>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Fair">Fair</SelectItem>
                        <SelectItem value="Poor">Poor</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Expected Life Span (Years)</Label>
                    <Input type="number" value={newAsset.expectedLifespan} onChange={e => setNewAsset({...newAsset, expectedLifespan: e.target.value})} placeholder="e.g. 15" />
                  </div>
                </div>
                
                <div className="p-4 border-2 border-muted rounded-lg bg-muted/20 space-y-4">
                  <h4 className="text-xs font-bold uppercase text-primary tracking-widest flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4" /> Schedule Setup
                  </h4>
                  <div className="flex items-start space-x-3">
                    <Checkbox id="insp" checked={newAsset.setupInspection} onCheckedChange={(v) => setNewAsset({...newAsset, setupInspection: !!v})} />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor="insp" className="text-sm font-semibold leading-none cursor-pointer">Generate regular inspection</label>
                      <p className="text-xs text-muted-foreground">Automatically create inspection tasks based on asset type.</p>
                    </div>
                  </div>

                  {newAsset.setupInspection && (
                    <div className="space-y-4 pt-2 animate-in slide-in-from-top-2 duration-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                           <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Start Date</Label>
                           <Input type="date" value={newAsset.inspectionStartDate} onChange={e => setNewAsset({...newAsset, inspectionStartDate: e.target.value})} className="h-9" />
                        </div>
                        <div className="grid gap-2">
                           <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Frequency</Label>
                           <Select value={newAsset.inspectionFrequency} onValueChange={(v: Frequency) => setNewAsset({...newAsset, inspectionFrequency: v})}>
                             <SelectTrigger className="h-9">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="Weekly">Weekly</SelectItem>
                               <SelectItem value="Monthly">Monthly</SelectItem>
                               <SelectItem value="Six Monthly">Six Monthly</SelectItem>
                               <SelectItem value="Yearly">Yearly</SelectItem>
                             </SelectContent>
                           </Select>
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Specific Inspection Notes</Label>
                        <Textarea 
                          placeholder="e.g. Check the playground for needles or sharp objects." 
                          value={newAsset.inspectionNotes} 
                          onChange={e => setNewAsset({...newAsset, inspectionNotes: e.target.value})}
                          className="text-xs min-h-[60px]"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Additional Custom Checks</Label>
                        <div className="flex gap-2">
                          <Input 
                            placeholder="Add a specific check..." 
                            value={newCustomCheck} 
                            onChange={e => setNewCustomCheck(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newCustomCheck.trim()) {
                                  setNewAsset({...newAsset, customChecks: [...newAsset.customChecks, newCustomCheck.trim()]});
                                  setNewCustomCheck("");
                                }
                              }
                            }}
                            className="h-8 text-xs"
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              if (newCustomCheck.trim()) {
                                setNewAsset({...newAsset, customChecks: [...newAsset.customChecks, newCustomCheck.trim()]});
                                setNewCustomCheck("");
                              }
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {newAsset.customChecks.map((check, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[9px] py-0 px-2 flex items-center gap-1 group">
                              {check}
                              <X 
                                className="h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" 
                                onClick={() => setNewAsset({...newAsset, customChecks: newAsset.customChecks.filter((_, i) => i !== idx)})} 
                              />
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="p-6 border-t bg-muted/50">
              <Button className="w-full" onClick={handleAddAsset} disabled={!newAsset.name || !newAsset.park || isSubmitting}>
                {isSubmitting ? "Adding Asset..." : "Complete Registration"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="flex items-center gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search assets..." className="pl-9 w-full" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0">
              <Filter className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Filter the asset register</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <Card className="overflow-hidden border-2">
        <div className="overflow-x-auto w-full">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-headline font-bold whitespace-nowrap min-w-[150px]">Asset Name</TableHead>
                <TableHead className="font-headline font-bold whitespace-nowrap">Park</TableHead>
                <TableHead className="font-headline font-bold whitespace-nowrap">Category</TableHead>
                <TableHead className="font-headline font-bold whitespace-nowrap">Condition</TableHead>
                <TableHead className="font-headline font-bold whitespace-nowrap">Last Inspected</TableHead>
                <TableHead className="text-right w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assetsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    <Clock className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading register...
                  </TableCell>
                </TableRow>
              ) : filteredAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground italic">
                    No assets found in registry.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssets.map((asset) => (
                  <TableRow key={asset.id} className="hover:bg-accent/5 transition-colors cursor-pointer" onClick={() => openAssetDetails(asset)}>
                    <TableCell className="font-medium">
                      <div className="min-w-[120px]">
                        <div className="truncate max-w-[200px]">{asset.name}</div>
                        <div className="flex items-center gap-2">
                          <div className="text-[10px] text-muted-foreground font-normal truncate max-w-[150px]">{asset.location}</div>
                          {asset.gpsLocation && (
                            <Badge variant="secondary" className="text-[8px] h-3.5 px-1 font-bold bg-primary/5 text-primary border-primary/10">GPS</Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{asset.park}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="outline" className="font-normal text-[10px]">{asset.type}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge className={`${getConditionColor(asset.condition)} font-bold text-[10px]`} variant="outline">
                        {asset.condition}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[10px] whitespace-nowrap">{asset.lastInspected}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openAssetDetails(asset)}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View asset details and history</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {assets.length >= assetLimit && !assetsLoading && (
        <div className="flex justify-center pt-6 pb-2">
          <Button variant="outline" className="w-full md:w-auto px-8" onClick={() => setAssetLimit(p => p + 25)}>
            Load More Assets
          </Button>
        </div>
      )}


      {/* Asset Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl font-headline font-bold flex items-center gap-2">
                  {selectedAsset?.name}
                  <Badge className={`${getConditionColor(selectedAsset?.condition || '')} font-bold text-[10px] uppercase ml-2`}>
                    {selectedAsset?.condition}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <MapPin className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium">{selectedAsset?.park} • {selectedAsset?.location}</span>
                </DialogDescription>
              </div>
              <Button 
                variant={isEditing ? "outline" : "default"} 
                size="sm" 
                className="font-bold"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? <X className="mr-2 h-4 w-4" /> : <Edit2 className="mr-2 h-4 w-4" />}
                {isEditing ? "Cancel Edit" : "Edit Asset"}
              </Button>
            </div>
          </DialogHeader>

          <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col mt-4">
            <TabsList className="mx-6 justify-start h-10 bg-transparent border-b rounded-none p-0 gap-6">
              <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 font-bold">Overview</TabsTrigger>
              <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 font-bold">Inspection Audit & History</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 p-6">
              <TabsContent value="overview" className="mt-0 space-y-6">
                {isEditing ? (
                  <div className="grid gap-6">
                    {/* Edit Form Fields */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Asset Name</Label>
                        <Input 
                          value={selectedAsset?.name} 
                          onChange={e => selectedAsset && setSelectedAsset({...selectedAsset, name: e.target.value})} 
                          className="font-medium"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Asset Category</Label>
                        <Input value={selectedAsset?.type} disabled className="font-medium opacity-100" />
                      </div>
                    </div>
                    <div className="grid gap-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Physical Location (GPS)</Label>
                        <div className="flex gap-2">
                            <Input 
                                disabled 
                                value={selectedAsset?.gpsLocation ? `${selectedAsset.gpsLocation.latitude.toFixed(6)}, ${selectedAsset.gpsLocation.longitude.toFixed(6)}` : "No GPS data captured"} 
                                className="font-medium bg-muted/30"
                            />
                            <Button variant="outline" size="sm" onClick={handleGetLocation} className="font-bold">
                                <MapPin className="mr-2 h-4 w-4" />
                                {selectedAsset?.gpsLocation ? "Update GPS" : "Capture GPS"}
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Physical Condition</Label>
                        <Select 
                          value={selectedAsset?.condition} 
                          onValueChange={(v: "Excellent" | "Good" | "Fair" | "Poor" | "Critical") => selectedAsset && setSelectedAsset({...selectedAsset, condition: v})}
                        >
                          <SelectTrigger className="font-medium"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Excellent">Excellent</SelectItem>
                            <SelectItem value="Good">Good</SelectItem>
                            <SelectItem value="Fair">Fair</SelectItem>
                            <SelectItem value="Poor">Poor</SelectItem>
                            <SelectItem value="Critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Expected Life Span (Years)</Label>
                        <Input 
                          type="number"
                          value={selectedAsset?.expectedLifespan} 
                          onChange={e => selectedAsset && setSelectedAsset({...selectedAsset, expectedLifespan: e.target.value})} 
                          className="font-medium"
                        />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <Button onClick={handleUpdateAsset} className="flex-1 font-bold" disabled={isSubmitting}>
                        {isSubmitting ? "Saving Changes..." : "Save Asset Changes"}
                      </Button>
                      <Button onClick={handleArchiveAsset} variant="destructive" className="font-bold px-6" disabled={isSubmitting}>
                        <Trash2 className="mr-2 h-4 w-4" /> Archive Asset
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg bg-card shadow-sm">
                        <div className="flex items-center gap-2 text-primary mb-2">
                          <History className="h-4 w-4" />
                          <h4 className="text-[10px] font-bold uppercase tracking-widest">Last Verified Log</h4>
                        </div>
                        <p className="text-lg font-bold font-headline">{selectedAsset?.lastInspected}</p>
                      </div>
                      <div className="p-4 border rounded-lg bg-card shadow-sm">
                        <div className="flex items-center gap-2 text-primary mb-2">
                          <ClipboardList className="h-4 w-4" />
                          <h4 className="text-[10px] font-bold uppercase tracking-widest">Asset Category</h4>
                        </div>
                        <p className="text-lg font-bold font-headline">{selectedAsset?.type}</p>
                      </div>
                      <div className="p-4 border rounded-lg bg-card shadow-sm">
                        <div className="flex items-center gap-2 text-primary mb-2">
                          <History className="h-4 w-4" />
                          <h4 className="text-[10px] font-bold uppercase tracking-widest">Expected Life Span</h4>
                        </div>
                        <p className="text-lg font-bold font-headline">{selectedAsset?.expectedLifespan || 'Not Set'} <span className="text-xs font-normal text-muted-foreground uppercase ml-1">Years</span></p>
                      </div>
                      {selectedAsset?.gpsLocation && (
                        <div className="p-4 border rounded-lg bg-card shadow-sm">
                          <div className="flex items-center gap-2 text-primary mb-2">
                            <MapPin className="h-4 w-4" />
                            <h4 className="text-[10px] font-bold uppercase tracking-widest">Physical GPS Location</h4>
                          </div>
                          <p className="text-lg font-bold font-headline">{selectedAsset.gpsLocation.latitude.toFixed(6)}, {selectedAsset.gpsLocation.longitude.toFixed(6)}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-widest px-1">Safety Status</h4>
                      <div className="grid gap-3">
                         <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                           <div className="flex items-center gap-3">
                             <CheckCircle2 className="h-5 w-5 text-primary" />
                             <div>
                               <p className="text-sm font-bold">Operational</p>
                               <p className="text-[10px] text-muted-foreground font-medium">Safe for Hackney residents</p>
                             </div>
                           </div>
                           <Badge className="bg-primary text-white font-bold text-[10px]">VERIFIED</Badge>
                         </div>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-0 space-y-8">
                <section className="mb-8">
                  <h4 className="text-xs font-bold uppercase text-primary tracking-widest mb-4 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" /> Upcoming Scheduled Checks
                  </h4>
                  {assetInspections.filter(i => i.status === 'Pending').length > 0 ? (
                    <div className="space-y-3">
                      {assetInspections.filter(i => i.status === 'Pending').map(insp => (
                        <div key={insp.id} className="p-3 border rounded-md group hover:border-primary/40 transition-colors bg-primary/5">
                          {editingRegimeId === insp.id ? (
                            <div className="space-y-3 animate-in fade-in duration-200">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="grid gap-1">
                                  <Label className="text-[9px] font-bold uppercase tracking-widest opacity-70">Frequency</Label>
                                  <Select value={tempRegime.frequency} onValueChange={(v: Frequency) => setTempRegime({...tempRegime, frequency: v})}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Weekly">Weekly</SelectItem>
                                      <SelectItem value="Monthly">Monthly</SelectItem>
                                      <SelectItem value="Six Monthly">Six Monthly</SelectItem>
                                      <SelectItem value="Yearly">Yearly</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid gap-1">
                                  <Label className="text-[9px] font-bold uppercase tracking-widest opacity-70">Next Due Date</Label>
                                  <Input type="date" value={tempRegime.dueDate} onChange={e => setTempRegime({...tempRegime, dueDate: e.target.value})} className="h-8 text-xs" />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" className="h-7 text-[10px] font-bold flex-1" onClick={() => {
                                  handleUpdateRegime(insp.id, tempRegime.frequency, tempRegime.dueDate);
                                  setEditingRegimeId(null);
                                }}>Save Schedule</Button>
                                <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold" onClick={() => setEditingRegimeId(null)}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold">Safety Check (Due: {insp.dueDate})</span>
                                <span className="text-[10px] text-muted-foreground uppercase">{insp.frequency || 'One-off'} Schedule</span>
                              </div>
                              <div className="flex gap-1">
                                 <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => {
                                   setEditingRegimeId(insp.id);
                                   setTempRegime({ frequency: insp.frequency || 'Monthly', dueDate: insp.dueDate });
                                 }}>
                                   <Edit2 className="h-3.5 w-3.5" />
                                 </Button>
                                 {isAdmin && (
                                   <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={async (e) => {
                                     e.stopPropagation();
                                     if (db && confirm('Delete this scheduled inspection?')) {
                                       await deleteDoc(doc(db, "inspections", insp.id));
                                       toast({ title: "Inspection Canceled" });
                                     }
                                   }}>
                                     <Trash2 className="h-3.5 w-3.5" />
                                   </Button>
                                 )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic py-4 text-center border border-dashed rounded-lg">No upcoming inspections scheduled.</p>
                  )}
                </section>

                <section>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-4 flex items-center gap-2">
                    <History className="h-3.5 w-3.5" /> Historical Inspection Records
                  </h4>
                  {assetInspections.length > 0 ? (
                    <div className="space-y-3">
                      {assetInspections.filter(i => i.status === 'Completed').map(insp => (
                        <div key={insp.id} className="p-3 border rounded-md flex items-center justify-between group hover:border-primary/40 transition-colors">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">Condition Log Entry</span>
                            <span className="text-[10px] text-muted-foreground">Logged: {insp.completedAt ? format(new Date(insp.completedAt), 'dd MMM yyyy') : insp.dueDate}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className="bg-green-50 text-green-700 border-green-200 text-[9px] font-bold">PASSED</Badge>
                            <span className="text-[10px] font-medium text-muted-foreground">{insp.inspectedBy}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic py-4 text-center border border-dashed rounded-lg">No logged records found.</p>
                  )}
                </section>

                <section>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-4 flex items-center gap-2">
                    <ClipboardList className="h-3.5 w-3.5" /> Maintenance Audit Trail
                  </h4>
                   {assetTasks.length > 0 ? (
                    <div className="space-y-3">
                      {assetTasks.filter(t => t.status === 'Completed').map(task => (
                        <div key={task.id} className="p-3 border rounded-md group">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-bold truncate pr-4">{task.title}</span>
                            <Badge className="bg-primary text-[8px] font-bold">COMPLETED</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">Actioned by {task.assignedTo}</span>
                            <span className="text-[9px] font-bold text-muted-foreground">{task.dueDate}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic py-4 text-center border border-dashed rounded-lg">No maintenance history recorded.</p>
                  )}
                </section>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
