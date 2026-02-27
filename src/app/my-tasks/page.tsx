
"use client";

import { useState, useRef, useMemo } from "react";
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
  Send
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { useFirestore, useCollection } from "@/firebase";
import { collection, updateDoc, doc, query, where } from "firebase/firestore";

export default function MyTasksPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Static current user for prototype session
  const currentUserName = "Sarah Smith";

  const tasksQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "tasks"), where("assignedTo", "==", currentUserName));
  }, [db]);
  const { data: tasks = [], loading } = useCollection(tasksQuery);

  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [completionData, setCompletionData] = useState({
    note: "",
    imageUrl: ""
  });

  const handleStatusUpdate = (taskId: string, newStatus: string) => {
    if (!db) return;
    if (newStatus === 'Pending Approval') {
      setSelectedTaskId(taskId);
      setCompletionData({ note: "", imageUrl: "" });
      setIsCompletionDialogOpen(true);
      return;
    }

    updateDoc(doc(db, "tasks", taskId), { status: newStatus });
    toast({ title: "Task Updated", description: `Status set to ${newStatus}.` });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompletionData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompleteTask = async () => {
    if (!db || !selectedTaskId) return;

    const task = tasks.find(t => t.id === selectedTaskId);
    if (!task) return;

    // 1. Update Task to Pending Approval
    await updateDoc(doc(db, "tasks", selectedTaskId), { 
      status: 'Pending Approval',
      completionNote: completionData.note,
      completionImageUrl: completionData.imageUrl
    });

    // 2. Set Issue to Pending Approval if linked
    if (task.linkedIssueId) {
      await updateDoc(doc(db, "issues", task.linkedIssueId), { status: 'Pending Approval' });
    }

    setIsCompletionDialogOpen(false);
    setSelectedTaskId(null);
    toast({ 
      title: "Task Submitted", 
      description: "Work proof sent to supervisor for approval." 
    });
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

  const activeTasks = tasks.filter(t => t.status !== 'Completed');
  const archivedTasks = tasks.filter(t => t.status === 'Completed');

  return (
    <DashboardShell 
      title="My Daily Tasks" 
      description={`Personal work queue for ${currentUserName}`}
    >
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
                <Card key={task.id} className="border-2 hover:border-primary/40 transition-all group flex flex-col">
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
                        onClick={() => handleStatusUpdate(task.id, 'Doing')}
                      >
                        <PlayCircle className="mr-2 h-4 w-4" /> Start Task
                      </Button>
                    ) : task.status === 'Doing' ? (
                      <Button 
                        variant="ghost" 
                        className="flex-1 rounded-none h-12 text-xs font-bold text-primary hover:bg-primary/5"
                        onClick={() => handleStatusUpdate(task.id, 'Pending Approval')}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Submit Proof
                      </Button>
                    ) : (
                      <div className="flex-1 flex items-center justify-center h-12 text-[10px] font-bold text-muted-foreground uppercase bg-muted/20">
                        Awaiting Review
                      </div>
                    )}
                    <Button variant="ghost" className="px-4 rounded-none h-12 border-l">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Button>
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

      <Dialog open={isCompletionDialogOpen} onOpenChange={setIsCompletionDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="font-headline">Submit Completion Proof</DialogTitle>
            <DialogDescription>Submit your work for supervisor approval.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label>Work Note</Label>
              <Textarea 
                placeholder="Briefly describe what was done..." 
                value={completionData.note}
                onChange={e => setCompletionData({...completionData, note: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Photo Evidence</Label>
              <div className="flex flex-col gap-2">
                {completionData.imageUrl ? (
                  <div className="relative w-full aspect-video rounded-md overflow-hidden border">
                    <Image src={completionData.imageUrl} alt="Evidence" fill className="object-cover" />
                    <Button 
                      size="icon" variant="destructive" 
                      className="absolute top-2 right-2 h-7 w-7 rounded-full"
                      onClick={() => setCompletionData({...completionData, imageUrl: ""})}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full h-24 border-dashed border-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-6 w-6 mr-2" /> Capture Proof
                  </Button>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full font-bold" onClick={handleCompleteTask}>
              <Send className="mr-2 h-4 w-4" /> Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
