
"use client";

import { useState, useRef, useMemo } from "react";
import { compressImage } from "@/lib/image-compress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Camera, 
  Send, 
  MapPin, 
  AlertCircle,
  Users,
  CheckCircle2,
  X
} from "lucide-react";
import Image from "next/image";
import { useFirestore, useUser } from "@/firebase";
import { updateDoc, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Task, Issue, User } from "@/lib/types";

interface TaskDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  linkedIssue?: Issue;
  allUsers: User[];
}

export function TaskDetailModal({ open, onOpenChange, task, linkedIssue, allUsers }: TaskDetailModalProps) {
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showColleagueSelection, setShowColleagueSelection] = useState(false);
  const [selectedColleagues, setSelectedColleagues] = useState<string[]>([]);
  const [completionData, setCompletionData] = useState({
    note: "",
    imageUrl: ""
  });

  const currentUserProfile = useMemo(() => 
    allUsers.find(u => u.email?.toLowerCase() === user?.email?.toLowerCase()),
  [allUsers, user?.email]);

  const colleagues = useMemo(() => {
    if (!currentUserProfile) return [];
    return allUsers.filter(u => 
      u.depot === currentUserProfile.depot && 
      u.name !== currentUserProfile.name && 
      !u.isArchived
    );
  }, [allUsers, currentUserProfile]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!db || !task) return;
    try {
      await updateDoc(doc(db, "tasks", task.id), { status: newStatus });
      toast({ title: "Task Updated", description: `Status set to ${newStatus}.` });
    } catch (e) {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
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
    if (!db || !task) return;
    setIsSubmitting(true);

    try {
      await updateDoc(doc(db, "tasks", task.id), { 
        status: 'Pending Approval',
        completionNote: completionData.note,
        completionImageUrl: completionData.imageUrl,
        collaborators: selectedColleagues
      });

      if (task.linkedIssueId) {
        await updateDoc(doc(db, "issues", task.linkedIssueId), { 
          status: 'Pending Approval',
          collaborators: selectedColleagues,
          resolutionNote: completionData.note,
          resolutionImageUrl: completionData.imageUrl,
          resolutionDate: new Date().toISOString()
        });
      }

      toast({ 
        title: "Task Submitted", 
        description: "Work proof sent for approval." 
      });
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Error", description: "Failed to submit work.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleColleague = (name: string) => {
    setSelectedColleagues(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-2 text-primary text-[10px] font-bold uppercase tracking-widest mb-1 opacity-70">
            <MapPin className="h-3 w-3" /> {task.park}
          </div>
          <DialogTitle className="text-2xl font-headline font-bold text-primary">{task.title}</DialogTitle>
          <DialogDescription className="text-sm font-medium text-foreground/80 mt-1">
            Due {task.dueDate} • Status: <Badge variant="outline" className="ml-1 uppercase text-[10px] bg-primary/5">{task.status}</Badge>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 pb-6 space-y-8">
            <div className="space-y-2 pt-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Objective & Requirements</Label>
              <p className="text-sm leading-relaxed bg-muted/30 p-4 rounded-lg border italic font-medium">
                "{task.objective}"
              </p>
            </div>

            {linkedIssue && (
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Contextual Reference</Label>
                <div className="rounded-lg border overflow-hidden bg-muted/5">
                  {linkedIssue.imageUrl && (
                    <div className="relative aspect-video w-full">
                      <Image src={linkedIssue.imageUrl} alt="Issue Reference" fill className="object-cover" />
                    </div>
                  )}
                  <div className="p-3 bg-white border-t">
                    <p className="text-xs font-bold text-primary">{linkedIssue.title}</p>
                  </div>
                </div>
              </div>
            )}

            {task.status === 'Todo' && (
              <Button className="w-full h-12 font-bold bg-accent hover:bg-accent/90" onClick={() => handleStatusUpdate('Doing')}>
                START THIS TASK NOW
              </Button>
            )}

            {(task.status === 'Doing' || task.status === 'Pending Approval') && (
              <div className="space-y-6 pt-2 border-t text-left">
                <div className="space-y-2 text-left">
                  <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Completion Note & Proof</Label>
                  <Textarea 
                    placeholder="Describe the completed work..." 
                    value={completionData.note}
                    onChange={e => setCompletionData({...completionData, note: e.target.value})}
                    disabled={task.status === 'Pending Approval'}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Photo Evidence</Label>
                  <div className="flex flex-col gap-2">
                    {completionData.imageUrl ? (
                      <div className="relative w-full aspect-video rounded-md overflow-hidden border shadow-sm">
                        <Image src={completionData.imageUrl} alt="Evidence" fill className="object-cover" />
                        {task.status !== 'Pending Approval' && (
                          <Button 
                            size="icon" variant="destructive" 
                            className="absolute top-2 right-2 h-7 w-7 rounded-full"
                            onClick={() => setCompletionData({...completionData, imageUrl: ""})}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ) : task.status !== 'Pending Approval' && (
                      <Button 
                        variant="outline" 
                        className="w-full h-24 border-dashed border-2 flex flex-col gap-2 bg-muted/10 hover:bg-muted/30"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs font-bold text-muted-foreground uppercase">Upload Proof Image</span>
                      </Button>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload} />
                  </div>
                </div>

                {task.status !== 'Pending Approval' && (
                  <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <Label className="font-bold">Add Collaborators</Label>
                      </div>
                      <Checkbox 
                        id="add-colleagues" 
                        checked={showColleagueSelection} 
                        onCheckedChange={(v) => setShowColleagueSelection(!!v)}
                      />
                    </div>
                    
                    {showColleagueSelection && (
                      <div className="space-y-2 pt-2 border-t">
                        <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto pr-2">
                          {colleagues.map(colleague => (
                            <div 
                              key={colleague.id} 
                              className="flex items-center justify-between p-2 rounded hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-muted"
                              onClick={() => toggleColleague(colleague.name)}
                            >
                              <span className="text-xs font-medium">{colleague.name}</span>
                              <Checkbox 
                                checked={selectedColleagues.includes(colleague.name)} 
                                onCheckedChange={() => toggleColleague(colleague.name)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {task.status === 'Doing' && (
          <DialogFooter className="p-6 border-t">
            <Button className="w-full h-12 font-bold text-accent-foreground" onClick={handleCompleteTask} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "SUBMIT WORK FOR APPROVAL"}
              <Send className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
