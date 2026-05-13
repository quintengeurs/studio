
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { 
  Building, 
  Plus, 
  Database, 
  Globe, 
  Zap, 
  Clock, 
  Settings,
  ShieldCheck,
  LayoutGrid,
  Edit2,
  ExternalLink,
  ChevronRight,
  Search,
  X,
  Link,
  Copy,
  CheckCheck
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { useUserContext } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { Organization, FeatureKey } from "@/lib/types";
import { logAction } from "@/lib/audit";
import { migrateToMultiTenancy } from "@/lib/migration";

export default function PlatformAdmin() {
  const { toast } = useToast();
  const db = useFirestore();
  const { isMaster, loading, setImpersonatedOrgId, organization: currentOrg } = useUserContext();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOrgOpen, setIsAddOrgOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editOrgName, setEditOrgName] = useState("");
  const [editOrgSlug, setEditOrgSlug] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Safety cleanup for navigation locks
    document.body.style.pointerEvents = 'auto';
    document.body.style.overflow = 'auto';
  }, []);

  const [newOrgForm, setNewOrgForm] = useState({
    name: "",
    slug: "",
    features: ['dashboard', 'assets', 'parks', 'issues', 'tasks', 'users', 'events', 'projects', 'development', 'operational', 'sports', 'calendar'] as FeatureKey[]
  });

  const orgsQuery = useMemoFirebase(() => 
    (db && isMaster) ? query(collection(db, "organizations"), orderBy("name", "asc")) : null, 
  [db, isMaster]);
  const { data: allOrgs = [], loading: orgsLoading } = useCollection<Organization>(orgsQuery as any);

  const filteredOrgs = useMemo(() => {
    return allOrgs.filter(org => 
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allOrgs, searchTerm]);

  const currentEditingOrg = useMemo(() => {
    if (!editingOrg) return null;
    return allOrgs.find(o => o.id === editingOrg.id) || editingOrg;
  }, [allOrgs, editingOrg]);

  const handleCreateOrg = async () => {
    if (!db || !newOrgForm.name || !newOrgForm.slug || !isMaster) return;
    setIsSubmitting(true);
    try {
        const orgId = newOrgForm.slug.toLowerCase().replace(/\s+/g, '-');
        const orgData: Organization = {
            id: orgId,
            name: newOrgForm.name,
            slug: newOrgForm.slug.toLowerCase(),
            activeFeatures: newOrgForm.features,
            createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, "organizations", orgId), orgData);
        
        // 1. Copy registry config
        const templateRef = doc(db, "settings", "hackney-council");
        const templateSnap = await getDoc(templateRef);
        if (templateSnap.exists()) {
            await setDoc(doc(db, "settings", orgId), templateSnap.data());
        }

        // 2. Copy park permissions
        const permsRef = doc(db, "settings", "hackney-council", "config", "park_permissions");
        const permsSnap = await getDoc(permsRef);
        if (permsSnap.exists()) {
            await setDoc(doc(db, "settings", orgId, "config", "park_permissions"), permsSnap.data());
        }

        toast({ title: "Organisation Created", description: `${newOrgForm.name} provisioned.` });
        setIsAddOrgOpen(false);
        setNewOrgForm({
            name: "",
            slug: "",
            features: ['dashboard', 'assets', 'parks', 'issues', 'tasks', 'users', 'events', 'projects', 'development', 'operational', 'sports', 'calendar']
        });
    } catch (error) {
        toast({ title: "Error", description: "Failed to create organization.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const toggleFeature = async (org: Organization, feature: FeatureKey) => {
    if (!db) return;
    const isEnabled = org.activeFeatures.includes(feature);
    const newFeatures = isEnabled 
      ? org.activeFeatures.filter(f => f !== feature) 
      : [...org.activeFeatures, feature];
      
    try {
      await updateDoc(doc(db, "organizations", org.id), { activeFeatures: newFeatures });
      
      // Update local state for immediate feedback
      setEditingOrg({ ...org, activeFeatures: newFeatures });
      
      // Log this action
      const user = (db as any).auth?.currentUser;
      await logAction(
        db, 
        user?.uid || "system", 
        "System Master", 
        org.id, 
        "TOGGLE_FEATURE", 
        { feature, enabled: !isEnabled }
      );

      toast({ title: "Feature Updated", description: `${feature} updated for ${org.name}.` });
    } catch (error) {
      toast({ title: "Update Failed", variant: "destructive" });
    }
  };

  const handleUpdateOrgDetails = async () => {
    if (!db || !editingOrg || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const updates: any = {};
      if (editOrgName && editOrgName !== editingOrg.name) updates.name = editOrgName;
      if (editOrgSlug && editOrgSlug !== editingOrg.slug) updates.slug = editOrgSlug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, "organizations", editingOrg.id), updates);
        toast({ title: "Organisation Updated", description: "Details saved successfully." });
      }
      setIsEditOpen(false);
    } catch (error) {
      toast({ title: "Update Failed", description: "Could not save org details.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast({ title: "Copied!", description: "URL copied to clipboard." });
  };

  const getBaseUrl = () => {
    if (typeof window !== 'undefined') return window.location.origin;
    return 'https://studio--studio-4537887383-23869.europe-west4.hosted.app';
  };

  const handleRunMigration = async () => {
    if (!db || isMigrating) return;
    setIsMigrating(true);
    try {
      await migrateToMultiTenancy(db);
      toast({ title: "Migration Successful" });
    } catch (error: any) {
      toast({ title: "Migration Failed", description: error.message || "An unknown error occurred.", variant: "destructive" });
    } finally {
      setIsMigrating(false);
    }
  };

  if (loading) {
    return (
        <DashboardShell title="Platform Administration">
            <div className="flex flex-col items-center justify-center h-96">
                <Clock className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 font-bold text-muted-foreground">Authenticating System Master...</p>
            </div>
        </DashboardShell>
    );
  }

  if (!isMaster) {
    return (
        <DashboardShell title="Access Denied">
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <ShieldCheck className="h-12 w-12 text-destructive" />
                <p className="font-bold">This area is restricted to System Master accounts.</p>
            </div>
        </DashboardShell>
    );
  }

  return (
    <DashboardShell 
        title="Platform Administration" 
        description="Global SaaS control and organization provisioning"
        actions={
            <Button onClick={() => setIsAddOrgOpen(true)} className="font-bold shadow-lg shadow-primary/20">
                <Plus className="mr-2 h-4 w-4" /> Provision New Org
            </Button>
        }
    >
        <div className="grid gap-6">
            {/* Platform Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="p-4 border-l-4 border-l-primary">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Active Tenants</p>
                    <p className="text-2xl font-bold font-headline">{allOrgs.length}</p>
                </Card>
                <Card className="p-4 border-l-4 border-l-accent">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Current View</p>
                    <p className="text-sm font-bold truncate text-accent-foreground">{currentOrg?.name || "Global Platform"}</p>
                </Card>
            </div>

            {/* Migration Tool (Hidden in card) */}
            <Card className="p-4 border-dashed bg-muted/30">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Database className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="text-sm font-bold">Migration Utility</p>
                            <p className="text-xs text-muted-foreground">Sync legacy data to organizations</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleRunMigration} disabled={isMigrating}>
                        {isMigrating ? <Clock className="h-3 w-3 animate-spin mr-2" /> : <Zap className="h-3 w-3 mr-2" />}
                        Run Core Migration
                    </Button>
                </div>
            </Card>

            {/* Org List */}
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search organizations by name or slug..." 
                            className="pl-10" 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {currentOrg && (
                        <Button variant="ghost" onClick={() => setImpersonatedOrgId(null)} className="text-xs font-bold uppercase">
                            <X className="h-3 w-3 mr-2" /> Reset View
                        </Button>
                    )}
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {orgsLoading ? (
                        <div className="col-span-full py-20 text-center text-muted-foreground animate-pulse">Loading Organisations...</div>
                    ) : filteredOrgs.length === 0 ? (
                        <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl opacity-50">
                            <Globe className="h-10 w-10 mx-auto mb-4" />
                            <p className="font-bold">No organizations found matching "{searchTerm}"</p>
                        </div>
                    ) : filteredOrgs.map(org => (
                        <Card key={org.id} className={`overflow-hidden border-2 transition-all hover:shadow-md ${currentOrg?.id === org.id ? 'ring-2 ring-primary border-primary' : ''}`}>
                            <div className="p-4 bg-muted/30 border-b flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-primary flex items-center gap-2">
                                        {org.name}
                                        {currentOrg?.id === org.id && <Badge className="text-[8px] h-4">ACTIVE VIEW</Badge>}
                                    </h4>
                                    <code className="text-[10px] text-muted-foreground">{org.slug}</code>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => {
                                        setEditingOrg(org);
                                        setEditOrgName(org.name);
                                        setEditOrgSlug(org.slug);
                                        setIsEditOpen(true);
                                    }} title="Edit Access">
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => {
                                        console.log("Impersonating organization:", org.id);
                                        setImpersonatedOrgId(org.id);
                                        toast({ title: "Switched View", description: `Now viewing as ${org.name}` });
                                        router.push("/");
                                    }} title="View As This Org">
                                        <ChevronRight className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                            <div className="p-4 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Enabled Modules</Label>
                                    <div className="flex flex-wrap gap-1">
                                        {org.activeFeatures.map(f => (
                                            <Badge key={f} variant="secondary" className="text-[9px] h-5 capitalize">{f.replace('_', ' ')}</Badge>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-4 border-t flex justify-between items-center">
                                    <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase bg-primary/5 hover:bg-primary/10 border-primary/20" onClick={() => {
                                        setEditingOrg(org);
                                        setEditOrgName(org.name);
                                        setEditOrgSlug(org.slug);
                                        setIsEditOpen(true);
                                    }}>
                                        Edit Access
                                    </Button>
                                    <Button size="sm" className="h-7 text-[10px] font-bold uppercase" onClick={() => {
                                        console.log("Entering organization:", org.id);
                                        setImpersonatedOrgId(org.id);
                                        toast({ title: "Entering Organisation", description: `Accessing content for ${org.name}` });
                                        router.push("/");
                                    }}>
                                        Manage Content <ExternalLink className="ml-1 h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>

        {/* Create Org Dialog */}
        <Dialog open={isAddOrgOpen} onOpenChange={setIsAddOrgOpen}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5 text-primary" /> Provision New Tenant
                    </DialogTitle>
                    <DialogDescription>Initialize a new organization environment.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <Label>Organisation Name</Label>
                        <Input value={newOrgForm.name} onChange={e => setNewOrgForm({...newOrgForm, name: e.target.value})} placeholder="Islington Council" />
                    </div>
                    <div className="grid gap-2">
                        <Label>URL Slug</Label>
                        <Input value={newOrgForm.slug} onChange={e => setNewOrgForm({...newOrgForm, slug: e.target.value})} placeholder="islington-council" />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[10px] font-bold uppercase tracking-widest">Initial Features</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {(['dashboard', 'assets', 'parks', 'depots', 'inspections', 'issues', 'requests', 'tasks', 'users', 'volunteering', 'smart_tasking', 'info_corner', 'map', 'events', 'projects', 'development', 'operational', 'sports', 'calendar'] as FeatureKey[]).map(feature => (
                                <div key={feature} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/20 text-xs">
                                    <Checkbox 
                                        checked={newOrgForm.features.includes(feature)}
                                        onCheckedChange={(checked) => {
                                            if (checked) setNewOrgForm({...newOrgForm, features: [...newOrgForm.features, feature]});
                                            else setNewOrgForm({...newOrgForm, features: newOrgForm.features.filter(f => f !== feature)});
                                        }}
                                    />
                                    <span className="capitalize">{feature.replace('_', ' ')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsAddOrgOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateOrg} disabled={isSubmitting}>{isSubmitting ? "Provisioning..." : "Create Organisation"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Edit Org Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="sm:max-w-[540px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        <Edit2 className="h-5 w-5 text-primary" /> Edit Organisation: {currentEditingOrg?.name}
                    </DialogTitle>
                    <DialogDescription>Modify feature entitlements, org details, and portal URLs.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6">

                    {/* Org Details */}
                    <div className="space-y-3">
                        <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">Organisation Details</Label>
                        <div className="grid gap-3">
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-bold opacity-60">Display Name</Label>
                                <Input 
                                    value={editOrgName} 
                                    onChange={e => setEditOrgName(e.target.value)} 
                                    placeholder="Organisation Name"
                                    className="h-9"
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-bold opacity-60">URL Slug</Label>
                                <div className="flex items-center gap-2">
                                    <Input 
                                        value={editOrgSlug} 
                                        onChange={e => setEditOrgSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
                                        placeholder="url-slug" 
                                        className="h-9 font-mono text-xs"
                                    />
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-9 shrink-0 font-bold text-[10px] uppercase"
                                        onClick={handleUpdateOrgDetails}
                                        disabled={isSubmitting || (editOrgSlug === currentEditingOrg?.slug && editOrgName === currentEditingOrg?.name)}
                                    >
                                        Save
                                    </Button>
                                </div>
                                <p className="text-[10px] text-muted-foreground">Only lowercase letters, numbers and hyphens. Changing this updates portal links.</p>
                            </div>
                        </div>
                    </div>

                    {/* Portal URLs */}
                    <div className="space-y-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                        <Label className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-1.5"><Link className="h-3.5 w-3.5" /> Portal URLs</Label>
                        <div className="space-y-2">
                            <div className="grid gap-1">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Staff Login</span>
                                <div className="flex items-center gap-2">
                                    <code className="text-[10px] bg-background border rounded px-2 py-1.5 flex-1 truncate font-mono">
                                        {getBaseUrl()}/login?org={editOrgSlug || currentEditingOrg?.slug}
                                    </code>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleCopyUrl(`${getBaseUrl()}/login?org=${editOrgSlug || currentEditingOrg?.slug}`)}>
                                        {isCopied ? <CheckCheck className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
                                        <a href={`${getBaseUrl()}/login?org=${editOrgSlug || currentEditingOrg?.slug}`} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                    </Button>
                                </div>
                            </div>
                            <div className="grid gap-1">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Volunteer Portal</span>
                                <div className="flex items-center gap-2">
                                    <code className="text-[10px] bg-background border rounded px-2 py-1.5 flex-1 truncate font-mono">
                                        {getBaseUrl()}/hub/{editOrgSlug || currentEditingOrg?.slug}
                                    </code>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleCopyUrl(`${getBaseUrl()}/hub/${editOrgSlug || currentEditingOrg?.slug}`)}>
                                        {isCopied ? <CheckCheck className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
                                        <a href={`${getBaseUrl()}/hub/${editOrgSlug || currentEditingOrg?.slug}`} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Feature Entitlements */}
                    <div className="space-y-4">
                        <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">Feature Entitlements</Label>
                        <div className="grid grid-cols-2 gap-3 pb-8">
                            {(['dashboard', 'assets', 'parks', 'depots', 'inspections', 'issues', 'requests', 'tasks', 'users', 'volunteering', 'smart_tasking', 'info_corner', 'map', 'events', 'projects', 'development', 'operational', 'sports', 'calendar'] as FeatureKey[]).map(feature => {
                                const isEnabled = currentEditingOrg?.activeFeatures.includes(feature);
                                return (
                                    <div key={feature} className="flex items-center justify-between p-2 rounded-lg border bg-background text-xs">
                                        <span className="capitalize">{feature.replace('_', ' ')}</span>
                                        <Switch 
                                            checked={isEnabled}
                                            onCheckedChange={() => currentEditingOrg && toggleFeature(currentEditingOrg, feature)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="pt-2 border-t">
                        <Button variant="destructive" className="w-full font-bold" onClick={() => {
                            if (confirm(`Are you sure you want to delete ${currentEditingOrg?.name}? This action is permanent.`)) {
                                toast({ title: "Delete Requested", description: "This feature is coming soon." });
                            }
                        }}>
                            Archive Organisation
                        </Button>
                    </div>
                </div>
                <DialogFooter className="p-6 border-t bg-muted/30">
                    <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdateOrgDetails} disabled={isSubmitting || (editOrgSlug === currentEditingOrg?.slug && editOrgName === currentEditingOrg?.name)} className="font-bold px-8">
                        {isSubmitting ? "Saving..." : "Save Details"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </DashboardShell>
  );
}

