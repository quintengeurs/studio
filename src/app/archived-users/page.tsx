
"use client";

import { useState, useMemo } from "react";
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
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, 
  Clock, 
  Mail, 
  UserPlus, 
  ExternalLink,
  Shield,
  Briefcase
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, updateDoc } from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function ArchivedUsersPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const archivedUsersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "users"), where("isArchived", "==", true));
  }, [db]);

  const { data: users = [], loading } = useCollection<User>(archivedUsersQuery);

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.team?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRestoreUser = (user: User) => {
    if (!db) return;
    updateDoc(doc(db, "users", user.id), { isArchived: false })
      .then(() => {
        setSelectedUser(null);
        toast({ title: "User Restored", description: `${user.name} has been moved back to the active directory.` });
      });
  };

  return (
    <DashboardShell 
      title="Archived Staff" 
      description="Historical directory of former or inactive staff members"
    >
      <div className="flex items-center gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search archived staff by name, email, or team..." 
            className="pl-9 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="overflow-hidden border-2">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-headline font-bold">Staff Information</TableHead>
              <TableHead className="font-headline font-bold">Role</TableHead>
              <TableHead className="font-headline font-bold">Team</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  <Clock className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading archives...
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  No archived users found.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow 
                  key={user.id} 
                  className="hover:bg-accent/5 transition-colors cursor-pointer"
                  onClick={() => setSelectedUser(user)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border opacity-70">
                        <AvatarImage src={user.avatar || undefined} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{user.name}</span>
                        <span className="text-[10px] text-muted-foreground">{user.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {user.team}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground">
                Archived
              </Badge>
            </div>
            <div className="flex items-center gap-4 py-2">
              <Avatar className="h-14 w-14 border">
                <AvatarImage src={selectedUser?.avatar || undefined} />
                <AvatarFallback className="text-xl font-bold">{selectedUser?.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <DialogTitle className="text-2xl font-headline font-bold">
                  {selectedUser?.name}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  <Mail className="h-3 w-3" /> {selectedUser?.email}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid gap-4 py-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-muted/20">
                  <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Last Role</h4>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold capitalize">{selectedUser?.role}</span>
                  </div>
                </div>
                <div className="p-4 border rounded-lg bg-muted/20">
                  <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Last Team</h4>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold">{selectedUser?.team}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Recorded Training</h4>
                <p className="text-xs font-medium">{selectedUser?.training || "None recorded"}</p>
              </div>
          </div>
          <DialogFooter>
            <Button className="w-full font-bold" onClick={() => selectedUser && handleRestoreUser(selectedUser)}>
              <UserPlus className="mr-2 h-4 w-4" /> Restore Staff Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
