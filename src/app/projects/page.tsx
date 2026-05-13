
"use client";

import { useState, useMemo, useEffect } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useUserContext } from "@/context/UserContext";
import { useDataContext } from "@/context/DataContext";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, addDoc, doc, updateDoc, deleteDoc, orderBy } from "firebase/firestore";
import { ParkActivity, ActivityType } from "@/lib/types";
import { 
  Construction, 
  Plus, 
  MapPin, 
  Building2, 
  Clock, 
  CheckCircle2, 
  CircleDashed,
  Search,
  Filter,
  MoreVertical,
  Edit3,
  Trash2,
  ExternalLink,
  Hammer,
  HardHat,
  Database,
  Layers,
  MessageSquare,
  History
} from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function ProjectsPage() {
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
        console.error("Projects fetch error:", err);
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
    type: "Project",
    linkedAssetId: "",
    linkedAssetCategory: ""
  });

  // Query for all projects
  const projectsQuery = useMemoFirebase(() => 
    (db && effectiveOrgId) ? query(
      collection(db, "park_activities"), 
      where("orgId", "==", effectiveOrgId),
      where("type", "==", "Project"),
      orderBy("startDate", "desc")
    ) : null, 
  [db, effectiveOrgId]);

  const { data: projects = [], loading: projectsLoading } = useCollection<ParkActivity>(projectsQuery as any);

  const filteredProjects = useMemo(() => {
    return projects.filter(e => {
      const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           e.parkId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || e.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchTerm, statusFilter]);

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
        type: "Project" as ActivityType,
        updatedAt: new Date().toISOString(),
        // Clear conflicting link types
        linkedAssetId: form.linkedAssetId === 'none' ? "" : form.linkedAssetId,
        linkedAssetCategory: form.linkedAssetCategory === 'none' ? "" : form.linkedAssetCategory
      };

      if (editingActivity) {
        await updateDoc(doc(db, "park_activities", editingActivity.id), activityData as any);
        toast({ title: "Project Updated", description: "The project has been successfully updated." });
      } else {
        await addDoc(collection(db, "park_activities"), {
          ...activityData,
          createdAt: new Date().toISOString(),
          createdBy: profile?.name || user.email || "Unknown",
        });
        toast({ title: "Project Registered", description: "The new project has been registered." });
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving project:", error);
      toast({ title: "Error", description: "Could not save the project. Please try again.", variant: "destructive" });
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

      toast({ title: "Update Added", description: "The update has been saved to the project timeline." });
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
    if (!db || !confirm("Are you sure you want to delete this project?")) return;
    try {
      await deleteDoc(doc(db, "park_activities", id));
      toast({ title: "Project Deleted" });
    } catch (error) {
      toast({ title: "Error", description: "Could not delete project.", variant: "destructive" });
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
      type: "Project",
      linkedAssetId: "",
      linkedAssetCategory: ""
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
      title="Projects & Capital Works" 
      description="Track park infrastructure projects and coordinate site access."
      actions={
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="font-bold shadow-lg shadow-primary/20 bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Register Project
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-blue-500/5 border-blue-500/10 shadow-none">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                <Construction className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 opacity-70">Active Projects</p>
                <p className="text-2xl font-bold">{projects.filter(p => p.status === 'Confirmed').length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-500/5 border-green-500/10 shadow-none">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
                <HardHat className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-green-600 opacity-70">Confirmed</p>
                <p className="text-2xl font-bold">{projects.filter(e => e.status === 'Confirmed').length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-500/5 border-slate-500/10 shadow-none">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-slate-500/10 flex items-center justify-center text-slate-600">
                <CircleDashed className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 opacity-70">Planning Phase</p>
                <p className="text-2xl font-bold">{projects.filter(e => e.status === 'Draft').length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-red-500/5 border-red-500/10 shadow-none">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-600">
                <Hammer className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-600 opacity-70">Major Works</p>
                <p className="text-2xl font-bold">{projects.filter(e => e.impactLevel === 'High').length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-2xl border shadow-sm">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search projects..." 
              className="pl-10 bg-muted/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4 opacity-50" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Confirmed">Confirmed</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Projects Grid */}
        {projectsLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
             <CircleDashed className="h-10 w-10 animate-spin opacity-20 mb-4" />
             <p className="font-bold uppercase tracking-widest text-[10px]">Loading Registry...</p>
          </div>
        ) : filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map(project => (
              <Card key={project.id} className={cn(
                "group hover:shadow-xl transition-all duration-300 border-2 overflow-hidden",
                project.status === 'Confirmed' ? "border-blue-500/10 hover:border-blue-500/30" : "border-muted hover:border-primary/20"
              )}>
                <CardHeader className="pb-3 bg-muted/5">
                  <div className="flex justify-between items-start">
                    <Badge variant={project.status === 'Confirmed' ? 'default' : 'secondary'} className={cn(
                      "font-bold uppercase text-[9px] px-2",
                      project.status === 'Confirmed' ? "bg-blue-600" : ""
                    )}>
                      {project.status}
                    </Badge>
                    <div className="flex gap-1">
                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEdit(project)}>
                         <Edit3 className="h-3.5 w-3.5" />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={() => handleDelete(project.id)}>
                         <Trash2 className="h-3.5 w-3.5" />
                       </Button>
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-2 line-clamp-1">{project.title}</CardTitle>
                  <CardDescription className="line-clamp-2 text-xs h-8">{project.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Site</p>
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <MapPin className="h-3.5 w-3.5 text-blue-500" />
                        {project.parkId}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Hub</p>
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Building2 className="h-3.5 w-3.5 text-slate-500" />
                        {project.depotId}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-3 bg-muted/20 rounded-xl border">
                    <div className="flex-1">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Start</p>
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <Clock className="h-3 w-3 text-blue-600" />
                        {new Date(project.startDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="flex-1 border-l pl-4">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Estimated End</p>
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {project.endDate ? new Date(project.endDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Ongoing'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {project.linkedAssetId && (
                      <Badge variant="outline" className="text-[8px] uppercase border-blue-200 bg-blue-50 text-blue-700">
                        <Database className="h-2 w-2 mr-1" /> Asset: {allAssets.find(a => a.id === project.linkedAssetId)?.name || 'Unknown'}
                      </Badge>
                    )}
                    {project.linkedAssetCategory && (
                      <Badge variant="outline" className="text-[8px] uppercase border-indigo-200 bg-indigo-50 text-indigo-700">
                        <Layers className="h-2 w-2 mr-1" /> All {project.linkedAssetCategory} Assets
                      </Badge>
                    )}
                  </div>

                    <div className="flex items-center justify-between gap-2 border-t pt-4">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 gap-2 text-[10px] font-bold uppercase text-blue-600 hover:bg-blue-50" 
                        onClick={() => { setSelectedActivityForUpdate(project); setIsUpdateModalOpen(true); }}
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Add Update
                      </Button>
                      <Link href={`/parks?name=${encodeURIComponent(project.parkId)}`} className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 hover:underline hover:text-blue-600">
                        View Park <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground border-2 border-dashed rounded-3xl bg-muted/5">
             <Construction className="h-16 w-16 mb-6 opacity-10" />
             <h3 className="text-xl font-bold">No Projects Registered</h3>
             <p className="text-sm max-w-xs text-center mt-2">Add your first infrastructure or capital works project to coordinate with depot staff.</p>
          </div>
        )}
      </div>

      {/* Register/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingActivity ? 'Update Project' : 'Register New Project'}</DialogTitle>
            <DialogDescription>
              Define the scope and timeline for this project. Confirmed projects will alert the relevant depot team.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs font-bold uppercase tracking-widest opacity-60">Project Title</Label>
              <Input 
                id="title" 
                placeholder="e.g. Playground Resurfacing" 
                value={form.title} 
                onChange={e => setForm({...form, title: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Site Location</Label>
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
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Impacted Depot</Label>
                <div className="flex items-center gap-2 h-10 px-3 rounded-md bg-muted/30 border text-sm font-bold text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  {form.depotId || "Select a Site"}
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
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Estimated End Date</Label>
                <Input 
                  type="date" 
                  value={form.endDate} 
                  onChange={e => setForm({...form, endDate: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Link to Asset (Optional)</Label>
                <Select 
                  value={form.linkedAssetId || "none"} 
                  onValueChange={(v) => setForm({...form, linkedAssetId: v, linkedAssetCategory: ""})}
                >
                  <SelectTrigger className="bg-blue-50/50 border-blue-200">
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
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Link to Category (Optional)</Label>
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
                      <SelectItem key={cat} value={cat}>All {cat} Assets</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Workflow Status</Label>
                <Select value={form.status} onValueChange={(v: any) => setForm({...form, status: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft (Planning)</SelectItem>
                    <SelectItem value="Confirmed">Confirmed (On Site)</SelectItem>
                    <SelectItem value="Archived">Completed / Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Operational Impact</Label>
                <Select value={form.impactLevel} onValueChange={(v: any) => setForm({...form, impactLevel: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low (No closure)</SelectItem>
                    <SelectItem value="Medium">Medium (Partial closure)</SelectItem>
                    <SelectItem value="High">High (Major site works)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-bold uppercase tracking-widest opacity-60">Work Details & Contractor Info</Label>
              <Textarea 
                id="description" 
                placeholder="Scope of works, contact numbers, gate access requirements..." 
                className="min-h-[100px]"
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSubmitting ? "Saving..." : (editingActivity ? "Update Project" : "Register Project")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Update Modal */}
      <Dialog open={isUpdateModalOpen} onOpenChange={(open) => { setIsUpdateModalOpen(open); if (!open) { setUpdateContent(""); setSelectedActivityForUpdate(null); } }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-600" /> Add Project Update
            </DialogTitle>
            <DialogDescription>
              Post a progress update for <span className="font-bold text-foreground">"{selectedActivityForUpdate?.title}"</span>. This will show on the relevant Parks page.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Update Message</Label>
              <Textarea 
                placeholder="e.g. Groundworks 50% complete. Drainage being installed this week." 
                className="min-h-[120px] bg-muted/20 border-none focus-visible:ring-1 focus-visible:ring-blue-600"
                value={updateContent}
                onChange={e => setUpdateContent(e.target.value)}
              />
            </div>
            {selectedActivityForUpdate?.updates && selectedActivityForUpdate.updates.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Project Timeline</Label>
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
            <Button onClick={handleAddUpdate} disabled={isSubmitting || !updateContent.trim()} className="bg-blue-600 hover:bg-blue-700">
              {isSubmitting ? "Posting..." : "Post Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

