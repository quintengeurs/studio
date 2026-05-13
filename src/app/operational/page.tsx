
"use client";

import { useState, useMemo } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useUserContext } from "@/context/UserContext";
import { useDataContext } from "@/context/DataContext";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, addDoc, doc, updateDoc, deleteDoc, orderBy } from "firebase/firestore";
import { ParkActivity, ActivityType } from "@/lib/types";
import { 
  Wrench, 
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
  Truck,
  Trees,
  Hammer,
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

export default function OperationalPage() {
  const { toast } = useToast();
  const { effectiveOrgId, profile } = useUserContext();
  const { allParks, loading: parksLoading } = useDataContext();
  const { user } = useUser();
  const db = useFirestore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [editingActivity, setEditingActivity] = useState<ParkActivity | null>(null);
  
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedActivityForUpdate, setSelectedActivityForUpdate] = useState<ParkActivity | null>(null);
  const [updateContent, setUpdateContent] = useState("");

  const [form, setForm] = useState<Partial<ParkActivity>>({
    title: "",
    description: "",
    parkId: "",
    depotId: "",
    startDate: "",
    endDate: "",
    status: "Confirmed",
    impactLevel: "Medium",
    type: "Operational"
  });

  const operationalTypes: ActivityType[] = ['Operational', 'ContractorWorks', 'TreeWorks', 'Maintenance'];

  // Query for operational activities
  const opQuery = useMemoFirebase(() => 
    (db && effectiveOrgId) ? query(
      collection(db, "park_activities"), 
      where("orgId", "==", effectiveOrgId),
      where("type", "in", operationalTypes),
      orderBy("startDate", "desc")
    ) : null, 
  [db, effectiveOrgId]);

  const { data: activities = [], loading: activitiesLoading } = useCollection<ParkActivity>(opQuery as any);

  const filteredActivities = useMemo(() => {
    return activities.filter(e => {
      const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           e.parkId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || e.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [activities, searchTerm, typeFilter]);

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
    if (!form.title || !form.parkId || !form.startDate || !form.type) {
      toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const activityData = {
        ...form,
        orgId: effectiveOrgId,
        updatedAt: new Date().toISOString(),
      };

      if (editingActivity) {
        await updateDoc(doc(db, "park_activities", editingActivity.id), activityData as any);
        toast({ title: "Update Saved" });
      } else {
        await addDoc(collection(db, "park_activities"), {
          ...activityData,
          createdAt: new Date().toISOString(),
          createdBy: profile?.name || user.email || "Unknown",
        });
        toast({ title: "Entry Added" });
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving op update:", error);
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

      toast({ title: "Update Added" });
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
    if (!db || !confirm("Are you sure?")) return;
    try {
      await deleteDoc(doc(db, "park_activities", id));
      toast({ title: "Deleted" });
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
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
      status: "Confirmed",
      impactLevel: "Medium",
      type: "Operational"
    });
    setEditingActivity(null);
  };

  const openEdit = (activity: ParkActivity) => {
    setEditingActivity(activity);
    setForm({ ...activity });
    setIsModalOpen(true);
  };

  const getTypeIcon = (type: ActivityType) => {
    switch(type) {
      case 'TreeWorks': return <Trees className="h-4 w-4" />;
      case 'ContractorWorks': return <Truck className="h-4 w-4" />;
      case 'Maintenance': return <Hammer className="h-4 w-4" />;
      default: return <Wrench className="h-4 w-4" />;
    }
  };

  return (
    <DashboardShell 
      title="Operational Hub" 
      description="Manage maintenance, tree works, and contractor activities."
      actions={
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="font-bold shadow-lg shadow-orange-500/20 bg-orange-600 hover:bg-orange-700">
          <Plus className="mr-2 h-4 w-4" /> Add Op Update
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-orange-500/5 border-orange-500/10 shadow-none">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-600">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600 opacity-70">Total Ops</p>
                <p className="text-2xl font-bold">{activities.length}</p>
              </div>
            </CardContent>
          </Card>
          {operationalTypes.map(type => (
            <Card key={type} className="bg-muted/30 border-muted/50 shadow-none">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-background border flex items-center justify-center text-muted-foreground">
                  {getTypeIcon(type)}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{type.replace(/([A-Z])/g, ' $1').trim()}</p>
                  <p className="text-2xl font-bold">{activities.filter(a => a.type === type).length}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-2xl border shadow-sm">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by title or park..." 
              className="pl-10 bg-muted/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="mr-2 h-4 w-4 opacity-50" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {operationalTypes.map(type => (
                  <SelectItem key={type} value={type}>{type.replace(/([A-Z])/g, ' $1').trim()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grid */}
        {activitiesLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
             <CircleDashed className="h-10 w-10 animate-spin opacity-20 mb-4" />
             <p className="font-bold uppercase tracking-widest text-[10px]">Loading Registry...</p>
          </div>
        ) : filteredActivities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredActivities.map(activity => (
              <Card key={activity.id} className="group hover:shadow-xl transition-all duration-300 border-2 border-muted overflow-hidden">
                <CardHeader className="pb-3 bg-muted/5">
                  <div className="flex justify-between items-start">
                    <Badge variant="secondary" className="font-bold uppercase text-[9px] px-2 flex items-center gap-1.5">
                      {getTypeIcon(activity.type)}
                      {activity.type.replace(/([A-Z])/g, ' $1').trim()}
                    </Badge>
                    <div className="flex gap-1">
                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEdit(activity)}>
                         <Edit3 className="h-3.5 w-3.5" />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={() => handleDelete(activity.id)}>
                         <Trash2 className="h-3.5 w-3.5" />
                       </Button>
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-2 line-clamp-1">{activity.title}</CardTitle>
                  <CardDescription className="line-clamp-2 text-xs h-8">{activity.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-orange-600" />
                      {activity.parkId}
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {activity.depotId}
                    </div>
                  </div>
                  
                  <div className="p-3 bg-muted/20 rounded-xl border text-xs font-bold flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-orange-600" />
                    {new Date(activity.startDate).toLocaleDateString()}
                    {activity.endDate && ` - ${new Date(activity.endDate).toLocaleDateString()}`}
                  </div>

                  {activity.updates && activity.updates.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <History className="h-2.5 w-2.5 text-orange-500" /> Recent Timeline
                      </p>
                      <div className="space-y-2 max-h-[80px] overflow-y-auto pr-2 scrollbar-none">
                        {activity.updates.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 2).map((u, i) => (
                          <div key={i} className="bg-muted/30 p-2 rounded-lg border-l-2 border-orange-500/50">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[9px] font-bold text-orange-700">{u.createdBy}</span>
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
                      className="h-8 gap-2 text-[10px] font-bold uppercase text-orange-600 hover:bg-orange-50" 
                      onClick={() => { setSelectedActivityForUpdate(activity); setIsUpdateModalOpen(true); }}
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Add Update
                    </Button>
                    <Link href={`/parks?name=${encodeURIComponent(activity.parkId)}`} className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 hover:underline hover:text-orange-600">
                      View Park <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground border-2 border-dashed rounded-3xl bg-muted/5">
             <Wrench className="h-16 w-16 mb-6 opacity-10" />
             <h3 className="text-xl font-bold">No Operational Entries</h3>
             <p className="text-sm max-w-xs text-center mt-2">Start documenting maintenance and works across the borough.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingActivity ? 'Update Entry' : 'New Operational Update'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Update Title</Label>
              <Input 
                placeholder="e.g. Tree Felling on West Border" 
                value={form.title} 
                onChange={e => setForm({...form, title: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Category</Label>
                <Select value={form.type} onValueChange={(v: any) => setForm({...form, type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operationalTypes.map(t => (
                      <SelectItem key={t} value={t}>{t.replace(/([A-Z])/g, ' $1').trim()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Impacted Park</Label>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Start Date</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">End Date (Optional)</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Details</Label>
              <Textarea 
                placeholder="Scope of work, machinery required, safety precautions..." 
                className="min-h-[100px]"
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-orange-600 hover:bg-orange-700 text-white">Save Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Modal */}
      <Dialog open={isUpdateModalOpen} onOpenChange={(open) => { setIsUpdateModalOpen(open); if (!open) { setUpdateContent(""); setSelectedActivityForUpdate(null); } }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-orange-600" /> Post Timeline Update
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Update Message</Label>
              <Textarea 
                placeholder="e.g. Work started. Site cordoned off." 
                className="min-h-[120px] bg-muted/20 border-none focus-visible:ring-1 focus-visible:ring-orange-600"
                value={updateContent}
                onChange={e => setUpdateContent(e.target.value)}
              />
            </div>
            {selectedActivityForUpdate?.updates && selectedActivityForUpdate.updates.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">History</Label>
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
            <Button variant="outline" onClick={() => setIsUpdateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddUpdate} className="bg-orange-600 hover:bg-orange-700">Post Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
