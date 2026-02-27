
"use client";

import { useState, useRef } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  UserPlus, 
  Plus, 
  Trash2,
  Image as ImageIcon,
  X,
  Clock,
  MapPin,
  Search
} from "lucide-react";
import { MOCK_ISSUES, MOCK_ASSETS, MOCK_USERS } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const PARKS = Array.from(new Set(MOCK_ASSETS.map(a => a.park))).sort();
const OPERATIVES = MOCK_USERS.filter(u => u.role === 'operative' || u.role === 'supervisor');

export default function IssuesPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [issues, setIssues] = useState(MOCK_ISSUES);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  
  const [newIssue, setNewIssue] = useState({
    title: "",
    description: "",
    priority: "Medium" as const,
    category: "General",
    park: "",
    imageUrl: ""
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewIssue(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setNewIssue(prev => ({ ...prev, imageUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreateIssue = () => {
    const issue = {
      ...newIssue,
      id: `i${Date.now()}`,
      status: 'Open' as const,
      reportedBy: 'Sarah Smith',
      createdAt: new Date().toISOString().split('T')[0]
    };
    // @ts-ignore
    setIssues([issue, ...issues]);
    setNewIssue({ title: "", description: "", priority: "Medium", category: "General", park: "", imageUrl: "" });
    setIsDialogOpen(false);
    toast({ title: "Issue Raised", description: "Successfully created the new issue report." });
  };

  const handleOpenAssignDialog = (id: string) => {
    setSelectedIssueId(id);
    setIsAssignDialogOpen(true);
  };

  const handleAssign = (operativeName: string) => {
    if (!selectedIssueId) return;
    setIssues(prev => prev.map(issue => 
      issue.id === selectedIssueId ? { ...issue, assignedTo: operativeName, status: 'In Progress' as const } : issue
    ));
    setIsAssignDialogOpen(false);
    setSelectedIssueId(null);
    toast({ title: "Issue Assigned", description: `Issue has been assigned to ${operativeName}.` });
  };

  const handleResolve = (id: string) => {
    setIssues(prev => prev.map(issue => 
      issue.id === id ? { ...issue, status: 'Resolved' as const } : issue
    ));
    toast({ title: "Issue Resolved", description: "Issue marked as resolved." });
  };

  const handleDelete = (id: string) => {
    setIssues(prev => prev.filter(issue => issue.id !== id));
    toast({ title: "Issue Deleted", description: "Issue report removed from the system.", variant: "destructive" });
  };

  return (
    <DashboardShell 
      title="Issue Reporting" 
      description="Track and resolve park infrastructure problems"
      actions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="font-headline font-bold w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Raise Issue
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px] w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-headline">Report New Issue</DialogTitle>
              <DialogDescription>
                Provide details about the infrastructure problem.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Issue Title</Label>
                <Input 
                  id="title" 
                  placeholder="e.g. Broken Fence Panel" 
                  value={newIssue.title}
                  onChange={e => setNewIssue({...newIssue, title: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="Provide details about the issue..." 
                  className="min-h-[80px]"
                  value={newIssue.description}
                  onChange={e => setNewIssue({...newIssue, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Park Location</Label>
                  <Select 
                    value={newIssue.park} 
                    onValueChange={(val) => setNewIssue({...newIssue, park: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Park" />
                    </SelectTrigger>
                    <SelectContent>
                      {PARKS.map(park => (
                        <SelectItem key={park} value={park}>{park}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Input 
                    placeholder="e.g. Pathways" 
                    value={newIssue.category}
                    onChange={e => setNewIssue({...newIssue, category: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Priority</Label>
                  <Select 
                    value={newIssue.priority} 
                    onValueChange={(val: any) => setNewIssue({...newIssue, priority: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Attach Image</Label>
                <div className="flex flex-col gap-2">
                  {newIssue.imageUrl ? (
                    <div className="relative w-full aspect-video rounded-md overflow-hidden border">
                      <Image 
                        src={newIssue.imageUrl} 
                        alt="Preview" 
                        fill 
                        className="object-cover"
                      />
                      <Button 
                        size="icon" 
                        variant="destructive" 
                        className="absolute top-2 right-2 h-8 w-8 rounded-full z-10"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full h-24 border-dashed border-2 flex flex-col gap-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Click to upload photo</span>
                    </Button>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageUpload}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreateIssue} disabled={!newIssue.title || !newIssue.description || !newIssue.park} className="w-full">
                Submit Issue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {issues.map((issue) => (
          <Card key={issue.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow border-2 w-full">
            <div className={`h-1.5 w-full shrink-0 ${
              issue.priority === 'Emergency' ? 'bg-destructive' : 
              issue.priority === 'High' ? 'bg-orange-500' : 
              issue.priority === 'Medium' ? 'bg-accent' : 'bg-primary'
            }`} />
            
            {issue.imageUrl && (
              <div className="relative w-full h-48 bg-muted shrink-0">
                <Image 
                  src={issue.imageUrl} 
                  alt={issue.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            <CardHeader className="pb-2 px-4 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                   <Badge variant="outline" className="text-[9px] uppercase font-bold text-muted-foreground shrink-0">
                    {issue.category}
                  </Badge>
                  <div className="flex items-center gap-1 text-[9px] text-primary font-bold shrink-0">
                    <MapPin className="h-3 w-3" />
                    {issue.park}
                  </div>
                </div>
                <Badge className={`${
                  issue.status === 'Open' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-200' :
                  issue.status === 'In Progress' ? 'bg-primary/10 text-primary border-primary/20' :
                  'bg-green-500/10 text-green-600 border-green-200'
                } font-bold text-[9px] shrink-0`}>
                  {issue.status}
                </Badge>
              </div>
              <CardTitle className="font-headline text-lg sm:text-xl break-words">{issue.title}</CardTitle>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                <Clock className="h-3 w-3" />
                <span>Reported {issue.createdAt}</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pb-4 px-4 sm:px-6">
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 break-words">
                {issue.description}
              </p>
            </CardContent>
            <CardFooter className="border-t bg-muted/20 p-4 flex flex-wrap justify-between items-center mt-auto gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {issue.assignedTo ? (
                   <div className="flex items-center gap-2 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                        <UserPlus className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-[10px] font-bold text-foreground truncate">{issue.assignedTo}</span>
                   </div>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-[10px] uppercase font-bold hover:bg-primary/10 hover:text-primary px-2"
                        onClick={() => handleOpenAssignDialog(issue.id)}
                      >
                        <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Assign
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Assign this issue to an operative</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <div className="flex gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => handleDelete(issue.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete this issue report</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`h-8 w-8 shrink-0 ${issue.status === 'Resolved' ? 'text-green-600 bg-green-50' : 'text-primary hover:bg-primary/10'}`}
                      onClick={() => handleResolve(issue.id)}
                      disabled={issue.status === 'Resolved'}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{issue.status === 'Resolved' ? 'Issue is already resolved' : 'Mark as resolved'}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Assign Issue</DialogTitle>
            <DialogDescription>
              Select an operative to handle this issue.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              {OPERATIVES.map(user => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleAssign(user.name)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{user.name}</span>
                      <span className="text-[10px] text-muted-foreground">{user.team}</span>
                    </div>
                  </div>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
