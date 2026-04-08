
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
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Trash2, 
  Settings2, 
  Leaf, 
  User as UserIcon, 
  MapPin, 
  ShieldCheck, 
  Construction, 
  Edit3,
  Save,
  X,
  Clock
} from "lucide-react";
import { useFirestore, useDoc, useCollection, useUser, useMemoFirebase } from "@/firebase";
import { collection, doc, setDoc, arrayUnion, arrayRemove, query } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { RegistryConfig, ParkDetail, User, Role, MANAGEMENT_ROLES, ParkUpdate } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";

export default function ParksPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const isMobile = useIsMobile();

  const registryConfigRef = useMemo(() => db ? doc(db, "settings", "registry") : null, [db]);
  const { data: registryConfig, loading: configLoading } = useDoc<RegistryConfig>(registryConfigRef as any);

  const parks = useMemo(() => registryConfig?.parks ? [...registryConfig.parks].sort() : [], [registryConfig?.parks]);

  const { user } = useUser();
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [configNewPark, setConfigNewPark] = useState("");
  const [configParks, setConfigParks] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Firestore Queries
  const usersQuery = useMemoFirebase(() => db ? query(collection(db, "users")) : null, [db]);
  const { data: allUsers = [] } = useCollection<User>(usersQuery as any);
  
  const detailsQuery = useMemoFirebase(() => db ? query(collection(db, "parks_details")) : null, [db]);
  const { data: allDetails = [] } = useCollection<ParkDetail>(detailsQuery as any);

  const [selectedParkName, setSelectedParkName] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newFeature, setNewFeature] = useState("");

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [currentUpdateType, setCurrentUpdateType] = useState<string>("");
  const [updateForm, setUpdateForm] = useState<Partial<ParkUpdate>>({});

  const currentUserData = allUsers.find(u => u.email?.toLowerCase() === user?.email?.toLowerCase());
  const isAdmin = currentUserData?.role === 'Admin' || user?.email?.toLowerCase() === 'quinten.geurs@gmail.com';

  const filteredParks = useMemo(() => {
    if (isAdmin || !currentUserData) return parks;
    
    const userDepots = currentUserData.depots?.length ? currentUserData.depots : (currentUserData.depot ? [currentUserData.depot] : []);
    if (userDepots.length === 0) return parks;

    return parks.filter(parkName => {
      const detail = allDetails.find(d => d.name === parkName);
      if (!detail?.depot) return true; 
      return (userDepots || []).some(ud => ud.trim() === detail.depot?.trim());
    });
  }, [parks, allDetails, currentUserData, isAdmin]);

  const headGardeners = useMemo(() => allUsers.filter(u => u.role === 'Head Gardener'), [allUsers]);
  const areaManagers = useMemo(() => allUsers.filter(u => u.role === 'Area Manager'), [allUsers]);
  const parkOfficers = useMemo(() => allUsers.filter(u => u.role === 'Parks Development Officer'), [allUsers]);
  const teams = useMemo(() => registryConfig?.teams ? [...registryConfig.teams].sort() : [], [registryConfig?.teams]);

  const selectedParkDetail = useMemo(() => {
    return allDetails.find(d => d.name === selectedParkName) || {
      id: selectedParkName || "",
      name: selectedParkName || "",
      features: []
    } as ParkDetail;
  }, [allDetails, selectedParkName]);

  const [editForm, setEditForm] = useState<Partial<ParkDetail>>({});

  const canEditProjects = isAdmin || currentUserData?.role === 'Project Manager' || currentUserData?.role === 'Parks Development Officer';
  const canEditEvents = isAdmin || currentUserData?.role === 'Events Manager' || currentUserData?.role === 'Parks Development Officer';
  const canEditVolunteering = isAdmin || currentUserData?.role === 'Volunteering Coordinator' || currentUserData?.role === 'Parks Development Officer';
  const canEditSports = isAdmin || currentUserData?.role === 'Sports and Leisure Manager' || currentUserData?.role === 'Parks Development Officer';
  const canEditUserGroups = isAdmin || currentUserData?.role === 'User Group Chair' || currentUserData?.role === 'Parks Development Officer';

  const handleOpenUpdateModal = (type: string, existingUpdate?: ParkUpdate) => {
    setCurrentUpdateType(type);
    if (existingUpdate) {
      setUpdateForm(existingUpdate);
    } else {
      setUpdateForm({ type: type as any, title: "", description: "", startDate: "", endDate: "" });
    }
    setIsUpdateModalOpen(true);
  };

  const handleSaveUpdate = async () => {
      if (!db || !selectedParkName || !user || isSubmitting) return;
      setIsSubmitting(true);
      try {
        const parkId = selectedParkName; 
        let updatedList = selectedParkDetail.updates || [];

        if (updateForm.id) {
            updatedList = updatedList.map(u => u.id === updateForm.id ? { ...u, ...updateForm } as ParkUpdate : u);
        } else {
            const newUpdate: ParkUpdate = {
                id: `up_${Date.now()}`,
                type: currentUpdateType as any,
                title: updateForm.title || "Untitled",
                description: updateForm.description || "",
                startDate: updateForm.startDate || "",
                endDate: updateForm.endDate || "",
                createdAt: new Date().toISOString(),
                createdBy: currentUserData?.name || user.email || "Unknown",
                isArchived: false,
            };
            updatedList = [...updatedList, newUpdate];
        }

        await setDoc(doc(db, "parks_details", parkId), { updates: updatedList }, { merge: true });
        toast({ title: "Update Saved", description: `Added entry to ${selectedParkName}.` });
        setIsUpdateModalOpen(false);
      } catch (e) {
        toast({ title: "Error saving entry", description: "Your changes could not be saved.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
  };

  const handleArchiveUpdate = async (updateId: string) => {
      if (!db || !selectedParkName || isSubmitting) return;
      setIsSubmitting(true);
      try {
        const updatedList = (selectedParkDetail.updates || []).map(u => 
          u.id === updateId ? { ...u, isArchived: true } : u
        );
        await setDoc(doc(db, "parks_details", selectedParkName), { updates: updatedList }, { merge: true });
        toast({ title: "Entry Archived" });
      } catch (e) {
        toast({ title: "Error archiving entry", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
  };

  const renderUpdates = (type: string, canEditRaw: boolean) => {
    const canEdit = isMobile ? false : canEditRaw;
    const sectionUpdates = (selectedParkDetail.updates || []).filter(u => u.type === type && !u.isArchived);

    return (
      <div className="space-y-4">
        {sectionUpdates.length > 0 ? (
          <div className="grid gap-3">
            {sectionUpdates.map(u => (
              <div key={u.id} className="p-4 bg-muted/20 border rounded-xl flex flex-col gap-2 relative group">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-sm tracking-tight">{u.title}</h4>
                    {canEdit && (
                       <div className="flex gap-1 transition-opacity">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleOpenUpdateModal(type, u)}>
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleArchiveUpdate(u.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                       </div>
                    )}
                  </div>
                  {(u.startDate || u.endDate) && (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <Clock className="h-3 w-3" /> {u.startDate || '?'} {u.endDate ? `- ${u.endDate}` : ''}
                    </div>
                  )}
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap mt-1">{u.description}</p>
                  <div className="text-[9px] text-muted-foreground flex justify-between mt-2 pt-2 border-t">
                     <span>Added by {u.createdBy}</span>
                     <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                  </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm whitespace-pre-wrap text-muted-foreground bg-muted/30 p-4 rounded-lg border italic">No active entries found.</div>
        )}
        
        {canEdit && (
          <Button variant="outline" size="sm" className="w-full font-bold border-dashed mt-2 border-2 text-primary" onClick={() => handleOpenUpdateModal(type)}>
            <Plus className="mr-2 h-4 w-4" /> Add Entry to {type}
          </Button>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (isConfigDialogOpen) {
      setConfigParks(parks);
    }
  }, [isConfigDialogOpen, parks]);

  const handleUpdateRegistry = async (field: 'parks', value: string, operation: 'add' | 'remove') => {
    if (!db || isSubmitting) return;

    setIsSubmitting(true);
    const originalParks = [...configParks];

    if (operation === 'add') {
      setConfigParks(current => [...current, value].sort());
      setConfigNewPark("");
    } else {
      setConfigParks(current => current.filter(p => p !== value));
    }

    const registryRef = doc(db, "settings", "registry");
    const updatePayload = {
      [field]: operation === 'add' ? arrayUnion(value) : arrayRemove(value)
    };

    try {
      await setDoc(registryRef, updatePayload, { merge: true });
    } catch (e) {
      toast({ title: "Error updating parks", description: "Your change could not be saved. Please try again.", variant: "destructive" });
      setConfigParks(originalParks);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'settings/registry',
          operation: 'update',
          requestResourceData: updatePayload,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetail = (parkName: string) => {
    setSelectedParkName(parkName);
    const detail = allDetails.find(d => d.name === parkName) || {
      id: parkName,
      name: parkName,
      features: []
    } as ParkDetail;
    setEditForm(detail);
    setIsEditing(false);
    setIsDetailDialogOpen(true);
  };

  const handleDepotChange = (depotValue: string) => {
    const isUnassigned = depotValue === "unassigned";
    const selectedDepot = isUnassigned ? "" : depotValue;
    
    // Find management for this depot
    // Note: If multiple exist, we take the first match as a primary suggestion
    const hg = allUsers.find(u => !u.isArchived && u.role === 'Head Gardener' && ((u.depots || []).some(d => d.trim() === selectedDepot.trim()) || u.depot?.trim() === selectedDepot.trim()));
    const am = allUsers.find(u => !u.isArchived && u.role === 'Area Manager' && ((u.depots || []).some(d => d.trim() === selectedDepot.trim()) || u.depot?.trim() === selectedDepot.trim()));
    const po = allUsers.find(u => !u.isArchived && u.role === 'Parks Development Officer' && ((u.depots || []).some(d => d.trim() === selectedDepot.trim()) || u.depot?.trim() === selectedDepot.trim()));
    
    setEditForm(prev => ({
        ...prev,
        depot: selectedDepot,
        headGardener: hg?.name || prev.headGardener,
        areaManager: am?.name || prev.areaManager,
        parkOfficer: po?.name || prev.parkOfficer
    }));

    if (selectedDepot) {
        toast({ 
            title: "Management Suggested", 
            description: `Auto-populated staff based on ${selectedDepot} assignments.` 
        });
    }
  };

  const handleSaveParkDetail = async () => {
    if (!db || !selectedParkName || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const parkId = selectedParkName; // Using name as ID for consistency
      await setDoc(doc(db, "parks_details", parkId), {
        ...editForm,
        name: selectedParkName,
        id: parkId
      }, { merge: true });

      toast({ title: "Park Updated", description: `${selectedParkName} information has been saved successfully.` });
      setIsEditing(false);
    } catch (e) {
      toast({ title: "Error saving details", description: "Your changes could not be saved.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardShell
      title="Park Management"
      description="View and manage the list of registered parks."
      actions={
        !isMobile && (
          <Button
            variant="outline"
            className="font-bold"
            onClick={() => setIsConfigDialogOpen(true)}
            disabled={configLoading || isSubmitting}
          >
            <Settings2 className="mr-2 h-4 w-4" /> Manage Park List
          </Button>
        )
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Registered Parks ({filteredParks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {configLoading ? (
            <div className="text-center py-10 text-muted-foreground">Loading parks...</div>
          ) : filteredParks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredParks.map((park) => {
                const detail = allDetails.find(d => d.name === park);
                return (
                  <button 
                    key={park} 
                    onClick={() => handleOpenDetail(park)}
                    className="flex items-center gap-3 p-4 bg-background border-2 hover:border-primary/50 hover:bg-muted/30 transition-all rounded-xl text-left group"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Leaf className="h-5 w-5 text-primary"/>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-sm tracking-tight flex items-center gap-2 truncate">
                        <span className="truncate">{park}</span>
                        {detail?.greenflag && <Leaf className="h-4 w-4 text-green-600 fill-green-600 flex-shrink-0" />}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">View Details</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
              <p className="font-bold">No parks found</p>
              <p className="text-sm">Click &apos;Manage Park List&apos; to add the first park.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Manage Parks</DialogTitle>
            <DialogDescription>Add or remove parks from the central registry.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                value={configNewPark}
                onChange={(e) => setConfigNewPark(e.target.value)}
                placeholder="New Park Name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && configNewPark && !configParks.includes(configNewPark)) {
                    handleUpdateRegistry('parks', configNewPark, 'add');
                  }
                }}
              />
              <Button
                disabled={isSubmitting || !configNewPark || configParks.includes(configNewPark)}
                onClick={() => {
                  if (configNewPark && !configParks.includes(configNewPark)) {
                    handleUpdateRegistry('parks', configNewPark, 'add');
                  }
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="h-[300px] border rounded-md p-2">
              {configParks.map((park) => (
                <div key={park} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded animate-in fade-in-50">
                  <span className="text-sm">{park}</span>
                  <Button
                    disabled={isSubmitting}
                    variant="ghost"
                    size="icon"
                    onClick={() => handleUpdateRegistry('parks', park, 'remove')}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {configParks.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground p-4">No parks configured.</div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail & Edit Modal */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-primary/10 px-8 py-8 border-b border-primary/10">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                  <Leaf className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-2xl font-headline font-bold text-primary flex items-center gap-2 truncate">
                    <span className="truncate">{selectedParkName}</span>
                    {selectedParkDetail?.greenflag && <Leaf className="h-6 w-6 text-green-600 fill-green-600 shrink-0" />}
                  </DialogTitle>
                  <p className="text-sm text-primary/60 font-medium tracking-tight">Park Information & Registry Details</p>
                  
                  {/* Diagnostic Debug Info - Only visible for admin troubleshooting */}
                  {(user?.email?.toLowerCase() === 'quinten.geurs@gmail.com' || isAdmin) && (
                    <div className="mt-2 py-1 px-2 bg-black/5 rounded text-[9px] font-mono text-primary/40 flex gap-3 w-fit">
                      <span>ROLE: {currentUserData?.role || 'NOT FOUND'}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {isAdmin && !isEditing && !isMobile && (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="font-bold gap-2 shadow-sm whitespace-nowrap"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit
                  </Button>
                )}
                {isEditing && (
                  <Button 
                    variant="outline" 
                    className="font-bold border-primary/20 text-primary hover:bg-primary/10"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                  >
                    <X className="mr-2 h-4 w-4" /> Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>

          <ScrollArea className="max-h-[75vh]">
            <div className="p-8 space-y-8 bg-background">
              {isEditing ? (
                <div className="grid gap-8">
                  {/* 1. Key Information */}
                  <div>
                    <h3 className="text-lg font-bold mb-4 font-headline border-b pb-2">1. Key Information</h3>
                    <div className="grid gap-6">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Head Gardener</Label>
                          <Select value={editForm.headGardener || "unassigned"} onValueChange={v => setEditForm({...editForm, headGardener: v === "unassigned" ? "" : v})}>
                            <SelectTrigger className="font-medium"><SelectValue placeholder="Select Head Gardener" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Not Assigned</SelectItem>
                              {headGardeners.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                              {(!headGardeners.some(u => u.name === editForm.headGardener) && editForm.headGardener) && (
                                  <SelectItem value={editForm.headGardener}>{editForm.headGardener}</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Area Manager</Label>
                          <Select value={editForm.areaManager || "unassigned"} onValueChange={v => setEditForm({...editForm, areaManager: v === "unassigned" ? "" : v})}>
                            <SelectTrigger className="font-medium"><SelectValue placeholder="Select Area Manager" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Not Assigned</SelectItem>
                              {areaManagers.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                              {(!areaManagers.some(u => u.name === editForm.areaManager) && editForm.areaManager) && (
                                  <SelectItem value={editForm.areaManager}>{editForm.areaManager}</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Attached Depot</Label>
                          <Select value={editForm.depot || "unassigned"} onValueChange={handleDepotChange}>
                            <SelectTrigger><SelectValue placeholder="Select Depot" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Not Assigned</SelectItem>
                              {teams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                              {(!teams.includes(editForm.depot || "") && editForm.depot) && (
                                  <SelectItem value={editForm.depot}>{editForm.depot}</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Park Officer</Label>
                          <Select value={editForm.parkOfficer || "unassigned"} onValueChange={v => setEditForm({...editForm, parkOfficer: v === "unassigned" ? "" : v})}>
                            <SelectTrigger><SelectValue placeholder="Select Park Officer" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Not Assigned</SelectItem>
                              {parkOfficers.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                              {(!parkOfficers.some(u => u.name === editForm.parkOfficer) && editForm.parkOfficer) && (
                                  <SelectItem value={editForm.parkOfficer}>{editForm.parkOfficer}</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 pt-2 pb-2">
                        <Checkbox 
                          id="greenflag" 
                          checked={editForm.greenflag || false} 
                          onCheckedChange={v => setEditForm({...editForm, greenflag: !!v})} 
                        />
                        <label htmlFor="greenflag" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer">
                          Greenflag Status <Leaf className="h-4 w-4 text-green-600" />
                        </label>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Key Features & Amenities</Label>
                        <div className="flex gap-2">
                          <Input 
                            placeholder="e.g. Playground" 
                            value={newFeature} 
                            onChange={e => setNewFeature(e.target.value)} 
                            onKeyDown={e => {
                              if (e.key === 'Enter' && newFeature) {
                                e.preventDefault();
                                setEditForm({...editForm, features: [...(editForm.features || []), newFeature]});
                                setNewFeature("");
                              }
                            }}
                          />
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => {
                              if (newFeature) {
                                setEditForm({...editForm, features: [...(editForm.features || []), newFeature]});
                                setNewFeature("");
                              }
                            }}
                            disabled={!newFeature}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                          {editForm.features && editForm.features.length > 0 ? (
                            editForm.features.map((feature, i) => (
                              <Badge key={i} variant="secondary" className="pl-3 pr-1 py-1 font-bold text-[10px] group border-primary/20">
                                {feature}
                                <button 
                                  className="ml-2 h-5 w-5 rounded-full hover:bg-primary/20 flex items-center justify-center transition-colors"
                                  onClick={() => setEditForm({...editForm, features: editForm.features?.filter((_, index) => index !== i)})}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))
                          ) : (
                            <p className="text-[10px] text-muted-foreground italic">No features added yet</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Projects */}
                  <div>
                    <h3 className="text-lg font-bold mb-4 font-headline border-b pb-2">2. Projects</h3>
                    <Textarea 
                      placeholder="Active projects and updates..." 
                      value={editForm.projects || ""} 
                      onChange={e => setEditForm({...editForm, projects: e.target.value})} 
                      className="min-h-[100px]"
                    />
                  </div>

                  {/* 3. Events */}
                  <div>
                    <h3 className="text-lg font-bold mb-4 font-headline border-b pb-2">3. Events</h3>
                    <Textarea 
                      placeholder="Current and future events..." 
                      value={editForm.events || ""} 
                      onChange={e => setEditForm({...editForm, events: e.target.value})} 
                      className="min-h-[100px]"
                    />
                  </div>

                  {/* 4. Operational Guidance */}
                  <div>
                    <h3 className="text-lg font-bold mb-4 font-headline border-b pb-2">4. Operational Guidance</h3>
                    <Textarea 
                      placeholder="Restrictions or particulars (e.g., no leaf blowing before 09.00)..." 
                      value={editForm.operationalGuidance || ""} 
                      onChange={e => setEditForm({...editForm, operationalGuidance: e.target.value})} 
                      className="min-h-[100px]"
                    />
                  </div>

                  {/* 5. Sports and Leisure */}
                  <div>
                    <h3 className="text-lg font-bold mb-4 font-headline border-b pb-2">5. Sports and Leisure</h3>
                    <Textarea 
                      placeholder="Current or future sports or leisure activities..." 
                      value={editForm.sportsAndLeisure || ""} 
                      onChange={e => setEditForm({...editForm, sportsAndLeisure: e.target.value})} 
                      className="min-h-[100px]"
                    />
                  </div>

                  {/* 6. Volunteering */}
                  <div>
                    <h3 className="text-lg font-bold mb-4 font-headline border-b pb-2">6. Volunteering</h3>
                    <Textarea 
                      placeholder="Current or future volunteering activities..." 
                      value={editForm.volunteering || ""} 
                      onChange={e => setEditForm({...editForm, volunteering: e.target.value})} 
                      className="min-h-[100px]"
                    />
                  </div>

                  {/* 7. User Group */}
                  <div>
                    <h3 className="text-lg font-bold mb-4 font-headline border-b pb-2">7. User Group</h3>
                    <div className="grid gap-4">
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Chair of User Group</Label>
                          <Input 
                            placeholder="Name of Chair" 
                            value={editForm.userGroupChair || ""} 
                            onChange={e => setEditForm({...editForm, userGroupChair: e.target.value})} 
                          />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Contact Details & Info</Label>
                          <Textarea 
                            placeholder="Attached user groups contact details..." 
                            value={editForm.userGroup || ""} 
                            onChange={e => setEditForm({...editForm, userGroup: e.target.value})} 
                            className="min-h-[100px]"
                          />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 pb-12">
                    <Button className="w-full font-bold h-12 text-lg" onClick={handleSaveParkDetail} disabled={isSubmitting}>
                      <Save className="mr-2 h-5 w-5" /> {isSubmitting ? "Saving Changes..." : "Save Park Details"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 pb-12">
                  {/* 1. Key Information */}
                  <div>
                    <h3 className="text-lg font-bold mb-4 font-headline border-b pb-2">1. Key Information</h3>
                    <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                          <UserIcon className="h-3 w-3 text-primary" /> Head Gardener
                        </span>
                        <span className="font-bold text-sm">{selectedParkDetail.headGardener || "Not Assigned"}</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                          <ShieldCheck className="h-3 w-3 text-primary" /> Area Manager
                        </span>
                        <span className="font-bold text-sm">{selectedParkDetail.areaManager || "Not Assigned"}</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-primary" /> Depot
                        </span>
                        <span className="font-bold text-sm">{selectedParkDetail.depot || "Not Listed"}</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                          <UserIcon className="h-3 w-3 text-primary" /> Park Officer
                        </span>
                        <span className="font-bold text-sm">{selectedParkDetail.parkOfficer || "Not Assigned"}</span>
                      </div>
                    </div>

                    <div className="pt-6">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-4">
                        <Construction className="h-3 w-3 text-primary" /> Key Features & Amenities
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {selectedParkDetail.features && selectedParkDetail.features.length > 0 ? (
                          selectedParkDetail.features.map((feature, i) => (
                            <Badge key={i} variant="secondary" className="px-3 py-1 bg-primary/5 text-primary border-primary/10 font-bold text-[11px]">
                              {feature}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No features recorded for this park.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. Projects */}
                  <div>
                    <h3 className="text-lg font-bold mb-4 font-headline border-b pb-2 flex items-center gap-2">2. Projects</h3>
                    {selectedParkDetail.projects && <div className="text-sm whitespace-pre-wrap text-muted-foreground bg-muted/10 p-4 rounded-lg border mb-4">{selectedParkDetail.projects}</div>}
                    {renderUpdates('Project', canEditProjects)}
                  </div>

                  {/* 3. Events */}
                  <div>
                    <h3 className="text-lg font-bold mb-4 font-headline border-b pb-2 flex items-center gap-2">3. Events</h3>
                    {selectedParkDetail.events && <div className="text-sm whitespace-pre-wrap text-muted-foreground bg-muted/10 p-4 rounded-lg border mb-4">{selectedParkDetail.events}</div>}
                    {renderUpdates('Event', canEditEvents)}
                  </div>

                  {/* 4. Operational Guidance */}
                  <div>
                    <h3 className="text-lg font-bold mb-4 font-headline border-b pb-2 flex items-center gap-2">4. Operational Guidance</h3>
                    <div className="text-sm whitespace-pre-wrap text-muted-foreground bg-muted/30 p-4 rounded-lg border">
                      {selectedParkDetail.operationalGuidance || "No operational guidance listed."}
                    </div>
                  </div>

                  {/* 5. Sports and Leisure */}
                  <div>
                    <h3 className="text-lg font-bold mb-4 font-headline border-b pb-2 flex items-center gap-2">5. Sports and Leisure</h3>
                    {selectedParkDetail.sportsAndLeisure && <div className="text-sm whitespace-pre-wrap text-muted-foreground bg-muted/10 p-4 rounded-lg border mb-4">{selectedParkDetail.sportsAndLeisure}</div>}
                    {renderUpdates('Sports', canEditSports)}
                  </div>

                  {/* 6. Volunteering */}
                  <div>
                    <h3 className="text-lg font-bold mb-4 font-headline border-b pb-2 flex items-center gap-2">6. Volunteering</h3>
                    {selectedParkDetail.volunteering && <div className="text-sm whitespace-pre-wrap text-muted-foreground bg-muted/10 p-4 rounded-lg border mb-4">{selectedParkDetail.volunteering}</div>}
                    {renderUpdates('Volunteering', canEditVolunteering)}
                  </div>

                  {/* 7. User Group */}
                  <div>
                    <h3 className="text-lg font-bold mb-4 font-headline border-b pb-2 flex items-center gap-2">7. User Group</h3>
                    <div className="grid gap-4 mb-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-1">Chair</span>
                        <span className="font-bold text-sm bg-muted/30 p-3 rounded-lg border block">{selectedParkDetail.userGroupChair || "Not Assigned"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-1">Contact Details & Info</span>
                        <div className="text-sm whitespace-pre-wrap text-muted-foreground bg-muted/30 p-4 rounded-lg border">{selectedParkDetail.userGroup || "No contact info listed."}</div>
                      </div>
                    </div>
                    {renderUpdates('UserGroup', canEditUserGroups)}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Update Modal */}
      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>
               {updateForm.id ? `Edit ${currentUpdateType} Entry` : `Add ${currentUpdateType} Entry`}
            </DialogTitle>
            <DialogDescription>
               Add details about this {currentUpdateType.toLowerCase()} entry to {selectedParkName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input 
                value={updateForm.title || ""} 
                onChange={e => setUpdateForm({...updateForm, title: e.target.value})} 
                placeholder="Entry title (e.g., Summer Festival 2026)" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                 <Label>Start Date/Time</Label>
                 <Input 
                    placeholder="e.g. 1st June, 9am"
                    value={updateForm.startDate || ""}
                    onChange={e => setUpdateForm({...updateForm, startDate: e.target.value})}
                 />
              </div>
              <div className="space-y-2">
                 <Label>End Date/Time</Label>
                 <Input 
                    placeholder="e.g. 3rd June, 6pm"
                    value={updateForm.endDate || ""}
                    onChange={e => setUpdateForm({...updateForm, endDate: e.target.value})}
                 />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Details / Description</Label>
              <Textarea 
                value={updateForm.description || ""} 
                onChange={e => setUpdateForm({...updateForm, description: e.target.value})} 
                placeholder="Include all relevant details..." 
                className="min-h-[120px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
             <Button variant="ghost" onClick={() => setIsUpdateModalOpen(false)}>Cancel</Button>
             <Button onClick={handleSaveUpdate} disabled={!updateForm.title || !updateForm.description || isSubmitting}>
               {isSubmitting ? "Saving..." : "Save Entry"}
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
