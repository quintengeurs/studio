"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
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
  MapPin,
  Smartphone,
  Monitor,
  Eye,
  Lock,
  Circle,
  Building,
  Zap,
  Globe,
  Database
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { User, Role, Task, Issue, RegistryConfig, OPERATIVE_ROLES, MANAGEMENT_ROLES, ParkDetail, AssignedRole, RoleTemplate, AccessPermissions, PARK_SECTIONS, ParkSectionKey } from "@/lib/types";
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
import { useFirestore, useCollection, useMemoFirebase, useUser, functions, auth } from "@/firebase";
import { httpsCallable } from "firebase/functions";
import { collection, query, where, doc, addDoc, updateDoc, deleteDoc, orderBy, limit, getDoc, getDocs, arrayUnion, arrayRemove, setDoc, writeBatch } from "firebase/firestore";
import { useUserContext } from "@/context/UserContext";
import { useDataContext } from "@/context/DataContext";
import { getDefaultPermissionsForUser, getDefaultMobilePermissionsForUser, mergePermissions, getEffectivePermissions } from "@/lib/permissions";
import { migrateToMultiTenancy } from "@/lib/migration";
import { Organization, FeatureKey } from "@/lib/types";
import { createUserWithClaims, updateUserClaims } from "@/lib/firebase/users";

export default function UserManagement() {
  const { toast } = useToast();
  const db = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  
  const { profile, isAdmin, effectiveOrgId } = useUserContext();
  const { allUsers: users, allParks: allDetails, registryConfig, configLoading } = useDataContext();

  const rolesQuery = useMemoFirebase(() => 
    (db && effectiveOrgId) ? query(collection(db, "organizations", effectiveOrgId, "role_templates"), orderBy("name")) : null, 
  [db, effectiveOrgId]);
  const { data: allRoleTemplates = [], loading: rolesLoading } = useCollection<RoleTemplate>(rolesQuery as any);

  useEffect(() => {
    // Safety cleanup for navigation locks
    document.body.style.pointerEvents = 'auto';
    document.body.style.overflow = 'auto';
  }, []);

  const teams = useMemo(() => 
    registryConfig?.teams ? [...registryConfig.teams].sort() : [], 
  [registryConfig?.teams]);

  const trainingOptions = useMemo(() => 
    registryConfig?.trainingOptions ? [...registryConfig.trainingOptions].sort() : [], 
  [registryConfig?.trainingOptions]);

  const parks = useMemo(() => 
    allDetails ? allDetails.map(p => p.name).sort() : [], 
  [allDetails]);

  const usersLoading = false; // We use DataContext which is already loaded or loading

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
  const [isMigrating, setIsMigrating] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  // Role Template States
  const [selectedRole, setSelectedRole] = useState<RoleTemplate | null>(null);
  const [isRoleEditorOpen, setIsRoleEditorOpen] = useState(false);
  const [isSeedingRoles, setIsSeedingRoles] = useState(false);

  const handleRunMigration = async () => {
    if (!db || isMigrating) return;
    setIsMigrating(true);
    try {
      await migrateToMultiTenancy(db);
      toast({ title: "Migration Successful", description: "All users have been linked to the default organisation." });
    } catch (error) {
      toast({ title: "Migration Failed", description: "See console for details.", variant: "destructive" });
    } finally {
      setIsMigrating(false);
    }
  };

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
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  
  // Global safety hook to prevent UI lockups from Radix Dialogs
  useEffect(() => {
    const anyModalOpen = isAddDialogOpen || isUpdateModalOpen || isTaskDeleteConfirmOpen || isProfileDialogOpen || isConfigDialogOpen || isArchiveConfirmOpen || isDeleteUserConfirmOpen;
    if (!anyModalOpen) {
      document.body.style.pointerEvents = 'auto';
      document.body.style.overflow = 'auto';
    }
  }, [isAddDialogOpen, isUpdateModalOpen, isTaskDeleteConfirmOpen, isProfileDialogOpen, isConfigDialogOpen, isArchiveConfirmOpen, isDeleteUserConfirmOpen]);

  // Secondary unmount safety
  useEffect(() => {
    return () => {
      document.body.style.pointerEvents = 'auto';
      document.body.style.overflow = 'auto';
    };
  }, []);
  
  const [selectedTrainings, setSelectedTrainings] = useState<string[]>([]);

  // Per-user permissions state for profile dialog
  const [editDesktopPerms, setEditDesktopPerms] = useState<AccessPermissions | null>(null);
  const [editMobilePerms, setEditMobilePerms] = useState<AccessPermissions | null>(null);

  // Per-user permissions state for add-user dialog
  const [newUserDesktopPerms, setNewUserDesktopPerms] = useState<AccessPermissions | null>(null);
  const [newUserMobilePerms, setNewUserMobilePerms] = useState<AccessPermissions | null>(null);
  
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

  const filteredUsers: User[] = useMemo(() => {
    // Safety: volunteers are managed via /volunteering — never show them here
    let result = users.filter(u => !u.isVolunteer);

    
    // 1. Role Filter (operative/management/archived)
    if (roleFilter === 'archived') {
      result = result.filter(u => u.isArchived);
    } else {
      result = result.filter(u => !u.isArchived);
      
      if (roleFilter === 'operative') {
        result = result.filter(u => (u.roles || []).some(r => OPERATIVE_ROLES.includes(r)));
      } else if (roleFilter === 'management') {
        result = result.filter(u => (u.roles || []).some(r => MANAGEMENT_ROLES.includes(r)));
      }
    }

    // 2. Category Filter (from Tabs)
    if (activeCategory !== 'all') {
      result = result.filter(u => {
        const userRoles = u.roles || [];
        if (activeCategory === 'management') return userRoles.some(r => MANAGEMENT_ROLES.includes(r));
        if (activeCategory === 'head_gardeners') return userRoles.includes('Head Gardener');
        if (activeCategory === 'gardeners') return userRoles.includes('Gardener');
        if (activeCategory === 'keepers') return userRoles.includes('Keeper');
        if (activeCategory === 'contractors') return userRoles.includes('Contractor');
        if (activeCategory === 'volunteers') return userRoles.includes('Volunteer');
        if (activeCategory === 'other_ops') return userRoles.some(r => OPERATIVE_ROLES.includes(r) && r !== 'Gardener' && r !== 'Keeper' && r !== 'Contractor');
        return true;
      });
    }

    // 3. Search Term Filter
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(u => 
        u.name?.toLowerCase().includes(s) || 
        u.email?.toLowerCase().includes(s) || 
        (u.roles || []).some(r => r.toLowerCase().includes(s))
      );
    }
    
    return result;
  }, [users, roleFilter, activeCategory, searchTerm]);

  const currentEffectivePerms = useMemo(() => {
    if (!selectedUser) return null;
    const matchedTemplates = allRoleTemplates.filter(t => (selectedUser.roleIds || []).includes(t.id));
    return getEffectivePermissions(selectedUser, false, selectedUser.email, matchedTemplates);
  }, [selectedUser, allRoleTemplates]);

  const currentEffectiveMobilePerms = useMemo(() => {
    if (!selectedUser) return null;
    const matchedTemplates = allRoleTemplates.filter(t => (selectedUser.roleIds || []).includes(t.id));
    return getEffectivePermissions(selectedUser, true, selectedUser.email, matchedTemplates);
  }, [selectedUser, allRoleTemplates]);

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


  const handleAddUser = async () => {
    if (!functions || isUserSubmitting) return;

    if (!newUser.email || !newUser.password) {
      toast({ title: "Validation Error", description: "Email and Password are required.", variant: "destructive" });
      return;
    }

    setIsUserSubmitting(true);
  
    try {
        const result = await createUserWithClaims({
          email: newUser.email.trim(),
          password: newUser.password,
          displayName: newUser.name || "Unknown User",
          role: newUser.assignedRoles?.[0]?.role || 'Staff',
          orgId: effectiveOrgId || 'hackney-council'
        });

        // After creation, we can update the Firestore doc with extra fields (training, etc)
        const { uid } = result;
        const trainingString = getFinalTrainingString() || "None";
        
        await updateDoc(doc(db, "users", uid), {
          training: trainingString,
          depots: Array.from(new Set(newUser.assignedRoles?.flatMap(ar => ar.depotIds) || [])),
          depot: newUser.assignedRoles?.[0]?.depotIds?.[0] || "",
          permissions: newUserDesktopPerms || undefined,
          mobilePermissions: newUserMobilePerms || undefined,
          phone: newUser.phone || "",
          radioCallSign: newUser.radioCallSign || "",
          avatar: newUser.avatar || ""
        });

        toast({ title: "User Created", description: `${newUser.name} has been added and claims assigned.` });
        setIsAddDialogOpen(false);
        setNewUser({ 
          name: '', email: '', roles: ['Gardener'], depot: '', depots: [], 
          training: '', avatar: '', isArchived: false, password: '',
          phone: '', radioCallSign: '',
          assignedRoles: [{ role: 'Gardener', depotIds: [] }]
        });
        setSelectedTrainings([]);
        setNewUserDesktopPerms(null);
        setNewUserMobilePerms(null);
    } catch (e: any) {
        console.error("User Creation Error:", e);
        toast({ title: "Creation Failed", description: e.message || "Could not create user account.", variant: "destructive" });
    } finally {
        setIsUserSubmitting(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!db || !selectedUser || isUserSubmitting) return;

    setIsUserSubmitting(true);
    const trainingString = getFinalTrainingString() || "None";

    // Safely derive depots — filter out any undefined values that arise when
    // an assignedRole entry has no depotIds yet (Firestore rejects undefined in arrays).
    const derivedDepots = Array.from(
      new Set(
        (selectedUser.assignedRoles ?? [])
          .flatMap(ar => ar.depotIds ?? [])
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    );

    // Build an explicit, serialisable payload — never spread the full React state
    // object into Firestore as it may contain non-plain values (class instances, etc.).
    const updatedData: Record<string, any> = {
      name:               selectedUser.name ?? "",
      email:              selectedUser.email ?? "",
      role:               selectedUser.assignedRoles?.[0]?.role ?? selectedUser.role ?? "Staff",
      roles:              (selectedUser.assignedRoles ?? []).map(ar => ar.role).filter(Boolean),
      assignedRoles:      selectedUser.assignedRoles ?? [],
      depot:              selectedUser.assignedRoles?.[0]?.depotIds?.[0] ?? "",
      depots:             derivedDepots,
      orgId:              selectedUser.orgId ?? effectiveOrgId ?? "hackney-council",
      training:           trainingString,
      status:             selectedUser.status ?? "Active",
      phone:              selectedUser.phone ?? "",
      radioCallSign:      selectedUser.radioCallSign ?? "",
      permissions:        editDesktopPerms ?? selectedUser.permissions ?? {},
      mobilePermissions:  editMobilePerms ?? selectedUser.mobilePermissions ?? {},
      allowDesktopView:   editDesktopPerms
                            ? Object.values(editDesktopPerms).some(v => v === true)
                            : (selectedUser.allowDesktopView ?? true),
      updatedAt:          new Date().toISOString(),
    };

    // Remove any keys whose value is undefined (Firestore rejects them)
    Object.keys(updatedData).forEach(k => {
      if (updatedData[k] === undefined) delete updatedData[k];
    });

    try {
      // Sync custom claims via Cloud Function
      await updateUserClaims({
        uid:   selectedUser.id,
        orgId: updatedData.orgId,
        role:  updatedData.role,
      });

      await updateDoc(doc(db, "users", selectedUser.id), updatedData);

      // Refresh token only if the admin just updated their own profile
      if (auth?.currentUser?.uid === selectedUser.id) {
        await auth.currentUser.getIdToken(true);
      }

      setSelectedUser({ ...selectedUser, ...updatedData } as User);
      setIsEditing(false);
      toast({ title: "Profile Updated", description: "Changes saved successfully." });
    } catch (e: any) {
      console.error("handleUpdateUser error:", e);
      toast({
        title: "Error saving profile",
        description: e?.message || "Could not update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUserSubmitting(false);
      setTimeout(() => { document.body.style.pointerEvents = 'auto'; }, 300);
    }
  };


  const handleBulkArchive = async () => {
    if (!db || selectedUserIds.length === 0 || isUserSubmitting) return;
    if (!confirm(`Are you sure you want to archive ${selectedUserIds.length} selected users?`)) return;

    setIsUserSubmitting(true);
    try {
        const { writeBatch } = await import("firebase/firestore");
        const batch = writeBatch(db);
        selectedUserIds.forEach(id => {
            batch.update(doc(db, "users", id), { isArchived: true });
        });
        await batch.commit();
        setSelectedUserIds([]);
        toast({ title: "Bulk Archive Complete", description: `${selectedUserIds.length} staff members moved to archives.` });
    } catch (e) {
        toast({ title: "Bulk Action Failed", variant: "destructive" });
    } finally {
        setIsUserSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!db || selectedUserIds.length === 0 || isUserSubmitting) return;
    if (!confirm(`DANGER: Are you sure you want to PERMANENTLY delete ${selectedUserIds.length} users? This will only remove their Firestore records. Use this if you have already deleted them from Firebase Auth.`)) return;

    setIsUserSubmitting(true);
    try {
        const { writeBatch } = await import("firebase/firestore");
        const batch = writeBatch(db);
        selectedUserIds.forEach(id => {
            batch.delete(doc(db, "users", id));
        });
        await batch.commit();
        setSelectedUserIds([]);
        toast({ title: "Bulk Deletion Complete", description: `${selectedUserIds.length} records removed from Firestore.` });
    } catch (e) {
        toast({ title: "Bulk Action Failed", variant: "destructive" });
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
        
        // Manual cleanup of pointer events to prevent UI lockup after hard deletion
        document.body.style.pointerEvents = 'auto';
        document.body.style.overflow = 'auto';
        
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

    const registryRef = doc(db, "settings", profile?.orgId || "registry");
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

  const handleSyncAllRoles = useCallback(async () => {
    if (!db || !effectiveOrgId || isSeedingRoles) return;
    setIsSeedingRoles(true);
    try {
      const batch = writeBatch(db);
      const allSystemRoles: Role[] = [...OPERATIVE_ROLES, ...MANAGEMENT_ROLES, 'Volunteer'];
      
      // Get existing template names/IDs
      const existingRoleNames = new Set(allRoleTemplates.map(t => t.name));
      
      let addedCount = 0;

      for (const roleName of allSystemRoles) {
        if (existingRoleNames.has(roleName)) continue;

        const roleId = roleName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        const docRef = doc(db, "organizations", effectiveOrgId, "role_templates", roleId);
        
        // Define baseline "Standard" permissions as requested
        const baselinePermissions: AccessPermissions = {
          ...getDefaultPermissionsForUser({ roles: [roleName] } as User),
          viewDashboard: true,
          viewMyTasks: true,
          viewParks: true,
          viewDepots: true,
          viewInfoCorner: true,
          viewIssues: true,
          viewInspections: true,
          viewAssets: true,
          viewEvents: true,
          viewProjects: true,
          viewOperational: true,
          viewSports: true,
          viewCalendar: true,
        };

        const baselineMobilePermissions: AccessPermissions = {
          ...getDefaultMobilePermissionsForUser({ roles: [roleName] } as User),
          viewDashboard: true,
          viewMyTasks: true,
          viewParks: true,
          viewDepots: true,
          viewInfoCorner: true,
        };
        
        batch.set(docRef, {
          id: roleId,
          name: roleName,
          description: `Standard baseline for ${roleName} accounts.`,
          orgId: effectiveOrgId,
          permissions: baselinePermissions,
          mobilePermissions: baselineMobilePermissions,
          isSystemRole: true,
          updatedAt: new Date().toISOString(),
          updatedBy: profile?.name || 'System Sync'
        });
        addedCount++;
      }

      if (addedCount > 0) {
        await batch.commit();
        toast({ title: "Roles Synchronized", description: `${addedCount} new role templates have been added with baseline permissions.` });
      }
    } catch (e) {
      console.error("Sync Error:", e);
    } finally {
      setIsSeedingRoles(false);
    }
  }, [db, effectiveOrgId, isSeedingRoles, allRoleTemplates, profile?.name, toast]);

  // Auto-sync missing roles when admin visits
  useEffect(() => {
    if (isAdmin && allRoleTemplates.length > 0 && effectiveOrgId && !isSeedingRoles) {
      const allSystemRoles = [...OPERATIVE_ROLES, ...MANAGEMENT_ROLES, 'Volunteer'];
      const existingRoleNames = new Set(allRoleTemplates.map(t => t.name));
      const hasMissing = allSystemRoles.some(r => !existingRoleNames.has(r));
      
      if (hasMissing) {
        handleSyncAllRoles();
      }
    }
  }, [isAdmin, allRoleTemplates.length, effectiveOrgId, handleSyncAllRoles, isSeedingRoles]);

  const handleSaveRole = async () => {
    if (!db || !effectiveOrgId || !selectedRole) return;
    setIsConfigSubmitting(true);
    try {
      const docRef = doc(db, "organizations", effectiveOrgId, "role_templates", selectedRole.id);
      await setDoc(docRef, {
        ...selectedRole,
        updatedAt: new Date().toISOString(),
        updatedBy: profile?.name || 'Admin'
      }, { merge: true });
      toast({ title: "Role Updated", description: `${selectedRole.name} template has been saved.` });
      setIsRoleEditorOpen(false);
    } catch (e) {
      toast({ title: "Error", description: "Failed to save role template.", variant: "destructive" });
    } finally {
      setIsConfigSubmitting(false);
    }
  };

  const handleUpdateRolePermission = (key: keyof AccessPermissions, value: boolean, platform: 'desktop' | 'mobile') => {
    if (!selectedRole) return;
    const target = platform === 'desktop' ? 'permissions' : 'mobilePermissions';
    const currentPerms = selectedRole[target] || (platform === 'desktop' ? getDefaultPermissionsForUser(null) : getDefaultMobilePermissionsForUser(null));
    
    setSelectedRole({
      ...selectedRole,
      [target]: { ...currentPerms, [key]: value }
    });
  };

  const handleUpdateRoleParkPermission = (sectionKey: ParkSectionKey, type: 'view' | 'edit', value: boolean) => {
    if (!selectedRole) return;
    const currentParkPerms = selectedRole.parkPermissions || {};
    const sectionPerms = currentParkPerms[sectionKey] || { view: false, edit: false };
    
    const newSectionPerms = { ...sectionPerms, [type]: value };
    // If edit is true, view must be true
    if (type === 'edit' && value === true) {
      newSectionPerms.view = true;
    }
    // If view is false, edit must be false
    if (type === 'view' && value === false) {
      newSectionPerms.edit = false;
    }

    setSelectedRole({
      ...selectedRole,
      parkPermissions: { ...currentParkPerms, [sectionKey]: newSectionPerms }
    });
  };

  const openUserProfile = async (user: User) => {
    setSelectedUser(user);
    setIsEditing(false);
    setIsProfileDialogOpen(true);

    // Initialize permission state from saved data or role-based defaults
    const desktopDefaults = getDefaultPermissionsForUser(user);
    const mobileDefaults = getDefaultMobilePermissionsForUser(user);
    setEditDesktopPerms(
      (user.permissions && Object.keys(user.permissions).length > 0)
        ? { ...desktopDefaults, ...user.permissions }
        : desktopDefaults
    );
    setEditMobilePerms(
      (user.mobilePermissions && Object.keys(user.mobilePermissions).length > 0)
        ? { ...mobileDefaults, ...user.mobilePermissions }
        : mobileDefaults
    );
    
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
        <div className="flex flex-wrap items-center gap-2">
          {selectedUserIds.length > 0 && (
            <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-dashed pr-2 animate-in slide-in-from-right-4">
              <Badge variant="secondary" className="bg-primary text-primary-foreground font-bold px-2 py-0.5">{selectedUserIds.length} Selected</Badge>
              <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase hover:bg-muted" onClick={() => setSelectedUserIds([])}>Cancel</Button>
              <Separator orientation="vertical" className="h-6" />
              <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase border-primary text-primary hover:bg-primary/5" onClick={handleBulkArchive}>
                <UserMinus className="mr-1.5 h-3 w-3" /> Archive
              </Button>
              <Button variant="destructive" size="sm" className="h-8 text-[10px] font-bold uppercase" onClick={handleBulkDelete}>
                <Trash2 className="mr-1.5 h-3 w-3" /> Delete
              </Button>
            </div>
          )}
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
          {isAdmin && <TabsTrigger value="roles" className="font-bold">Role Templates</TabsTrigger>}
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

        <Card className="bg-card border-2 shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase text-muted-foreground">Currently Online</span>
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <div className="text-3xl font-bold font-headline">
              {users.filter(u => {
                if (u.isArchived) return false;
                const lastActiveDate = u.lastActive ? new Date(u.lastActive) : null;
                return lastActiveDate && (new Date().getTime() - lastActiveDate.getTime() < 300000);
              }).length}
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search users by name, email, or role..." 
            className="pl-9 bg-background shadow-sm border-2 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoComplete="off"
          />
        </div>
        <Select value={activeCategory} onValueChange={setActiveCategory}>
          <SelectTrigger className="w-full sm:w-[220px] bg-background shadow-sm border-2 rounded-xl">
            <SelectValue placeholder="Filter by Role Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Active Staff</SelectItem>
            <SelectItem value="management">Management Staff</SelectItem>
            <SelectItem value="head_gardeners">Head Gardeners</SelectItem>
            <SelectItem value="gardeners">Gardeners</SelectItem>
            <SelectItem value="keepers">Keepers</SelectItem>
            <SelectItem value="contractors">Contractors</SelectItem>
            <SelectItem value="volunteers">Volunteers</SelectItem>
            <SelectItem value="other_ops">Other Operatives</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden border-2">
        <div className="overflow-x-auto w-full">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[50px] px-4">
                  <Checkbox 
                    checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedUserIds(filteredUsers.map((u: User) => u.id));
                      } else {
                        setSelectedUserIds([]);
                      }
                    }}
                  />
                </TableHead>
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
                filteredUsers.map((user: User) => (
                  <TableRow 
                    key={user.id} 
                    className={cn(
                        "hover:bg-muted/20 transition-colors cursor-pointer",
                        selectedUserIds.includes(user.id) ? "bg-primary/5 border-l-4 border-l-primary" : ""
                    )} 
                    onClick={() => openUserProfile(user)}
                  >
                    <TableCell className="px-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={selectedUserIds.includes(user.id)}
                        onCheckedChange={(checked) => {
                          setSelectedUserIds(prev => 
                            checked 
                              ? [...prev, user.id] 
                              : prev.filter(id => id !== user.id)
                          );
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10 border-2 border-primary/10">
                            <AvatarImage src={user.avatar || undefined} />
                            <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          {(() => {
                            const lastActiveDate = user.lastActive ? new Date(user.lastActive) : null;
                            const isOnline = lastActiveDate && (new Date().getTime() - lastActiveDate.getTime() < 300000); // 5 mins
                            return (
                              <div className={cn(
                                "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background flex items-center justify-center shadow-sm",
                                isOnline ? "bg-green-500" : "bg-red-500"
                              )}>
                                {isOnline ? (
                                  <Check className="h-2 w-2 text-white" />
                                ) : (
                                  <div className="h-1 w-1 bg-white rounded-full opacity-50" />
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="font-bold text-sm truncate flex items-center gap-2">
                            {user.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5 min-w-[150px]">
                        {user.assignedRoles && user.assignedRoles.length > 0 ? (
                           (user.assignedRoles || []).map((ar: AssignedRole, i: number) => (
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
                              {(user.roles || []).map((r: Role, i: number) => (
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
                      <TableRow key={user.id} className="hover:bg-accent/5 transition-colors cursor-pointer opacity-50 grayscale hover:grayscale-0" onClick={() => openUserProfile(user)}>
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
                          <div className="flex flex-wrap gap-1 max-w-[200px]">{(user.roles || []).map((r: Role, i: number) => <Badge key={i} className="font-bold text-[9px] uppercase" variant="outline">{r}</Badge>)}</div>
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

        <TabsContent value="roles" className="mt-0 pt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 px-1">
                <div>
                  <h3 className="text-lg font-headline font-bold">Organization Role Templates</h3>
                  <p className="text-xs text-muted-foreground font-medium">Define base permissions that automatically apply to staff types</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button variant="outline" className="flex-1 sm:flex-none font-bold text-xs" onClick={handleSyncAllRoles} disabled={isSeedingRoles}>
                    {isSeedingRoles ? <Clock className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-2 h-3.5 w-3.5" />}
                    Sync All Role Templates
                  </Button>
                  <Button className="flex-1 sm:flex-none font-headline font-bold" onClick={() => {
                    const newRole: RoleTemplate = {
                      id: `role-${Date.now()}`,
                      orgId: effectiveOrgId || '',
                      name: "New Role",
                      description: "",
                      permissions: getDefaultPermissionsForUser(null),
                      mobilePermissions: getDefaultMobilePermissionsForUser(null),
                      updatedAt: new Date().toISOString(),
                      updatedBy: profile?.name || ''
                    };
                    setSelectedRole(newRole);
                    setIsRoleEditorOpen(true);
                  }}>
                    <Plus className="mr-2 h-4 w-4" /> New Template
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-10">
                {allRoleTemplates.map(role => (
                  <Card key={role.id} className="p-4 border-2 hover:border-primary/40 transition-all hover:shadow-md group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold font-headline text-primary">{role.name}</h4>
                            {role.isSystemRole && <Badge variant="outline" className="text-[8px] uppercase h-4 px-1 opacity-60">System</Badge>}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium line-clamp-2 mt-1">{role.description || "No description provided."}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                        setSelectedRole(role);
                        setIsRoleEditorOpen(true);
                      }}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-auto">
                      {Object.entries(role.permissions)
                        .filter(([_, val]) => !!val)
                        .slice(0, 4)
                        .map(([key]) => (
                          <Badge key={key} variant="outline" className="text-[8px] uppercase font-bold bg-muted/20 border-primary/10">
                            {key.replace('view', '').replace('edit', '').replace('manage', '').replace(/([A-Z])/g, ' $1').trim()}
                          </Badge>
                        ))}
                      {Object.values(role.permissions).filter(v => !!v).length > 4 && (
                        <Badge variant="outline" className="text-[8px] font-bold bg-primary/5 text-primary">
                          +{Object.values(role.permissions).filter(v => !!v).length - 4} MORE
                        </Badge>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {allRoleTemplates.length === 0 && !rolesLoading && (
                <div className="text-center py-20 bg-muted/10 rounded-2xl border-2 border-dashed border-muted-foreground/20">
                   <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Shield className="h-8 w-8 text-muted-foreground/40" />
                   </div>
                   <h4 className="font-bold font-headline text-lg mb-1">No Role Templates</h4>
                   <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">Create templates to manage permissions for multiple staff members at once.</p>
                   <Button variant="outline" onClick={handleSyncAllRoles} className="font-bold shadow-sm">
                      <RotateCcw className="mr-2 h-4 w-4" /> Sync All Role Templates
                   </Button>
                </div>
              )}
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
                <Input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="e.g. David Jones" className="font-medium" autoComplete="off" />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Email Address</Label>
                <Input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="david.jones@hackney.gov.uk" className="font-medium" autoComplete="off" />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Initial Password</Label>
                <Input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="Min 6 characters" className="font-medium" autoComplete="new-password" />
                <p className="text-[9px] text-muted-foreground italic leading-tight">
                  <strong>Security Note:</strong> If this email was used before, the old password will remain active. The user must use &quot;Forgot Password&quot; on the login screen to reset it.
                </p>
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

            <div className="p-4 border rounded-xl bg-primary/5 flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Include on Staff Roster</Label>
                <p className="text-[10px] text-muted-foreground italic">If enabled, this user will appear in the shift planning grid.</p>
              </div>
              <Switch 
                checked={newUser.isOnRoster || false} 
                onCheckedChange={(v) => setNewUser({...newUser, isOnRoster: v})} 
              />
            </div>

            {/* Access & Permissions Section */}
            <div className="grid gap-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <Label className="text-sm font-bold">Access & Permissions</Label>
              </div>
              <p className="text-xs text-muted-foreground -mt-1">Set which pages and features this user can access. Defaults are based on the selected role.</p>

              {/* Initialize defaults button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit text-[10px] font-bold uppercase h-7"
                onClick={() => {
                  const tempUser = {
                    ...newUser,
                    id: 'temp',
                    name: newUser.name || '',
                    email: newUser.email || '',
                    roles: newUser.assignedRoles?.map(ar => ar.role) || newUser.roles || [],
                    depot: newUser.assignedRoles?.[0]?.depotIds?.[0] || '',
                  } as any;
                  setNewUserDesktopPerms(getDefaultPermissionsForUser(tempUser));
                  setNewUserMobilePerms(getDefaultMobilePermissionsForUser(tempUser));
                }}
              >
                Reset to Role Defaults
              </Button>

              {newUserDesktopPerms && newUserMobilePerms ? (
                <div className="space-y-4">
                  {/* Page Visibility */}
                  <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <div className="grid grid-cols-[1fr_80px_80px] bg-muted/50 border-b">
                      <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Page</div>
                      <div className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-0.5">
                        <Smartphone className="h-3 w-3" /> Mobile
                      </div>
                      <div className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-0.5">
                        <Monitor className="h-3 w-3" /> Desktop
                      </div>
                    </div>
                    {([
                      { key: 'viewDashboard', label: 'Dashboard' },
                      { key: 'viewMyTasks', label: 'My Tasks' },
                      { key: 'viewAllTasks', label: 'All Tasks' },
                      { key: 'viewIssues', label: 'Issues' },
                      { key: 'viewInspections', label: 'Inspections' },
                      { key: 'viewParks', label: 'Parks' },
                      { key: 'viewDepots', label: 'Depots' },
                      { key: 'viewAssets', label: 'Assets' },
                      { key: 'viewUsers', label: 'Users' },
                      { key: 'viewStaffRequests', label: 'Staff Requests' },
                      { key: 'viewMap', label: 'Map' },
                      { key: 'viewInfoCorner', label: 'Info Corner' },
                      { key: 'viewSmartTasking', label: 'Smart Tasking' },
                      { key: 'viewEvents', label: 'Events' },
                      { key: 'viewProjects', label: 'Projects' },
                      { key: 'viewDevelopment', label: 'Development' },
                      { key: 'viewOperational', label: 'Operational' },
                      { key: 'viewSports', label: 'Sports & Leisure' },
                      { key: 'viewCalendar', label: 'Master Calendar' },
                      { key: 'viewRoster', label: 'Staff Roster' },
                    ] as { key: keyof AccessPermissions; label: string }[]).map((item) => (
                      <div key={item.key} className="grid grid-cols-[1fr_80px_80px] border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                        <div className="px-3 py-2 text-xs font-medium">{item.label}</div>
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={newUserMobilePerms?.[item.key] || false}
                            onCheckedChange={(c) => {
                              setNewUserMobilePerms(prev => prev ? { ...prev, [item.key]: !!c } : prev);
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={newUserDesktopPerms?.[item.key] || false}
                            onCheckedChange={(c) => {
                              setNewUserDesktopPerms(prev => prev ? { ...prev, [item.key]: !!c } : prev);
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Feature Access */}
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { key: 'createTask', label: 'Create Tasks' },
                      { key: 'assignTask', label: 'Assign Tasks' },
                      { key: 'createIssue', label: 'Create Issues' },
                      { key: 'scheduleInspection', label: 'Schedule Inspections' },
                      { key: 'manageAssets', label: 'Manage Assets' },
                      { key: 'approveResolution', label: 'Approve Resolutions' },
                      { key: 'editParksFull', label: 'Edit Parks (Full)' },
                      { key: 'editDepotsFull', label: 'Edit Depots (Full)' },
                    ] as { key: keyof AccessPermissions; label: string }[]).map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => {
                          const newVal = !newUserDesktopPerms?.[item.key];
                          setNewUserDesktopPerms(prev => prev ? { ...prev, [item.key]: newVal } : prev);
                          setNewUserMobilePerms(prev => prev ? { ...prev, [item.key]: newVal } : prev);
                        }}
                      >
                        <Checkbox checked={newUserDesktopPerms?.[item.key] || false} onCheckedChange={() => {}} />
                        <span className="text-xs font-medium">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center text-[10px] font-bold uppercase opacity-30 border border-dashed rounded-xl">
                  Click &quot;Reset to Role Defaults&quot; to configure access, or permissions will auto-populate from role defaults on creation.
                </div>
              )}
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
                    {(selectedUser?.roles || []).map((r: Role, i: number) => (
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
                    
                    {isAdmin && (
                      <div className="grid gap-4 p-4 border-2 border-primary/20 rounded-xl bg-primary/5">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="h-4 w-4 text-primary" />
                          <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">System Security (Admin Only)</Label>
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-xs font-bold">User Password (Firestore Reference)</Label>
                          <Input 
                            value={selectedUser?.password || ""} 
                            onChange={e => selectedUser && setSelectedUser({...selectedUser, password: e.target.value})} 
                            className="font-medium bg-background" 
                            placeholder="Update password label..."
                          />
                          <div className="p-2 rounded bg-amber-50 border border-amber-200 space-y-1">
                            <p className="text-[9px] text-amber-700 font-bold uppercase flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> Security Warning
                            </p>
                            <p className="text-[9px] text-amber-600 leading-tight italic">
                              Firebase security prevents Admins from forcing password changes in Authentication. 
                              Updating this field only updates the text record. 
                              <strong> Staff must use &quot;Forgot Password&quot; on the login screen to truly change their password.</strong>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-4 border rounded-xl bg-primary/5 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-bold">Include on Staff Roster</Label>
                        <p className="text-[10px] text-muted-foreground italic">Enable to show this user in the visual shift planning grid.</p>
                      </div>
                      <Switch 
                        checked={selectedUser?.isOnRoster || false} 
                        onCheckedChange={(v) => isEditing && selectedUser && setSelectedUser({...selectedUser, isOnRoster: v})} 
                        disabled={!isEditing}
                      />
                    </div>
                    
                    <Separator className="my-2" />

                    {/* Role Template Assignments */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Role Template Assignments</Label>
                      </div>
                      <div className="grid grid-cols-2 gap-2 p-4 border rounded-xl bg-muted/5">
                        {allRoleTemplates.map(template => {
                          const isAssigned = (selectedUser?.roleIds || []).includes(template.id);
                          return (
                            <div 
                              key={template.id} 
                              className={cn(
                                "flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer group/role",
                                isAssigned ? "border-primary bg-primary/5" : "border-transparent bg-muted/20 hover:bg-muted/40"
                              )}
                              onClick={() => {
                                if (!selectedUser || !isEditing) return;
                                const currentIds = selectedUser.roleIds || [];
                                const newIds = isAssigned 
                                  ? currentIds.filter(id => id !== template.id)
                                  : [...currentIds, template.id];
                                selectedUser && setSelectedUser({...selectedUser, roleIds: newIds});
                              }}
                            >
                              <div className="flex flex-col min-w-0 pr-2">
                                <span className="text-[11px] font-bold truncate">{template.name}</span>
                                <span className="text-[9px] text-muted-foreground line-clamp-1">{template.description}</span>
                              </div>
                              <div className={cn(
                                "h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors",
                                isAssigned ? "border-primary bg-primary" : "border-muted-foreground/30 group-hover/role:border-muted-foreground/50"
                              )}>
                                {isAssigned && <Check className="h-3 w-3 text-white" />}
                              </div>
                            </div>
                          );
                        })}
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
                              const roles = [...(selectedUser.assignedRoles || [{ role: (selectedUser.role || selectedUser.roles?.[0] || 'Gardener') as Role, depotIds: selectedUser.depots || (selectedUser.depot ? [selectedUser.depot] : []) }])];
                              roles[0] = { ...roles[0], role: v as Role };
                              selectedUser && setSelectedUser({...selectedUser, assignedRoles: roles});
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
                                  selectedUser && setSelectedUser({...selectedUser, assignedRoles: roles});
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
                              selectedUser && setSelectedUser({...selectedUser, assignedRoles: roles});
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
                                  selectedUser && setSelectedUser({...selectedUser, assignedRoles: roles});
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
                                    selectedUser && setSelectedUser({...selectedUser, assignedRoles: roles});
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
                                        selectedUser && setSelectedUser({...selectedUser, assignedRoles: roles});
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
                        {Array.from(new Set([...trainingOptions.map((t: string) => t.trim()), ...selectedTrainings.map((t: string) => t.trim())])).sort().map((option: string) => {
                          const isUnregistered = !trainingOptions.some((ref: string) => ref.trim() === option.trim());
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
                        {selectedUser?.assignedRoles?.map((ar: AssignedRole, i: number) => (
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
                          {selectedUser?.phone && (
                            <div className="p-4 border rounded-xl bg-card shadow-sm flex flex-col gap-1">
                              <span className="text-[10px] font-bold uppercase text-muted-foreground">Phone Number</span>
                              <span className="text-sm font-bold">{selectedUser.phone}</span>
                            </div>
                          )}
                          {selectedUser?.radioCallSign && (
                            <div className="p-4 border rounded-xl bg-card shadow-sm flex flex-col gap-1">
                              <span className="text-[10px] font-bold uppercase text-muted-foreground">Radio Call Sign</span>
                              <span className="text-sm font-bold">{selectedUser.radioCallSign}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {isAdmin && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-60">System Access (Admin Only)</h4>
                        </div>
                        <div className="p-4 border-2 border-primary/20 rounded-xl bg-primary/5 flex flex-col gap-1 shadow-sm">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground">Current Password</span>
                          <span className="text-sm font-mono font-bold tracking-widest">{selectedUser?.password || 'None Set'}</span>
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
      {/* Role Editor Dialog */}
      <Dialog open={isRoleEditorOpen} onOpenChange={setIsRoleEditorOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] h-[800px] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
          <DialogHeader className="p-6 pb-0 shrink-0">
            <DialogTitle className="font-headline text-xl">Role Template Editor</DialogTitle>
            <DialogDescription>Define baseline permissions for all users assigned to this role.</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 px-6 py-4">
            {selectedRole && (
              <div className="space-y-8">
                <div className="grid gap-6">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Role Name</Label>
                    <Input 
                      value={selectedRole.name} 
                      onChange={e => setSelectedRole({...selectedRole, name: e.target.value})} 
                      placeholder="e.g. Area Manager"
                      className="font-bold"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Description</Label>
                    <Textarea 
                      value={selectedRole.description} 
                      onChange={e => setSelectedRole({...selectedRole, description: e.target.value})} 
                      placeholder="What does this role do?"
                      className="resize-none h-20"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center justify-between border-b pb-2">
                      <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">Feature Access Grid</Label>
                      <div className="flex gap-4 text-[9px] font-bold uppercase text-muted-foreground">
                        <span className="w-12 text-center">Mobile</span>
                        <span className="w-12 text-center">Desktop</span>
                      </div>
                   </div>

                   <div className="space-y-1">
                      {([
                        { key: 'viewDashboard', label: 'Dashboard' },
                        { key: 'viewMyTasks', label: 'My Tasks' },
                        { key: 'viewAllTasks', label: 'All Tasks Hub' },
                        { key: 'viewIssues', label: 'Issue Register' },
                        { key: 'viewInspections', label: 'Inspections' },
                        { key: 'viewParks', label: 'Parks Management' },
                        { key: 'viewDepots', label: 'Depot Controls' },
                        { key: 'viewAssets', label: 'Asset Register' },
                        { key: 'viewUsers', label: 'Staff Management' },
                        { key: 'viewEvents', label: 'Events Hub' },
                        { key: 'viewProjects', label: 'Projects Hub' },
                        { key: 'viewOperational', label: 'Operational Hub' },
                        { key: 'viewSports', label: 'Sports & Leisure' },
                        { key: 'viewCalendar', label: 'Master Calendar' },
                        { key: 'viewRoster', label: 'Staff Roster' },
                        { key: 'viewSmartTasking', label: 'Smart Tasking' },
                        { key: 'viewVolunteering', label: 'Volunteering Portal' },
                        { key: 'createTask', label: 'Create Tasks' },
                        { key: 'assignTask', label: 'Assign Staff' },
                        { key: 'createIssue', label: 'Raise Issues' },
                        { key: 'manageAssets', label: 'Edit Infrastructure' },
                        { key: 'editParksFull', label: 'Admin: Edit Park Data' },
                        { key: 'manageInfoCorner', label: 'Manage Info Corner' },
                      ] as { key: keyof AccessPermissions; label: string }[]).map((item) => {
                        if (!selectedRole) return null;
                        return (
                          <div key={item.key} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors border-b border-dashed last:border-0">
                            <span className="text-xs font-medium">{item.label}</span>
                            <div className="flex gap-4">
                              <div className="w-12 flex justify-center">
                                <Switch 
                                  checked={selectedRole.mobilePermissions?.[item.key] ?? selectedRole.permissions?.[item.key]} 
                                  onCheckedChange={(v) => handleUpdateRolePermission(item.key, v, 'mobile')}
                                />
                              </div>
                              <div className="w-12 flex justify-center">
                                <Switch 
                                  checked={selectedRole.permissions?.[item.key]} 
                                  onCheckedChange={(v) => handleUpdateRolePermission(item.key, v, 'desktop')}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                   </div>
                </div>

                {/* Park Info Section Permissions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                      <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">Park Registry Section Access</Label>
                      <div className="flex gap-4 text-[9px] font-bold uppercase text-muted-foreground">
                        <span className="w-12 text-center">View</span>
                        <span className="w-12 text-center">Edit</span>
                      </div>
                  </div>

                  <div className="space-y-1">
                    {PARK_SECTIONS.map((section) => {
                      if (!selectedRole) return null;
                      const perms = selectedRole.parkPermissions?.[section.key] || { view: false, edit: false };
                      return (
                        <div key={section.key} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors border-b border-dashed last:border-0">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium">{section.label}</span>
                            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Section {section.number}</span>
                          </div>
                          <div className="flex gap-4">
                            <div className="w-12 flex justify-center">
                              <Switch 
                                checked={perms.view} 
                                onCheckedChange={(v) => handleUpdateRoleParkPermission(section.key, 'view', v)}
                              />
                            </div>
                            <div className="w-12 flex justify-center">
                              <Switch 
                                checked={perms.edit} 
                                onCheckedChange={(v) => handleUpdateRoleParkPermission(section.key, 'edit', v)}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="p-6 bg-muted/30 border-t shrink-0">
            <Button variant="ghost" onClick={() => setIsRoleEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRole} disabled={isConfigSubmitting}>
              {isConfigSubmitting && <Clock className="mr-2 h-4 w-4 animate-spin" />}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
