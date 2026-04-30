
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
import { Switch } from "@/components/ui/switch";
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
  AlertTriangle,
  Search,
  Filter
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
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, limit, getDocs } from "firebase/firestore";
import { Issue, OPERATIVE_ROLES, ParkDetail } from "@/lib/types";
import { useUserContext } from "@/context/UserContext";
import { useDataContext } from "@/context/DataContext";
import { FolderArchive } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ISSUE_CATEGORIES = ["Vandalism", "Maintenance", "Safety Hazard", "Litter/Waste", "Lighting", "Playground", "Wildlife", "Other"];

function IssuesContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || null;
  
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile, permissions, isAdmin, currentUserRoles } = useUserContext();
  const { allUsers: users, allParks: allDetails, allIssues, loading: issuesLoading } = useDataContext();
  const isOperative = !permissions.assignTask;

  // Derive the three subsets from the single allIssues collection (avoids Firestore composite index requirement)
  const issues = useMemo(() => allIssues.filter(i => i.status !== 'Resolved'), [allIssues]);
  const resolvedIssuesRaw = useMemo(() => allIssues.filter(i => i.status === 'Resolved'), [allIssues]);
  const archivedIssuesRaw = useMemo(() => allIssues.filter(i => i.isArchived === true), [allIssues]);

  const parks = useMemo(() => allDetails.map(p => p.name).sort(), [allDetails]);

  const canDelete = isAdmin || profile?.role === 'Area Manager' || profile?.role === 'Operations Manager';

  const filteredIssues = useMemo(() => {
    if (isAdmin) return issues.filter(i => !i.isArchived);

    const roles = currentUserRoles as string[];
    const isGlobalMgmt = roles.some(r => ['Area Manager', 'Operations Manager', 'Park Manager'].includes(r));
    const isDepotMgmt = roles.some(r => ['Head Gardener', 'Assistant Area Manager'].includes(r));
    const userDepots = profile?.depots?.length ? profile.depots : (profile?.depot ? [profile.depot] : []);
    
    return issues.filter(issue => {
        if (issue.isArchived) return false;

        const userIdent = user?.displayName || user?.email || "";
        const userName = profile?.name || userIdent;

        // 1. Own Issues (Reported or Assigned)
        const matchesReporter = issue.reportedBy?.toLowerCase() === userIdent.toLowerCase() || 
                               issue.reportedBy?.toLowerCase() === user?.email?.toLowerCase() ||
                               issue.reportedBy === userName;
                               
        const matchesAssignee = issue.assignedTo?.toLowerCase() === userIdent.toLowerCase() || 
                               issue.assignedTo?.toLowerCase() === user?.email?.toLowerCase() ||
                               issue.assignedTo === userName;
        
        if (matchesReporter || matchesAssignee) return true;
        
        // 2. Global Management visibility
        if (isGlobalMgmt) return true;

        // 3. Depot Management visibility
        if (isDepotMgmt) {
          const parkDetail = allDetails.find(d => d.name === issue.park);
          if (parkDetail?.depot && userDepots.includes(parkDetail.depot)) return true;
        }
        
        return false;
    });
  }, [issues, profile, user, allDetails, isAdmin, currentUserRoles]);

  const unassignedIssuesRaw = useMemo(() => filteredIssues.filter(i => !i.assignedTo), [filteredIssues]);
  const assignedIssuesRaw = useMemo(() => filteredIssues.filter(i => i.assignedTo), [filteredIssues]);
  const resolvedIssuesRawData = useMemo(() => resolvedIssuesRaw.filter(i => i.isArchived !== true), [resolvedIssuesRaw]);
  const archivedIssuesRawData = archivedIssuesRaw;

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPark, setFilterPark] = useState<string>("All");
  const [filterReporter, setFilterReporter] = useState<string>("All");
  const [filterAssignee, setFilterAssignee] = useState<string>("All");

  const reporters = useMemo(() => {
    const set = new Set<string>();
    allIssues.forEach(i => i.reportedBy && set.add(i.reportedBy));
    return Array.from(set).sort();
  }, [allIssues]);

  const assignees = useMemo(() => {
    const set = new Set<string>();
    allIssues.forEach(i => i.assignedTo && set.add(i.assignedTo));
    return Array.from(set).sort();
  }, [allIssues]);

  const applyFilters = (list: Issue[]) => {
    let result = list;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(i => 
        i.title.toLowerCase().includes(s) || 
        i.description.toLowerCase().includes(s)
      );
    }
    if (filterPark !== "All") result = result.filter(i => i.park === filterPark);
    if (filterReporter !== "All") result = result.filter(i => i.reportedBy === filterReporter);
    if (filterAssignee !== "All") result = result.filter(i => i.assignedTo === filterAssignee);
    return result;
  };

  const unassignedIssues = useMemo(() => applyFilters(unassignedIssuesRaw), [unassignedIssuesRaw, searchTerm, filterPark, filterReporter, filterAssignee]);
  const assignedIssues = useMemo(() => applyFilters(assignedIssuesRaw), [assignedIssuesRaw, searchTerm, filterPark, filterReporter, filterAssignee]);
  const resolvedIssues = useMemo(() => applyFilters(resolvedIssuesRawData), [resolvedIssuesRawData, searchTerm, filterPark, filterReporter, filterAssignee]);
  const archivedIssues = useMemo(() => applyFilters(archivedIssuesRawData), [archivedIssuesRawData, searchTerm, filterPark, filterReporter, filterAssignee]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllStaff, setShowAllStaff] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");
  
  const selectedIssue = useMemo(() => issues.find(i => i.id === selectedIssueId), [issues, selectedIssueId]);
  const targetDepot = useMemo(() => {
    if (!selectedIssue) return null;
    return allDetails.find(d => d.name === selectedIssue.park)?.depot;
  }, [selectedIssue, allDetails]);

  const assignableStaff = useMemo(() => {
    // Include all non-archived users, not just operatives
    let list = users;
    
    if (assignSearch) {
        const search = assignSearch.toLowerCase();
        list = list.filter(u => 
            u.name.toLowerCase().includes(search) || 
            u.email.toLowerCase().includes(search) ||
            u.role?.toLowerCase().includes(search) ||
            u.roles?.some(r => r.toLowerCase().includes(search))
        );
    }

    if (showAllStaff) return list;

    // Filter by target depot
    if (!targetDepot) return list;
    return list.filter(u => {
        const userDepots = u.depots || (u.depot ? [u.depot] : []);
        return userDepots.includes(targetDepot);
    });
  }, [users, targetDepot, showAllStaff, assignSearch]);

  const [assignment, setAssignment] = useState({ operativeId: "", instructions: "" });
  const [isProofDialogOpen, setIsProofDialogOpen] = useState(false);
  const [selectedIssueForProof, setSelectedIssueForProof] = useState<Issue | null>(null);

  const [newIssue, setNewIssue] = useState({
    title: "",
    description: "",
    priority: "Medium" as Issue['priority'],
    category: "General",
    park: "",
    imageUrl: "",
    location: null as { latitude: number, longitude: number } | null
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

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Not Supported", description: "Geolocation is not supported by your browser.", variant: "destructive" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNewIssue(prev => ({
          ...prev,
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        }));
        toast({ title: "Location Captured", description: "GPS coordinates added to report." });
      },
      (error) => {
        toast({ title: "Location Error", description: "Could not retrieve your location. Please check permissions.", variant: "destructive" });
      },
      { enableHighAccuracy: true }
    );
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
      setNewIssue({ title: "", description: "", priority: "Medium", category: "General", park: "", imageUrl: "", location: null });
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
    setShowAllStaff(false);
    setAssignSearch("");
    setIsAssignDialogOpen(true);
  };

  const handleAssign = async () => {
    if (!db || !selectedIssueId || !assignment.operativeId || isSubmitting) return;
    setIsSubmitting(true);

    const issue = issues.find(i => i.id === selectedIssueId);
    const operative = users.find(o => o.id === assignment.operativeId);
    if (!issue || !operative) {
        toast({ title: "Error", description: "Invalid issue or operative.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    try {
      const issueRef = doc(db, "issues", selectedIssueId);
      await updateDoc(issueRef, { assignedTo: operative.name, status: 'In Progress' });

      // Search for existing task for this issue to update rather than duplicate
      const tasksQuery = query(collection(db, "tasks"), where("linkedIssueId", "==", selectedIssueId));
      const taskSnap = await getDocs(tasksQuery);
      
      const taskData = {
        assignedTo: operative.name,
        objective: assignment.instructions || `Please resolve this reported issue in ${issue.park}.`,
        status: 'Todo',
        dueDate: new Date().toISOString().split('T')[0],
        park: issue.park,
        linkedIssueId: selectedIssueId
      };

      if (!taskSnap.empty) {
        // Update existing task
        const existingTaskId = taskSnap.docs[0].id;
        await updateDoc(doc(db, "tasks", existingTaskId), taskData);
      } else {
        // Create new task
        await addDoc(collection(db, "tasks"), {
          ...taskData,
          title: `Resolve Issue: ${issue.title}`,
          createdAt: new Date().toISOString()
        });
      }

      setIsAssignDialogOpen(false);
      setSelectedIssueId(null);
      toast({ title: "Issue Assigned", description: `Task updated/created for ${operative.name}.` });
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

  const handleArchiveIssue = async (id: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "issues", id), { isArchived: true });
      toast({ title: "Issue Archived", description: "Moved to the permanent archive." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to archive issue.", variant: "destructive" });
    }
  };

  const renderIssueList = (listToRender: Issue[], loadingState: boolean) => {
    if (loadingState) return <div className="flex justify-center items-center py-20"><Clock className="animate-spin h-8 w-8 text-primary" /></div>;
    if (listToRender.length === 0) return (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
          <CheckCircle2 className="h-12 w-12 mb-4 opacity-20" />
          <p className="font-bold">No issues found in this view</p>
        </div>
    );
    return (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {listToRender.map((issue) => (
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
                    {issue.location && (
                      <Badge variant="secondary" className="text-[8px] h-4 px-1.5 font-bold bg-primary/5 text-primary border-primary/10 flex items-center gap-1 shrink-0">
                        <MapPin className="h-2.5 w-2.5" /> GPS
                      </Badge>
                    )}
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
                {(issue.status as string) === 'Pending Approval' && (
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
                      className="w-full text-[10px] font-bold uppercase tracking-widest bg-background"
                      onClick={() => {
                        setSelectedIssueForProof(issue);
                        setIsProofDialogOpen(true);
                      }}
                    >
                      <ImageIcon className="h-3.5 w-3.5 mr-1.5" /> View Proof
                    </Button>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t bg-muted/20 p-4 flex flex-wrap justify-between items-center mt-auto gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {(issue.status as string) === 'Pending Approval' ? (
                    permissions.approveResolution && <Button variant="default" size="sm" className="h-8 text-[10px] uppercase font-bold bg-accent hover:bg-accent/90 text-accent-foreground px-3" onClick={() => handleApproveResolution(issue.id)}><ThumbsUp className="mr-1.5 h-3.5 w-3.5" /> Approve Resolution</Button>
                  ) : issue.assignedTo ? (
                    <div 
                      className={`flex items-center gap-2 min-w-0 p-1 rounded-md transition-colors ${permissions.assignTask ? 'cursor-pointer hover:bg-primary/5' : ''}`}
                      onClick={() => permissions.assignTask && handleOpenAssignDialog(issue.id)}
                    >
                        <div className={`h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 ${permissions.assignTask ? 'group-hover:bg-primary/20' : ''}`}>
                          <UserPlus className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[8px] font-bold uppercase text-muted-foreground leading-none">Assignee</span>
                          <span className="text-[10px] font-bold text-foreground truncate">{issue.assignedTo}</span>
                        </div>
                    </div>
                  ) : (
                    permissions.assignTask && <Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase font-bold hover:bg-primary/10 hover:text-primary px-2" onClick={() => handleOpenAssignDialog(issue.id)}><UserPlus className="mr-1.5 h-3.5 w-3.5" /> Assign</Button>
                  )}
                </div>
                <div className="flex gap-1 items-center">
                  {(issue.status as string) === 'Resolved' && permissions.assignTask && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary shrink-0" onClick={() => handleArchiveIssue(issue.id)}><FolderArchive className="h-4 w-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Archive Issue</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {canDelete && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0" onClick={() => handleDelete(issue.id)}><Trash2 className="h-4 w-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Delete Issue</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
    );
  };

  return (
    <DashboardShell 
      title="Issues Management" 
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

              <div className="grid gap-2">
                <Label>Geolocation</Label>
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${newIssue.location ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold leading-none mb-1">
                      {newIssue.location ? "GPS Tag Captured" : "No GPS Tag Added"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {newIssue.location 
                        ? `${newIssue.location.latitude.toFixed(4)}, ${newIssue.location.longitude.toFixed(4)}` 
                        : "Tag where the issue is located"}
                    </p>
                  </div>
                  <Button 
                    variant={newIssue.location ? "secondary" : "outline"}
                    size="sm"
                    className="h-8 font-bold text-[10px] uppercase shadow-sm"
                    onClick={handleGetLocation}
                    type="button"
                  >
                    {newIssue.location ? "Retake Tag" : "Add GPS Tag"}
                  </Button>
                  {newIssue.location && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive"
                      onClick={() => setNewIssue(prev => ({ ...prev, location: null }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
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
      <Tabs defaultValue={defaultTab || (isOperative ? "assigned" : "unassigned")} className="w-full">
        <TabsList className="mb-6">
          {!isOperative && (
            <TabsTrigger value="unassigned" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Unassigned
              {unassignedIssues.length > 0 && <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold shadow-sm">{unassignedIssues.length}</span>}
            </TabsTrigger>
          )}
          <TabsTrigger value="assigned" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Assigned
            {assignedIssues.length > 0 && <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold shadow-sm">{assignedIssues.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="resolved" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Resolved
          </TabsTrigger>
          {!isOperative && (
            <TabsTrigger value="archived" className="flex items-center gap-2 opacity-60">
              <FolderArchive className="h-4 w-4" /> Archive Log
            </TabsTrigger>
          )}
        </TabsList>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search issues by title or details..." 
              className="pl-9 bg-background shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6" 
                onClick={() => setSearchTerm("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 lg:flex gap-4">
            <Select value={filterPark} onValueChange={setFilterPark}>
              <SelectTrigger className="w-full lg:w-[160px] bg-background shadow-sm">
                <SelectValue placeholder="All Sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Sites</SelectItem>
                {parks.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterReporter} onValueChange={setFilterReporter}>
              <SelectTrigger className="w-full lg:w-[160px] bg-background shadow-sm">
                <SelectValue placeholder="Raised By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Reporters</SelectItem>
                {reporters.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="w-full lg:w-[160px] bg-background shadow-sm">
                <SelectValue placeholder="Assigned To" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Assignees</SelectItem>
                {assignees.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            {(filterPark !== "All" || filterReporter !== "All" || filterAssignee !== "All") && (
              <Button variant="ghost" size="sm" className="px-2 font-bold text-muted-foreground hover:text-primary" onClick={() => { setFilterPark("All"); setFilterReporter("All"); setFilterAssignee("All"); }}>
                Reset
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="unassigned">
          {renderIssueList(unassignedIssues, issuesLoading)}
        </TabsContent>

        <TabsContent value="assigned">
          {renderIssueList(assignedIssues, issuesLoading)}
        </TabsContent>

        <TabsContent value="resolved">
          {renderIssueList(resolvedIssues, false)}
        </TabsContent>

        <TabsContent value="archived">
          {renderIssueList(archivedIssues, false)}
        </TabsContent>
      </Tabs>

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="font-headline">Assign Issue</DialogTitle>
            <DialogDescription>Create a task for an operative.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Select Staff Member</Label>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{showAllStaff ? 'Showing All' : `Depot: ${targetDepot || 'Any'}`}</span>
                    <Switch checked={showAllStaff} onCheckedChange={setShowAllStaff} />
                </div>
              </div>
              
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input 
                    placeholder="Search staff by name or role..." 
                    className="h-8 pl-8 text-xs" 
                    value={assignSearch}
                    onChange={e => setAssignSearch(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto pr-2 mt-2">
                {assignableStaff.map(user => (
                  <div key={user.id} className={`flex items-center justify-between p-3 border rounded-xl hover:bg-muted/50 cursor-pointer transition-colors ${assignment.operativeId === user.id ? 'border-primary bg-primary/5' : ''}`} onClick={() => setAssignment({...assignment, operativeId: user.id})}>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border"><AvatarImage src={user.avatar} /><AvatarFallback>{user.name.charAt(0)}</AvatarFallback></Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{user.name}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted font-bold text-muted-foreground uppercase">{user.role || (user.roles?.[0])}</span>
                            <span className="text-[9px] text-muted-foreground truncate max-w-[150px]">{user.depots?.length ? user.depots.join(', ') : user.depot}</span>
                        </div>
                      </div>
                    </div>
                    {assignment.operativeId === user.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </div>
                ))}
                {assignableStaff.length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed rounded-xl">
                        <p className="text-xs text-muted-foreground italic mb-2">No staff found {showAllStaff ? '' : `for ${targetDepot}`}</p>
                        {!showAllStaff && (
                            <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => setShowAllStaff(true)}>Show All Staff</Button>
                        )}
                    </div>
                )}
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
          </DialogFooter>
        </DialogContent>
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

export default function IssuesPage() {
  return (
    <Suspense fallback={
      <DashboardShell title="Issues Management" description="Loading issues...">
        <div className="flex items-center justify-center h-96">
          <Clock className="h-12 w-12 animate-spin text-primary" />
        </div>
      </DashboardShell>
    }>
      <IssuesContent />
    </Suspense>
  );
}
