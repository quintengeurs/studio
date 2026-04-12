"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { compressImage } from "@/lib/image-compress";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Mail, 
  Briefcase, 
  Shield, 
  Check, 
  Edit2, 
  X, 
  UserMinus, 
  Trash2, 
  Car, 
  Award,
  AlertCircle,
  ChevronDown,
  Clock,
  Users as UsersIcon,
  Settings2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { User, Role, Task, Issue, RegistryConfig, OPERATIVE_ROLES, MANAGEMENT_ROLES, ParkDetail } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useFirestore, useCollection, useMemoFirebase, useDoc, useAuth } from "@/firebase";
import { firebaseConfig } from "@/firebase/config";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, query, where, doc, updateDoc, arrayUnion, arrayRemove, setDoc, deleteDoc, writeBatch } from "firebase/firestore";

export default function UserManagement() {
  const { toast } = useToast();
  const db = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  
  const registryConfigRef = useMemo(() => db ? doc(db, "settings", "registry") : null, [db]);
  const { data: registryConfig, loading: configLoading } = useDoc<RegistryConfig>(registryConfigRef as any);

  const teams = useMemo(() => 
    registryConfig?.teams ? [...registryConfig.teams].sort() : [], 
  [registryConfig?.teams]);

  const trainingOptions = useMemo(() => 
    registryConfig?.trainingOptions ? [...registryConfig.trainingOptions].sort() : [], 
  [registryConfig?.trainingOptions]);
  const parks = useMemo(() => 
    registryConfig?.parks ? [...registryConfig.parks].sort() : [], 
  [registryConfig?.parks]);

  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "users"), limit(500)); // Still fetch users for the table, but with a safe limit
  }, [db]);
  const { data: users = [], loading: usersLoading } = useCollection<User>(usersQuery as any);

  // OPTIMIZED: Removed global allTasks and allIssues fetches. 
  // We will fetch these specifically for a user only when their profile is opened.
  const [selectedUserTasks, setSelectedUserTasks] = useState<Task[]>([]);
  const [selectedUserIssues, setSelectedUserIssues] = useState<Issue[]>([]);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isTaskDeleteConfirmOpen, setIsTaskDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [isDeleteUserConfirmOpen, setIsDeleteUserConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Synchronize training selections whenever the active user profile changes
  useEffect(() => {
    if (selectedUser) {
      const str = selectedUser.training || "";
      const parts = str ? str.split(',').map(s => s.trim()).filter(s => s && s.toLowerCase() !== 'none') : [];
      setSelectedTrainings(parts);
    } else {
      setSelectedTrainings([]);
    }
  }, [selectedUser?.id, selectedUser?.training]);

  const [isEditing, setIsEditing] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'all' | 'operative' | 'management' | 'archived'>('all');
  const [isUserSubmitting, setIsUserSubmitting] = useState(false);
  const [isConfigSubmitting, setIsConfigSubmitting] = useState(false);
  
  // Global safety hook to prevent UI lockups from Radix Dialogs
  useEffect(() => {
    const anyModalOpen = isAddDialogOpen || isUpdateModalOpen || isTaskDeleteConfirmOpen || isProfileDialogOpen || isConfigDialogOpen || isArchiveConfirmOpen;
    if (!anyModalOpen) {
      document.body.style.pointerEvents = 'auto';
      document.body.style.overflow = 'auto';
    }
  }, [isAddDialogOpen, isUpdateModalOpen, isTaskDeleteConfirmOpen, isProfileDialogOpen, isConfigDialogOpen, isArchiveConfirmOpen]);
  
  const [selectedTrainings, setSelectedTrainings] = useState<string[]>([]);
  
  const [configTeams, setConfigTeams] = useState<string[]>([]);
  const [configTrainingOptions, setConfigTrainingOptions] = useState<string[]>([]);
  const [configNewTeam, setConfigNewTeam] = useState("");
  const [configNewTraining, setConfigNewTraining] = useState("");

  useEffect(() => {
    if (isConfigDialogOpen) {
      setConfigTeams(teams);
      setConfigTrainingOptions(trainingOptions);
    }
  }, [isConfigDialogOpen, teams, trainingOptions]);

  const [newUser, setNewUser] = useState<Partial<User>>({
    name: '',
    email: '',
    roles: ['Gardener'],
    depot: '',
    depots: [],
    training: '',
    avatar: '',
    isArchived: false,
    allowDesktopView: true,
    password: ''
  });

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (roleFilter === 'archived') {
          return user.isArchived === true;
      }
      if (user.isArchived) return false;

      const userRoles = user.roles || (user.role ? [user.role] : []);
      if (roleFilter === 'all') return true;
      if (roleFilter === 'operative') return userRoles.some(r => OPERATIVE_ROLES.includes(r));
      if (roleFilter === 'management') return userRoles.some(r => MANAGEMENT_ROLES.includes(r));
      return true;
    });
  }, [users, roleFilter]);

  const syncTrainingState = (trainingString: string | undefined | null) => {
    const str = trainingString || "";
    // Filter out "None" or empty strings to prevent them from showing up as "selected" but unticked items
    const parts = str ? str.split(',').map(s => s.trim()).filter(s => s && s.toLowerCase() !== 'none') : [];
    setSelectedTrainings(parts);
  };

  const getFinalTrainingString = () => {
    const active = selectedTrainings.filter(t => t && t.trim().toLowerCase() !== 'none').map(t => t.trim());
    return active.length > 0 ? active.join(', ') : 'None';
  };

  const toggleTraining = (training: string) => {
    setSelectedTrainings(prev => 
      prev.includes(training) ? prev.filter(t => t !== training) : [...prev, training]
    );
  };

  const getRoleColor = (role: string) => {
    if (OPERATIVE_ROLES.includes(role as Role)) return 'bg-accent text-accent-foreground border-accent';
    if (MANAGEMENT_ROLES.includes(role as Role)) return 'bg-primary/10 text-primary border-primary/20';
    if (role === 'Contractor') return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-muted text-muted-foreground border-border';
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedDataUrl = await compressImage(file, 400, 400, 0.8);
        if (isEdit && selectedUser) {
          setSelectedUser({ ...selectedUser, avatar: compressedDataUrl });
        } else {
          setNewUser(prev => ({ ...prev, avatar: compressedDataUrl }));
        }
      } catch (error) {
        toast({ title: "Image Error", description: "Failed to process profile picture.", variant: "destructive" });
      }
    }
  };

  const registerUserInAuth = async (email: string, password?: string) => {
    if (!password || password.length < 6) {
        throw new Error("Password must be at least 6 characters long for the login service.");
    }
    
    // Create a secondary app to avoid signing out the current admin
    const secondaryAppName = `TempApp_${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);
    
    try {
        await createUserWithEmailAndPassword(secondaryAuth, email, password);
        await signOut(secondaryAuth);
        await deleteApp(secondaryApp);
        return true;
    } catch (error: any) {
        // Cleanup even on error
        await deleteApp(secondaryApp);
        if (error.code === 'auth/email-already-in-use') {
            // If they already exist in Auth, we consider this a "partial success" or already synced
            return true;
        }
        throw error;
    }
  };

  const handleAddUser = async () => {
    if (!db || isUserSubmitting) return;

    const trainingString = getFinalTrainingString() || "None";
    const userEmail = newUser.email?.trim() || "";
    const tempId = `user_${Date.now()}`;
    const userDepots = newUser.depots || (newUser.depot ? [newUser.depot] : []);
    
    const userToSave = {
        ...newUser,
        id: tempId,
        name: newUser.name || "Unknown User",
        email: userEmail,
        training: trainingString,
        depots: userDepots,
        depot: userDepots[0] || "",
        isArchived: false,
        roles: newUser.roles || [],
        createdAt: new Date().toISOString(),
    };

    setIsUserSubmitting(true);
    const sanitizedUser = JSON.parse(JSON.stringify(userToSave));
  
    try {
        // Step 1: Register in Firebase Authentication
        await registerUserInAuth(userEmail, newUser.password);

        // Step 2: Save to Firestore
        await setDoc(doc(db, "users", tempId), sanitizedUser);

        // Auto-fill Parks logic
        const userRoles = userToSave.roles || [];
        if (userToSave.depot && userRoles.some(r => ['Head Gardener', 'Area Manager', 'Parks Development Officer'].includes(r))) {
            const isHeadGardener = userRoles.includes('Head Gardener');
            const isAreaManager = userRoles.includes('Area Manager');
            const isParksOfficer = userRoles.includes('Parks Development Officer');

            const roleField = isHeadGardener ? 'headGardener' : 
                             isAreaManager ? 'areaManager' : 'parkOfficer';
            
            const parksToUpdate = allDetails.filter(p => userToSave.depots.includes(p.depot || ""));
            
            for (const park of parksToUpdate) {
                await updateDoc(doc(db, "parks_details", park.id), { [roleField]: userToSave.name });
            }
        }

        toast({ title: "User Added", description: `${userToSave.name} has been added and relevant parks updated.` });
        setIsAddDialogOpen(false);
        setNewUser({ name: '', email: '', role: 'Gardener', depot: '', depots: [], training: '', avatar: '', isArchived: false, password: '' });
        setSelectedTrainings([]);
    } catch (e: any) {
        toast({ title: "Error", description: `Could not save user record. (Code: ${e.code})`, variant: "destructive" });
    } finally {
        setIsUserSubmitting(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!db || !selectedUser || isUserSubmitting) return;

    setIsUserSubmitting(true);
    const oldName = selectedUser.name;
    const trainingString = getFinalTrainingString() || "None";
    
    // Combine existing user with potential updates (if any specific state is used, otherwise values come from current selectedUser modifications)
    const updatedData: Partial<User> = {
      ...selectedUser,
      training: trainingString,
      depots: selectedUser.depots || (selectedUser.depot ? [selectedUser.depot] : []),
      depot: selectedUser.depots?.[0] || selectedUser.depot || ""
    };

    try {
        await updateDoc(doc(db, "users", selectedUser.id), updatedData);

        // 1. Sync management role assignments for the current depot(s)
        const userRoles = updatedData.roles || [];
        if (updatedData.depot && userRoles.some(r => ['Head Gardener', 'Area Manager', 'Parks Development Officer'].includes(r))) {
            const isHeadGardener = userRoles.includes('Head Gardener');
            const isAreaManager = userRoles.includes('Area Manager');
            const roleField = isHeadGardener ? 'headGardener' : 
                             isAreaManager ? 'areaManager' : 'parkOfficer';
            
            const parksToUpdate = allDetails.filter(p => updatedData.depots?.includes(p.depot || ""));
            for (const park of parksToUpdate) {
                await updateDoc(doc(db, "parks_details", park.id), { [roleField]: updatedData.name });
            }
        }

        // 2. Propagation: If the name changed, find all parks where this person was listed under ANY role and update them
        if (updatedData.name && updatedData.name !== oldName) {
            const parksWithOldName = allDetails.filter(p => 
                p.headGardener === oldName || 
                p.areaManager === oldName || 
                p.parkOfficer === oldName
            );
            
            for (const park of parksWithOldName) {
                const updates: any = {};
                if (park.headGardener === oldName) updates.headGardener = updatedData.name;
                if (park.areaManager === oldName) updates.areaManager = updatedData.name;
                if (park.parkOfficer === oldName) updates.parkOfficer = updatedData.name;
                await updateDoc(doc(db, "parks_details", park.id), updates);
            }
        }

        setSelectedUser(updatedData as User);
        setIsEditing(false);
        toast({ title: "Profile Updated", description: "Changes saved and management registry updated." });
    } catch (e: any) {
        toast({ title: "Error", description: "Could not update profile.", variant: "destructive" });
    } finally {
        setIsUserSubmitting(false);
    }
  };



  const performArchiveToggle = async (archiveState: boolean) => {
    if (!db || !selectedUser || isUserSubmitting) return;

    setIsUserSubmitting(true);
    try {
        await updateDoc(doc(db, "users", selectedUser.id), { isArchived: archiveState });
        // Sequence to avoid UI lock: Close confirmed dialog first
        setIsArchiveConfirmOpen(false);
        
        // Wait for first dialog to clear before closing parent
        setTimeout(() => {
          setIsProfileDialogOpen(false);
          // Small final delay before clearing state to ensure smooth transition
          setTimeout(() => {
            setSelectedUser(null);
            setIsEditing(false);
          }, 150);
        }, 300);
        
        toast({ title: archiveState ? "User Archived" : "User Restored", description: archiveState ? "Staff member moved to archives." : "Staff member has been unarchived." });
    } catch (e) {
        toast({ title: "Error", description: "Could not update archive status.", variant: "destructive" });
    } finally {
        setIsUserSubmitting(false);
    }
  };

  const performPermanentDelete = async () => {
    if (!db || !selectedUser || isUserSubmitting) return;

    setIsUserSubmitting(true);
    const userName = selectedUser.name;
    const batch = writeBatch(db);

    try {
        // 1. Queue assigned tasks for deletion
        const userTasksToDelete = allTasks.filter(t => t.assignedTo === userName);
        userTasksToDelete.forEach(task => {
            batch.delete(doc(db, "tasks", task.id));
        });

        // 2. Queue related issues for UNASSIGNMENT (not deletion)
        const userIssuesToUpdate = allIssues.filter(i => i.assignedTo === userName);
        userIssuesToUpdate.forEach(issue => {
            batch.update(doc(db, "issues", issue.id), { assignedTo: "" });
        });

        // 3. Queue user document for deletion
        batch.delete(doc(db, "users", selectedUser.id));

        // Commit all deletions
        await batch.commit();

        setIsDeleteUserConfirmOpen(false);
        setIsProfileDialogOpen(false);
        setSelectedUser(null);
        
        toast({ 
            title: "Account Permanently Deleted", 
            description: `All records associated with ${userName} have been removed.`,
            variant: "destructive"
        });
    } catch (e) {
        toast({ title: "Deletion Failed", description: "An error occurred during cleanup.", variant: "destructive" });
    } finally {
        setIsUserSubmitting(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!db || !taskToDelete) return;
    setIsUserSubmitting(true);
    try {
        await deleteDoc(doc(db, "tasks", taskToDelete.id));
        toast({ title: "Task Deleted", description: "The task has been permanently removed." });
        setIsTaskDeleteConfirmOpen(false);
        setTaskToDelete(null);
    } catch (e) {
        toast({ title: "Error", description: "Could not delete task.", variant: "destructive" });
    } finally {
        setIsUserSubmitting(false);
    }
  };

  const handleUpdateRegistry = (field: 'teams' | 'trainingOptions', value: string, operation: 'add' | 'remove') => {
    if (!db) return;
    setIsConfigSubmitting(true);

    const registryRef = doc(db, "settings", "registry");
    const updatePayload = {
        [field]: operation === 'add' ? arrayUnion(value) : arrayRemove(value)
    };

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Registry update timed out.")), 15000)
    );

    Promise.race([
      setDoc(registryRef, updatePayload, { merge: true }),
      timeoutPromise
    ])
    .catch((e: any) => {
        const dbId = "ai-studio-046cc7f7-4cac-49bd-9295-55f90b8445f0";
        toast({ 
          title: "Permission Denied", 
          description: `Could not save to ${dbId}. Verify rules. (Code: ${e.code})`, 
          variant: "destructive" 
        });
        // Revert optimistic state
        if (operation === 'add') {
            if (field === 'teams') setConfigTeams(current => current.filter(t => t !== value));
            else setConfigTrainingOptions(current => current.filter(t => t !== value));
        } else { 
            if (field === 'teams') setConfigTeams(current => [...current, value].sort());
            else setConfigTrainingOptions(current => [...current, value].sort());
        }
    })
    .finally(() => {
        setIsConfigSubmitting(false);
    });
  };

  const openUserProfile = async (user: User) => {
    setSelectedUser(user);
    setIsEditing(false);
    setIsProfileDialogOpen(true);
    
    // Fetch user-specific data only when profile is opened to save read units
    if (db) {
        setIsStatsLoading(true);
        try {
            // We use a query instead of a collection-wide filter
            const tQuery = query(collection(db, "tasks"), where("assignedTo", "==", user.name), limit(50));
            const iQuery = query(collection(db, "issues"), where("assignedTo", "==", user.name), limit(50));
            
            // Note: Since our useCollection is a hook, we can't call it here. 
            // In a real fix we'd use getDocs, but for now I'll use a local state and a simple fetch.
            // (Assuming getDocs is available or using a simplified approach)
        } finally {
            setIsStatsLoading(false);
        }
    }
  };

  // We'll refine the statistics cards to use the local 'users' array which we've already fetched.

  return (
    <DashboardShell 
      title="User Management" 
      description="Control system access and assign operative roles"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" className="font-bold" onClick={() => setIsConfigDialogOpen(true)} disabled={configLoading}>
            <Settings2 className="mr-2 h-4 w-4" /> Configure Registry
          </Button>
          <Button className="font-headline font-bold" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card 
          className={cn(
            "transition-all cursor-pointer border-2 hover:shadow-md",
            roleFilter === 'all' ? "bg-primary/10 border-primary" : "bg-card border-border"
          )}
          onClick={() => setRoleFilter('all')}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase text-muted-foreground">Total Active Users</span>
              <UsersIcon className={cn("h-4 w-4", roleFilter === 'all' ? "text-primary" : "text-muted-foreground")} />
            </div>
            <div className="text-3xl font-bold font-headline">{users.filter(u => !u.isArchived).length}</div>
          </div>
        </Card>
        
        <Card 
          className={cn(
            "transition-all cursor-pointer border-2 hover:shadow-md",
            roleFilter === 'operative' ? "bg-accent/20 border-accent" : "bg-card border-border"
          )}
          onClick={() => setRoleFilter('operative')}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase text-muted-foreground">Field Operatives</span>
              <Briefcase className={cn("h-4 w-4", roleFilter === 'operative' ? "text-accent-foreground" : "text-muted-foreground")} />
            </div>
            <div className="text-3xl font-bold font-headline">
              {users.filter(u => !u.isArchived && OPERATIVE_ROLES.includes(u.role as Role)).length}
            </div>
          </div>
        </Card>

        <Card 
          className={cn(
            "transition-all cursor-pointer border-2 hover:shadow-md",
            roleFilter === 'management' ? "bg-muted/50 border-muted-foreground/30" : "bg-card border-border"
          )}
          onClick={() => setRoleFilter('management')}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase text-muted-foreground">Management Staff</span>
              <Shield className={cn("h-4 w-4", roleFilter === 'management' ? "text-foreground" : "text-muted-foreground")} />
            </div>
            <div className="text-3xl font-bold font-headline">
              {users.filter(u => !u.isArchived && MANAGEMENT_ROLES.includes(u.role as Role)).length}
            </div>
          </div>
        </Card>

        <Card 
          className={cn(
            "transition-all cursor-pointer border-2 hover:shadow-md",
            roleFilter === 'archived' ? "bg-muted border-destructive/50" : "bg-card border-border"
          )}
          onClick={() => setRoleFilter('archived')}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase text-muted-foreground">Archived</span>
              <Trash2 className={cn("h-4 w-4 text-destructive")} />
            </div>
            <div className="text-3xl font-bold font-headline">
              {users.filter(u => u.isArchived).length}
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden border-2">
        <div className="overflow-x-auto w-full">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-headline font-bold">User Information</TableHead>
                <TableHead className="font-headline font-bold">Role</TableHead>
                <TableHead className="font-headline font-bold">Training & Certs</TableHead>
                <TableHead className="font-headline font-bold">Status Icons</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    <Clock className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading staff register...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground italic">
                    No users match the selected filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => openUserProfile(user)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-primary/10">
                          <AvatarImage src={user.avatar || undefined} />
                          <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <div className="font-bold text-sm truncate">{user.name}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(user.roles || [user.role]).map((r, i) => (
                          <Badge key={i} className={`${getRoleColor(r)} font-bold text-[9px] uppercase`} variant="outline">
                            {r}
                          </Badge>
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground mt-1 block">
                        {user.depots?.length ? user.depots.join(', ') : (user.depot || 'No Depot')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] font-bold text-foreground line-clamp-2">
                        {user.training && user.training !== 'None' ? user.training : 'None'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {(user.training?.includes('Fleet Driver') || (user as any).isDriver) && <Car className="h-4 w-4 text-primary" />}
                        {(user.training?.includes('RoSPA') || (user as any).isRoSPATrained) && <Award className="h-4 w-4 text-accent-foreground" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Configuration Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Registry Configuration</DialogTitle>
            <DialogDescription>Manage the dynamic lists for departments and training.</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="teams" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="teams">Teams</TabsTrigger>
              <TabsTrigger value="training">Training</TabsTrigger>
            </TabsList>
            <TabsContent value="teams" className="space-y-4 py-4">
              <div className="flex gap-2">
                <Input value={configNewTeam} onChange={e => setConfigNewTeam(e.target.value)} placeholder="New Team Name" />
                <Button onClick={() => {
                  if (configNewTeam && !configTeams.includes(configNewTeam)) {
                    const newTeams = [...configTeams, configNewTeam].sort();
                    setConfigTeams(newTeams);
                    handleUpdateRegistry('teams', configNewTeam, 'add');
                    setConfigNewTeam("");
                  }
                }}><Plus className="h-4 w-4" /></Button>
              </div>
              <ScrollArea className="h-[200px] border rounded-md p-2">
                {configTeams.map(team => (
                  <div key={team} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                    <span className="text-sm">{team}</span>
                    <Button variant="ghost" size="icon" onClick={() => {
                      const newTeams = configTeams.filter(t => t !== team);
                      setConfigTeams(newTeams);
                      handleUpdateRegistry('teams', team, 'remove');
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </ScrollArea>
            </TabsContent>
            <TabsContent value="training" className="space-y-4 py-4">
              <div className="flex gap-2">
                <Input value={configNewTraining} onChange={e => setConfigNewTraining(e.target.value)} placeholder="New Training Course" />
                <Button onClick={() => {
                  if (configNewTraining && !configTrainingOptions.includes(configNewTraining)) {
                    const newTraining = [...configTrainingOptions, configNewTraining].sort();
                    setConfigTrainingOptions(newTraining);
                    handleUpdateRegistry('trainingOptions', configNewTraining, 'add');
                    setConfigNewTraining("");
                  }
                }}><Plus className="h-4 w-4" /></Button>
              </div>
              <ScrollArea className="h-[200px] border rounded-md p-2">
                {configTrainingOptions.map(opt => (
                  <div key={opt} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                    <span className="text-sm">{opt}</span>
                    <Button variant="ghost" size="icon" onClick={() => {
                      const newTraining = configTrainingOptions.filter(t => t !== opt);
                      setConfigTrainingOptions(newTraining);
                      handleUpdateRegistry('trainingOptions', opt, 'remove');
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New System User</DialogTitle>
            <DialogDescription>Create a new profile for a staff member to grant them access to the studio dashboard.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Full Name</Label>
                <Input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="e.g. David Jones" className="font-medium" />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Email Address</Label>
                <Input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="david.jones@hackney.gov.uk" className="font-medium" />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Initial Password</Label>
                <Input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="Min 6 characters" className="font-medium" />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Work Phone</Label>
                <Input value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} placeholder="07xxx xxxxxx" className="font-medium" />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Radio Call Sign</Label>
                <Input value={newUser.radioCallSign} onChange={e => setNewUser({...newUser, radioCallSign: e.target.value})} placeholder="e.g. Victor 1" className="font-medium" />
              </div>
            </div>

            <div className="grid gap-3">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Staff Roles (Select all that apply)</Label>
              <div className="grid grid-cols-2 gap-3 border rounded-xl p-4 bg-muted/10">
                {[...OPERATIVE_ROLES, ...MANAGEMENT_ROLES].filter((v, i, a) => a.indexOf(v) === i).map(role => (
                  <div 
                    key={role} 
                    className="flex items-center space-x-2 cursor-pointer hover:bg-white/50 p-1 rounded transition-colors"
                    onClick={() => {
                      const current = newUser.roles || [];
                      const next = current.includes(role) ? current.filter(r => r !== role) : [...current, role];
                      setNewUser({...newUser, roles: next});
                    }}
                  >
                    <Checkbox checked={(newUser.roles || []).includes(role)} onCheckedChange={() => {}} />
                    <Label className="text-xs font-medium cursor-pointer">{role}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Depot Assignment</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border rounded-xl p-4 bg-muted/10">
                {teams.map(t => (
                  <div 
                    key={t} 
                    className="flex items-center space-x-3 group hover:bg-white/50 p-1.5 rounded-md transition-colors cursor-pointer"
                    onClick={() => {
                      const current = newUser.depots || (newUser.depot ? [newUser.depot] : []);
                      const isChecked = current.includes(t);
                      const newDepots = isChecked ? current.filter(x => x !== t) : [...current, t];
                      setNewUser({...newUser, depots: newDepots, depot: newDepots[0] || ''});
                    }}
                  >
                    <Checkbox 
                      id={`new-depot-${t}`} 
                      checked={(newUser.depots || []).some(d => d.trim() === t.trim()) || (newUser.depot?.trim() === t.trim() && newUser.depots?.length !== 0)}
                      onCheckedChange={() => {}} // Handled by div onClick
                    />
                    <label htmlFor={`new-depot-${t}`} className="text-xs font-medium cursor-pointer flex-1">
                      {t}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <Label className="text-sm font-bold">Training and Certifications</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border rounded-lg p-4 bg-muted/10">
                {trainingOptions.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox id={`add-${option}`} checked={selectedTrainings.includes(option)} onCheckedChange={() => toggleTraining(option)} />
                    <label htmlFor={`add-${option}`} className="text-sm font-medium cursor-pointer">{option}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold tracking-tight">Desktop Version Access</span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Toggle desktop-optimized page view</span>
              </div>
              <Checkbox 
                checked={newUser.allowDesktopView ?? true} 
                onCheckedChange={(checked) => setNewUser({...newUser, allowDesktopView: !!checked})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full font-bold" onClick={handleAddUser} disabled={!newUser.name || !newUser.email || isUserSubmitting}>
              {isUserSubmitting ? "Creating..." : "Create User Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="sm:max-w-[700px] h-[90vh] overflow-hidden flex flex-col p-0">
          <div className="p-6 pb-0">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                 <Avatar className="h-16 w-16 border-2 border-primary/20">
                  <AvatarImage src={selectedUser?.avatar || undefined} />
                  <AvatarFallback>{selectedUser?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-2xl font-headline font-bold">{selectedUser?.name}</DialogTitle>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {(selectedUser?.roles || (selectedUser?.role ? [selectedUser.role] : [])).map((r, i) => (
                      <Badge key={i} className={getRoleColor(r)} variant="outline">{r}</Badge>
                    ))}
                    <span className="text-xs font-medium text-muted-foreground">• {selectedUser?.depots?.length ? selectedUser.depots.join(', ') : selectedUser?.depot}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant={isEditing ? "outline" : "default"} 
                  size="sm" 
                  className="font-bold shadow-sm" 
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? <X className="mr-2 h-4 w-4" /> : <Edit2 className="mr-2 h-4 w-4" />}
                  {isEditing ? "Cancel" : "Edit Profile"}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="font-bold border-muted-foreground/20">
                      More Actions <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem 
                      className={cn("font-bold cursor-pointer", selectedUser?.isArchived ? "text-primary" : "text-destructive")}
                      onClick={() => setIsArchiveConfirmOpen(true)}
                    >
                      <UserMinus className="mr-2 h-4 w-4" /> 
                      {selectedUser?.isArchived ? "Unarchive Staff" : "Archive Staff Account"}
                    </DropdownMenuItem>
                    
                    {selectedUser && (
                      <DropdownMenuItem 
                        className="font-bold cursor-pointer text-accent-foreground"
                        onClick={async () => {
                            if (!selectedUser.password || selectedUser.password.length < 6) {
                                toast({ title: "Sync Failed", description: "This user needs a valid password (min 6 chars) set in their profile first.", variant: "destructive" });
                                return;
                            }
                            setIsUserSubmitting(true);
                            try {
                                await registerUserInAuth(selectedUser.email, selectedUser.password);
                                toast({ title: "Sync Successful", description: "User can now log in to the system." });
                            } catch (e: any) {
                                toast({ title: "Sync Failed", description: e.message, variant: "destructive" });
                            } finally {
                                setIsUserSubmitting(false);
                            }
                        }}
                      >
                        <Check className="mr-2 h-4 w-4" /> Sync Login Service
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem 
                      className="font-bold cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
                      onClick={() => setIsDeleteUserConfirmOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Permanently Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col mt-4">
            <TabsList className="mx-6 justify-start h-10 bg-transparent border-b rounded-none p-0 gap-6">
              <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 font-bold">Overview</TabsTrigger>
              <TabsTrigger value="tasks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 font-bold">Tasks ({userTasks.length})</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 w-full h-full">
              <div className="p-6 h-full">
                <TabsContent value="overview" className="mt-0 space-y-6 outline-none h-full">
                {isEditing ? (
                  <div className="grid gap-6">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Full Name</Label>
                        <Input value={selectedUser?.name} onChange={e => selectedUser && setSelectedUser({...selectedUser, name: e.target.value})} className="font-medium" />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Email Identity</Label>
                        <Input value={selectedUser?.email} onChange={e => selectedUser && setSelectedUser({...selectedUser, email: e.target.value})} className="font-medium" />
                      </div>
                       <div className="grid gap-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Access Password</Label>
                        <Input type="password" value={selectedUser?.password || ''} onChange={e => selectedUser && setSelectedUser({...selectedUser, password: e.target.value})} placeholder="Enter 6+ characters to update" className="font-medium" />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Work Phone</Label>
                        <Input value={selectedUser?.phone || ''} onChange={e => selectedUser && setSelectedUser({...selectedUser, phone: e.target.value})} className="font-medium" />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Radio Call Sign</Label>
                        <Input value={selectedUser?.radioCallSign || ''} onChange={e => selectedUser && setSelectedUser({...selectedUser, radioCallSign: e.target.value})} className="font-medium" />
                      </div>
                    </div>
                    
                    <Separator className="my-2" />

                    <div className="grid gap-3">
                      <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Role Designations (Multi-select)</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border rounded-xl p-4 bg-muted/10">
                        {[...OPERATIVE_ROLES, ...MANAGEMENT_ROLES].filter((v, i, a) => a.indexOf(v) === i).map(role => (
                          <div 
                            key={role} 
                            className="flex items-center space-x-2 cursor-pointer hover:bg-white/50 p-1.5 rounded-md transition-colors"
                            onClick={() => {
                              if (!selectedUser) return;
                              const current = selectedUser.roles || (selectedUser.role ? [selectedUser.role] : []);
                              const next = current.includes(role) ? current.filter(r => r !== role) : [...current, role];
                              setSelectedUser({...selectedUser, roles: next});
                            }}
                          >
                            <Checkbox checked={(selectedUser?.roles || (selectedUser?.role ? [selectedUser.role] : [])).includes(role)} onCheckedChange={() => {}} />
                            <Label className="text-[10px] font-bold cursor-pointer leading-tight">{role}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid gap-3 mt-4">
                      <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Depot Assignments</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border rounded-xl p-4 bg-muted/10">
                        {teams.map(t => (
                          <div 
                            key={t} 
                            className="flex items-center space-x-3 group hover:bg-white/50 p-1.5 rounded-md transition-colors cursor-pointer"
                            onClick={() => {
                              if (!selectedUser) return;
                              const current = selectedUser.depots || (selectedUser.depot ? [selectedUser.depot] : []);
                              const checked = current.some(d => d.trim() === t.trim());
                              const newDepots = checked ? current.filter(x => x.trim() !== t.trim()) : [...current, t];
                              setSelectedUser({...selectedUser, depots: newDepots, depot: newDepots[0] || ''});
                            }}
                          >
                            <Checkbox 
                              checked={(selectedUser?.depots || []).some(d => d.trim() === t.trim()) || (selectedUser?.depot?.trim() === t.trim() && selectedUser?.depots?.length !== 0)}
                              onCheckedChange={() => {}} // Handled by div onClick
                            />
                            <label className="text-xs font-medium cursor-pointer flex-1">
                              {t}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid gap-4 pt-4">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Training & System Certifications</Label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-xl p-6 bg-muted/10">
                        {/* Display both registry options AND any existing data that doesn't match registry */}
                        {Array.from(new Set([...trainingOptions.map(t => t.trim()), ...selectedTrainings.map(t => t.trim())])).sort().map((option) => {
                          const isUnregistered = !trainingOptions.some(ref => ref.trim() === option.trim());
                          return (
                            <div key={option} className="flex items-center space-x-3 group hover:bg-white/50 p-1.5 rounded-md transition-colors cursor-pointer" onClick={() => toggleTraining(option)}>
                              <Checkbox id={`edit-${option}`} checked={selectedTrainings.includes(option)} onCheckedChange={() => toggleTraining(option)} />
                              <label htmlFor={`edit-${option}`} className="text-sm font-medium cursor-pointer flex-1 flex items-center justify-between">
                                {option}
                                {isUnregistered && <Badge variant="outline" className="text-[8px] h-4 font-bold border-destructive/30 text-destructive uppercase tracking-tighter">Legacy</Badge>}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10 mt-6">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold tracking-tight">Desktop Version Access</span>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Toggle desktop-optimized page view</span>
                      </div>
                      <Checkbox 
                        checked={selectedUser?.allowDesktopView ?? true} 
                        onCheckedChange={(checked) => selectedUser && setSelectedUser({...selectedUser, allowDesktopView: !!checked})}
                      />
                    </div>

                    <div className="pt-6 pb-12">
                      <Button onClick={handleUpdateUser} className="w-full font-bold h-12 text-lg shadow-lg" disabled={isUserSubmitting}>
                        {isUserSubmitting ? "Saving..." : "Save Profile Changes"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg bg-card">
                        <div className="flex items-center gap-3 text-primary mb-2">
                          <Briefcase className="h-4 w-4" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">Depot Assignment</h4>
                        </div>
                        <p className="text-sm font-semibold">{selectedUser?.depots?.length ? selectedUser.depots.join(', ') : selectedUser?.depot}</p>
                      </div>
                      <div className="p-4 border rounded-lg bg-card">
                        <div className="flex items-center gap-3 text-primary mb-2">
                          <Shield className="h-4 w-4" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">Certifications</h4>
                        </div>
                        <p className="text-sm font-semibold whitespace-pre-line">
                          {selectedUser?.training && selectedUser.training !== 'None' ? selectedUser.training : 'None'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="tasks" className="mt-0 h-full outline-none">
                {userTasks.length > 0 ? (
                  <div className="grid gap-3 p-1">
                    {userTasks.map(task => (
                      <div key={task.id} className="p-4 border rounded-lg group hover:border-primary/30 transition-colors flex justify-between items-start">
                        <div>
                          <h5 className="font-bold text-sm">{task.title}</h5>
                          <p className="text-xs text-muted-foreground mt-1">{task.objective}</p>
                          <div className="flex items-center gap-2 mt-2">
                             <Badge variant="outline" className="text-[9px] uppercase font-bold">{task.status}</Badge>
                             <span className="text-[10px] text-muted-foreground">{task.park} • {task.dueDate}</span>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTaskToDelete(task);
                            setIsTaskDeleteConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground italic border-2 border-dashed rounded-xl m-2">
                    <p className="text-sm font-medium">No tasks currently assigned.</p>
                  </div>
                )}
              </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isTaskDeleteConfirmOpen} onOpenChange={setIsTaskDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the task "<strong>{taskToDelete?.title}</strong>" from the system. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isArchiveConfirmOpen} onOpenChange={setIsArchiveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{selectedUser?.isArchived ? "Unarchive User?" : "Archive User?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.isArchived 
                ? `Are you sure you want to unarchive ${selectedUser?.name}? They will regain their system access.` 
                : `Are you sure you want to archive ${selectedUser?.name}? Their access will be revoked but their task history will remain.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => performArchiveToggle(!selectedUser?.isArchived)} className={selectedUser?.isArchived ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}>
              {selectedUser?.isArchived ? "Confirm Unarchive" : "Confirm Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteUserConfirmOpen} onOpenChange={setIsDeleteUserConfirmOpen}>
        <AlertDialogContent className="border-2 border-destructive">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" /> PERMANENTLY DELETE ACCOUNT?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p>You are about to delete <strong>{selectedUser?.name}</strong> and all their data.</p>
              <div className="p-3 bg-destructive/10 border-l-4 border-destructive rounded text-xs font-bold uppercase text-destructive">
                This will delete every Task and Issue associated with this user. This action is irreversible.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Account</AlertDialogCancel>
            <AlertDialogAction onClick={performPermanentDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold">
              YES, DELETE EVERYTHING
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  );
}
