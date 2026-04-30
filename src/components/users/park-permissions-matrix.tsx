"use client";

import { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Save, Shield, Eye, Edit3 } from "lucide-react";
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

export function ParkPermissionsMatrix() {
  const { toast } = useToast();
  const db = useFirestore();
  const [config, setConfig] = useState<ParkPermissionsConfig | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // All roles including the new 'Volunteer'
  const allRoles: Role[] = [
    ...MANAGEMENT_ROLES, 
    ...OPERATIVE_ROLES, 
    'Volunteer'
  ].filter((v, i, a) => a.indexOf(v) === i) as Role[];

  useEffect(() => {
    async function loadConfig() {
      if (!db) return;
      try {
        const docRef = doc(db, "settings", "park_permissions");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfig(docSnap.data() as ParkPermissionsConfig);
        } else {
          // Initialize with empty config if not exists
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
      toast({ title: "Permissions Saved", description: "Park section access rules updated." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save permissions.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading permissions...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold">Park Info Section Access</h3>
          <p className="text-sm text-muted-foreground">Control which roles can view or edit specific sections of the Park pages.</p>
        </div>
        <Button onClick={handleSave} disabled={isSubmitting} className="font-bold">
          <Save className="mr-2 h-4 w-4" />
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[200px] font-bold">Account Type / Role</TableHead>
                {PARK_SECTIONS.map((section) => (
                  <TableHead key={section.key} className="text-center min-w-[120px] px-2">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-tight leading-tight">
                        {section.number}. {section.label}
                      </span>
                      <div className="flex gap-4 mt-1">
                        <div className="flex flex-col items-center">
                          <Eye className="h-3 w-3 opacity-50" />
                          <span className="text-[8px] uppercase">View</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <Edit3 className="h-3 w-3 opacity-50" />
                          <span className="text-[8px] uppercase">Edit</span>
                        </div>
                      </div>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {allRoles.map((role) => (
                <TableRow key={role} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-sm border-r">{role}</TableCell>
                  {PARK_SECTIONS.map((section) => {
                    const perms = config?.roles?.[role]?.[section.key] || { view: false, edit: false };
                    return (
                      <TableCell key={section.key} className="text-center p-2">
                        <div className="flex justify-center items-center gap-6">
                          <div className="flex items-center justify-center">
                            <Checkbox 
                              checked={perms.view} 
                              onCheckedChange={() => togglePermission(role, section.key, 'view')}
                              className="h-4 w-4"
                            />
                          </div>
                          <div className="flex items-center justify-center">
                            <Checkbox 
                              checked={perms.edit} 
                              onCheckedChange={() => togglePermission(role, section.key, 'edit')}
                              className="h-4 w-4"
                            />
                          </div>
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex gap-3 items-start mt-4">
        <Shield className="h-5 w-5 text-primary mt-0.5" />
        <div className="text-xs text-primary/80 leading-relaxed">
          <p className="font-bold mb-1">Important Note:</p>
          <p>These settings define global access levels for each account type. If a role does not have &apos;View&apos; permission for a section, it will be hidden entirely from their view. &apos;Edit&apos; permission allows them to modify existing entries and add new ones (where applicable).</p>
        </div>
      </div>
    </div>
  );
}
