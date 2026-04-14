import { useState } from "react";
import { User, AccessPermissions } from "@/lib/types";
import { getDefaultPermissionsForUser } from "@/lib/permissions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
  
  // Local state for optimistic updates and batch saving
  const [localPermissions, setLocalPermissions] = useState<Record<string, AccessPermissions>>(
    () => users.reduce((acc, user) => {
      acc[user.id] = getDefaultPermissionsForUser(user);
      return acc;
    }, {} as Record<string, AccessPermissions>)
  );
  
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const togglePermission = (userId: string, key: keyof AccessPermissions, value: boolean) => {
    setLocalPermissions(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const saveAllChanges = async () => {
    if (!db) return;
    setIsSaving(true);
    try {
      // Loop sequentially since batch has a limit and could be heavy
      for (const user of users) {
        const p = localPermissions[user.id];
        if (p) {
          await updateDoc(doc(db, "users", user.id), { permissions: p });
        }
      }
      setHasChanges(false);
      toast({ title: "Permissions Saved", description: "The active matrix was synced to the cloud successfully." });
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
      
      <ScrollArea className="w-[calc(100vw-300px)] rounded-md border bg-card shadow-sm max-h-[70vh]">
        <Table className="relative">
          <TableHeader className="bg-muted/50 sticky top-0 z-20 shadow-sm border-b">
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
        <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
}
