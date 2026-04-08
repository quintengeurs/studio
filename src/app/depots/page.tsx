"use client";

import { useState, useMemo, useEffect } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Trash2, 
  Building2, 
  User as UserIcon, 
  MapPin, 
  ShieldCheck, 
  Edit3,
  Save,
  X,
  Clock,
  Phone,
  Mail,
  Wifi,
  Lock,
  Truck,
  Wrench,
  Construction,
  Leaf,
  CheckCircle2
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useFirestore, useDoc, useCollection, useUser, useMemoFirebase } from "@/firebase";
import { collection, doc, setDoc, query } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { RegistryConfig, DepotDetail, User, Role, DepotUpdate, ParkDetail } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";

export default function DepotsPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const isMobile = useIsMobile();
  const { user } = useUser();

  const registryConfigRef = useMemo(() => db ? doc(db, "settings", "registry") : null, [db]);
  const { data: registryConfig, loading: configLoading } = useDoc<RegistryConfig>(registryConfigRef as any);

  const depots = useMemo(() => registryConfig?.teams ? [...registryConfig.teams].sort() : [], [registryConfig?.teams]);

  // Firestore Queries
  const usersQuery = useMemoFirebase(() => db ? query(collection(db, "users")) : null, [db]);
  const { data: allUsers = [] } = useCollection<User>(usersQuery as any);
  
  const detailsQuery = useMemoFirebase(() => db ? query(collection(db, "depots_details")) : null, [db]);
  const { data: allDetails = [] } = useCollection<DepotDetail>(detailsQuery as any);

  const parksQuery = useMemoFirebase(() => db ? query(collection(db, "parks_details")) : null, [db]);
  const { data: allParks = [] } = useCollection<ParkDetail>(parksQuery as any);

  const [selectedDepotName, setSelectedDepotName] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Multi-input state for tags
  const [newMachinery, setNewMachinery] = useState("");
  const [newTool, setNewTool] = useState("");
  const [newOvertimeSite, setNewOvertimeSite] = useState("");
  const [newContractedSite, setNewContractedSite] = useState("");

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [currentUpdateType, setCurrentUpdateType] = useState<string>("");
  const [updateForm, setUpdateForm] = useState<Partial<DepotUpdate>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUserData = allUsers.find(u => u.email?.toLowerCase() === user?.email?.toLowerCase());
  const isAdmin = currentUserData?.role === 'Admin' || user?.email?.toLowerCase() === 'quinten.geurs@gmail.com';

  const selectedDepotDetail = useMemo(() => {
    return allDetails.find(d => d.name === selectedDepotName || d.id === selectedDepotName) || {
      id: selectedDepotName || "",
      name: selectedDepotName || "",
      machinery: [],
      tools: [],
      overtimeSites: [],
      contractedSites: []
    } as DepotDetail;
  }, [allDetails, selectedDepotName]);

  const [editForm, setEditForm] = useState<Partial<DepotDetail>>({});

  const depotStaff = useMemo(() => {
    if (!selectedDepotName) return [];
    return allUsers.filter(u => 
      !u.isArchived && (u.depots?.includes(selectedDepotName) || u.depot === selectedDepotName)
    );
  }, [allUsers, selectedDepotName]);

  const linkedParks = useMemo(() => {
    if (!selectedDepotName) return [];
    return allParks.filter(p => p.depot === selectedDepotName);
  }, [allParks, selectedDepotName]);

  const handleOpenDetail = (depotName: string) => {
    setSelectedDepotName(depotName);
    const detail = allDetails.find(d => d.name === depotName) || {
      id: depotName,
      name: depotName,
      machinery: [],
      tools: [],
      overtimeSites: [],
      contractedSites: []
    } as DepotDetail;
    setEditForm(detail);
    setIsEditing(false);
    setIsDetailDialogOpen(true);
    setActiveTab("overview");
  };

  const handleSaveDepotDetail = async () => {
    if (!db || !selectedDepotName || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await setDoc(doc(db, "depots_details", selectedDepotName), {
        ...editForm,
        name: selectedDepotName,
        id: selectedDepotName
      }, { merge: true });
      toast({ title: "Depot Updated", description: `${selectedDepotName} information saved.` });
      setIsEditing(false);
    } catch (e) {
      toast({ title: "Error saving", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenUpdateModal = (type: string, existingUpdate?: DepotUpdate) => {
    setCurrentUpdateType(type);
    if (existingUpdate) {
      setUpdateForm(existingUpdate);
    } else {
      setUpdateForm({ type: type as any, title: "", description: "", attendees: [] });
    }
    setIsUpdateModalOpen(true);
  };

  const handleSaveUpdate = async () => {
    if (!db || !selectedDepotName || !user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      let updatedList = selectedDepotDetail.updates || [];
      if (updateForm.id) {
        updatedList = updatedList.map(u => u.id === updateForm.id ? { ...u, ...updateForm } as DepotUpdate : u);
      } else {
        const newUpdate: DepotUpdate = {
          id: `up_${Date.now()}`,
          type: currentUpdateType as any,
          title: updateForm.title || "Untitled",
          description: updateForm.description || "",
          attendees: updateForm.attendees || [],
          createdAt: new Date().toISOString(),
          createdBy: currentUserData?.name || user.email || "Unknown",
          isArchived: false,
        };
        updatedList = [...updatedList, newUpdate];
      }
      await setDoc(doc(db, "depots_details", selectedDepotName), { 
        updates: updatedList,
        name: selectedDepotName,
        id: selectedDepotName
      }, { merge: true });
      setIsUpdateModalOpen(false);
      toast({ title: "Update Saved" });
    } catch (e) {
      toast({ title: "Error saving task", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderUpdates = (type: string) => {
    const list = (selectedDepotDetail.updates || []).filter(u => u.type === type && !u.isArchived);
    const canEdit = isAdmin && !isMobile;

    return (
      <div className="space-y-4">
        {list.length > 0 ? (
          <div className="grid gap-3">
            {list.map(u => (
              <div key={u.id} className="p-3 sm:p-4 bg-muted/20 border rounded-xl flex flex-col gap-2 relative">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <h4 className="font-bold text-sm tracking-tight">{u.title}</h4>
                    {u.attendees && u.attendees.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {u.attendees.map(attendee => (
                          <Badge key={attendee} variant="outline" className="text-[9px] py-0 px-1.5 bg-primary/5 text-primary border-primary/20">
                            {attendee}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {canEdit && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenUpdateModal(type, u)}>
                      <Edit3 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">{u.description}</p>
                <div className="text-[9px] text-muted-foreground pt-2 border-t mt-2 flex justify-between">
                  <span>{u.createdBy}</span>
                  <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg border italic">No entries for {type}.</div>
        )}
        {canEdit && (
          <Button variant="outline" size="sm" className="w-full font-bold border-dashed border-2 text-primary" onClick={() => handleOpenUpdateModal(type)}>
            <Plus className="mr-2 h-4 w-4" /> Add Record Entry
          </Button>
        )}
      </div>
    );
  };

  const renderStaffByRole = (role: Role) => {
    const staff = depotStaff.filter(s => s.role === role);
    if (staff.length === 0) return null;

    return (
      <div className="space-y-3">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary/60 border-b pb-1">{role}s</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {staff.map(s => (
            <div key={s.id} className="p-3 sm:p-4 bg-background border rounded-xl shadow-sm flex flex-col gap-2 transition-all hover:border-primary/20">
              <div className="flex items-center gap-2 sm:gap-3">
                 <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">
                    {s.name.charAt(0)}
                 </div>
                 <span className="font-bold text-sm">{s.name}</span>
              </div>
              <div className="grid gap-1 mt-1">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Mail className="h-3 w-3" /> {s.email}
                </div>
                {s.phone && (
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Phone className="h-3 w-3" /> {s.phone}
                  </div>
                )}
                {s.radioCallSign && (
                  <div className="flex items-center gap-2 text-[11px] font-bold text-primary italic">
                    <Wifi className="h-3 w-3" /> {s.radioCallSign}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const rolesInOrder: Role[] = [
    'Area Manager', 'Assistant Area Manager', 'Operations Manager', 'Head Gardener', 'Gardener', 'Keeper', 'Litter Picker'
  ];

  return (
    <DashboardShell title="Depot Register" description="Operational information and team management for Hackney depots.">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {depots.map((depot) => {
          const detail = allDetails.find(d => d.name === depot);
          const staffCount = allUsers.filter(u => 
            !u.isArchived && (u.depots?.includes(depot) || u.depot === depot)
          ).length;
          const parkCount = allParks.filter(p => p.depot === depot).length;

          return (
            <button key={depot} onClick={() => handleOpenDetail(depot)} className="p-8 bg-background border-2 hover:border-primary/50 hover:bg-muted/30 transition-all rounded-3xl text-left flex flex-col gap-6 group shadow-sm">
              <div className="flex justify-between items-start">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Building2 className="h-8 w-8 text-primary"/>
                </div>
                <div className="flex flex-col items-end">
                   <Badge variant="secondary" className="font-bold text-[10px] uppercase tracking-widest">{staffCount} Staff</Badge>
                   <span className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-tighter">{parkCount} Linked Parks</span>
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xl font-headline font-bold text-primary tracking-tight truncate">{depot}</span>
                <span className="text-xs text-muted-foreground mt-1 font-medium truncate">{detail?.address || "No address listed"}</span>
              </div>
              <div className="pt-4 mt-auto border-t flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-primary opacity-60">
                <span>View Depot Hub</span>
                <Plus className="h-3 w-3" />
              </div>
            </button>
          );
        })}
      </div>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-primary/10 px-8 py-8 border-b border-primary/10">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                  <Building2 className="h-7 w-7 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-2xl font-headline font-bold text-primary truncate">
                    {selectedDepotName}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-primary/60 font-medium tracking-tight">
                    Depot Operational Hub & Staff Registry
                  </DialogDescription>
                </div>
              </div>
              {!isMobile && isAdmin && (
                <Button variant={isEditing ? "outline" : "secondary"} size="sm" className="font-bold shrink-0" onClick={() => setIsEditing(!isEditing)}>
                  {isEditing ? <X className="h-4 w-4 mr-2" /> : <Edit3 className="h-4 w-4 mr-2" />}
                  {isEditing ? "Cancel" : "Edit Hub"}
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="max-h-[80vh]">
            <div className="p-4 sm:p-8 space-y-8 sm:space-y-12 pb-24">
              {/* 1. Team Staff */}
              <div>
                <h3 className="text-lg font-bold mb-4 font-headline border-b pb-2 flex items-center gap-2">
                  <UserIcon className="h-5 w-5 text-primary" /> 1. Team Staff
                </h3>
                <div className="space-y-8">
                  {rolesInOrder.map(role => renderStaffByRole(role))}
                  {depotStaff.length === 0 && (
                    <div className="py-12 text-center text-muted-foreground italic border-2 border-dashed rounded-3xl">No staff currently assigned to this depot.</div>
                  )}
                </div>
              </div>

              {/* 2. Upcoming Training and Courses */}
              <div>
                <h3 className="text-lg font-bold mb-4 font-headline border-b pb-2 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" /> 2. Upcoming Training and Courses
                </h3>
                {renderUpdates('Training')}
              </div>

              {/* 3. Equipment and Machinery */}
              <div>
                <h3 className="text-lg font-bold mb-4 font-headline border-b pb-2 flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" /> 3. Equipment and Machinery
                </h3>
                {selectedDepotDetail.machinery && selectedDepotDetail.machinery.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedDepotDetail.machinery.map(m => (
                      <Badge key={m} variant="secondary" className="bg-primary/5 text-primary border-primary/10 font-bold text-[10px]">{m}</Badge>
                    ))}
                  </div>
                )}
                {renderUpdates('Machinery')}
              </div>

              {/* 4. Parks Serviced */}
              <div>
                <h3 className="text-lg font-bold mb-4 font-headline border-b pb-2 flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-primary" /> 4. Parks Serviced
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:gap-3">
                  {linkedParks.map(park => (
                    <div key={park.id} className="p-3 sm:p-4 bg-muted/20 border rounded-xl flex items-center justify-between group transition-all hover:bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">
                          <Leaf className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">{park.name}</span>
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Linked Park</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="font-bold text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">Serviced Site</Badge>
                    </div>
                  ))}
                  {linkedParks.length === 0 && (
                    <div className="py-12 text-center text-muted-foreground italic border-2 border-dashed rounded-3xl">No parks currently serviced by this depot.</div>
                  )}
                </div>
              </div>

              {/* 5. Contracted and Overtime Sites */}
              <div>
                <h3 className="text-lg font-bold mb-4 font-headline border-b pb-2 flex items-center gap-2">
                  <Construction className="h-5 w-5 text-primary" /> 5. Contracted and Overtime Sites
                </h3>
                {(selectedDepotDetail.overtimeSites && selectedDepotDetail.overtimeSites.length > 0 || selectedDepotDetail.contractedSites && selectedDepotDetail.contractedSites.length > 0) && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedDepotDetail.overtimeSites?.map(s => (
                      <Badge key={s} variant="secondary" className="bg-orange-500/5 text-orange-600 border-orange-500/10 font-bold text-[10px]">{s}</Badge>
                    ))}
                    {selectedDepotDetail.contractedSites?.map(s => (
                      <Badge key={s} variant="secondary" className="bg-blue-500/5 text-blue-600 border-blue-500/10 font-bold text-[10px]">{s}</Badge>
                    ))}
                  </div>
                )}
                {renderUpdates('Sites')}
              </div>

              {/* 6. Depot Access & Info */}
              <div>
                <h3 className="text-lg font-bold mb-4 font-headline border-b pb-2 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" /> 6. Depot Access & Info
                </h3>
                
                {isEditing ? (
                  <div className="grid gap-8 bg-muted/20 p-6 rounded-2xl border border-primary/10 shadow-inner">
                    <div className="grid gap-6">
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Depot Address</Label>
                        <Input value={editForm.address || ""} onChange={e => setEditForm({...editForm, address: e.target.value})} placeholder="Full address..." className="bg-background"/>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Office Phone</Label>
                          <Input value={editForm.contactPhone || ""} onChange={e => setEditForm({...editForm, contactPhone: e.target.value})} className="bg-background"/>
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Main Email</Label>
                          <Input value={editForm.contactEmail || ""} onChange={e => setEditForm({...editForm, contactEmail: e.target.value})} className="bg-background"/>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60 flex items-center gap-1.5"><Wifi className="h-3 w-3" /> Wifi Code</Label>
                          <Input value={editForm.wifiCode || ""} onChange={e => setEditForm({...editForm, wifiCode: e.target.value})} className="bg-background font-mono"/>
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60 flex items-center gap-1.5"><Lock className="h-3 w-3" /> Gate Code</Label>
                          <Input value={editForm.gateCode || ""} onChange={e => setEditForm({...editForm, gateCode: e.target.value})} className="bg-background font-mono"/>
                        </div>
                      </div>

                      {/* Inventory Tag Inputs */}
                      <div className="space-y-4 pt-4 border-t">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Inventory Tags (Quick Reference)</Label>
                        
                        {/* Equipment and Machinery Tags */}
                        <div className="grid gap-4 bg-background/50 p-4 rounded-xl border border-dashed">
                           <Label className="text-[9px] font-bold uppercase tracking-widest text-primary">3. Equipment and Machinery</Label>
                           <div className="flex gap-2">
                              <Input value={newMachinery} onChange={e => setNewMachinery(e.target.value)} placeholder="Add Machinery..." className="bg-background" onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  setEditForm({...editForm, machinery: [...(editForm.machinery || []), newMachinery]});
                                  setNewMachinery("");
                                }
                              }}/>
                              <Button variant="outline" size="sm" onClick={() => {
                                if (!newMachinery) return;
                                setEditForm({...editForm, machinery: [...(editForm.machinery || []), newMachinery]});
                                setNewMachinery("");
                              }}><Plus className="h-4 w-4" /></Button>
                           </div>
                           <div className="flex flex-wrap gap-2">
                             {editForm.machinery?.map((item, i) => (
                               <Badge key={i} variant="secondary" className="pl-3 pr-1 py-1 font-bold text-[10px]">
                                 {item} <X className="h-3 w-3 ml-2 cursor-pointer" onClick={() => setEditForm({...editForm, machinery: editForm.machinery?.filter((_, index) => index !== i)})}/>
                               </Badge>
                             ))}
                           </div>
                        </div>

                        {/* Sites Tags */}
                        <div className="grid gap-4 bg-background/50 p-4 rounded-xl border border-dashed">
                           <Label className="text-[9px] font-bold uppercase tracking-widest text-orange-600">5. Contracted and Overtime Sites</Label>
                           <div className="flex gap-2">
                              <Input value={newOvertimeSite} onChange={e => setNewOvertimeSite(e.target.value)} placeholder="Add Site..." className="bg-background" onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  setEditForm({...editForm, overtimeSites: [...(editForm.overtimeSites || []), newOvertimeSite]});
                                  setNewOvertimeSite("");
                                }
                              }}/>
                              <Button variant="outline" size="sm" onClick={() => {
                                if (!newOvertimeSite) return;
                                setEditForm({...editForm, overtimeSites: [...(editForm.overtimeSites || []), newOvertimeSite]});
                                setNewOvertimeSite("");
                              }}><Plus className="h-4 w-4" /></Button>
                           </div>
                           <div className="flex flex-wrap gap-2">
                             {editForm.overtimeSites?.map((item, i) => (
                               <Badge key={i} variant="secondary" className="pl-3 pr-1 py-1 font-bold text-[10px] bg-orange-50 text-orange-600 border-orange-200">
                                 {item} <X className="h-3 w-3 ml-2 cursor-pointer" onClick={() => setEditForm({...editForm, overtimeSites: editForm.overtimeSites?.filter((_, index) => index !== i)})}/>
                               </Badge>
                             ))}
                           </div>
                        </div>
                      </div>
                    </div>
                    <Button className="w-full font-bold h-12" onClick={handleSaveDepotDetail} disabled={isSubmitting}>
                      <Save className="h-4 w-4 mr-2" /> Save Hub Information
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6 sm:gap-y-10 bg-muted/10 p-4 sm:p-8 rounded-2xl border">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-primary" /> Location
                      </span>
                      <span className="font-bold text-sm tracking-tight leading-relaxed">{selectedDepotDetail.address || "No address listed"}</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-primary" /> Phone
                      </span>
                      <span className="font-bold text-sm">{selectedDepotDetail.contactPhone || "None"}</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <Wifi className="h-3 w-3 text-primary" /> WiFi Code
                      </span>
                      <span className="font-bold text-sm font-mono tracking-wider bg-background p-2 rounded border border-primary/10 inline-block w-fit">{selectedDepotDetail.wifiCode || "Not listed"}</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <Lock className="h-3 w-3 text-primary" /> Gate Code
                      </span>
                      <span className="font-bold text-sm font-mono tracking-wider bg-background p-2 rounded border border-primary/10 inline-block w-fit">{selectedDepotDetail.gateCode || "Not listed"}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Add {currentUpdateType} Entry</DialogTitle>
            <DialogDescription>Record team-specific information for the {currentUpdateType.toLowerCase()} registry.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
             <div className="grid gap-2">
                <Label>Entry Title</Label>
                <Input value={updateForm.title} onChange={e => setUpdateForm({...updateForm, title: e.target.value})} placeholder="e.g. H&S Refresher next Tuesday"/>
             </div>
              <div className="grid gap-2">
                 <Label>Details / Instructions</Label>
                 <Input value={updateForm.description} onChange={e => setUpdateForm({...updateForm, description: e.target.value})} />
              </div>

              {currentUpdateType === 'Training' && (
                <div className="grid gap-3 pt-2">
                   <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Team Attendees</Label>
                   <div className="grid grid-cols-2 gap-2 border rounded-xl p-3 bg-muted/5 max-h-[150px] overflow-y-auto">
                      {depotStaff.map(staff => (
                        <div key={staff.id} className="flex items-center space-x-2 group">
                           <Checkbox 
                              id={`staff-${staff.id}`} 
                              checked={(updateForm.attendees || []).includes(staff.name)} 
                              onCheckedChange={(checked) => {
                                 const current = updateForm.attendees || [];
                                 const next = checked ? [...current, staff.name] : current.filter(n => n !== staff.name);
                                 setUpdateForm({...updateForm, attendees: next});
                              }}
                           />
                           <label htmlFor={`staff-${staff.id}`} className="text-xs font-medium cursor-pointer flex-1 truncate">{staff.name}</label>
                        </div>
                      ))}
                      {depotStaff.length === 0 && <span className="text-[10px] text-muted-foreground italic">No staff found for this depot.</span>}
                   </div>
                </div>
              )}
           </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setIsUpdateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveUpdate} disabled={isSubmitting}>Save Entry</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
