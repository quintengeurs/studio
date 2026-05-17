
"use client";

import { ActivityKanbanBoard } from "@/components/kanban/ActivityKanbanBoard";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useUserContext } from "@/context/UserContext";
import { useDataContext } from "@/context/DataContext";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, addDoc, doc, updateDoc, deleteDoc, orderBy } from "firebase/firestore";
import { ParkActivity, ActivityType } from "@/lib/types";
import { 
  Compass, 
  Plus, 
  MapPin, 
  Building2, 
  Clock, 
  CheckCircle2, 
  CircleDashed,
  Search,
  Filter,
  Edit3,
  Trash2,
  ExternalLink,
  Zap,
  TrendingUp,
  Target,
  Database,
  Layers,
  MessageSquare,
  History,
  Archive,
  Inbox,
  LayoutGrid,
  ListTodo
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function DevelopmentPage() {
  const { toast } = useToast();
  const { effectiveOrgId, profile, isAdmin } = useUserContext();
  const { allParks, getAssets, registryConfig, loading: parksLoading } = useDataContext();
  const [allAssets, setAllAssets] = useState<any[]>([]);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const data = await getAssets();
        setAllAssets(data);
      } catch (err) {
        console.error("Development fetch error:", err);
      }
    };
    fetchAssets();
  }, [getAssets]);
  const { user } = useUser();
  const db = useFirestore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [editingActivity, setEditingActivity] = useState<ParkActivity | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedActivityForUpdate, setSelectedActivityForUpdate] = useState<ParkActivity | null>(null);
  const [updateContent, setUpdateContent] = useState("");

  // Filter assets based on user's assigned depots (if not admin)
  const userDepots = useMemo(() => {
    if (isAdmin) return [];
    const depots = new Set<string>();
    if (profile?.depot) depots.add(profile.depot);
    if (profile?.depots) profile.depots.forEach(d => depots.add(d));
    if (profile?.assignedRoles) profile.assignedRoles.forEach(ar => ar.depotIds?.forEach(id => depots.add(id)));
    return Array.from(depots);
  }, [profile, isAdmin]);

  const availableAssets = useMemo(() => {
    return allAssets.filter(asset => {
      // Find the park this asset belongs to
      const park = allParks.find(p => p.name === asset.park);
      if (!park) return false;
      
      // If admin, show all. If not, only show assets in depots assigned to the user.
      return isAdmin || userDepots.includes(park.depot || "");
    });
  }, [allAssets, allParks, isAdmin, userDepots]);

  const [form, setForm] = useState<Partial<ParkActivity>>({
    title: "",
    description: "",
    parkId: "",
    depotId: "",
    startDate: "",
    endDate: "",
    status: "Draft",
    impactLevel: "Medium",
    type: "Development",
    linkedAssetId: "",
    linkedAssetCategory: "",
    showOnCalendar: false
  });

  // Query for all development updates
  const devQuery = useMemoFirebase(() => 
    (db && effectiveOrgId) ? query(
      collection(db, "park_activities"), 
      where("orgId", "==", effectiveOrgId),
      where("type", "==", "Development"),
      orderBy("startDate", "desc")
    ) : null, 
  [db, effectiveOrgId]);

  const { data: devActivities = [], loading: devLoading } = useCollection<ParkActivity>(devQuery as any);

  const filteredDev = useMemo(() => {
    return devActivities.filter(e => {
      const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           e.parkId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || e.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [devActivities, searchTerm, statusFilter]);

  const handleParkChange = (parkName: string) => {
    const park = allParks.find(p => p.name === parkName);
    setForm(prev => ({
      ...prev,
      parkId: parkName,
      depotId: park?.depot || "Unassigned"
    }));
  };

  const handleSave = async () => {
    if (!db || !user || !effectiveOrgId) return;
    if (!form.title || !form.parkId || !form.startDate) {
      toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const activityData = {
        ...form,
        orgId: effectiveOrgId,
        type: "Development" as ActivityType,
        updatedAt: new Date().toISOString(),
        linkedAssetId: form.linkedAssetId === 'none' ? "" : form.linkedAssetId,
        linkedAssetCategory: form.linkedAssetCategory === 'none' ? "" : form.linkedAssetCategory
      };

      if (editingActivity) {
        await updateDoc(doc(db, "park_activities", editingActivity.id), activityData as any);
        toast({ title: "Update Saved", description: "Development entry updated successfully." });
      } else {
        await addDoc(collection(db, "park_activities"), {
          ...activityData,
          createdAt: new Date().toISOString(),
          createdBy: profile?.name || user.email || "Unknown",
        });
        toast({ title: "Update Posted", description: "New development update has been posted to the registry." });
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving dev update:", error);
      toast({ title: "Error", description: "Could not save. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddUpdate = async () => {
    if (!db || !selectedActivityForUpdate || !updateContent || !user) return;
    setIsSubmitting(true);
    try {
      const newUpdate = {
        id: Math.random().toString(36).substr(2, 9),
        content: updateContent,
        date: new Date().toISOString(),
        createdBy: profile?.name || user.email || "Unknown"
      };

      const existingUpdates = selectedActivityForUpdate.updates || [];
      await updateDoc(doc(db, "park_activities", selectedActivityForUpdate.id), {
        updates: [...existingUpdates, newUpdate],
        updatedAt: new Date().toISOString()
      });

      toast({ title: "Update Added", description: "The development update has been saved." });
      setIsUpdateModalOpen(false);
      setUpdateContent("");
      setSelectedActivityForUpdate(null);
    } catch (error) {
      console.error("Error adding update:", error);
      toast({ title: "Error", description: "Could not save update.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!db || !confirm("Are you sure you want to delete this update?")) return;
    try {
      await deleteDoc(doc(db, "park_activities", id));
      toast({ title: "Update Deleted" });
    } catch (error) {
      console.error("Delete error:", error);
      toast({ title: "Error", description: "Could not delete entry.", variant: "destructive" });
    }
  };

  const handleArchive = async (id: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "park_activities", id), { 
        status: "Archived",
        updatedAt: new Date().toISOString()
      });
      toast({ title: "Entry Archived", description: "Moved to the development archive." });
    } catch (error) {
      console.error("Archive error:", error);
      toast({ title: "Error", description: "Could not archive entry.", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      parkId: "",
      depotId: "",
      startDate: "",
      endDate: "",
      status: "Draft",
      impactLevel: "Medium",
      type: "Development",
      linkedAssetId: "",
      linkedAssetCategory: "",
      showOnCalendar: false
    });
    setEditingActivity(null);
  };

  const openEdit = (activity: ParkActivity) => {
    setEditingActivity(activity);
    setForm({ ...activity });
    setIsModalOpen(true);
  };

  return (
    <DashboardShell 
      title="Parks Development" 
      description="Strategy, master-planning, and community development updates."
      actions={
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="font-bold shadow-lg shadow-purple-500/20 bg-purple-600 hover:bg-purple-700">
          <Plus className="mr-2 h-4 w-4" /> New Dev Update
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-purple-500/5 border-purple-500/10 shadow-none">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-purple-600 opacity-70">Total Updates</p>
                <p className="text-2xl font-bold">{devActivities.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-indigo-500/5 border-indigo-500/10 shadow-none">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 opacity-70">Strategic Wins</p>
                <p className="text-2xl font-bold">{devActivities.filter(e => e.status === 'Confirmed').length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-emerald-500/5 border-emerald-500/10 shadow-none">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 opacity-70">Growth Phase</p>
                <p className="text-2xl font-bold">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-orange-500/5 border-orange-500/10 shadow-none">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-600">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600 opacity-70">New Initiatives</p>
                <p className="text-2xl font-bold">12</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="active" className="flex items-center gap-2">
                <Inbox className="h-4 w-4" /> Active Development
              </TabsTrigger>
              <TabsTrigger value="archived" className="flex items-center gap-2">
                <Archive className="h-4 w-4" /> Archive Log
              </TabsTrigger>
            </TabsList>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center flex-1 justify-end w-full">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search updates..." 
                  className="pl-10 bg-muted/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[160px]">
                  <Filter className="mr-2 h-4 w-4 opacity-50" />
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex bg-muted p-1 rounded-md shrink-0">
                <Button 
                  variant={viewMode === 'board' ? 'default' : 'ghost'} 
                  size="sm" 
                  className="h-8 px-3"
                  onClick={() => setViewMode('board')}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" /> Board
                </Button>
                <Button 
                  variant={viewMode === 'list' ? 'default' : 'ghost'} 
                  size="sm" 
                  className="h-8 px-3"
                  onClick={() => setViewMode('list')}
                >
                  <ListTodo className="h-4 w-4 mr-2" /> List
                </Button>
              </div>
            </div>
          </div>

          <TabsContent value="active">
            {devLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                 <CircleDashed className="h-10 w-10 animate-spin opacity-20 mb-4" />
                 <p className="font-bold uppercase tracking-widest text-[10px]">Loading Registry...</p>
              </div>
            ) : filteredDev.filter(e => e.status !== 'Archived').length > 0 ? (
              viewMode === 'board' ? (
                <div className="h-[calc(100vh-280px)] min-h-[500px] w-full mt-4">
                  <ActivityKanbanBoard 
                    activities={filteredDev.filter(e => e.status !== 'Archived')} 
                    onActivityClick={(activity) => openEdit(activity)} 
                    orgId={effectiveOrgId || ''} 
                  />
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDev.filter(e => e.status !== 'Archived').map(entry => (
                  <Card key={entry.id} className={cn(
                    "group hover:shadow-xl transition-all duration-300 border-2 overflow-hidden",
                    entry.status === 'Confirmed' ? "border-purple-500/10 hover:border-purple-500/30" : "border-muted hover:border-primary/20"
                  )}>
                    <CardHeader className="pb-3 bg-muted/5">
                      <div className="flex justify-between items-start">
                        <Badge variant={entry.status === 'Confirmed' ? 'default' : 'secondary'} className={cn(
                          "font-bold uppercase text-[9px] px-2",
                          entry.status === 'Confirmed' ? "bg-purple-600" : ""
                        )}>
                          {entry.status}
                        </Badge>
                        <div className="flex gap-1">
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEdit(entry)}>
                             <Edit3 className="h-3.5 w-3.5" />
                           </Button>
                          {entry.status !== 'Archived' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-700" onClick={() => handleArchive(entry.id)}>
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={() => handleDelete(entry.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="text-lg mt-2 line-clamp-1">{entry.title}</CardTitle>
                      <CardDescription className="line-clamp-2 text-xs h-8">{entry.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Park Area</p>
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <MapPin className="h-3.5 w-3.5 text-purple-500" />
                            {entry.parkId}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Assigned Depot</p>
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                            {entry.depotId}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 p-3 bg-muted/20 rounded-xl border">
                        <div className="flex-1">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Effective From</p>
                          <div className="flex items-center gap-2 text-xs font-bold">
                            <Clock className="h-3 w-3 text-purple-600" />
                            {new Date(entry.startDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                        <div className="flex-1 border-l pl-4">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Review Date</p>
                          <div className="flex items-center gap-2 text-xs font-bold">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {entry.endDate ? new Date(entry.endDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Ongoing'}
                          </div>
                        </div>
                      </div>

                      {entry.updates && entry.updates.length > 0 && (
                        <div className="space-y-2 pt-2 border-t">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                            <History className="h-2.5 w-2.5 text-purple-500" /> Recent Timeline
                          </p>
                          <div className="space-y-2 max-h-[80px] overflow-y-auto pr-2 scrollbar-none">
                            {entry.updates.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 2).map((u, i) => (
                              <div key={i} className="bg-muted/30 p-2 rounded-lg border-l-2 border-purple-500/50">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[9px] font-bold text-purple-700">{u.createdBy}</span>
                                  <span className="text-[8px] text-muted-foreground">{new Date(u.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                                </div>
                                <p className="text-[10px] leading-snug line-clamp-2 italic">{u.content}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 border-t pt-4">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 gap-2 text-[10px] font-bold uppercase text-purple-600 hover:bg-purple-50" 
                            onClick={() => { setSelectedActivityForUpdate(entry); setIsUpdateModalOpen(true); }}
                          >
                            <MessageSquare className="h-3.5 w-3.5" /> Add Update
                          </Button>
                          <Link href={`/parks?name=${encodeURIComponent(entry.parkId)}`} className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 hover:underline hover:text-purple-600">
                            View Park <ExternalLink className="h-2.5 w-2.5" />
                          </Link>
                        </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-muted-foreground border-2 border-dashed rounded-3xl bg-muted/5">
                 <Compass className="h-16 w-16 mb-6 opacity-10" />
                 <h3 className="text-xl font-bold">No Active Entries</h3>
                 <p className="text-sm max-w-xs text-center mt-2">All development updates are either archived or haven't been posted yet.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="archived">
            {filteredDev.filter(e => e.status === 'Archived').length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDev.filter(e => e.status === 'Archived').map(entry => (
                  <Card key={entry.id} className="opacity-75 grayscale-[0.5] border-dashed border-2 hover:grayscale-0 transition-all">
                    <CardHeader className="pb-3 bg-muted/5">
                      <div className="flex justify-between items-start">
                        <Badge variant="outline" className="font-bold uppercase text-[9px] px-2">
                          Archived
                        </Badge>
                        <div className="flex gap-1">
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive" onClick={() => handleDelete(entry.id)}>
                             <Trash2 className="h-3.5 w-3.5" />
                           </Button>
                        </div>
                      </div>
                      <CardTitle className="text-lg mt-2 line-clamp-1">{entry.title}</CardTitle>
                      <CardDescription className="line-clamp-2 text-xs h-8">{entry.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                       <div className="text-[10px] bg-muted p-2 rounded text-muted-foreground font-medium italic">
                         Entry archived on {entry.updatedAt ? new Date(entry.updatedAt).toLocaleDateString() : 'Unknown date'}.
                       </div>
                       <div className="grid grid-cols-2 gap-4 opacity-60">
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Park</p>
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <MapPin className="h-3.5 w-3.5" />
                            {entry.parkId}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Depot</p>
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <Building2 className="h-3.5 w-3.5" />
                            {entry.depotId}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-muted-foreground border-2 border-dashed rounded-3xl">
                 <Archive className="h-16 w-16 mb-6 opacity-10" />
                 <p className="text-sm font-bold">Archive is Empty</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Register/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingActivity ? 'Update Entry' : 'Post Development Update'}</DialogTitle>
            <DialogDescription>
              Share strategic updates about park development. Confirmed entries are published to park staff and management.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs font-bold uppercase tracking-widest opacity-60">Update Title</Label>
              <Input 
                id="title" 
                placeholder="e.g. Masterplan Consultation Phase 1" 
                value={form.title} 
                onChange={e => setForm({...form, title: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Park Selection</Label>
                <Select value={form.parkId} onValueChange={handleParkChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Park" />
                  </SelectTrigger>
                  <SelectContent>
                    {allParks.map(p => (
                      <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Responsible Depot</Label>
                <div className="flex items-center gap-2 h-10 px-3 rounded-md bg-muted/30 border text-sm font-bold text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  {form.depotId || "Select a Park"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Start Date</Label>
                <Input 
                  type="date" 
                  value={form.startDate} 
                  onChange={e => setForm({...form, startDate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Next Review (Optional)</Label>
                <Input 
                  type="date" 
                  value={form.endDate} 
                  onChange={e => setForm({...form, endDate: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Link Specific Asset (Optional)</Label>
                <Select 
                  value={form.linkedAssetId || "none"} 
                  onValueChange={(v) => setForm({...form, linkedAssetId: v, linkedAssetCategory: ""})}
                >
                  <SelectTrigger className="bg-purple-50/50 border-purple-200">
                    <SelectValue placeholder="Select Asset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Specific Asset</SelectItem>
                    {availableAssets
                      .filter(a => !form.parkId || a.park === form.parkId)
                      .map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name} ({a.park})</SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Strategic Asset Category</Label>
                <Select 
                  value={form.linkedAssetCategory || "none"} 
                  onValueChange={(v) => setForm({...form, linkedAssetCategory: v, linkedAssetId: ""})}
                >
                  <SelectTrigger className="bg-indigo-50/50 border-indigo-200">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Specific Category</SelectItem>
                    {(registryConfig?.assetCategories || ['Seating', 'Play Equipment', 'Bins', 'Fencing', 'Buildings', 'Nature Areas']).map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Publication Status</Label>
                <Select value={form.status} onValueChange={(v: any) => setForm({...form, status: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft (Internal Only)</SelectItem>
                    <SelectItem value="Confirmed">Confirmed (Publish to Staff)</SelectItem>
                    <SelectItem value="Archived">Archived / Historical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Strategic Priority</Label>
                <Select value={form.impactLevel} onValueChange={(v: any) => setForm({...form, impactLevel: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low Priority</SelectItem>
                    <SelectItem value="Medium">Medium Priority</SelectItem>
                    <SelectItem value="High">High Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-muted/20 p-3 rounded-lg border border-dashed border-primary/20">
              <Checkbox 
                id="showOnCalendar" 
                checked={form.showOnCalendar} 
                onCheckedChange={(checked) => setForm({...form, showOnCalendar: !!checked})}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="showOnCalendar"
                  className="text-xs font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Show on Master Calendar
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  If enabled, this will appear in the global Master Calendar for all teams.
                </p>
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="description" className="text-xs font-bold uppercase tracking-widest opacity-60">Strategy Details & Community Impact</Label>
              <Textarea 
                id="description" 
                placeholder="Detail the development progress, upcoming milestones, or feedback summary..." 
                className="min-h-[100px]"
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700 text-white">
              {isSubmitting ? "Saving..." : (editingActivity ? "Update Entry" : "Post Update")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Update Modal */}
      <Dialog open={isUpdateModalOpen} onOpenChange={(open) => { setIsUpdateModalOpen(open); if (!open) { setUpdateContent(""); setSelectedActivityForUpdate(null); } }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-purple-600" /> Add Development Update
            </DialogTitle>
            <DialogDescription>
              Post a progress update for <span className="font-bold text-foreground">"{selectedActivityForUpdate?.title}"</span>. This will show on the relevant Parks page.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Update Message</Label>
              <Textarea 
                placeholder="e.g. Masterplan draft finalized. Public consultation period begins next month." 
                className="min-h-[120px] bg-muted/20 border-none focus-visible:ring-1 focus-visible:ring-purple-600"
                value={updateContent}
                onChange={e => setUpdateContent(e.target.value)}
              />
            </div>
            {selectedActivityForUpdate?.updates && selectedActivityForUpdate.updates.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Activity History</Label>
                <div className="max-h-[150px] overflow-y-auto space-y-2 pr-2">
                  {selectedActivityForUpdate.updates.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(u => (
                    <div key={u.id} className="p-2 rounded-lg bg-muted/30 border text-[11px]">
                      <div className="flex justify-between mb-1 opacity-60 font-bold uppercase tracking-tighter">
                        <span>{u.createdBy}</span>
                        <span>{new Date(u.date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-foreground/80">{u.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleAddUpdate} disabled={isSubmitting || !updateContent.trim()} className="bg-purple-600 hover:bg-purple-700">
              {isSubmitting ? "Posting..." : "Post Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

