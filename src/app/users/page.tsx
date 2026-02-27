
"use client";

import { useState, useRef, useMemo } from "react";
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
  CheckCircle2,
  Clock,
  UserPlus,
  Users as UsersIcon,
  Filter
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useFirestore, useCollection } from "@/firebase";
import { collection, addDoc, updateDoc, doc, query, where } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const TRAINING_OPTIONS = [
  "Health & Safety",
  "Equipment Handling",
  "First Aid",
  "Pesticide Application",
  "Chain Saw Operation"
];

export default function UserManagement() {
  const { toast } = useToast();
  const db = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  
  // Firebase Data
  const usersQuery = useMemo(() => {
    if (!db) return null;
    return collection(db, "users");
  }, [db]);
  const { data: users = [], loading: usersLoading } = useCollection<User>(usersQuery);

  const tasksQuery = useMemo(() => {
    if (!db) return null;
    return collection(db, "tasks");
  }, [db]);
  const { data: allTasks = [] } = useCollection<Task>(tasksQuery);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'all' | 'operative' | 'management'>('all');
  
  const [selectedTrainings, setSelectedTrainings] = useState<string[]>([]);
  const [otherTraining, setOtherTraining] = useState("");
  const [isOtherChecked, setIsOtherChecked] = useState(false);

  const [newUser, setNewUser] = useState<Partial<User>>({
    name: '',
    email: '',
    role: 'operative',
    team: '',
    training: '',
    isDriver: false,
    isRoSPATrained: false,
    avatar: ''
  });

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (roleFilter === 'all') return true;
      if (roleFilter === 'operative') return user.role === 'operative';
      if (roleFilter === 'management') return user.role !== 'operative';
      return true;
    });
  }, [users, roleFilter]);

  const syncTrainingState = (trainingString: string) => {
    const parts = trainingString ? trainingString.split(',').map(s => s.trim()) : [];
    const standard = parts.filter(p => TRAINING_OPTIONS.includes(p));
    const others = parts.filter(p => !TRAINING_OPTIONS.includes(p));
    
    setSelectedTrainings(standard);
    if (others.length > 0) {
      setIsOtherChecked(true);
      setOtherTraining(others.join(', '));
    } else {
      setIsOtherChecked(false);
      setOtherTraining("");
    }
  };

  const getFinalTrainingString = () => {
    let combined = [...selectedTrainings];
    if (isOtherChecked && otherTraining) {
      combined.push(otherTraining);
    }
    return combined.join(', ');
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
    if (!db) return;
    
    const trainingString = getFinalTrainingString() || "None";
    const userToSave = {
      ...newUser,
      training: trainingString,
      createdAt: new Date().toISOString()
    };

    addDoc(collection(db, "users"), userToSave)
      .then(() => {
        setIsAddDialogOpen(false);
        setNewUser({ name: '', email: '', role: 'operative', team: '', training: '', isDriver: false, isRoSPATrained: false, avatar: '' });
        setSelectedTrainings([]);
        setOtherTraining("");
        setIsOtherChecked(false);
        toast({ title: "User Added", description: `${newUser.name} has been added to the system.` });
      })
      .catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'users',
          operation: 'create',
          requestResourceData: userToSave
        }));
      });
  };

  const handleUpdateUser = () => {
    if (!db || !selectedUser) return;
    
    const trainingString = getFinalTrainingString() || "None";
    const updatedData = {
      ...selectedUser,
      training: trainingString
    };

    updateDoc(doc(db, "users", selectedUser.id), updatedData)
      .then(() => {
        setIsEditing(false);
        toast({ title: "Profile Updated", description: `Changes to ${selectedUser.name}'s profile saved.` });
      })
      .catch(async (e) => {
         errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `users/${selectedUser.id}`,
          operation: 'update',
          requestResourceData: updatedData
        }));
      });
  };

  const openUserProfile = (user: User) => {
    setSelectedUser(user);
    syncTrainingState(user.training || "");
    setIsEditing(false);
    setIsProfileDialogOpen(true);
  };

  const openAddDialog = () => {
    setNewUser({ name: '', email: '', role: 'operative', team: '', training: '', isDriver: false, isRoSPATrained: false, avatar: '' });
    setSelectedTrainings([]);
    setOtherTraining("");
    setIsOtherChecked(false);
    setIsAddDialogOpen(true);
  };

  const userTasks = selectedUser 
    ? allTasks.filter(t => t.assignedTo === selectedUser.name)
    : [];

  return (
    <DashboardShell 
      title="User Management" 
      description="Control system access and assign operative roles"
      actions={
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <Button className="font-headline font-bold" onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Button>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-headline">Add New System User</DialogTitle>
              <DialogDescription>Create a new operative or management profile.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="flex justify-center">
                <div className="relative group">
                  <Avatar className="h-24 w-24 border-4 border-muted cursor-pointer transition-opacity group-hover:opacity-70" onClick={() => fileInputRef.current?.click()}>
                    <AvatarImage src={newUser.avatar || undefined} />
                    <AvatarFallback className="text-2xl font-bold bg-muted text-muted-foreground">
                      {newUser.name ? newUser.name.charAt(0) : <Camera className="h-8 w-8" />}
                    </AvatarFallback>
                  </Avatar>
                  {newUser.avatar && (
                    <Button 
                      size="icon" 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={() => setNewUser(prev => ({...prev, avatar: ''}))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e)} />
                </div>
              </div>

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
                    <SelectTrigger>
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operative">Field Operative</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="master">System Master</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Team / Department</Label>
                  <Input value={newUser.team} onChange={e => setNewUser({...newUser, team: e.target.value})} placeholder="e.g. North Parks" />
                </div>
              </div>

              <div className="grid gap-3">
                <Label className="text-sm font-bold">Training and Certifications</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border rounded-lg p-4 bg-muted/10">
                  {TRAINING_OPTIONS.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`training-${option}`} 
                        checked={selectedTrainings.includes(option)}
                        onCheckedChange={() => toggleTraining(option)}
                      />
                      <label htmlFor={`training-${option}`} className="text-sm font-medium leading-none cursor-pointer">
                        {option}
                      </label>
                    </div>
                  ))}
                  <div className="flex items-center space-x-2 col-span-full mt-2">
                    <Checkbox 
                      id="training-other" 
                      checked={isOtherChecked}
                      onCheckedChange={(v) => setIsOtherChecked(!!v)}
                    />
                    <label htmlFor="training-other" className="text-sm font-medium leading-none cursor-pointer">
                      Other
                    </label>
                  </div>
                  {isOtherChecked && (
                    <div className="col-span-full mt-1">
                      <Input 
                        placeholder="Enter other certification..." 
                        value={otherTraining}
                        onChange={(e) => setOtherTraining(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 border rounded-lg p-4 bg-muted/20">
                <div className="flex items-center justify-between space-x-2">
                  <div className="flex flex-col gap-0.5">
                    <Label className="flex items-center gap-2">
                      <Car className="h-4 w-4" /> Valid Driver
                    </Label>
                    <p className="text-[10px] text-muted-foreground">Certified for fleet vehicles</p>
                  </div>
                  <Switch checked={newUser.isDriver} onCheckedChange={v => setNewUser({...newUser, isDriver: v})} />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <div className="flex flex-col gap-0.5">
                    <Label className="flex items-center gap-2">
                      <Award className="h-4 w-4" /> RoSPA Trained
                    </Label>
                    <p className="text-[10px] text-muted-foreground">Play area safety certification</p>
                  </div>
                  <Switch checked={newUser.isRoSPATrained} onCheckedChange={v => setNewUser({...newUser, isRoSPATrained: v})} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button className="w-full font-bold" onClick={handleAddUser} disabled={!newUser.name || !newUser.email}>Create User Profile</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between mb-1">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Total Active Users</CardTitle>
              <UsersIcon className={cn("h-4 w-4", roleFilter === 'all' ? "text-primary" : "text-muted-foreground")} />
            </div>
            <div className="text-3xl font-bold font-headline">{users.length}</div>
          </CardHeader>
        </Card>
        
        <Card 
          className={cn(
            "transition-all cursor-pointer border-2 hover:shadow-md",
            roleFilter === 'operative' ? "bg-accent/20 border-accent" : "bg-card border-border"
          )}
          onClick={() => setRoleFilter('operative')}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between mb-1">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Field Operatives</CardTitle>
              <Briefcase className={cn("h-4 w-4", roleFilter === 'operative' ? "text-accent-foreground" : "text-muted-foreground")} />
            </div>
            <div className="text-3xl font-bold font-headline">
              {users.filter(u => u.role === 'operative').length}
            </div>
          </CardHeader>
        </Card>

        <Card 
          className={cn(
            "transition-all cursor-pointer border-2 hover:shadow-md",
            roleFilter === 'management' ? "bg-muted/50 border-muted-foreground/30" : "bg-card border-border"
          )}
          onClick={() => setRoleFilter('management')}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between mb-1">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Management Staff</CardTitle>
              <Shield className={cn("h-4 w-4", roleFilter === 'management' ? "text-foreground" : "text-muted-foreground")} />
            </div>
            <div className="text-3xl font-bold font-headline">
              {users.filter(u => u.role !== 'operative').length}
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
          <Filter className="h-3.5 w-3.5" />
          Current View: {roleFilter === 'all' ? 'All Users' : roleFilter === 'operative' ? 'Field Operatives' : 'Management'}
        </div>
        {roleFilter !== 'all' && (
          <Button variant="ghost" size="sm" onClick={() => setRoleFilter('all')} className="h-7 text-[10px] uppercase font-bold">
            Clear Filter
          </Button>
        )}
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
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
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
                      <div className="flex flex-col gap-1 max-w-[200px]">
                        <span className="text-[10px] font-bold text-foreground line-clamp-2">{user.training || 'None'}</span>
                        <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase">
                          <Shield className="h-3 w-3" />
                          {user.role === 'master' ? 'Full Control' : user.role === 'supervisor' ? 'Team Access' : 'Personal Tasks'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.isDriver && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="p-1 rounded bg-blue-50 text-blue-600 border border-blue-100 cursor-help">
                                <Car className="h-4 w-4" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Authorized Fleet Driver</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {user.isRoSPATrained && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="p-1 rounded bg-yellow-50 text-yellow-600 border border-yellow-100 cursor-help">
                                <Award className="h-4 w-4" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>RoSPA Safety Certified</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {!user.isDriver && !user.isRoSPATrained && <span className="text-[10px] text-muted-foreground italic">None</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => openUserProfile(user)}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Manage user profile and assignments</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                 <Avatar className="h-16 w-16 border-2 border-primary/20">
                  <AvatarImage src={selectedUser?.avatar || undefined} />
                  <AvatarFallback className="text-xl font-bold">{selectedUser?.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-2xl font-headline font-bold">{selectedUser?.name}</DialogTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`${getRoleColor(selectedUser?.role || '')} font-bold text-[10px] uppercase`}>
                      {selectedUser?.role}
                    </Badge>
                    <span className="text-xs font-medium text-muted-foreground">• {selectedUser?.team}</span>
                  </div>
                </div>
              </div>
              <Button 
                variant={isEditing ? "outline" : "default"} 
                size="sm" 
                className="font-bold"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? <X className="mr-2 h-4 w-4" /> : <Edit2 className="mr-2 h-4 w-4" />}
                {isEditing ? "Cancel Edit" : "Edit Profile"}
              </Button>
            </div>
          </DialogHeader>

          <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col mt-4">
            <TabsList className="mx-6 justify-start h-10 bg-transparent border-b rounded-none p-0 gap-6">
              <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 font-bold">Overview</TabsTrigger>
              <TabsTrigger value="tasks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 font-bold">Assigned Tasks ({userTasks.length})</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 p-6">
              <TabsContent value="overview" className="mt-0 space-y-6">
                {isEditing ? (
                  <div className="grid gap-6">
                    <div className="flex justify-center mb-2">
                       <div className="relative group">
                        <Avatar className="h-20 w-20 border-2 border-muted cursor-pointer hover:opacity-80" onClick={() => editFileInputRef.current?.click()}>
                          <AvatarImage src={selectedUser?.avatar || undefined} />
                          <AvatarFallback><Camera className="h-6 w-6" /></AvatarFallback>
                        </Avatar>
                        <input type="file" ref={editFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, true)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Full Name</Label>
                        <Input 
                          value={selectedUser?.name} 
                          onChange={e => selectedUser && setSelectedUser({...selectedUser, name: e.target.value})} 
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Email</Label>
                        <Input 
                          value={selectedUser?.email} 
                          onChange={e => selectedUser && setSelectedUser({...selectedUser, email: e.target.value})} 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Role</Label>
                        <Select 
                          value={selectedUser?.role} 
                          onValueChange={(v: Role) => selectedUser && setSelectedUser({...selectedUser, role: v})}
                        >
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
                        <Input 
                          value={selectedUser?.team} 
                          onChange={e => selectedUser && setSelectedUser({...selectedUser, team: e.target.value})} 
                        />
                      </div>
                    </div>
                    
                    <div className="grid gap-3">
                      <Label className="text-sm font-bold">Training and Certifications</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border rounded-lg p-4 bg-muted/10">
                        {TRAINING_OPTIONS.map((option) => (
                          <div key={option} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`edit-training-${option}`} 
                              checked={selectedTrainings.includes(option)}
                              onCheckedChange={() => toggleTraining(option)}
                            />
                            <label htmlFor={`edit-training-${option}`} className="text-sm font-medium leading-none cursor-pointer">
                              {option}
                            </label>
                          </div>
                        ))}
                        <div className="flex items-center space-x-2 col-span-full mt-2">
                          <Checkbox 
                            id="edit-training-other" 
                            checked={isOtherChecked}
                            onCheckedChange={(v) => setIsOtherChecked(!!v)}
                          />
                          <label htmlFor="edit-training-other" className="text-sm font-medium leading-none cursor-pointer">
                            Other
                          </label>
                        </div>
                        {isOtherChecked && (
                          <div className="col-span-full mt-1">
                            <Input 
                              placeholder="Enter other certification..." 
                              value={otherTraining}
                              onChange={(e) => setOtherTraining(e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border p-4 rounded-lg bg-muted/20">
                      <div className="flex items-center justify-between">
                        <Label>Fleet Driver</Label>
                        <Switch 
                          checked={selectedUser?.isDriver} 
                          onCheckedChange={v => selectedUser && setSelectedUser({...selectedUser, isDriver: v})} 
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>RoSPA Certified</Label>
                        <Switch 
                          checked={selectedUser?.isRoSPATrained} 
                          onCheckedChange={v => selectedUser && setSelectedUser({...selectedUser, isRoSPATrained: v})} 
                        />
                      </div>
                    </div>
                    <Button onClick={handleUpdateUser} className="w-full font-bold">Save Profile Changes</Button>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg bg-card">
                        <div className="flex items-center gap-3 text-primary mb-2">
                          <Briefcase className="h-4 w-4" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">Departmental Info</h4>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">{selectedUser?.team}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Active Team</p>
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg bg-card">
                        <div className="flex items-center gap-3 text-primary mb-2">
                          <Shield className="h-4 w-4" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">Certification</h4>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold whitespace-pre-line">{selectedUser?.training}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Main Training</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-widest px-1">Permissions & Access</h4>
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Car className={`h-5 w-5 ${selectedUser?.isDriver ? 'text-primary' : 'text-muted-foreground opacity-30'}`} />
                            <span className="text-sm font-medium">Fleet Vehicle Authorization</span>
                          </div>
                          {selectedUser?.isDriver ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <X className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Award className={`h-5 w-5 ${selectedUser?.isRoSPATrained ? 'text-primary' : 'text-muted-foreground opacity-30'}`} />
                            <span className="text-sm font-medium">RoSPA Play Area Certification</span>
                          </div>
                          {selectedUser?.isRoSPATrained ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <X className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="tasks" className="mt-0">
                {userTasks.length > 0 ? (
                  <div className="grid gap-3">
                    {userTasks.map(task => (
                      <div key={task.id} className="p-4 border rounded-lg hover:border-primary/40 transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className="text-[9px] font-bold uppercase text-primary border-primary/20">
                            {task.park}
                          </Badge>
                          <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Due {task.dueDate}
                          </div>
                        </div>
                        <h5 className="font-headline font-bold text-sm group-hover:text-primary transition-colors">{task.title}</h5>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.objective}</p>
                        <div className="mt-3 flex items-center justify-between">
                           <Badge className={`${
                            task.status === 'Completed' ? 'bg-primary' : 
                            task.status === 'Doing' ? 'bg-accent text-accent-foreground' : 
                            'bg-muted text-muted-foreground'
                          } font-bold text-[9px] uppercase`}>
                            {task.status}
                          </Badge>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold text-primary px-2">
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mb-4 opacity-10" />
                    <p className="text-sm font-medium">No tasks currently assigned to {selectedUser?.name}.</p>
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
