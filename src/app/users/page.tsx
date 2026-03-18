
"use client";

import { useState, useRef, useMemo, useEffect } from "react";
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
  Shield, 
  Mail, 
  MoreHorizontal, 
  Car, 
  Award, 
  Camera, 
  X, 
  Edit2,
  Briefcase,
  Clock,
  Users as UsersIcon,
  Filter,
  UserMinus,
  Settings2,
  Check,
  Trash2
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
import { User, Role, Task } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, addDoc, updateDoc, doc, query, where, setDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function UserManagement() {
  const { toast } = useToast();
  const db = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  
  // LIVE RECURRING CONFIGURATION
  const registryConfigRef = useMemo(() => db ? doc(db, "settings", "registry") : null, [db]);
  const { data: registryConfig, loading: configLoading } = useDoc<any>(registryConfigRef);

  const teams = registryConfig?.teams || ["North Parks", "South Parks", "Central Management"];
  const trainingOptions = registryConfig?.trainingOptions || [
    "Health & Safety",
    "Equipment Handling",
    "First Aid",
    "Pesticide Application",
    "Chain Saw Operation"
  ];

  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "users"), where("isArchived", "==", false));
  }, [db]);
  const { data: users = [], loading: usersLoading } = useCollection<User>(usersQuery);

  const tasksQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "tasks");
  }, [db]);
  const { data: allTasks = [] } = useCollection<Task>(tasksQuery);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'all' | 'operative' | 'management'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Selection States
  const [selectedTrainings, setSelectedTrainings] = useState<string[]>([]);
  const [configNewTeam, setConfigNewTeam] = useState("");
  const [configNewTraining, setConfigNewTraining] = useState("");

  const [newUser, setNewUser] = useState<Partial<User>>({
    name: '',
    email: '',
    role: 'operative',
    team: '',
    training: '',
    isDriver: false,
    isRoSPATrained: false,
    avatar: '',
    isArchived: false
  });

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (roleFilter === 'all') return true;
      if (roleFilter === 'operative') return user.role === 'operative';
      if (roleFilter === 'management') return user.role !== 'operative';
      return true;
    });
  }, [users, roleFilter]);

  const syncTrainingState = (trainingString: string | undefined | null) => {
    const str = trainingString || "";
    const parts = str ? str.split(',').map(s => s.trim()) : [];
    setSelectedTrainings(parts);
  };

  const getFinalTrainingString = () => {
    return selectedTrainings.join(', ');
  };

  const toggleTraining = (training: string) => {
    setSelectedTrainings(prev => 
      prev.includes(training) ? prev.filter(t => t !== training) : [...prev, training]
    );
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'master': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      case 'supervisor': return 'bg-primary/10 text-primary border-primary/20';
      case 'operative': return 'bg-accent text-accent-foreground';
      default: return '';
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEdit && selectedUser) {
          setSelectedUser({ ...selectedUser, avatar: reader.result as string });
        } else {
          setNewUser(prev => ({ ...prev, avatar: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddUser = () => {
    if (!db || isSubmitting) return;
    
    setIsSubmitting(true);
    const trainingString = getFinalTrainingString() || "None";
    const userToSave = {
      ...newUser,
      name: newUser.name || "Unknown User",
      email: newUser.email || "",
      training: trainingString,
      isArchived: false,
      createdAt: new Date().toISOString()
    };

    setIsAddDialogOpen(false);
    setNewUser({ name: '', email: '', role: 'operative', team: '', training: '', isDriver: false, isRoSPATrained: false, avatar: '', isArchived: false });
    setSelectedTrainings([]);

    addDoc(collection(db, "users"), userToSave)
      .then(() => {
        setIsSubmitting(false);
        toast({ title: "User Added", description: `${userToSave.name} has been added to the register.` });
      })
      .catch(async (e) => {
        setIsSubmitting(false);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'users',
          operation: 'create',
          requestResourceData: userToSave
        }));
      });
  };

  const handleUpdateUser = () => {
    if (!db || !selectedUser || isSubmitting) return;
    
    setIsSubmitting(true);
    const trainingString = getFinalTrainingString() || "None";
    const updatedData = {
      ...selectedUser,
      training: trainingString
    };

    updateDoc(doc(db, "users", selectedUser.id), updatedData)
      .then(() => {
        setIsEditing(false);
        setIsSubmitting(false);
        toast({ title: "Profile Updated", description: "Changes saved successfully." });
      })
      .catch(async (e) => {
         setIsSubmitting(false);
         errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `users/${selectedUser.id}`,
          operation: 'update',
          requestResourceData: updatedData
        }));
      });
  };

  const handleArchiveUser = () => {
    if (!db || !selectedUser || isSubmitting) return;
    
    setIsSubmitting(true);
    const archiveData = { isArchived: true };
    
    updateDoc(doc(db, "users", selectedUser.id), archiveData)
      .then(() => {
        setIsProfileDialogOpen(false);
        setSelectedUser(null);
        setIsSubmitting(false);
        toast({ title: "User Archived", description: "Staff member moved to archives." });
      })
      .catch(async (e) => {
        setIsSubmitting(false);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `users/${selectedUser.id}`,
          operation: 'update',
          requestResourceData: archiveData
        }));
      });
  };

  const handleSaveConfig = (newTeams: string[], newTraining: string[]) => {
    if (!db) return;
    setDoc(doc(db, "settings", "registry"), {
      teams: newTeams,
      trainingOptions: newTraining
    });
    toast({ title: "Configuration Updated", description: "Registry options have been saved." });
  };

  const openUserProfile = (user: User) => {
    setSelectedUser(user);
    syncTrainingState(user.training);
    setIsEditing(false);
    setIsProfileDialogOpen(true);
  };

  const userTasks = selectedUser 
    ? allTasks.filter(t => t.assignedTo === selectedUser.name)
    : [];

  return (
    <DashboardShell 
      title="User Management" 
      description="Control system access and assign operative roles"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" className="font-bold" onClick={() => setIsConfigDialogOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" /> Configure Registry
          </Button>
          <Button className="font-headline font-bold" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 md:grid-cols-3 mb-8">
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
            <div className="text-3xl font-bold font-headline">{users.length}</div>
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
              {users.filter(u => u.role === 'operative').length}
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
              {users.filter(u => u.role !== 'operative').length}
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
                      <div className="flex flex-col gap-1">
                        <Badge className={`${getRoleColor(user.role)} font-bold text-[9px] uppercase w-fit`} variant="outline">
                          {user.role}
                        </Badge>
                        <span className="text-[10px] font-bold text-muted-foreground">{user.team}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] font-bold text-foreground line-clamp-2">{user.training || 'None'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.isDriver && <Car className="h-4 w-4 text-blue-600" />}
                        {user.isRoSPATrained && <Award className="h-4 w-4 text-yellow-600" />}
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
                  if (configNewTeam) {
                    handleSaveConfig([...teams, configNewTeam], trainingOptions);
                    setConfigNewTeam("");
                  }
                }}><Plus className="h-4 w-4" /></Button>
              </div>
              <ScrollArea className="h-[200px] border rounded-md p-2">
                {teams.map(team => (
                  <div key={team} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                    <span className="text-sm">{team}</span>
                    <Button variant="ghost" size="icon" onClick={() => handleSaveConfig(teams.filter(t => t !== team), trainingOptions)}>
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
                  if (configNewTraining) {
                    handleSaveConfig(teams, [...trainingOptions, configNewTraining]);
                    setConfigNewTraining("");
                  }
                }}><Plus className="h-4 w-4" /></Button>
              </div>
              <ScrollArea className="h-[200px] border rounded-md p-2">
                {trainingOptions.map(opt => (
                  <div key={opt} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                    <span className="text-sm">{opt}</span>
                    <Button variant="ghost" size="icon" onClick={() => handleSaveConfig(teams, trainingOptions.filter(t => t !== opt))}>
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
          </DialogHeader>
          <div className="grid gap-6 py-4">
             <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Full Name</Label>
                <Input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="e.g. David Jones" />
              </div>
              <div className="grid gap-2">
                <Label>Email Address</Label>
                <Input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="david.jones@hackney.gov.uk" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select value={newUser.role} onValueChange={(v: Role) => setNewUser({...newUser, role: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operative">Field Operative</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="master">System Master</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Team / Department</Label>
                <Select value={newUser.team} onValueChange={v => setNewUser({...newUser, team: v})}>
                  <SelectTrigger><SelectValue placeholder="Select Team" /></SelectTrigger>
                  <SelectContent>
                    {teams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
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
            <Button className="w-full font-bold" onClick={handleAddUser} disabled={!newUser.name || !newUser.email || isSubmitting}>
              {isSubmitting ? "Creating..." : "Create User Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Profile / Edit Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <div className="p-6 pb-0">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                 <Avatar className="h-16 w-16 border-2 border-primary/20">
                  <AvatarImage src={selectedUser?.avatar || undefined} />
                  <AvatarFallback>{selectedUser?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-2xl font-headline font-bold">{selectedUser?.name}</DialogTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={getRoleColor(selectedUser?.role || '')} variant="outline">{selectedUser?.role}</Badge>
                    <span className="text-xs font-medium text-muted-foreground">• {selectedUser?.team}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="font-bold text-destructive hover:bg-destructive/10" onClick={handleArchiveUser} disabled={isSubmitting}>
                  <UserMinus className="mr-2 h-4 w-4" /> Archive Staff
                </Button>
                <Button variant={isEditing ? "outline" : "default"} size="sm" className="font-bold" onClick={() => setIsEditing(!isEditing)}>
                  {isEditing ? <X className="mr-2 h-4 w-4" /> : <Edit2 className="mr-2 h-4 w-4" />}
                  {isEditing ? "Cancel" : "Edit"}
                </Button>
              </div>
            </div>
          </div>

          <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col mt-4">
            <TabsList className="mx-6 justify-start h-10 bg-transparent border-b rounded-none p-0 gap-6">
              <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 font-bold">Overview</TabsTrigger>
              <TabsTrigger value="tasks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 font-bold">Tasks ({userTasks.length})</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 p-6">
              <TabsContent value="overview" className="mt-0 space-y-6">
                {isEditing ? (
                  <div className="grid gap-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Full Name</Label>
                        <Input value={selectedUser?.name} onChange={e => selectedUser && setSelectedUser({...selectedUser, name: e.target.value})} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Email</Label>
                        <Input value={selectedUser?.email} onChange={e => selectedUser && setSelectedUser({...selectedUser, email: e.target.value})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Role</Label>
                        <Select value={selectedUser?.role} onValueChange={(v: Role) => selectedUser && setSelectedUser({...selectedUser, role: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="operative">Operative</SelectItem>
                            <SelectItem value="supervisor">Supervisor</SelectItem>
                            <SelectItem value="master">Master</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Team</Label>
                        <Select value={selectedUser?.team} onValueChange={v => selectedUser && setSelectedUser({...selectedUser, team: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {teams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid gap-3">
                      <Label className="text-sm font-bold">Training and Certifications</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border rounded-lg p-4 bg-muted/10">
                        {trainingOptions.map((option) => (
                          <div key={option} className="flex items-center space-x-2">
                            <Checkbox id={`edit-${option}`} checked={selectedTrainings.includes(option)} onCheckedChange={() => toggleTraining(option)} />
                            <label htmlFor={`edit-${option}`} className="text-sm font-medium cursor-pointer">{option}</label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border p-4 rounded-lg bg-muted/20">
                      <div className="flex items-center justify-between">
                        <Label>Fleet Driver</Label>
                        <Switch checked={selectedUser?.isDriver} onCheckedChange={v => selectedUser && setSelectedUser({...selectedUser, isDriver: v})} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>RoSPA Certified</Label>
                        <Switch checked={selectedUser?.isRoSPATrained} onCheckedChange={v => selectedUser && setSelectedUser({...selectedUser, isRoSPATrained: v})} />
                      </div>
                    </div>
                    <Button onClick={handleUpdateUser} className="w-full font-bold" disabled={isSubmitting}>
                      {isSubmitting ? "Saving..." : "Save Profile Changes"}
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg bg-card">
                        <div className="flex items-center gap-3 text-primary mb-2">
                          <Briefcase className="h-4 w-4" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">Department</h4>
                        </div>
                        <p className="text-sm font-semibold">{selectedUser?.team}</p>
                      </div>
                      <div className="p-4 border rounded-lg bg-card">
                        <div className="flex items-center gap-3 text-primary mb-2">
                          <Shield className="h-4 w-4" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">Certifications</h4>
                        </div>
                        <p className="text-sm font-semibold whitespace-pre-line">{selectedUser?.training}</p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="tasks" className="mt-0">
                {userTasks.length > 0 ? (
                  <div className="grid gap-3">
                    {userTasks.map(task => (
                      <div key={task.id} className="p-4 border rounded-lg">
                        <h5 className="font-bold text-sm">{task.title}</h5>
                        <p className="text-xs text-muted-foreground mt-1">{task.objective}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <p className="text-sm font-medium">No tasks assigned.</p>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
