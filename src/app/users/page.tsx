
"use client";

import { useState, useRef } from "react";
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
import { Plus, Shield, Mail, MoreHorizontal, UserPlus, Car, Award, Users, Camera, X } from "lucide-react";
import { MOCK_USERS } from "@/lib/mock-data";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { User, Role } from "@/lib/types";

export default function UserManagement() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({
    name: '',
    email: '',
    role: 'operative',
    team: '',
    training: 'None',
    isDriver: false,
    isRoSPATrained: false,
    avatar: ''
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'master': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      case 'supervisor': return 'bg-primary/10 text-primary border-primary/20';
      case 'operative': return 'bg-accent text-accent-foreground';
      default: return '';
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewUser(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddUser = () => {
    const user: User = {
      ...newUser as User,
      id: `u${Date.now()}`,
    };
    setUsers([...users, user]);
    setIsDialogOpen(false);
    setNewUser({ name: '', email: '', role: 'operative', team: '', training: 'None', isDriver: false, isRoSPATrained: false, avatar: '' });
    toast({ title: "User Added", description: `${user.name} has been added to the system.` });
  };

  return (
    <DashboardShell 
      title="User Management" 
      description="Control system access and assign operative roles"
      actions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="font-headline font-bold">
              <Plus className="mr-2 h-4 w-4" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-headline">Add New System User</DialogTitle>
              <DialogDescription>Create a new operative or management profile.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="flex justify-center">
                <div className="relative group">
                  <Avatar className="h-24 w-24 border-4 border-muted cursor-pointer transition-opacity group-hover:opacity-70" onClick={() => fileInputRef.current?.click()}>
                    <AvatarImage src={newUser.avatar} />
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
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
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

              <div className="grid gap-2">
                <Label>Required Training Status</Label>
                <Select value={newUser.training} onValueChange={(v: any) => setNewUser({...newUser, training: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Training" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">No training recorded</SelectItem>
                    <SelectItem value="Health & Safety">Health & Safety Certification</SelectItem>
                    <SelectItem value="Equipment Handling">Heavy Equipment Handling</SelectItem>
                    <SelectItem value="First Aid">Emergency First Aid</SelectItem>
                    <SelectItem value="Pesticide Application">Pesticide Application (PA1/PA6)</SelectItem>
                    <SelectItem value="Chain Saw Operation">NPTC Chainsaw Operation</SelectItem>
                  </SelectContent>
                </Select>
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
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase text-primary/60">Total Active Users</CardTitle>
            <div className="text-3xl font-bold font-headline">{users.length}</div>
          </CardHeader>
        </Card>
        <Card className="bg-accent border-accent-foreground/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase text-accent-foreground/60">Field Operatives</CardTitle>
            <div className="text-3xl font-bold font-headline">
              {users.filter(u => u.role === 'operative').length}
            </div>
          </CardHeader>
        </Card>
        <Card className="bg-muted border-muted-foreground/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase text-muted-foreground/60">Management Staff</CardTitle>
            <div className="text-3xl font-bold font-headline">
              {users.filter(u => u.role !== 'operative').length}
            </div>
          </CardHeader>
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
              {users.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-primary/10">
                        <AvatarImage src={user.avatar} />
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
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-foreground">{user.training || 'None'}</span>
                      <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase">
                        <Shield className="h-3 w-3" />
                        {user.role === 'master' ? 'Full Control' : user.role === 'supervisor' ? 'Team Access' : 'Personal Tasks'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.isDriver && (
                        <div className="p-1 rounded bg-blue-50 text-blue-600 border border-blue-100" title="Driver">
                          <Car className="h-4 w-4" />
                        </div>
                      )}
                      {user.isRoSPATrained && (
                        <div className="p-1 rounded bg-yellow-50 text-yellow-600 border border-yellow-100" title="RoSPA Trained">
                          <Award className="h-4 w-4" />
                        </div>
                      )}
                      {!user.isDriver && !user.isRoSPATrained && <span className="text-[10px] text-muted-foreground italic">None</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </DashboardShell>
  );
}
