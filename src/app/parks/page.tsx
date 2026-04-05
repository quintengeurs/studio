
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
  X
} from "lucide-react";
import { useFirestore, useDoc, useCollection, useUser, useMemoFirebase } from "@/firebase";
import { collection, doc, setDoc, arrayUnion, arrayRemove, query } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { RegistryConfig, ParkDetail, User, Role, MANAGEMENT_ROLES } from "@/lib/types";

export default function ParksPage() {
  const { toast } = useToast();
  const db = useFirestore();

  const registryConfigRef = useMemo(() => db ? doc(db, "settings", "registry") : null, [db]);
  const { data: registryConfig, loading: configLoading } = useDoc<RegistryConfig>(registryConfigRef);

  const parks = useMemo(() => registryConfig?.parks ? [...registryConfig.parks].sort() : [], [registryConfig?.parks]);

  const { user } = useUser();
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [configNewPark, setConfigNewPark] = useState("");
  const [configParks, setConfigParks] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Modal States
  const [selectedParkName, setSelectedParkName] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Firestore Queries
  const usersQuery = useMemoFirebase(() => db ? query(collection(db, "users")) : null, [db]);
  const { data: allUsers = [] } = useCollection<User>(usersQuery);
  const currentUserData = allUsers.find(u => u.email?.toLowerCase() === user?.email?.toLowerCase());
  const isAdmin = currentUserData?.role === 'Admin' || user?.email?.toLowerCase() === 'quinten.geurs@gmail.com';

  const detailsQuery = useMemoFirebase(() => db ? query(collection(db, "parks_details")) : null, [db]);
  const { data: allDetails = [] } = useCollection<ParkDetail>(detailsQuery);

  const selectedParkDetail = useMemo(() => {
    return allDetails.find(d => d.name === selectedParkName) || {
      id: selectedParkName || "",
      name: selectedParkName || "",
      features: []
    } as ParkDetail;
  }, [allDetails, selectedParkName]);

  const [editForm, setEditForm] = useState<Partial<ParkDetail>>({});

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
        <Button
          variant="outline"
          className="font-bold"
          onClick={() => setIsConfigDialogOpen(true)}
          disabled={configLoading || isSubmitting}
        >
          <Settings2 className="mr-2 h-4 w-4" /> Manage Park List
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Registered Parks ({parks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {configLoading ? (
            <div className="text-center py-10 text-muted-foreground">Loading parks...</div>
          ) : parks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {parks.map((park) => (
                <button 
                  key={park} 
                  onClick={() => handleOpenDetail(park)}
                  className="flex items-center gap-3 p-4 bg-background border-2 hover:border-primary/50 hover:bg-muted/30 transition-all rounded-xl text-left group"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Leaf className="h-5 w-5 text-primary"/>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm tracking-tight">{park}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">View Details</span>
                  </div>
                </button>
              ))}
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
          <div className="bg-primary/10 px-8 py-8 relative">
            <div className="flex items-center gap-4 mb-2">
               <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  <Leaf className="h-6 w-6 text-primary-foreground" />
               </div>
               <div>
                  <DialogTitle className="text-2xl font-headline font-bold text-primary">{selectedParkName}</DialogTitle>
                  <p className="text-sm text-primary/60 font-medium tracking-tight">Park Information & Registry Details</p>
                  
                  {/* Diagnostic Debug Info - Only visible for admin troubleshooting */}
                  {(user?.email?.toLowerCase() === 'quinten.geurs@gmail.com' || isAdmin) && (
                    <div className="mt-2 py-1 px-2 bg-black/5 rounded text-[9px] font-mono text-primary/40 flex gap-3">
                      <span>EMAIL: {user?.email}</span>
                      <span>ROLE: {currentUserData?.role || 'NOT FOUND'}</span>
                      <span>PERM: {isAdmin ? 'ADMIN_BYPASS' : 'STANDARD'}</span>
                    </div>
                  )}
               </div>
            </div>
            {isAdmin && !isEditing && (
              <Button 
                variant="secondary" 
                size="sm" 
                className="absolute top-8 right-12 font-bold gap-2 shadow-sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 className="h-3.5 w-3.5" /> Edit Information
              </Button>
            )}
            {isEditing && (
               <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-8 right-12 text-primary"
                onClick={() => setIsEditing(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>

          <div className="p-8 space-y-8 bg-background">
            {isEditing ? (
              <div className="grid gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Head Gardener</Label>
                    <Input 
                      placeholder="Name" 
                      value={editForm.headGardener || ""} 
                      onChange={e => setEditForm({...editForm, headGardener: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Area Manager</Label>
                    <Input 
                      placeholder="Name" 
                      value={editForm.areaManager || ""} 
                      onChange={e => setEditForm({...editForm, areaManager: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Attached Depot</Label>
                    <Input 
                      placeholder="e.g. Millfields Depot" 
                      value={editForm.depot || ""} 
                      onChange={e => setEditForm({...editForm, depot: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Park Officer</Label>
                    <Input 
                      placeholder="Name" 
                      value={editForm.parkOfficer || ""} 
                      onChange={e => setEditForm({...editForm, parkOfficer: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Key Features (comma separated)</Label>
                  <Textarea 
                    placeholder="Playground, Drinking Fountains, Animal Enclosure..." 
                    value={editForm.features?.join(", ") || ""} 
                    onChange={e => setEditForm({...editForm, features: e.target.value.split(",").map(s => s.trim()).filter(Boolean)})} 
                  />
                </div>
                <Button className="w-full font-bold h-12 text-lg" onClick={handleSaveParkDetail} disabled={isSubmitting}>
                  <Save className="mr-2 h-5 w-5" /> {isSubmitting ? "Saving Changes..." : "Save Park Details"}
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
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

                <div className="pt-6 border-t">
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
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
