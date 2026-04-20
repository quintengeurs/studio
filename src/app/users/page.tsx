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
  Settings2,
  RotateCcw,
  MapPin
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { User, Role, Task, Issue, RegistryConfig, OPERATIVE_ROLES, MANAGEMENT_ROLES, ParkDetail, AssignedRole } from "@/lib/types";
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
import { collection, query, where, doc, addDoc, updateDoc, deleteDoc, orderBy, limit, getDocs, arrayUnion, arrayRemove, setDoc, writeBatch } from "firebase/firestore";
import { PermissionsMatrix } from "@/components/users/permissions-matrix";

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
    password: '',
    phone: '',
    radioCallSign: '',
    assignedRoles: [{ role: 'Gardener', depotIds: [] }]
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
    const userToSave = {
        ...newUser,
        id: tempId,
        name: newUser.name || "Unknown User",
        email: userEmail,
        training: trainingString,
        depots: Array.from(new Set(newUser.assignedRoles?.flatMap(ar => ar.depotIds) || [])),
        depot: newUser.assignedRoles?.[0]?.depotIds?.[0] || "",
        isArchived: false,
        roles: newUser.assignedRoles?.map(ar => ar.role) || newUser.roles || [],
        assignedRoles: newUser.assignedRoles || [],
        createdAt: new Date().toISOString(),
    };

    setIsUserSubmitting(true);
    const sanitizedUser = JSON.parse(JSON.stringify(userToSave));
  
    try {
        // Step 1: Register in Firebase Authentication
        await registerUserInAuth(userEmail, newUser.password);

        // Step 2: Save to Firestore
        await setDoc(doc(db, "users", tempId), sanitizedUser);

        toast({ title: "User Added", description: `${userToSave.name} has been added.` });
        setIsAddDialogOpen(false);
        setNewUser({ 
          name: '', email: '', roles: ['Gardener'], depot: '', depots: [], 
          training: '', avatar: '', isArchived: false, password: '',
          phone: '', radioCallSign: '',
          assignedRoles: [{ role: 'Gardener', depotIds: [] }]
        });
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
    const trainingString = getFinalTrainingString() || "None";
    
    const updatedData: Partial<User> = {
      ...selectedUser,
      training: trainingString,
      roles: selectedUser.assignedRoles?.map(ar => ar.role) || selectedUser.roles || [],
      depots: Array.from(new Set(selectedUser.assignedRoles?.flatMap(ar => ar.depotIds) || [])),
      depot: selectedUser.assignedRoles?.[0]?.depotIds?.[0] || ""
    };

    try {
        await updateDoc(doc(db, "users", selectedUser.id), updatedData);
        setSelectedUser(updatedData as User);
        setIsEditing(false);
        toast({ title: "Profile Updated", description: "Changes saved." });
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
        setIsArchiveConfirmOpen(false);
        
        setTimeout(() => {
          setIsProfileDialogOpen(false);
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

  const handleRestore = async (id: string) => {
    if (!db) return;
    try {
        await updateDoc(doc(db, "users", id), { isArchived: false });
        toast({ title: "Staff Restored", description: "User has been successfully un-archived." });
    } catch (e: any) {
        toast({ title: "Error", description: "Failed to restore user.", variant: "destructive" });
    }
  };

  const performPermanentDelete = async () => {
    if (!db || !selectedUser || isUserSubmitting) return;

    setIsUserSubmitting(true);
    const userName = selectedUser.name;
    const batch = writeBatch(db);

    try {
        // 1. Queue assigned tasks for deletion
        selectedUserTasks.forEach(task => {
            batch.delete(doc(db, "tasks", task.id));
        });

        // 2. Queue related issues for UNASSIGNMENT (not deletion)
        selectedUserIssues.forEach(issue => {
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

    setDoc(registryRef, updatePayload, { merge: true })
    .catch((e: any) => {
        toast({ title: "Permission Denied", description: "Could not save changes.", variant: "destructive" });
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
    
    if (db) {
        setIsStatsLoading(true);
        try {
            const tQuery = query(collection(db, "tasks"), where("assignedTo", "==", user.name));
            const iQuery = query(collection(db, "issues"), where("assignedTo", "==", user.name));
            const [tSnap, iSnap] = await Promise.all([getDocs(tQuery), getDocs(iQuery)]);
            setSelectedUserTasks(tSnap.docs.map(d => ({ ...d.data(), id: d.id } as Task)));
            setSelectedUserIssues(iSnap.docs.map(d => ({ ...d.data(), id: d.id } as Issue)));
        } finally {
            setIsStatsLoading(false);
        }
    }
  };

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
      <Tabs defaultValue="registry" className="w-full">
        <TabsList className="mb-6 bg-muted/50 border">
          <TabsTrigger value="registry" className="font-bold">User Registry</TabsTrigger>
          <TabsTrigger value="permissions" className="font-bold">Access Permissions</TabsTrigger>
          <TabsTrigger value="archived" className="font-bold">Archived Staff</TabsTrigger>
        </TabsList>
        <TabsContent value="registry" className="mt-0 space-y-0">
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
              {users.filter(u => !u.isArchived && (u.roles || []).some(r => OPERATIVE_ROLES.includes(r))).length}
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
              {users.filter(u => !u.isArchived && (u.roles || []).some(r => MANAGEMENT_ROLES.includes(r))).length}
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
                      <div className="flex flex-col gap-1.5 min-w-[150px]">
                        {user.assignedRoles && user.assignedRoles.length > 0 ? (
                           user.assignedRoles.map((ar, i) => (
                             <div key={i} className="flex items-center gap-2 overflow-hidden">
                               <Badge className={`${getRoleColor(ar.role)} font-bold text-[8px] h-4 uppercase shrink-0`} variant="outline">
                                 {ar.role}
                               </Badge>
                               <span className="text-[9px] font-bold text-muted-foreground truncate">at {ar.depotIds?.join(', ')}</span>
                             </div>
                           ))
                        ) : (
                          <>
                            <div className="flex flex-wrap gap-1">
                              {(user.roles || []).map((r, i) => (
                                <Badge key={i} className={`${getRoleColor(r)} font-bold text-[9px] uppercase`} variant="outline">
                                  {r}
                                </Badge>
                              ))}
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground mt-1 block">
                              {user.depots?.length ? user.depots.join(', ') : (user.depot || 'No Depot')}
                            </span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] font-bold text-foreground line-clamp-2">
                        {user.training && user.training !== 'None' ? user.training : 'None'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {(user.training?.includes('Fleet Driver')) && <Car className="h-4 w-4 text-primary" />}
                        {(user.training?.includes('RoSPA')) && <Award className="h-4 w-4 text-accent-foreground" />}
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
        </TabsContent>
        <TabsContent value="permissions" className="mt-0 pt-2">
          <PermissionsMatrix users={users.filter(u => !u.isArchived)} />
        </TabsContent>
        <TabsContent value="archived" className="mt-0 pt-2">
          <Card className="overflow-hidden border-2 mb-6 shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-headline font-bold text-xs">Profile</TableHead>
                    <TableHead className="font-headline font-bold text-xs">Legacy Role/Depot</TableHead>
                    <TableHead className="font-headline font-bold text-xs">Archived Status</TableHead>
                    <TableHead className="text-right text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-10"><Clock className="animate-spin h-6 w-6 mx-auto text-primary" /></TableCell></TableRow>
                  ) : users.filter(u => u.isArchived).length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground"><p className="font-bold">No Archived Staff</p></TableCell></TableRow>
                  ) : (
                    users.filter(u => u.isArchived).map((user) => (
                      <TableRow key={user.id} className="hover:bg-accent/5 transition-colors cursor-pointer opacity-50 grayscale hover:grayscale-0" onClick={() => handleEditClick(user)}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2 border-primary/10">
                              <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                              <div className="font-bold text-sm truncate">{user.name}</div>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">{(user.roles || []).map((r, i) => <Badge key={i} className="font-bold text-[9px] uppercase" variant="outline">{r}</Badge>)}</div>
                          <span className="text-[10px] font-bold text-muted-foreground mt-1 block">{user.depots?.length ? user.depots.join(', ') : (user.depot || 'No Depot')}</span>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-xs uppercase font-bold text-muted-foreground bg-muted/20">Archived</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={(e) => {
                            e.stopPropagation();
                            handleRestore(user.id);
                          }}>
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

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
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Phone Number (Optional)</Label>
                <Input type="tel" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} placeholder="e.g. 07700 900000" className="font-medium" />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Radio Call Sign (Optional)</Label>
                <Input value={newUser.radioCallSign} onChange={e => setNewUser({...newUser, radioCallSign: e.target.value})} placeholder="e.g. Sierra 1" className="font-medium" />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Primary Assignment</Label>
              <div className="grid gap-4 border rounded-xl p-4 bg-muted/10">
                <div className="grid gap-2">
                  <Label className="text-xs font-bold">Role</Label>
                  <Select 
                    value={newUser.assignedRoles?.[0]?.role} 
                    onValueChange={(v) => {
                      const roles = [...(newUser.assignedRoles || [])];
                      roles[0] = { ...roles[0], role: v as Role };
                      setNewUser({...newUser, assignedRoles: roles});
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select primary role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectValue placeholder="Operative roles" className="text-muted-foreground font-bold px-2 py-1 flex h-auto" />
                      {OPERATIVE_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      <Separator className="my-1" />
                      <SelectValue placeholder="Management roles" className="text-muted-foreground font-bold px-2 py-1 flex h-auto" />
                      {MANAGEMENT_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-bold">Depots (Select all that apply)</Label>
                  <div className="grid grid-cols-2 gap-2 border rounded-lg p-3 bg-muted/5 min-h-[80px]">
                    {teams.map(t => (
                      <div 
                        key={t} 
                        className="flex items-center space-x-2 cursor-pointer hover:bg-white/50 p-1 rounded transition-colors"
                        onClick={() => {
                          const roles = [...(newUser.assignedRoles || [])];
                          const currentIds = roles[0].depotIds || [];
                          const checked = currentIds.includes(t);
                          roles[0] = { 
                            ...roles[0], 
                            depotIds: checked ? currentIds.filter(id => id !== t) : [...currentIds, t] 
                          };
                          setNewUser({...newUser, assignedRoles: roles});
                        }}
                      >
                        <Checkbox checked={(newUser.assignedRoles?.[0]?.depotIds || []).includes(t)} onCheckedChange={() => {}} />
                        <Label className="text-[10px] cursor-pointer">{t}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Additional Roles</Label>
                {newUser.assignedRoles && newUser.assignedRoles.length < 3 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-[10px] font-bold uppercase"
                    onClick={() => {
                      const roles = [...(newUser.assignedRoles || [])];
                      roles.push({ role: 'Litter Picker', depotIds: [] });
                      setNewUser({...newUser, assignedRoles: roles});
                    }}
                  >
                    <Plus className="mr-1 h-3 w-3" /> Add Secondary/Third Role
                  </Button>
                )}
              </div>
              
              <div className="space-y-3">
                {newUser.assignedRoles?.slice(1).map((ar, idx) => (
                  <div key={idx} className="grid grid-cols-1 gap-3 border rounded-xl p-4 bg-muted/5 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex justify-between items-center pb-2 border-b">
                       <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">{idx === 0 ? "Secondary" : "Third"} Assignment</Label>
                       <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-destructive"
                        onClick={() => {
                          const roles = (newUser.assignedRoles || []).filter((_, i) => i !== idx + 1);
                          setNewUser({...newUser, assignedRoles: roles});
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Role</Label>
                        <Select 
                          value={ar.role} 
                          onValueChange={(v) => {
                            const roles = [...(newUser.assignedRoles || [])];
                            roles[idx + 1] = { ...roles[idx + 1], role: v as Role };
                            setNewUser({...newUser, assignedRoles: roles});
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[...OPERATIVE_ROLES, ...MANAGEMENT_ROLES].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Depots</Label>
                        <div className="grid grid-cols-1 gap-2 border rounded-lg p-2 bg-background min-h-[60px] max-h-[120px] overflow-y-auto">
                          {teams.map(t => (
                            <div 
                              key={t} 
                              className="flex items-center space-x-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                              onClick={() => {
                                const roles = [...(newUser.assignedRoles || [])];
                                const currentIds = roles[idx + 1].depotIds || [];
                                const checked = currentIds.includes(t);
                                roles[idx + 1] = { 
                                  ...roles[idx + 1], 
                                  depotIds: checked ? currentIds.filter(id => id !== t) : [...currentIds, t] 
                                };
                                setNewUser({...newUser, assignedRoles: roles});
                              }}
                            >
                              <Checkbox checked={(ar.depotIds || []).includes(t)} onCheckedChange={() => {}} />
                              <Label className="text-[10px] cursor-pointer truncate">{t}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {(!newUser.assignedRoles || newUser.assignedRoles.length <= 1) && (
                  <div className="py-6 text-center text-[10px] font-bold uppercase opacity-30 border border-dashed rounded-xl">
                    No additional roles assigned
                  </div>
                )}
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
          </div>
          <DialogFooter>
            <Button className="w-full font-bold" onClick={handleAddUser} disabled={!newUser.name || !newUser.email || isUserSubmitting}>
              {isUserSubmitting ? "Creating..." : "Create User Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="sm:max-w-[700px] h-[90vh] overflow-hidden flex flex-col p-0" aria-describedby={undefined}>
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
                    {(selectedUser?.roles || []).map((r, i) => (
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
              <TabsTrigger value="tasks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 font-bold">Tasks ({selectedUserTasks.length})</TabsTrigger>
              <TabsTrigger value="issues" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 font-bold">Issues ({selectedUserIssues.length})</TabsTrigger>
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
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Phone Number</Label>
                        <Input type="tel" value={selectedUser?.phone || ""} onChange={e => selectedUser && setSelectedUser({...selectedUser, phone: e.target.value})} className="font-medium" />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Radio Call Sign</Label>
                        <Input value={selectedUser?.radioCallSign || ""} onChange={e => selectedUser && setSelectedUser({...selectedUser, radioCallSign: e.target.value})} className="font-medium" />
                      </div>
                    </div>
                    
                    <Separator className="my-2" />

                    <div className="space-y-4">
                      <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Primary Assignment</Label>
                      <div className="grid gap-4 border rounded-xl p-4 bg-muted/10">
                        <div className="grid gap-2">
                          <Label className="text-xs font-bold">Role</Label>
                          <Select 
                            value={selectedUser?.assignedRoles?.[0]?.role || selectedUser?.role || (selectedUser?.roles?.[0] as Role)} 
                            onValueChange={(v) => {
                              if (!selectedUser) return;
                              const roles = [...(selectedUser.assignedRoles || [{ role: selectedUser.role || selectedUser.roles?.[0] || 'Gardener', depotId: selectedUser.depot || selectedUser.depots?.[0] || '' }])];
                              roles[0] = { ...roles[0], role: v as Role };
                              setSelectedUser({...selectedUser, assignedRoles: roles});
                            }}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-1.5 bg-muted/30">Operative Roles</div>
                              {OPERATIVE_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                              <Separator className="my-1" />
                              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-1.5 bg-muted/30">Management Roles</div>
                              {MANAGEMENT_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-xs font-bold">Depots (Select all that apply)</Label>
                          <div className="grid grid-cols-2 gap-2 border rounded-lg p-3 bg-muted/5 min-h-[80px]">
                            {teams.map(t => (
                              <div 
                                key={t} 
                                className="flex items-center space-x-2 cursor-pointer hover:bg-white/50 p-1 rounded transition-colors"
                                onClick={() => {
                                  if (!selectedUser) return;
                                  const roles = [...(selectedUser.assignedRoles || [{ role: selectedUser.role || selectedUser.roles?.[0] || 'Gardener', depotIds: selectedUser.depots || [] }])];
                                  const currentIds = roles[0].depotIds || [];
                                  const checked = currentIds.includes(t);
                                  roles[0] = { 
                                    ...roles[0], 
                                    depotIds: checked ? currentIds.filter(id => id !== t) : [...currentIds, t] 
                                  };
                                  setSelectedUser({...selectedUser, assignedRoles: roles});
                                }}
                              >
                                <Checkbox checked={(selectedUser?.assignedRoles?.[0]?.depotIds || []).includes(t)} onCheckedChange={() => {}} />
                                <Label className="text-[10px] cursor-pointer">{t}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Additional Roles</Label>
                        {(!selectedUser?.assignedRoles || selectedUser.assignedRoles.length < 3) && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-[10px] font-bold uppercase"
                            onClick={() => {
                              if (!selectedUser) return;
                              const roles = [...(selectedUser.assignedRoles || [{ role: selectedUser.role || selectedUser.roles?.[0] || 'Gardener', depotIds: selectedUser.depots || [] }])];
                              roles.push({ role: 'Litter Picker', depotIds: [] });
                              setSelectedUser({...selectedUser, assignedRoles: roles});
                            }}
                          >
                            <Plus className="mr-1 h-3 w-3" /> Add Secondary/Third Role
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        {selectedUser?.assignedRoles?.slice(1).map((ar, idx) => (
                          <div key={idx} className="grid grid-cols-1 gap-3 border rounded-xl p-4 bg-muted/5 animate-in slide-in-from-top-2 duration-200">
                            <div className="flex justify-between items-center pb-2 border-b">
                               <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">{idx === 0 ? "Secondary" : "Third"} Assignment</Label>
                               <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-destructive"
                                onClick={() => {
                                  if (!selectedUser) return;
                                  const roles = (selectedUser.assignedRoles || []).filter((_, i) => i !== idx + 1);
                                  setSelectedUser({...selectedUser, assignedRoles: roles});
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Role</Label>
                                <Select 
                                  value={ar.role} 
                                  onValueChange={(v) => {
                                    if (!selectedUser) return;
                                    const roles = [...(selectedUser.assignedRoles || [])];
                                    roles[idx + 1] = { ...roles[idx + 1], role: v as Role };
                                    setSelectedUser({...selectedUser, assignedRoles: roles});
                                  }}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[...OPERATIVE_ROLES, ...MANAGEMENT_ROLES].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Depots</Label>
                                <div className="grid grid-cols-1 gap-2 border rounded-lg p-2 bg-background min-h-[60px] max-h-[120px] overflow-y-auto">
                                  {teams.map(t => (
                                    <div 
                                      key={t} 
                                      className="flex items-center space-x-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                                      onClick={() => {
                                        if (!selectedUser) return;
                                        const roles = [...(selectedUser.assignedRoles || [])];
                                        const currentIds = roles[idx + 1].depotIds || [];
                                        const checked = currentIds.includes(t);
                                        roles[idx + 1] = { 
                                          ...roles[idx + 1], 
                                          depotIds: checked ? currentIds.filter(id => id !== t) : [...currentIds, t] 
                                        };
                                        setSelectedUser({...selectedUser, assignedRoles: roles});
                                      }}
                                    >
                                      <Checkbox checked={(ar.depotIds || []).includes(t)} onCheckedChange={() => {}} />
                                      <Label className="text-[10px] cursor-pointer truncate">{t}</Label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
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

                    <div className="pt-6 pb-12">
                      <Button onClick={handleUpdateUser} className="w-full font-bold h-12 text-lg shadow-lg" disabled={isUserSubmitting}>
                        {isUserSubmitting ? "Saving..." : "Save Profile Changes"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-primary" />
                        <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-60">Current Assignments</h4>
                      </div>
                      <div className="grid gap-3">
                        {selectedUser?.assignedRoles?.map((ar, i) => (
                          <div key={i} className="flex items-center justify-between p-4 border rounded-xl bg-card shadow-sm">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold uppercase text-muted-foreground">{i === 0 ? "Primary" : i === 1 ? "Secondary" : "Third"}</span>
                              <span className="text-sm font-bold">{ar.role}</span>
                            </div>
                            <div className="flex items-center gap-2 text-primary font-bold">
                              <MapPin className="h-3 w-3" />
                              <span className="text-[10px] uppercase">{ar.depotIds?.join(' • ') || "No Depot"}</span>
                            </div>
                          </div>
                        ))}
                        {(!selectedUser?.assignedRoles || selectedUser.assignedRoles.length === 0) && (
                          <div className="p-4 border rounded-lg bg-card flex justify-between items-center">
                            <p className="text-sm font-semibold">{selectedUser?.role || selectedUser?.roles?.[0]}</p>
                            <p className="text-sm font-semibold text-primary">{selectedUser?.depot || selectedUser?.depots?.[0]}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {(selectedUser?.phone || selectedUser?.radioCallSign) && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-primary" />
                          <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-60">Communication Details</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {selectedUser.phone && (
                            <div className="p-4 border rounded-xl bg-card shadow-sm flex flex-col gap-1">
                              <span className="text-[10px] font-bold uppercase text-muted-foreground">Phone Number</span>
                              <span className="text-sm font-bold">{selectedUser.phone}</span>
                            </div>
                          )}
                          {selectedUser.radioCallSign && (
                            <div className="p-4 border rounded-xl bg-card shadow-sm flex flex-col gap-1">
                              <span className="text-[10px] font-bold uppercase text-muted-foreground">Radio Call Sign</span>
                              <span className="text-sm font-bold">{selectedUser.radioCallSign}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="tasks" className="mt-0 h-full outline-none">
                {selectedUserTasks.length > 0 ? (
                  <div className="grid gap-3 p-1">
                    {selectedUserTasks.map(task => (
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
