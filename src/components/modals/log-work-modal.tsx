"use client";

import { useState, useMemo } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Camera, X, Users, ClipboardCheck } from "lucide-react";
import { useFirestore, useCollection, useUser, useDoc } from "@/firebase";
import { collection, addDoc, doc } from "firebase/firestore";
import { compressImage } from "@/lib/image-compress";
import { User, RegistryConfig } from "@/lib/types";
import { format } from "date-fns";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

interface LogWorkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogWorkModal({ open, onOpenChange }: LogWorkModalProps) {
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const usersQuery = useMemo(() => db ? collection(db, "users") : null, [db]);
  const { data: allUsers = [] } = useCollection<User>(usersQuery as any);
  
  const registryRef = useMemo(() => db ? doc(db, "settings", "registry") : null, [db]);
  const { data: registry } = useDoc<RegistryConfig>(registryRef as any);

  const currentUser = allUsers.find(u => u.email?.toLowerCase() === user?.email?.toLowerCase());

  const colleagues = useMemo(() => {
    if (!currentUser) return [];
    return allUsers.filter(u => 
      u.id !== currentUser.id && 
      !u.isArchived && 
      u.depot === currentUser.depot
    );
  }, [allUsers, currentUser]);

  const [formData, setFormData] = useState({
    title: "",
    park: "",
    note: "",
    imageUrl: "",
    selectedColleagues: [] as string[]
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 800, 800, 0.7);
        setFormData(prev => ({ ...prev, imageUrl: compressed }));
      } catch (err) {
        toast({ title: "Upload Failed", variant: "destructive" });
      }
    }
  };

  const toggleColleague = (name: string) => {
    setFormData(prev => ({
      ...prev,
      selectedColleagues: prev.selectedColleagues.includes(name)
        ? prev.selectedColleagues.filter(n => n !== name)
        : [...prev.selectedColleagues, name]
    }));
  };

  const handleSubmit = async () => {
    if (!db || !user || isSubmitting) return;
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, "tasks"), {
        title: formData.title,
        objective: formData.note || "Ad-hoc work log",
        park: formData.park,
        assignedTo: currentUser?.name || user.displayName || user.email,
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        status: 'Pending Approval',
        completionNote: formData.note,
        completionImageUrl: formData.imageUrl,
        collaborators: formData.selectedColleagues,
        isLog: true,
        createdAt: new Date().toISOString()
      });

      toast({ title: "Work Logged", description: "Successfully sent for approval." });
      setFormData({ title: "", park: "", note: "", imageUrl: "", selectedColleagues: [] });
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Error", description: "Failed to log work.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" /> Log Work Done
          </DialogTitle>
          <DialogDescription>Report ad-hoc maintenance or operational tasks.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">What did you do?</Label>
            <Input 
              placeholder="e.g. Mowed grass at the north entrance" 
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location (Park)</Label>
            <Select value={formData.park} onValueChange={v => setFormData(prev => ({ ...prev, park: v }))}>
              <SelectTrigger><SelectValue placeholder="Select Park" /></SelectTrigger>
              <SelectContent>
                {registry?.parks?.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Who assisted you?</Label>
            <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/20">
              {colleagues.map(u => (
                <Badge 
                  key={u.id}
                  variant={formData.selectedColleagues.includes(u.name) ? "default" : "outline"}
                  className="cursor-pointer py-1 px-3"
                  onClick={() => toggleColleague(u.name)}
                >
                  <Users className="mr-1 h-3 w-3" /> {u.name}
                </Badge>
              ))}
              {colleagues.length === 0 && <p className="text-[10px] italic text-muted-foreground">No colleagues found in your depot.</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Proof (Photo)</Label>
              <div className="flex flex-col gap-3">
                {formData.imageUrl ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden border">
                    <Image src={formData.imageUrl} alt="Proof" fill className="object-cover" />
                    <button 
                      onClick={() => setFormData(prev => ({ ...prev, imageUrl: "" }))}
                      className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase text-center px-4 leading-tight">Tap for camera</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Note / details</Label>
              <Textarea 
                placeholder="Any specific findings or notes?" 
                className="h-full min-h-[120px]"
                value={formData.note}
                onChange={e => setFormData(prev => ({ ...prev, note: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button 
            className="w-full font-bold h-12 uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
            disabled={!formData.title || !formData.park || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? "Logging..." : "Submit for Approval"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
