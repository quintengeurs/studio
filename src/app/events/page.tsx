
"use client";

import { useState, useMemo } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useUserContext } from "@/context/UserContext";
import { useDataContext } from "@/context/DataContext";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, addDoc, doc, updateDoc, deleteDoc, orderBy } from "firebase/firestore";
import { ParkActivity, ActivityType } from "@/lib/types";
import { 
  Calendar, 
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
  Info,
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

export default function EventsPage() {
  const { toast } = useToast();
  const { effectiveOrgId, profile } = useUserContext();
  const { allParks, loading: parksLoading } = useDataContext();
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

  const [form, setForm] = useState<Partial<ParkActivity>>({
    title: "",
    description: "",
    parkId: "",
    depotId: "",
    startDate: "",
    endDate: "",
    status: "Draft",
    impactLevel: "Medium",
    type: "Event"
  });

  // Query for all events
  const eventsQuery = useMemoFirebase(() => 
    (db && effectiveOrgId) ? query(
      collection(db, "park_activities"), 
      where("orgId", "==", effectiveOrgId),
      where("type", "==", "Event"),
      orderBy("startDate", "desc")
    ) : null, 
  [db, effectiveOrgId]);

  const { data: events = [], loading: eventsLoading } = useCollection<ParkActivity>(eventsQuery as any);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           e.parkId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || e.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [events, searchTerm, statusFilter]);

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
        type: "Event" as ActivityType,
        updatedAt: new Date().toISOString(),
      };

      if (editingActivity) {
        await updateDoc(doc(db, "park_activities", editingActivity.id), activityData as any);
        toast({ title: "Event Updated", description: "The event has been successfully updated." });
      } else {
        await addDoc(collection(db, "park_activities"), {
          ...activityData,
          createdAt: new Date().toISOString(),
          createdBy: profile?.name || user.email || "Unknown",
        });
        toast({ title: "Event Created", description: "The new event has been registered." });
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving event:", error);
      toast({ title: "Error", description: "Could not save the event. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!db || !confirm("Are you sure you want to delete this event?")) return;
    try {
      await deleteDoc(doc(db, "park_activities", id));
      toast({ title: "Event Deleted" });
    } catch (error) {
      toast({ title: "Error", description: "Could not delete event.", variant: "destructive" });
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
      type: "Event"
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
      title="Events Management" 
      description="Manage park events and coordinate with depot teams."
      actions={
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="font-bold shadow-lg shadow-primary/20">
          <Plus className="mr-2 h-4 w-4" /> Register Event
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-primary/5 border-primary/10 shadow-none">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary opacity-70">Total Events</p>
                <p className="text-2xl font-bold">{events.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-500/5 border-green-500/10 shadow-none">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-green-600 opacity-70">Confirmed</p>
                <p className="text-2xl font-bold">{events.filter(e => e.status === 'Confirmed').length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/5 border-amber-500/10 shadow-none">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                <CircleDashed className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 opacity-70">Drafts</p>
                <p className="text-2xl font-bold">{events.filter(e => e.status === 'Draft').length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/5 border-blue-500/10 shadow-none">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 opacity-70">High Impact</p>
                <p className="text-2xl font-bold">{events.filter(e => e.impactLevel === 'High').length}</p>
              </div>
            </CardContent>
          </Card>
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

        {/* Events Grid */}
        {eventsLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
             <CircleDashed className="h-10 w-10 animate-spin opacity-20 mb-4" />
             <p className="font-bold uppercase tracking-widest text-[10px]">Loading Registry...</p>
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map(event => (
              <Card key={event.id} className={cn(
                "group hover:shadow-xl transition-all duration-300 border-2 overflow-hidden",
                event.status === 'Confirmed' ? "border-green-500/10 hover:border-green-500/30" : "border-muted hover:border-primary/20"
              )}>
                <CardHeader className="pb-3 bg-muted/5">
                  <div className="flex justify-between items-start">
                    <Badge variant={event.status === 'Confirmed' ? 'default' : 'secondary'} className={cn(
                      "font-bold uppercase text-[9px] px-2",
                      event.status === 'Confirmed' ? "bg-green-600" : ""
                    )}>
                      {event.status}
                    </Badge>
                    <div className="flex gap-1">
                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEdit(event)}>
                         <Edit3 className="h-3.5 w-3.5" />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={() => handleDelete(event.id)}>
                         <Trash2 className="h-3.5 w-3.5" />
                       </Button>
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-2 line-clamp-1">{event.title}</CardTitle>
                  <CardDescription className="line-clamp-2 text-xs h-8">{event.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Park Location</p>
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        {event.parkId}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Attached Depot</p>
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Building2 className="h-3.5 w-3.5 text-blue-500" />
                        {event.depotId}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-3 bg-muted/20 rounded-xl border">
                    <div className="flex-1">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Start Date</p>
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <Clock className="h-3 w-3 text-primary" />
                        {new Date(event.startDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <div className="flex-1 border-l pl-4">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">End Date</p>
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {event.endDate ? new Date(event.endDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'Same Day'}
                      </div>
                    </div>
                  </div>

                    <div className="flex items-center justify-between gap-2 border-t pt-4">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 gap-2 text-[10px] font-bold uppercase text-primary hover:bg-primary/5" 
                        onClick={() => { setSelectedActivityForUpdate(event); setIsUpdateModalOpen(true); }}
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Add Update
                      </Button>
                      <Link href={`/parks?name=${encodeURIComponent(event.parkId)}`} className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 hover:underline hover:text-primary">
                        View Park <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground border-2 border-dashed rounded-3xl bg-muted/5">
             <Calendar className="h-16 w-16 mb-6 opacity-10" />
             <h3 className="text-xl font-bold">No Events Found</h3>
             <p className="text-sm max-w-xs text-center mt-2">Start by registering your first event using the button in the header.</p>
          </div>
        )}
      </div>

      {/* Register/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingActivity ? 'Update Event' : 'Register New Event'}</DialogTitle>
            <DialogDescription>
              Add event details. Confirmed events will be visible to depot staff and trigger smart tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs font-bold uppercase tracking-widest opacity-60">Event Title</Label>
              <Input 
                id="title" 
                placeholder="e.g. Clissold Summer Festival" 
                value={form.title} 
                onChange={e => setForm({...form, title: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Target Park</Label>
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
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Attached Depot</Label>
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
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">End Date (Optional)</Label>
                <Input 
                  type="date" 
                  value={form.endDate} 
                  onChange={e => setForm({...form, endDate: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Status</Label>
                <Select value={form.status} onValueChange={(v: any) => setForm({...form, status: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft (Internal)</SelectItem>
                    <SelectItem value="Confirmed">Confirmed (Staff Alert)</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Impact Level</Label>
                <Select value={form.impactLevel} onValueChange={(v: any) => setForm({...form, impactLevel: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low Impact</SelectItem>
                    <SelectItem value="Medium">Medium Impact</SelectItem>
                    <SelectItem value="High">High Impact (Alert Depot)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-bold uppercase tracking-widest opacity-60">Description & Special Requirements</Label>
              <Textarea 
                id="description" 
                placeholder="Details for the depot team..." 
                className="min-h-[100px]"
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : (editingActivity ? "Update Event" : "Register Event")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Update Modal */}
      <Dialog open={isUpdateModalOpen} onOpenChange={(open) => { setIsUpdateModalOpen(open); if (!open) { setUpdateContent(""); setSelectedActivityForUpdate(null); } }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" /> Add Activity Update
            </DialogTitle>
            <DialogDescription>
              Post a progress update for <span className="font-bold text-foreground">"{selectedActivityForUpdate?.title}"</span>. This will show on the relevant Parks page.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Update Message</Label>
              <Textarea 
                placeholder="e.g. Stage setup complete. Sound checks starting at 2pm." 
                className="min-h-[120px] bg-muted/20 border-none focus-visible:ring-1 focus-visible:ring-primary"
                value={updateContent}
                onChange={e => setUpdateContent(e.target.value)}
              />
            </div>
            {selectedActivityForUpdate?.updates && selectedActivityForUpdate.updates.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Recent Updates</Label>
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
            <Button onClick={handleAddUpdate} disabled={isSubmitting || !updateContent.trim()}>
              {isSubmitting ? "Posting..." : "Post Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

