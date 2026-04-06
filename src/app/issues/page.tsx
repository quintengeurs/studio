
"use client";

import { useState, useRef, useMemo } from "react";
import { compressImage } from "@/lib/image-compress";
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
  ClipboardList,
  AlertCircle,
  ThumbsUp,
  Eye,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from "firebase/firestore";
import { Issue, Asset, User, RegistryConfig, OPERATIVE_ROLES, Role } from "@/lib/types";

const ISSUE_CATEGORIES = ["Vandalism", "Maintenance", "Safety Hazard", "Litter/Waste", "Lighting", "Playground", "Wildlife", "Other"];

export default function IssuesPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const userProfileRef = (user && db) ? doc(db, "users", user.uid) : null;
  const { data: profile } = useDoc<User>(userProfileRef as any);
  
  const isOperative = profile?.role === 'Keeper' || profile?.role === 'Gardener' || profile?.role === 'Litter Picker';

  const issuesQuery = useMemoFirebase(() => {
    if (!db) return null;
    const baseQuery = query(collection(db, "issues"), where("status", "!=", "Resolved"));
    
    if (isOperative) {
      const userIdent = user?.displayName || user?.email || "";
      return query(baseQuery, where("reportedBy", "==", userIdent), orderBy("status"), orderBy("createdAt", "desc"));
    }
    
    return query(baseQuery, orderBy("status"), orderBy("createdAt", "desc"));
  }, [db, isOperative, user]);

  const { data: issues = [], loading: issuesLoading } = useCollection<Issue>(issuesQuery as any);

  const usersQuery = useMemoFirebase(() => db ? query(collection(db, "users"), where("isArchived", "==", false)) : null, [db]);
  const { data: users = [] } = useCollection<User>(usersQuery as any);

  const registryConfigRef = useMemo(() => db ? doc(db, "settings", "registry") : null, [db]);
  const { data: registryConfig } = useDoc<RegistryConfig>(registryConfigRef as any);
  const parks = registryConfig?.parks?.sort() ?? [];

  const operatives = users.filter(u => OPERATIVE_ROLES.includes(u.role as Role) || (u.role as string) === 'operative');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [assignment, setAssignment] = useState({ operativeId: "", instructions: "" });
  const [isProofDialogOpen, setIsProofDialogOpen] = useState(false);
  const [selectedIssueForProof, setSelectedIssueForProof] = useState<Issue | null>(null);

  const [newIssue, setNewIssue] = useState({
    title: "",
    description: "",
    priority: "Medium" as Issue['priority'],
    category: "General",
    park: "",
    imageUrl: ""
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedDataUrl = await compressImage(file, 800, 800, 0.7);
        setNewIssue(prev => ({ ...prev, imageUrl: compressedDataUrl }));
      } catch (error) {
        toast({ title: "Image Error", description: "Could not process image.", variant: "destructive" });
      }
    }
  };

  const removeImage = () => {
    setNewIssue(prev => ({ ...prev, imageUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreateIssue = async () => {
    if (!db || !user || isSubmitting) return;
    setIsSubmitting(true);
    const issueData = {
      ...newIssue,
      status: 'Open',
      reportedBy: user.displayName || user.email,
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, "issues"), issueData);
      toast({ title: "Issue Raised", description: "Successfully created the new issue report." });
      setNewIssue({ title: "", description: "", priority: "Medium", category: "General", park: "", imageUrl: "" });
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to create issue. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAssignDialog = (id: string) => {
    setSelectedIssueId(id);
    setAssignment({ operativeId: "", instructions: "" });
    setIsAssignDialogOpen(true);
  };

  const handleAssign = async () => {
    if (!db || !selectedIssueId || !assignment.operativeId || isSubmitting) return;
    setIsSubmitting(true);

    const issue = issues.find(i => i.id === selectedIssueId);
    const operative = operatives.find(o => o.id === assignment.operativeId);
    if (!issue || !operative) {
        toast({ title: "Error", description: "Invalid issue or operative.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    try {
      const issueRef = doc(db, "issues", selectedIssueId);
      await updateDoc(issueRef, { assignedTo: operative.name, status: 'In Progress' });

      const taskData = {
        title: `Resolve Issue: ${issue.title}`,
        objective: assignment.instructions || `Please resolve this reported issue in ${issue.park}.`,
        status: 'Todo',
        dueDate: new Date().toISOString().split('T')[0],
        assignedTo: operative.name,
        park: issue.park,
        linkedIssueId: selectedIssueId
      };
      await addDoc(collection(db, "tasks"), taskData);

      setIsAssignDialogOpen(false);
      setSelectedIssueId(null);
      toast({ title: "Issue Assigned", description: `Task created for ${operative.name}.` });
    } catch (error) {
        toast({ title: "Error", description: "Failed to assign issue. Please try again.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleApproveResolution = async (id: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "issues", id), { status: 'Resolved' });
      toast({ title: "Resolution Approved", description: "The issue has been archived." });
    } catch (error) {
        toast({ title: "Error", description: "Failed to approve resolution.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    try {
        await deleteDoc(doc(db, "issues", id));
        toast({ title: "Issue Deleted" });
    } catch (error) {
        toast({ title: "Error", description: "Failed to delete issue.", variant: "destructive" });
    }
  };

  return (
    <DashboardShell 
      title="Active Issues" 
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
              <DialogDescription>Provide details about the infrastructure problem.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Input placeholder="Issue Title e.g. Broken Fence Panel" value={newIssue.title} onChange={e => setNewIssue({...newIssue, title: e.target.value})} />
              <Textarea placeholder="Provide details about the issue..." className="min-h-[80px]" value={newIssue.description} onChange={e => setNewIssue({...newIssue, description: e.target.value})} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select value={newIssue.park} onValueChange={v => setNewIssue({...newIssue, park: v})}>
                    <SelectTrigger><SelectValue placeholder="Select Park" /></SelectTrigger>
                    <SelectContent>
                        {parks.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={newIssue.category} onValueChange={v => setNewIssue({...newIssue, category: v})}>
                    <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                    <SelectContent>
                        {ISSUE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select value={newIssue.priority} onValueChange={(val: Issue['priority']) => setNewIssue({...newIssue, priority: val})}>
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
                      <Image src={newIssue.imageUrl} alt="Preview" fill className="object-cover" />
                      <Button size="icon" variant="destructive" className="absolute top-2 right-2 h-8 w-8 rounded-full z-10" onClick={removeImage}><X className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full h-24 border-dashed border-2 flex flex-col gap-2" onClick={() => fileInputRef.current?.click()}>
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Click to upload photo</span>
                    </Button>
                  )}
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreateIssue} disabled={!newIssue.title || !newIssue.description || !newIssue.park || isSubmitting} className="w-full">
                {isSubmitting ? "Submitting..." : "Submit Issue"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {issuesLoading ? (
        <div className="flex justify-center items-center py-20"><Clock className="animate-spin h-8 w-8 text-primary" /></div>
      ) : issues.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
          <CheckCircle2 className="h-12 w-12 mb-4 opacity-20" />
          <p className="font-bold">No active issues found</p>
          <p className="text-xs">All reported problems are currently resolved or closed.</p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {issues.map((issue) => (
            <Card key={issue.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow border-2 w-full">
                <div className={`h-1.5 w-full shrink-0 ${(issue.priority as string) === 'Emergency' ? 'bg-destructive' : (issue.priority as string) === 'High' ? 'bg-yellow-500' : (issue.priority as string) === 'Medium' ? 'bg-accent' : 'bg-primary'}`} />
              
              {issue.imageUrl && (
                <div className="relative w-full h-48 bg-muted shrink-0">
                  <Image src={issue.imageUrl} alt={issue.title} fill className="object-cover" />
                </div>
              )}

              <CardHeader className="pb-2 px-4 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[9px] uppercase font-bold text-muted-foreground shrink-0">{issue.category}</Badge>
                    <div className="flex items-center gap-1 text-[9px] text-primary font-bold shrink-0"><MapPin className="h-3 w-3" />{issue.park}</div>
                  </div>
                  <Badge className={`${(issue.status as string) === 'Open' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-200' : (issue.status as string) === 'In Progress' ? 'bg-primary/10 text-primary border-primary/20' : (issue.status as string) === 'Pending Approval' ? 'bg-accent/20 text-accent-foreground border-accent animate-pulse' : 'bg-green-500/10 text-green-600 border-green-200'} font-bold text-[9px] shrink-0 uppercase tracking-tighter`}>{issue.status}</Badge>
                </div>
                <CardTitle className="font-headline text-lg sm:text-xl break-words">{issue.title}</CardTitle>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                  <Clock className="h-3 w-3" />
                  <span>Reported {new Date(issue.createdAt).toLocaleDateString()} by {issue.reportedBy}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pb-4 px-4 sm:px-6">
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 break-words">{issue.description}</p>
                  <div className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/20 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-accent-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-accent-foreground">Work Completed</p>
                        <p className="text-[10px] text-muted-foreground">Operative has submitted completion proof. Please review and approve.</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-[10px] font-bold h-8 uppercase border-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIssueForProof(issue);
                        setIsProofDialogOpen(true);
                      }}
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> View Proof
                    </Button>
                  </div>
              </CardContent>
              <CardFooter className="border-t bg-muted/20 p-4 flex flex-wrap justify-between items-center mt-auto gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {(issue.status as string) === 'Pending Approval' ? (
                    <Button variant="default" size="sm" className="h-8 text-[10px] uppercase font-bold bg-accent hover:bg-accent/90 text-accent-foreground px-3" onClick={() => handleApproveResolution(issue.id)}><ThumbsUp className="mr-1.5 h-3.5 w-3.5" /> Approve Resolution</Button>
                  ) : issue.assignedTo ? (
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0"><UserPlus className="h-3.5 w-3.5 text-primary" /></div>
                        <span className="text-[10px] font-bold text-foreground truncate">{issue.assignedTo}</span>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase font-bold hover:bg-primary/10 hover:text-primary px-2" onClick={() => handleOpenAssignDialog(issue.id)}><UserPlus className="mr-1.5 h-3.5 w-3.5" /> Assign</Button>
                  )}
                </div>
                <div className="flex gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0" onClick={() => handleDelete(issue.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Delete Issue</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
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
            <DialogDescription>Create a task for an operative.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label>Select Operative</Label>
              <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2">
                {operatives.map(user => (
                  <div key={user.id} className={`flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${assignment.operativeId === user.id ? 'border-primary bg-primary/5' : ''}`} onClick={() => setAssignment({...assignment, operativeId: user.id})}>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border"><AvatarImage src={user.avatar} /><AvatarFallback>{user.name.charAt(0)}</AvatarFallback></Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{user.name}</span>
                        <span className="text-[10px] text-muted-foreground">{user.team}</span>
                      </div>
                    </div>
                    {assignment.operativeId === user.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </div>
                ))}
                {operatives.length === 0 && <p className="text-center text-xs text-muted-foreground py-4 italic">No active operatives found.</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructions">Task Instructions</Label>
              <Textarea id="instructions" placeholder="What needs to be done?" value={assignment.instructions} onChange={e => setAssignment({...assignment, instructions: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full font-bold" onClick={handleAssign} disabled={!assignment.operativeId || isSubmitting}>
              {isSubmitting ? "Assigning..." : "Confirm Assignment"}
            </Button>
      </Dialog>

      <Dialog open={isProofDialogOpen} onOpenChange={setIsProofDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl text-accent-foreground flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6" /> Resolution Proof
            </DialogTitle>
            <DialogDescription>
              Verification for: {selectedIssueForProof?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {selectedIssueForProof?.resolutionImageUrl && (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border-4 border-muted shadow-inner bg-muted">
                <Image 
                  src={selectedIssueForProof.resolutionImageUrl} 
                  alt="Resolution proof" 
                  fill 
                  className="object-cover" 
                />
              </div>
            )}
            
            <div className="space-y-4">
              <div className="rounded-xl bg-accent/5 p-4 border border-accent/10">
                <h4 className="text-xs font-bold text-accent-foreground uppercase tracking-wider mb-2">Completion Note</h4>
                <p className="text-sm leading-relaxed italic text-foreground">
                  "{selectedIssueForProof?.resolutionNote || 'No note provided.'}"
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Submitted On</h4>
                  <p className="text-sm font-medium">
                    {selectedIssueForProof?.resolutionDate ? format(new Date(selectedIssueForProof.resolutionDate), 'PPP p') : 'Pending'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Assigned To</h4>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20">
                      {selectedIssueForProof?.assignedTo?.charAt(0)}
                    </div>
                    <p className="text-sm font-medium">{selectedIssueForProof?.assignedTo}</p>
                  </div>
                </div>
              </div>

              {selectedIssueForProof?.collaborators && (selectedIssueForProof.collaborators as any).length > 0 && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <h4 className="text-[10px] font-bold text-primary uppercase mb-2">Team Collaboration</h4>
                  <div className="flex flex-wrap gap-2">
                    {(selectedIssueForProof.collaborators as any).map((name: string) => (
                      <Badge key={name} variant="secondary" className="bg-white text-primary border-primary/20 text-[10px] font-bold uppercase">{name}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="flex sm:justify-between items-center gap-4 border-t pt-4">
            <Button variant="ghost" onClick={() => setIsProofDialogOpen(false)} className="text-xs font-bold uppercase">Close</Button>
            <Button 
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold uppercase tracking-wider px-6"
                onClick={() => {
                  if (selectedIssueForProof) {
                    handleApproveResolution(selectedIssueForProof.id);
                    setIsProofDialogOpen(false);
                  }
                }}
            >
                Approve & Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
