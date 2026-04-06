
"use client";

import { useState, useRef, useMemo } from "react";
import { compressImage } from "@/lib/image-compress";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ChevronRight, 
  AlertCircle,
  PlayCircle,
  X,
  Camera,
  Send,
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Image from "next/image";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, updateDoc, doc, query, where } from "firebase/firestore";
import { User as UserType } from "@/lib/types";
import { format } from "date-fns";

export default function MyTasksPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();
  
  // Fetch all users to find colleagues and current profile
  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "users"));
  }, [db]);
  const { data: allUsers = [] } = useCollection<UserType>(usersQuery as any);

  // Dynamic current user profile
  const currentUserProfile = useMemo(() => 
    allUsers.find(u => u.email?.toLowerCase() === user?.email?.toLowerCase()),
  [allUsers, user?.email]);
  
  const currentUserName = useMemo(() => {
    if (currentUserProfile?.name) return currentUserProfile.name;
    if (user?.email?.toLowerCase() === 'quinten.geurs@gmail.com') return "Quinten (Admin)";
    return user?.displayName || user?.email || "";
  }, [currentUserProfile, user]);

  const isAdmin = useMemo(() => 
    currentUserProfile?.role === 'Admin' || user?.email?.toLowerCase() === 'quinten.geurs@gmail.com',
  [currentUserProfile, user?.email]);

  const groupIdentity = useMemo(() => {

    if (!currentUserProfile?.role || !currentUserProfile?.depot) return null;
    return `Group: ${currentUserProfile.role} @ ${currentUserProfile.depot}`;
  }, [currentUserProfile]);

  const colleagues = useMemo(() => {
    if (!currentUserProfile) return [];
    return allUsers.filter(u => 
      u.team === currentUserProfile.team && 
      u.depot === currentUserProfile.depot && 
      u.name !== currentUserName && 
      !u.isArchived
    );
  }, [allUsers, currentUserProfile, currentUserName]);


  const tasksQuery = useMemoFirebase(() => {
    if (!db || !currentUserName) return null;
    const identities = [currentUserName];
    if (groupIdentity) identities.push(groupIdentity);
    return query(collection(db, "tasks"), where("assignedTo", "in", identities));
  }, [db, currentUserName, groupIdentity]);

  const { data: tasks = [], loading } = useCollection<any>(tasksQuery);

  const issuesQuery = useMemoFirebase(() => db ? query(collection(db, "issues")) : null, [db]);
  const { data: allIssues = [] } = useCollection<any>(issuesQuery);

  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = tasks.find(t => t.id === selectedTaskId);
  const linkedIssue = allIssues.find(i => i.id === selectedTask?.linkedIssueId);

  const [showColleagueSelection, setShowColleagueSelection] = useState(false);
  const [selectedColleagues, setSelectedColleagues] = useState<string[]>([]);
  const [completionData, setCompletionData] = useState({
    note: "",
    imageUrl: ""
  });

  const handleStatusUpdate = (taskId: string, newStatus: string) => {
    if (!db) return;
    if (newStatus === 'Pending Approval') {
      setSelectedTaskId(taskId);
      setCompletionData({ note: "", imageUrl: "" });
      setSelectedColleagues([]);
      setShowColleagueSelection(false);
      setIsDetailDialogOpen(true);
      return;
    }

    updateDoc(doc(db, "tasks", taskId), { status: newStatus });
    toast({ title: "Task Updated", description: `Status set to ${newStatus}.` });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedDataUrl = await compressImage(file, 800, 800, 0.7);
        setCompletionData(prev => ({ ...prev, imageUrl: compressedDataUrl }));
      } catch (error) {
        toast({ title: "Image Error", description: "Could not process image.", variant: "destructive" });
      }
    }
  };

  const handleCompleteTask = async () => {
    if (!db || !selectedTaskId) return;

    // 1. Update Task to Pending Approval
    await updateDoc(doc(db, "tasks", selectedTaskId), { 
      status: 'Pending Approval',
      completionNote: completionData.note,
      completionImageUrl: completionData.imageUrl,
      collaborators: selectedColleagues
    });

    // 2. Set Issue to Pending Approval if linked
    if (selectedTask?.linkedIssueId) {
      await updateDoc(doc(db, "issues", selectedTask.linkedIssueId), { 
        status: 'Pending Approval',
        collaborators: selectedColleagues,
        resolutionNote: completionData.note,
        resolutionImageUrl: completionData.imageUrl,
        resolutionDate: new Date().toISOString()
      });
    }

    setIsDetailDialogOpen(false);
    setSelectedTaskId(null);
    toast({ 
      title: "Task Submitted", 
      description: "Work proof sent to supervisor for approval." 
    });
  };

  const toggleColleague = (name: string) => {
    setSelectedColleagues(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Todo': return <Badge variant="outline" className="bg-muted text-muted-foreground font-bold text-[10px] uppercase">To Do</Badge>;
      case 'Doing': return <Badge className="bg-accent text-accent-foreground font-bold text-[10px] uppercase">In Progress</Badge>;
      case 'Pending Approval': return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-200 font-bold text-[10px] uppercase animate-pulse">Reviewing</Badge>;
      case 'Completed': return <Badge className="bg-primary text-primary-foreground font-bold text-[10px] uppercase">Archived</Badge>;
      default: return null;
    }
  };

  const today = format(new Date(), 'yyyy-MM-dd');
  const activeTasks = tasks.filter(t => t.status !== 'Completed' && t.dueDate <= today);
  const archivedTasks = tasks.filter(t => t.status === 'Completed' && t.dueDate === today);

  return (
    <DashboardShell 
      title="My Daily Tasks" 
      description={`Personal work queue for ${currentUserName}`}
    >
      {/* Diagnostic Debug - Visible for troubleshooting */}
      {isAdmin && (
        <div className="mb-4 py-1 px-3 bg-black/5 rounded text-[10px] font-mono text-primary/40 flex flex-wrap gap-4 items-center">
           <span className="font-bold text-accent-foreground uppercase tracking-tight">Diagnostic Mode:</span>
           <span>EMAIL: {user?.email}</span>
           <span>PROF_NAME: {currentUserProfile?.name || 'NOT FOUND'}</span>
           <span>QUERY_NAME: {currentUserName}</span>
           <span>GROUP: {groupIdentity || 'NONE'}</span>
           <span>TASKS_LOADED: {tasks.length}</span>
           <span>VISIBLE: {activeTasks.length + archivedTasks.length}</span>
           {!currentUserProfile && <span className="text-destructive font-bold">MISSING DB RECORD</span>}
        </div>
      )}

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="active">Active ({activeTasks.length})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({archivedTasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {loading ? (
             <div className="flex justify-center py-20"><Clock className="animate-spin h-8 w-8 text-primary" /></div>
          ) : activeTasks.length > 0 ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {activeTasks.map((task) => (
                <Card 
                  key={task.id} 
                  className="border-2 hover:border-primary/40 transition-all group flex flex-col cursor-pointer"
                  onClick={() => {
                    setSelectedTaskId(task.id);
                    setIsDetailDialogOpen(true);
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-wider">
                        <MapPin className="h-3 w-3" />
                        {task.park}
                      </div>
                      {getStatusBadge(task.status)}
                    </div>
                    <CardTitle className="text-xl font-headline group-hover:text-primary transition-colors">{task.title}</CardTitle>
                    <CardDescription className="text-sm font-medium text-foreground/70 line-clamp-3 min-h-[4rem]">
                      {task.objective}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4 flex-1">
                    <div className="space-y-4">
                      {task.linkedIssueId && (
                        <div className="p-2 rounded bg-yellow-50 border border-yellow-100 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="text-[10px] font-bold text-yellow-700 uppercase">Linked to Issue</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Due {task.dueDate}</span>
                        <span>{task.status === 'Doing' ? '45%' : task.status === 'Pending Approval' ? '100%' : '0%'}</span>
                      </div>
                      <Progress value={task.status === 'Doing' ? 45 : task.status === 'Pending Approval' ? 100 : 0} className="h-2" />
                    </div>
                  </CardContent>
                  <CardFooter className="p-0 border-t flex divide-x mt-auto">
                    {task.status === 'Todo' ? (
                      <Button 
                        variant="ghost" 
                        className="flex-1 rounded-none h-12 text-xs font-bold hover:bg-accent/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusUpdate(task.id, 'Doing');
                        }}
                      >
                        <PlayCircle className="mr-2 h-4 w-4" /> Start Task
                      </Button>
                    ) : task.status === 'Doing' ? (
                      <Button 
                        variant="ghost" 
                        className="flex-1 rounded-none h-12 text-xs font-bold text-primary hover:bg-primary/5"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTaskId(task.id);
                          setIsDetailDialogOpen(true);
                        }}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Submit Proof
                      </Button>
                    ) : (
                      <div className="flex-1 flex items-center justify-center h-12 text-[10px] font-bold text-muted-foreground uppercase bg-muted/20 w-full rounded-b-lg">
                        Reviewing Details
                      </div>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
              <CheckCircle2 className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-bold">All caught up!</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived">
          <div className="grid gap-4">
            {archivedTasks.map((task) => (
              <Card key={task.id} className="bg-muted/30 border-dashed">
                <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{task.title}</h4>
                      <p className="text-xs text-muted-foreground">{task.park} • Archived {task.dueDate}</p>
                      {task.collaborators && task.collaborators.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">Assisted by: {task.collaborators.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {task.completionImageUrl && (
                    <div className="relative h-12 w-12 rounded border overflow-hidden">
                      <Image src={task.completionImageUrl} alt="Evidence" fill className="object-cover" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 text-primary text-[10px] font-bold uppercase tracking-widest mb-1">
                  <MapPin className="h-3 w-3" /> {selectedTask.park}
                </div>
                <div className="flex justify-between items-start">
                  <DialogTitle className="text-2xl font-headline font-bold text-primary">{selectedTask.title}</DialogTitle>
                  {getStatusBadge(selectedTask.status)}
                </div>
                <DialogDescription className="text-sm font-medium text-foreground pb-2">
                  Due {selectedTask.dueDate}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Objective & Requirements</Label>
                  <p className="text-sm leading-relaxed bg-muted/30 p-4 rounded-lg border italic">
                    "{selectedTask.objective}"
                  </p>
                </div>

                {linkedIssue && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Contextual Reference (From Original Issue)</Label>
                    <div className="rounded-lg border overflow-hidden bg-muted/10">
                      {linkedIssue.imageUrl ? (
                        <div className="relative aspect-video w-full">
                          <Image src={linkedIssue.imageUrl} alt="Issue Reference" fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="p-4 flex items-center gap-2 text-xs italic text-muted-foreground">
                          <AlertCircle className="h-4 w-4" /> No original image provided.
                        </div>
                      )}
                      <div className="p-3 bg-white border-t">
                        <p className="text-xs font-bold text-primary">{linkedIssue.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{linkedIssue.description}</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTask.status === 'Todo' ? (
                  <Button className="w-full h-12 font-bold bg-accent hover:bg-accent/90" onClick={() => handleStatusUpdate(selectedTask.id, 'Doing')}>
                    <PlayCircle className="mr-2 h-5 w-5" /> START THIS TASK NOW
                  </Button>
                ) : (selectedTask.status === 'Doing' || selectedTask.status === 'Pending Approval') && (
                  <div className="space-y-6 pt-2 border-t">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Completion Note & Proof</Label>
                      <Textarea 
                        placeholder="Describe the completed work..." 
                        value={completionData.note}
                        onChange={e => setCompletionData({...completionData, note: e.target.value})}
                        disabled={selectedTask.status === 'Pending Approval'}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Photo Evidence</Label>
                      <div className="flex flex-col gap-2">
                        {completionData.imageUrl ? (
                          <div className="relative w-full aspect-video rounded-md overflow-hidden border">
                            <Image src={completionData.imageUrl} alt="Evidence" fill className="object-cover" />
                            {selectedTask.status !== 'Pending Approval' && (
                              <Button 
                                size="icon" variant="destructive" 
                                className="absolute top-2 right-2 h-7 w-7 rounded-full"
                                onClick={() => setCompletionData({...completionData, imageUrl: ""})}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ) : selectedTask.status !== 'Pending Approval' && (
                          <Button 
                            variant="outline" 
                            className="w-full h-24 border-dashed border-2 flex flex-col gap-2"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Camera className="h-6 w-6 text-muted-foreground" />
                            <span className="text-xs font-bold text-muted-foreground uppercase">Upload Proof Image</span>
                          </Button>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload} />
                      </div>
                    </div>

                    {selectedTask.status !== 'Pending Approval' && (
                      <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            <Label className="font-bold">Add Collaborating Colleagues</Label>
                          </div>
                          <Checkbox 
                            id="add-colleagues" 
                            checked={showColleagueSelection} 
                            onCheckedChange={(v) => setShowColleagueSelection(!!v)}
                          />
                        </div>
                        
                        {showColleagueSelection && (
                          <div className="space-y-2 pt-2 border-t">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Colleagues in {currentUserProfile?.team || 'General Staff'}</p>
                            <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto pr-2">
                              {colleagues.map(colleague => (
                                <div 
                                  key={colleague.id} 
                                  className="flex items-center justify-between p-2 rounded hover:bg-white transition-colors cursor-pointer"
                                  onClick={() => toggleColleague(colleague.name)}
                                >
                                  <span className="text-xs font-medium">{colleague.name}</span>
                                  <Checkbox 
                                    checked={selectedColleagues.includes(colleague.name)} 
                                    onCheckedChange={() => toggleColleague(colleague.name)}
                                  />
                                </div>
                              ))}
                              {colleagues.length === 0 && (
                                <p className="text-xs text-muted-foreground italic text-center py-2">No colleagues found in your team.</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedTask.status === 'Doing' && (
                <DialogFooter>
                  <Button className="w-full h-12 font-bold text-accent-foreground" onClick={handleCompleteTask}>
                    <Send className="mr-2 h-4 w-4" /> SUBMIT WORK FOR APPROVAL
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
