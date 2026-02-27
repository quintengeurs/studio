
"use client";

import { useState, useRef, useMemo } from "react";
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
  ClipboardList
} from "lucide-react";
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
import { useFirestore, useCollection } from "@/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function IssuesPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Firebase Data
  const issuesQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "issues"), orderBy("createdAt", "desc"));
  }, [db]);
  const { data: issues = [], loading: issuesLoading } = useCollection(issuesQuery);

  const usersQuery = useMemo(() => {
    if (!db) return null;
    return collection(db, "users");
  }, [db]);
  const { data: users = [] } = useCollection(usersQuery);

  const operatives = users.filter(u => u.role === 'operative' || u.role === 'supervisor');
  const parks = Array.from(new Set(issues.map(i => i.park))).sort();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  
  const [assignment, setAssignment] = useState({
    operativeId: "",
    instructions: ""
  });

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
    if (!db) return;
    const issueData = {
      ...newIssue,
      status: 'Open',
      reportedBy: 'Sarah Smith',
      createdAt: new Date().toISOString()
    };

    addDoc(collection(db, "issues"), issueData)
      .then(() => {
        setNewIssue({ title: "", description: "", priority: "Medium", category: "General", park: "", imageUrl: "" });
        setIsDialogOpen(false);
        toast({ title: "Issue Raised", description: "Successfully created the new issue report." });
      })
      .catch(async (e) => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({
          path: "issues",
          operation: "create",
          requestResourceData: issueData
        }));
      });
  };

  const handleOpenAssignDialog = (id: string) => {
    setSelectedIssueId(id);
    setAssignment({ operativeId: "", instructions: "" });
    setIsAssignDialogOpen(true);
  };

  const handleAssign = () => {
    if (!db || !selectedIssueId || !assignment.operativeId) return;
    
    const issue = issues.find(i => i.id === selectedIssueId);
    const operative = operatives.find(o => o.id === assignment.operativeId);
    
    if (!issue || !operative) return;

    // 1. Update Issue
    const issueRef = doc(db, "issues", selectedIssueId);
    updateDoc(issueRef, { 
      assignedTo: operative.name, 
      status: 'In Progress' 
    });

    // 2. Create Linked Task
    const taskData = {
      title: `Resolve Issue: ${issue.title}`,
      objective: assignment.instructions || `Please resolve this reported issue in ${issue.park}.`,
      status: 'Todo',
      dueDate: new Date().toISOString().split('T')[0],
      assignedTo: operative.name,
      park: issue.park,
      linkedIssueId: selectedIssueId
    };
    addDoc(collection(db, "tasks"), taskData);

    setIsAssignDialogOpen(false);
    setSelectedIssueId(null);
    toast({ 
      title: "Issue Assigned", 
      description: `Task created for ${operative.name}.` 
    });
  };

  const handleResolve = (id: string) => {
    if (!db) return;
    updateDoc(doc(db, "issues", id), { status: 'Resolved' });
    toast({ title: "Issue Resolved", description: "Issue marked as resolved." });
  };

  const handleDelete = (id: string) => {
    if (!db) return;
    deleteDoc(doc(db, "issues", id));
    toast({ title: "Issue Deleted", variant: "destructive" });
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
                  <Input 
                    placeholder="e.g. London Fields" 
                    value={newIssue.park}
                    onChange={e => setNewIssue({...newIssue, park: e.target.value})}
                  />
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
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select 
                  value={newIssue.priority} 
                  onValueChange={(val: any) => setNewIssue({...newIssue, priority: val})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
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
      {issuesLoading ? (
        <div className="flex justify-center items-center py-20">
          <Clock className="animate-spin h-8 w-8 text-primary" />
        </div>
      ) : (
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
                  <span>Reported {new Date(issue.createdAt).toLocaleDateString()}</span>
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
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-[10px] uppercase font-bold hover:bg-primary/10 hover:text-primary px-2"
                      onClick={() => handleOpenAssignDialog(issue.id)}
                    >
                      <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Assign
                    </Button>
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
                    <TooltipContent><p>Delete Issue</p></TooltipContent>
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
                    <TooltipContent><p>Resolve Issue</p></TooltipContent>
                  </Tooltip>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="font-headline">Assign Issue</DialogTitle>
            <DialogDescription>
              Create a task for an operative.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label>Select Operative</Label>
              <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2">
                {operatives.map(user => (
                  <div 
                    key={user.id} 
                    className={`flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${assignment.operativeId === user.id ? 'border-primary bg-primary/5' : ''}`}
                    onClick={() => setAssignment({...assignment, operativeId: user.id})}
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
                    {assignment.operativeId === user.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructions">Task Instructions</Label>
              <Textarea 
                id="instructions" 
                placeholder="What needs to be done?"
                value={assignment.instructions}
                onChange={e => setAssignment({...assignment, instructions: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full font-bold" onClick={handleAssign} disabled={!assignment.operativeId}>
              Confirm Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
