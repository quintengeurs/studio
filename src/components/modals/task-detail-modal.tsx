
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
  CheckCircle2,
  X,
  BrainCircuit,
  Users
} from "lucide-react";
import Image from "next/image";
import { useFirestore, useUser } from "@/firebase";
import { updateDoc, doc, arrayUnion } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Task, Issue, User } from "@/lib/types";

interface TaskDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  linkedIssue?: Issue;
  allUsers: User[];
  allParks?: any[];
  volunteerEmail?: string | null;
  onSuccess?: () => void;
}

export function TaskDetailModal({ open, onOpenChange, task, linkedIssue, allUsers, allParks, volunteerEmail, onSuccess }: TaskDetailModalProps) {
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

  const taskDepot = useMemo(() => {
    if (!task || !allParks) return null;
    return allParks.find(p => p.name === task.park)?.depot;
  }, [task, allParks]);

  const colleagues = useMemo(() => {
    if (!taskDepot) {
      // Fallback to current user's depot if we can't find task depot
      if (!currentUserProfile) return [];
      return allUsers.filter(u => 
        (u.depot === currentUserProfile.depot || u.depots?.includes(currentUserProfile.depot || "")) && 
        u.name !== currentUserProfile.name && 
        !u.isArchived
      );
    }

    return allUsers.filter(u => {
      const userDepots = u.depots || (u.depot ? [u.depot] : []);
      return userDepots.includes(taskDepot) && 
             u.name !== currentUserProfile?.name && 
             !u.isArchived;
    });
  }, [allUsers, currentUserProfile, taskDepot]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!db || !task) return;
    try {
      if (newStatus === 'Doing' && task.maxVolunteers && (task.doingByVolunteers?.length || 0) >= task.maxVolunteers) {
        toast({ title: "Task Full", description: "This volunteer role has reached its capacity.", variant: "destructive" });
        return;
      }

      const updateData: any = { status: newStatus };
      if (newStatus === 'Doing' && volunteerEmail) {
        updateData.doingByVolunteers = arrayUnion(volunteerEmail);
        // We still set assignedTo for staff visibility, 
        // but it will show the first/primary person or we can change it to a count later.
        updateData.assignedTo = `Volunteer Team (${(task.doingByVolunteers?.length || 0) + 1} active)`;
      }
      await updateDoc(doc(db, "tasks", task.id), updateData);
      toast({ title: "Task Joined", description: `You are now working on this task.` });
      if (onSuccess) onSuccess();
      onOpenChange(false);
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
    
    // Role-based validation
    const operativeRoles = ['Gardener', 'Keeper', 'Litter Picker', 'Bin Run', 'Head Gardener', 'Contractor'];
    const userRoles = currentUserProfile?.roles || (currentUserProfile?.role ? [currentUserProfile.role] : []);
    const isOperationalOrContractor = userRoles.some(r => operativeRoles.includes(r as string));

    if (isOperationalOrContractor && !completionData.imageUrl) {
      toast({ 
        title: "Image Proof Required", 
        description: "As an operational staff member or contractor, you must upload a photo proof to complete this task.", 
        variant: "destructive" 
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const newStatus = volunteerEmail ? 'Completed' : 'Pending Approval';

      await updateDoc(doc(db, "tasks", task.id), { 
        status: newStatus,
        completionNote: completionData.note,
        completionImageUrl: completionData.imageUrl,
        collaborators: selectedColleagues,
        ...(volunteerEmail ? { 
          completedByVolunteers: arrayUnion(volunteerEmail),
          assignedTo: `Volunteer: ${volunteerEmail}`,
          completedAt: new Date().toISOString()
        } : {})
      });

      if (task.linkedIssueId) {
        await updateDoc(doc(db, "issues", task.linkedIssueId), { 
          status: newStatus === 'Completed' ? 'Resolved' : 'Pending Approval',
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
      if (onSuccess) onSuccess();
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
          <DialogDescription className="text-sm font-medium text-foreground/80 mt-1 flex items-center gap-2 flex-wrap">
            <span>Due {task.dueDate} {task.displayTime && `at ${task.displayTime}`} • Status: <Badge variant="outline" className="ml-1 uppercase text-[10px] bg-primary/5">{task.status}</Badge></span>
            {task.source === 'smart-engine' && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1 uppercase text-[9px] font-bold">
                <BrainCircuit className="h-3 w-3" /> Auto-Generated: Weather
              </Badge>
            )}
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

            {task.volunteerImageUrl && (
              <div className="relative aspect-video w-full rounded-xl overflow-hidden border shadow-sm">
                <Image src={task.volunteerImageUrl} alt="Volunteer Role" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
            )}

            {task.isVolunteerEligible && task.status === 'Completed' && task.completedByVolunteers?.includes(volunteerEmail || "") && task.rewardDescription && (
              <div className="p-6 rounded-2xl bg-gradient-to-br from-pink-500 to-orange-500 text-white shadow-xl animate-in zoom-in-95 duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                    <Heart className="h-5 w-5 fill-current" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg leading-tight tracking-tight">Reward Unlocked!</h4>
                    <p className="text-[10px] uppercase font-bold opacity-80 tracking-widest">Thank you for your help</p>
                  </div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 block mb-1">Your Reward</span>
                  <span className="text-xl font-bold">{task.rewardDescription}</span>
                </div>

                {task.rewardCode && (
                  <div className="bg-white text-orange-600 rounded-xl p-4 flex flex-col items-center justify-center border-2 border-white/50 shadow-inner">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500/70 mb-1">Redemption Code</span>
                    <span className="text-2xl font-black tracking-widest">{task.rewardCode}</span>
                  </div>
                )}
                
                <p className="text-[10px] text-center mt-4 opacity-80 font-medium">Present this code at the park office or participating vendors to claim your reward.</p>
              </div>
            )}

            {linkedIssue && (
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60 flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3" /> Linked Issue Context
                </Label>
                <div className="rounded-xl border-2 border-yellow-200 overflow-hidden bg-yellow-50/30 dark:bg-yellow-900/10">
                  {linkedIssue.imageUrl ? (
                    <div className="relative aspect-video w-full">
                      <Image src={linkedIssue.imageUrl} alt="Issue Reference" fill className="object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                        {linkedIssue.priority && (
                          <Badge className={`text-[9px] font-bold uppercase px-2 ${
                            linkedIssue.priority === 'Emergency' ? 'bg-red-600 text-white' :
                            linkedIssue.priority === 'High' ? 'bg-yellow-500 text-white' :
                            linkedIssue.priority === 'Medium' ? 'bg-blue-500 text-white' :
                            'bg-green-600 text-white'
                          }`}>{linkedIssue.priority}</Badge>
                        )}
                        {linkedIssue.category && (
                          <Badge variant="secondary" className="text-[9px] font-bold uppercase px-2 bg-white/80 text-foreground">{linkedIssue.category}</Badge>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-24 bg-yellow-100/50 flex items-center justify-center gap-2 text-yellow-700">
                      <AlertCircle className="h-5 w-5" />
                      <span className="text-xs font-bold uppercase">No Image Provided</span>
                    </div>
                  )}
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-bold text-foreground leading-tight">{linkedIssue.title}</p>
                        {!linkedIssue.imageUrl && linkedIssue.priority && (
                          <Badge className={`text-[9px] font-bold uppercase px-2 shrink-0 ${
                            linkedIssue.priority === 'Emergency' ? 'bg-red-600 text-white' :
                            linkedIssue.priority === 'High' ? 'bg-yellow-500 text-white' :
                            linkedIssue.priority === 'Medium' ? 'bg-blue-500 text-white' :
                            'bg-green-600 text-white'
                          }`}>{linkedIssue.priority}</Badge>
                        )}
                      </div>
                      {linkedIssue.description && (
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{linkedIssue.description}</p>
                      )}
                    </div>
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-1 pt-2 border-t border-yellow-200/60">
                      {linkedIssue.reportedBy && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" /> Reported by <strong>{linkedIssue.reportedBy}</strong>
                        </span>
                      )}
                      {linkedIssue.createdAt && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> {new Date(linkedIssue.createdAt).toLocaleDateString()}
                        </span>
                      )}
                      {linkedIssue.location && (
                        <span className="text-[10px] text-primary flex items-center gap-1 font-bold">
                          <MapPin className="h-3 w-3" /> GPS Tagged
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(task.status === 'Todo' || (task.status === 'Doing' && task.isVolunteerEligible && !task.doingByVolunteers?.includes(volunteerEmail || ""))) && (
              <Button 
                className={`w-full h-12 font-bold ${task.isVolunteerEligible ? 'bg-orange-500 hover:bg-orange-600' : 'bg-accent hover:bg-accent/90'}`} 
                onClick={() => handleStatusUpdate('Doing')}
                disabled={(task.maxVolunteers && (task.doingByVolunteers?.length || 0) >= task.maxVolunteers) || isSubmitting}
              >
                {task.isVolunteerEligible 
                  ? (task.status === 'Doing' 
                      ? ((task.maxVolunteers && (task.doingByVolunteers?.length || 0) >= task.maxVolunteers) ? 'ROLE FULL' : 'JOIN VOLUNTEER TEAM') 
                      : 'COMMENCE VOLUNTEERING') 
                  : 'START THIS TASK NOW'}
              </Button>
            )}

            {((task.status === 'Doing' && (!task.isVolunteerEligible || task.doingByVolunteers?.includes(volunteerEmail || ""))) || task.status === 'Pending Approval') && (
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
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
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

        {task.status === 'Doing' && (!task.isVolunteerEligible || task.doingByVolunteers?.includes(volunteerEmail || "")) && (
          <DialogFooter className="p-6 border-t">
            <Button 
              className={`w-full h-12 font-bold ${task.isVolunteerEligible ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-accent text-accent-foreground'}`} 
              onClick={handleCompleteTask} 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : task.isVolunteerEligible ? "COMPLETE VOLUNTEERING" : "SUBMIT WORK FOR APPROVAL"}
              <Send className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
