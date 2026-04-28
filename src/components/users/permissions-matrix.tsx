import { useState } from "react";
import { User, AccessPermissions } from "@/lib/types";
import { getDefaultPermissionsForUser } from "@/lib/permissions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { doc, updateDoc } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { Filter, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PermissionsMatrixProps {
  users: User[];
}

const PERMISSION_COLUMNS = [
  { key: 'viewDashboard', label: 'View Dashboard', category: 'Pages' },
  { key: 'viewMyTasks', label: 'View My Tasks', category: 'Pages' },
  { key: 'viewAssets', label: 'View Assets', category: 'Pages' },
  { key: 'viewParks', label: 'View Parks', category: 'Pages' },
  { key: 'viewDepots', label: 'View Depots', category: 'Pages' },
  { key: 'viewInspections', label: 'View Inspections', category: 'Pages' },
  { key: 'viewIssues', label: 'View Issues', category: 'Pages' },
  { key: 'viewResolvedIssues', label: 'View Resolved Issues', category: 'Pages' },
  { key: 'viewStaffRequests', label: 'View Staff Requests', category: 'Pages' },
  { key: 'viewAllTasks', label: 'View All Tasks', category: 'Pages' },
  { key: 'viewArchivedTasks', label: 'View Archived Tasks', category: 'Pages' },
  { key: 'viewUsers', label: 'View Users', category: 'Pages' },
  { key: 'viewArchivedStaff', label: 'View Archived Staff', category: 'Pages' },
  
  { key: 'createTask', label: 'Create Tasks', category: 'Functions' },
  { key: 'assignTask', label: 'Assign Tasks', category: 'Functions' },
  { key: 'createIssue', label: 'Create Issues', category: 'Functions' },
  { key: 'scheduleInspection', label: 'Schedule Inspections', category: 'Functions' },
  { key: 'manageAssets', label: 'Manage Assets', category: 'Functions' },
  { key: 'approveResolution', label: 'Approve Resolutions', category: 'Functions' },
  
  { key: 'editParksFull', label: 'Edit Park (Full)', category: 'Granular' },
  { key: 'editParkDevelopment', label: 'Edit Park (Projects/Groups only)', category: 'Granular' },
  { key: 'editDepotsFull', label: 'Edit Depot (Full)', category: 'Granular' },
] as const;

export function PermissionsMatrix({ users }: PermissionsMatrixProps) {
  const db = useFirestore();
  const { toast } = useToast();
  
  // Initialise from saved permissions first; fall back to role-based defaults only if none saved
  const [localPermissions, setLocalPermissions] = useState<Record<string, AccessPermissions>>(
    () => users.reduce((acc, user) => {
      // Use saved custom permissions if they exist, otherwise derive from role
      acc[user.id] = (user.permissions && Object.keys(user.permissions).length > 0)
        ? { ...getDefaultPermissionsForUser(user), ...user.permissions }
        : getDefaultPermissionsForUser(user);
      return acc;
    }, {} as Record<string, AccessPermissions>)
  );
  
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [changedUserIds, setChangedUserIds] = useState<Set<string>>(new Set());

  const togglePermission = (userId: string, key: keyof AccessPermissions, value: boolean) => {
    setLocalPermissions(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [key]: value
      }
    }));
    setHasChanges(true);
    setChangedUserIds(prev => new Set(prev).add(userId));
  };

  const saveAllChanges = async () => {
    if (!db) return;
    setIsSaving(true);
    try {
      // Only save users whose permissions were actually changed
      const usersToSave = users.filter(u => changedUserIds.has(u.id));
      for (const user of usersToSave) {
        const p = localPermissions[user.id];
        if (p) {
          await updateDoc(doc(db, "users", user.id), { permissions: p });
        }
      }
      setHasChanges(false);
      setChangedUserIds(new Set());
      toast({ title: "Permissions Saved", description: `Custom permissions saved for ${usersToSave.length} user(s).` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm text-muted-foreground w-full max-w-2xl">
          Override and customize feature availability per staff member. If a user has no custom permissions saved, the matrix pre-fills with their legacy role defaults.
        </p>
        <Button onClick={saveAllChanges} disabled={!hasChanges || isSaving} className="font-bold">
          <Save className="mr-2 h-4 w-4" /> {isSaving ? "Saving Matrix..." : "Save Custom Matrix"}
        </Button>
      </div>
      
      <div className="w-full overflow-auto rounded-md border bg-card shadow-sm max-h-[70vh]">
        <Table className="relative min-w-max">
          <TableHeader className="bg-muted/50 sticky top-0 z-20 shadow-sm">
            <TableRow>
              <TableHead className="w-[200px] min-w-[200px] sticky left-0 z-30 bg-muted/95 border-r shadow-sm">
                Staff Member
              </TableHead>
              {PERMISSION_COLUMNS.map((col, idx) => (
                <TableHead key={col.key} className={`whitespace-nowrap text-xs text-center border-r font-bold ${col.category === 'Pages' ? 'text-primary' : col.category === 'Functions' ? 'text-yellow-600' : 'text-blue-600'}`}>
                  {col.label}
                  <div className="text-[9px] uppercase tracking-widest mt-1 opacity-50">{col.category}</div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.id} className="hover:bg-muted/30">
                <TableCell className="sticky left-0 z-10 bg-card border-r shadow-sm font-medium">
                  <div className="flex flex-col">
                    <span className="truncate max-w-[180px]">{user.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[180px] uppercase font-bold tracking-widest">{user.role || (user.roles && user.roles[0])}</span>
                  </div>
                </TableCell>
                {PERMISSION_COLUMNS.map(col => {
                  const val = localPermissions[user.id]?.[col.key as keyof AccessPermissions] || false;
                  return (
                    <TableCell key={`${user.id}-${col.key}`} className="text-center border-r">
                      <Checkbox 
                        checked={val} 
                        onCheckedChange={(c) => togglePermission(user.id, col.key as keyof AccessPermissions, !!c)} 
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
