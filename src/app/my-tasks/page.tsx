
"use client";

import { useState, useRef, useEffect } from "react";
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
  Image as ImageIcon,
  X,
  Camera,
  MessageSquare
} from "lucide-react";
import { MOCK_TASKS, MOCK_USERS, updateMockTask, updateMockIssue, MOCK_ISSUES } from "@/lib/mock-data";
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

export default function MyTasksPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = MOCK_USERS[1]; // Sarah Smith
  const [tasks, setTasks] = useState(MOCK_TASKS.filter(t => t.assignedTo === currentUser.name));
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [completionData, setCompletionData] = useState({
    note: "",
    imageUrl: ""
  });

  // Sync local state
  useEffect(() => {
    setTasks(MOCK_TASKS.filter(t => t.assignedTo === currentUser.name));
  }, [MOCK_TASKS]);

  const handleStatusUpdate = (taskId: string, newStatus: 'Todo' | 'Doing' | 'Done') => {
    if (newStatus === 'Done') {
      setSelectedTaskId(taskId);
      setCompletionData({ note: "", imageUrl: "" });
      setIsCompletionDialogOpen(true);
      return;
    }

    const task = MOCK_TASKS.find(t => t.id === taskId);
    if (!task) return;

    const updated = { ...task, status: newStatus };
    updateMockTask(updated);
    setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
    
    toast({
      title: "Task Updated",
      description: `Status changed to ${newStatus}.`,
    });
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

  const handleCompleteTask = () => {
    if (!selectedTaskId) return;

    const task = MOCK_TASKS.find(t => t.id === selectedTaskId);
    if (!task) return;

    // 1. Update Task
    const updatedTask = { 
      ...task, 
      status: 'Done' as const,
      completionNote: completionData.note,
      completionImageUrl: completionData.imageUrl
    };
    updateMockTask(updatedTask);
    setTasks(prev => prev.map(t => t.id === selectedTaskId ? updatedTask : t));

    // 2. If linked to an issue, resolve the issue
    if (task.linkedIssueId) {
      const issue = MOCK_ISSUES.find(i => i.id === task.linkedIssueId);
      if (issue) {
        updateMockIssue({ ...issue, status: 'Resolved' as const });
      }
    }

    setIsCompletionDialogOpen(false);
    setSelectedTaskId(null);
    toast({
      title: "Task Completed",
      description: "Well done! Your work has been submitted and the linked issue (if any) is resolved.",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Todo': return <Badge variant="outline" className="bg-muted text-muted-foreground font-bold text-[10px] uppercase">To Do</Badge>;
      case 'Doing': return <Badge className="bg-accent text-accent-foreground font-bold text-[10px] uppercase">In Progress</Badge>;
      case 'Done': return <Badge className="bg-primary text-primary-foreground font-bold text-[10px] uppercase">Completed</Badge>;
      default: return null;
    }
  };

  const activeTasks = tasks.filter(t => t.status !== 'Done');
  const completedTasks = tasks.filter(t => t.status === 'Done');

  return (
    <DashboardShell 
      title="My Daily Tasks" 
      description={`Personal work queue for ${currentUser.name}`}
    >
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="active">Active ({activeTasks.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {activeTasks.length > 0 ? (
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
                        <span>{task.status === 'Doing' ? '45%' : '0%'}</span>
                      </div>
                      <Progress value={task.status === 'Doing' ? 45 : 0} className="h-2" />
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
                    ) : (
                      <Button 
                        variant="ghost" 
                        className="flex-1 rounded-none h-12 text-xs font-bold text-primary hover:bg-primary/5"
                        onClick={() => handleStatusUpdate(task.id, 'Done')}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Complete
                      </Button>
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
              <p className="text-sm">No active tasks assigned to you right now.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          <div className="grid gap-4">
            {completedTasks.map((task) => (
              <Card key={task.id} className="bg-muted/30 border-dashed">
                <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{task.title}</h4>
                      <p className="text-xs text-muted-foreground">{task.park} • Completed {task.dueDate}</p>
                      {task.completionNote && (
                        <p className="text-[10px] text-muted-foreground italic mt-1 bg-muted/50 p-1 rounded">
                          "{task.completionNote}"
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.completionImageUrl && (
                      <div className="relative h-12 w-12 rounded border overflow-hidden">
                        <Image src={task.completionImageUrl} alt="Evidence" fill className="object-cover" />
                      </div>
                    )}
                    <Badge variant="outline" className="text-[10px] opacity-60">FINISHED</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {completedTasks.length === 0 && (
              <p className="text-center py-12 text-sm text-muted-foreground">No completed tasks recorded for this period.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isCompletionDialogOpen} onOpenChange={setIsCompletionDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="font-headline">Mark Task as Completed</DialogTitle>
            <DialogDescription>
              Submit your work for review. Providing an image and a brief note helps verify the resolution.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="completion-note">Work Completed Note (Optional)</Label>
              <Textarea 
                id="completion-note" 
                placeholder="Briefly describe what was done..." 
                value={completionData.note}
                onChange={e => setCompletionData({...completionData, note: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Attach Evidence Photo (Optional)</Label>
              <div className="flex flex-col gap-2">
                {completionData.imageUrl ? (
                  <div className="relative w-full aspect-video rounded-md overflow-hidden border">
                    <Image src={completionData.imageUrl} alt="Evidence" fill className="object-cover" />
                    <Button 
                      size="icon" 
                      variant="destructive" 
                      className="absolute top-2 right-2 h-7 w-7 rounded-full"
                      onClick={() => setCompletionData({...completionData, imageUrl: ""})}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full h-24 border-dashed border-2 flex flex-col items-center justify-center gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs font-bold text-muted-foreground">Capture or Upload Proof</span>
                  </Button>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  capture="environment" // Hint for mobile camera
                  onChange={handleImageUpload} 
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full font-bold" onClick={handleCompleteTask}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Submit Completion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
