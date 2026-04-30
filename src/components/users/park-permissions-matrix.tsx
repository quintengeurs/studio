"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Save, 
  Shield, 
  Eye, 
  Edit3, 
  Users, 
  ChevronRight, 
  ArrowLeft,
  Search,
  Lock,
  Unlock
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFirestore } from "@/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { 
  Role, 
  ParkPermissionsConfig, 
  PARK_SECTIONS, 
  RoleParkPermissions,
  MANAGEMENT_ROLES,
  OPERATIVE_ROLES
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function ParkPermissionsMatrix() {
  const { toast } = useToast();
  const db = useFirestore();
  const [config, setConfig] = useState<ParkPermissionsConfig | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // All roles including 'Volunteer'
  const allRoles: Role[] = [
    ...MANAGEMENT_ROLES, 
    ...OPERATIVE_ROLES, 
    'Volunteer'
  ].filter((v, i, a) => a.indexOf(v) === i) as Role[];

  const filteredRoles = allRoles.filter(role => 
    role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    async function loadConfig() {
      if (!db) return;
      try {
        const docRef = doc(db, "settings", "park_permissions");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfig(docSnap.data() as ParkPermissionsConfig);
        } else {
          setConfig({ roles: {} });
        }
      } catch (error) {
        console.error("Error loading park permissions:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadConfig();
  }, [db]);

  const togglePermission = (role: Role, sectionKey: string, type: 'view' | 'edit') => {
    if (!config) return;

    const newConfig = { ...config };
    if (!newConfig.roles) newConfig.roles = {};
    if (!newConfig.roles[role]) newConfig.roles[role] = {};
    
    const rolePerms = newConfig.roles[role] as RoleParkPermissions;
    if (!rolePerms[sectionKey]) {
      rolePerms[sectionKey] = { view: false, edit: false };
    }

    const currentVal = rolePerms[sectionKey][type];
    rolePerms[sectionKey][type] = !currentVal;

    // If edit is enabled, view must also be enabled
    if (type === 'edit' && !currentVal === true) {
      rolePerms[sectionKey].view = true;
    }

    setConfig({ ...newConfig });
  };

  const handleSave = async () => {
    if (!db || !config || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await setDoc(doc(db, "settings", "park_permissions"), config);
      toast({ title: "Permissions Saved", description: `Access rules updated successfully.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save permissions.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading permission profiles...</div>;

  if (selectedRole) {
    const rolePerms = config?.roles?.[selectedRole] || {};
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedRole(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h3 className="text-2xl font-bold tracking-tight">{selectedRole} Permissions</h3>
              <p className="text-sm text-muted-foreground">Configure what this account type can see and do in the Parks registry.</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSubmitting} className="font-bold shadow-lg shadow-primary/20">
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? "Saving..." : "Save Config"}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PARK_SECTIONS.map((section) => {
            const perms = rolePerms[section.key] || { view: false, edit: false };
            return (
              <Card key={section.key} className={cn(
                "transition-all border-2",
                perms.view ? "border-primary/20 bg-primary/5" : "border-muted opacity-80"
              )}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="text-[10px] font-bold">SECTION {section.number}</Badge>
                    {perms.edit ? (
                      <Badge className="bg-green-600/10 text-green-600 border-green-600/20 text-[8px] font-bold uppercase">Full Access</Badge>
                    ) : perms.view ? (
                      <Badge variant="secondary" className="text-[8px] font-bold uppercase">Read Only</Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-red-600/10 text-red-600 border-red-600/20 text-[8px] font-bold uppercase">Hidden</Badge>
                    )}
                  </div>
                  <CardTitle className="text-base mt-2">{section.label}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-4 flex flex-col gap-3">
                  <div 
                    className="flex items-center justify-between p-2 rounded-lg bg-background border cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => togglePermission(selectedRole, section.key, 'view')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("p-1.5 rounded-md", perms.view ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                        <Eye className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">Visible to Role</span>
                    </div>
                    <Checkbox checked={perms.view} />
                  </div>

                  <div 
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer",
                      perms.view ? "bg-background hover:bg-muted/50" : "bg-muted/50 opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => perms.view && togglePermission(selectedRole, section.key, 'edit')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("p-1.5 rounded-md", perms.edit ? "bg-amber-100 text-amber-600" : "bg-muted text-muted-foreground")}>
                        <Edit3 className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">Editable by Role</span>
                    </div>
                    <Checkbox checked={perms.edit} disabled={!perms.view} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Park Info Access Control</h3>
          <p className="text-sm text-muted-foreground">Select an account type to manage their specific view and edit rights for park details.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search account types..." 
            className="pl-9 bg-muted/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredRoles.map((role) => {
          const roleConfig = config?.roles?.[role] || {};
          const viewCount = Object.values(roleConfig).filter(p => p.view).length;
          const editCount = Object.values(roleConfig).filter(p => p.edit).length;

          return (
            <Card 
              key={role} 
              className="group cursor-pointer hover:border-primary/50 hover:shadow-md transition-all border-2 relative overflow-hidden"
              onClick={() => setSelectedRole(role)}
            >
              <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="h-5 w-5 text-primary" />
              </div>
              <CardHeader className="pb-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-white transition-colors">
                  <Users className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{role}</CardTitle>
                <CardDescription className="text-xs uppercase font-bold tracking-wider">Account Type</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    <span>{viewCount} Sections Visible</span>
                  </div>
                  <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Edit3 className="h-3 w-3" />
                    <span>{editCount} Editable</span>
                  </div>
                </div>
              </CardContent>
              <div className="h-1.5 w-full bg-muted mt-auto group-hover:bg-primary/20 transition-colors">
                <div 
                  className="h-full bg-primary transition-all duration-1000" 
                  style={{ width: `${(viewCount / PARK_SECTIONS.length) * 100}%` }} 
                />
              </div>
            </Card>
          );
        })}
      </div>

      {filteredRoles.length === 0 && (
        <div className="py-20 text-center border-2 border-dashed rounded-3xl">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No roles matching &quot;{searchTerm}&quot;</p>
        </div>
      )}

      <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 flex gap-4 items-start mt-8">
        <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h4 className="font-bold text-primary mb-1">Role-Based Permission Profiles</h4>
          <p className="text-sm text-primary/70 leading-relaxed max-w-2xl">
            These profiles allow you to standardize what different staff types can access within the Parks registry.
            Changes saved here will apply immediately to all users holding the respective role.
          </p>
        </div>
      </div>
    </div>
  );
}
