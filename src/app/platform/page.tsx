
"use client";

import { useState, useMemo } from "react";
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
  ChevronRight,
  Search,
  LayoutGrid
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
import { migrateToMultiTenancy } from "@/lib/migration";

export default function PlatformAdmin() {
  const { toast } = useToast();
  const db = useFirestore();
  const { isMaster, setImpersonatedOrgId, organization: currentOrg } = useUserContext();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOrgOpen, setIsAddOrgOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  const [newOrgForm, setNewOrgForm] = useState({
    name: "",
    slug: "",
    features: ['dashboard', 'assets', 'parks', 'issues', 'tasks', 'users'] as FeatureKey[]
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
        
        const templateRef = doc(db, "settings", "hackney-council");
        const templateSnap = await getDoc(templateRef);
        if (templateSnap.exists()) {
            await setDoc(doc(db, "settings", orgId), templateSnap.data());
        }

        toast({ title: "Organization Created", description: `${newOrgForm.name} provisioned.` });
        setIsAddOrgOpen(false);
        setNewOrgForm({
            name: "",
            slug: "",
            features: ['dashboard', 'assets', 'parks', 'issues', 'tasks', 'users']
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
      toast({ title: "Feature Updated", description: `${feature} updated for ${org.name}.` });
    } catch (error) {
      toast({ title: "Update Failed", variant: "destructive" });
    }
  };

  const handleRunMigration = async () => {
    if (!db || isMigrating) return;
    setIsMigrating(true);
    try {
      await migrateToMultiTenancy(db);
      toast({ title: "Migration Successful" });
    } catch (error) {
      toast({ title: "Migration Failed", variant: "destructive" });
    } finally {
      setIsMigrating(false);
    }
  };

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
                        <div className="col-span-full py-20 text-center text-muted-foreground animate-pulse">Loading Organizations...</div>
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
                                <Button variant="ghost" size="icon" onClick={() => setImpersonatedOrgId(org.id)} title="View As This Org">
                                    <ChevronRight className="h-5 w-5" />
                                </Button>
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
                                    <div className="text-[10px] text-muted-foreground">
                                        ID: {org.id}
                                    </div>
                                    <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase" onClick={() => setImpersonatedOrgId(org.id)}>
                                        Manage Content
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
                        <Label>Organization Name</Label>
                        <Input value={newOrgForm.name} onChange={e => setNewOrgForm({...newOrgForm, name: e.target.value})} placeholder="Islington Council" />
                    </div>
                    <div className="grid gap-2">
                        <Label>URL Slug</Label>
                        <Input value={newOrgForm.slug} onChange={e => setNewOrgForm({...newOrgForm, slug: e.target.value})} placeholder="islington-council" />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[10px] font-bold uppercase tracking-widest">Initial Features</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {(['dashboard', 'assets', 'parks', 'depots', 'inspections', 'issues', 'requests', 'tasks', 'users', 'volunteering', 'smart_tasking', 'info_corner', 'map'] as FeatureKey[]).map(feature => (
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
                    <Button onClick={handleCreateOrg} disabled={isSubmitting}>{isSubmitting ? "Provisioning..." : "Create Organization"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </DashboardShell>
  );
}

// Helper icons missing from imports
function X(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
}
