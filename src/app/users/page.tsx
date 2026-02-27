
"use client";

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
import { Plus, Shield, Mail, MoreHorizontal } from "lucide-react";
import { MOCK_USERS } from "@/lib/mock-data";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function UserManagement() {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'master': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      case 'supervisor': return 'bg-primary/10 text-primary border-primary/20';
      case 'operative': return 'bg-accent text-accent-foreground';
      default: return '';
    }
  };

  return (
    <DashboardShell 
      title="User Management" 
      description="Control system access and assign operative roles"
      actions={
        <Button className="font-headline font-bold">
          <Plus className="mr-2 h-4 w-4" /> Invite User
        </Button>
      }
    >
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase text-primary/60">Total Active Users</CardTitle>
            <div className="text-3xl font-bold font-headline">{MOCK_USERS.length}</div>
          </CardHeader>
        </Card>
        <Card className="bg-accent border-accent-foreground/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase text-accent-foreground/60">Field Operatives</CardTitle>
            <div className="text-3xl font-bold font-headline">
              {MOCK_USERS.filter(u => u.role === 'operative').length}
            </div>
          </CardHeader>
        </Card>
        <Card className="bg-muted border-muted-foreground/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase text-muted-foreground/60">Management Staff</CardTitle>
            <div className="text-3xl font-bold font-headline">
              {MOCK_USERS.filter(u => u.role !== 'operative').length}
            </div>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-headline font-bold">User Information</TableHead>
              <TableHead className="font-headline font-bold">Role</TableHead>
              <TableHead className="font-headline font-bold">Email Address</TableHead>
              <TableHead className="font-headline font-bold">Permissions</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_USERS.map((user) => (
              <TableRow key={user.id} className="hover:bg-muted/20 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-primary/10">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="font-bold text-sm">{user.name}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={`${getRoleColor(user.role)} font-bold text-[10px] uppercase`} variant="outline">
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3 w-3" />
                    {user.email}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase">
                    <Shield className="h-3 w-3" />
                    {user.role === 'master' ? 'Full Control' : user.role === 'supervisor' ? 'Team Access' : 'Personal Tasks'}
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
      </Card>
    </DashboardShell>
  );
}
