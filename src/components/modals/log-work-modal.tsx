"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
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
import { Badge } from "@/components/ui/badge";
import { useFirestore, useUser, useDoc } from "@/firebase";
import { collection, addDoc, doc } from "firebase/firestore";
import { compressImage } from "@/lib/image-compress";
import { RegistryConfig } from "@/lib/types";
import { format } from "date-fns";
import { useDataContext } from "@/context/DataContext";
import { useUserContext } from "@/context/UserContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { logWorkSchema } from "@/lib/schemas";
import { z } from "zod";

type FormData = z.infer<typeof logWorkSchema>;

interface LogWorkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogWorkModal({ open, onOpenChange }: LogWorkModalProps) {
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();

  const { profile } = useUserContext();
  const { allUsers, allParks, registryConfig: contextRegistry } = useDataContext();
  
  const registryRef = useMemo(() => db ? doc(db, "settings", "registry") : null, [db]);
  const { data: localRegistry } = useDoc<RegistryConfig>(registryRef as any);
  const registry = localRegistry || contextRegistry;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: zodResolver(logWorkSchema),
    defaultValues: {
      title: "",
      park: "",
      note: "",
      imageUrl: "",
      selectedColleagues: []
    }
  });

  const watchPark = watch("park");
  const watchImageUrl = watch("imageUrl");
  const watchColleagues = watch("selectedColleagues");

  const userDepots = useMemo(() => {
    const list = [...(profile?.depots || []), profile?.depot].filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [profile]);

  const parks = useMemo(() => {
    const list = [...(registry?.parks || []), ...allParks.map(p => p.name)];
    return Array.from(new Set(list)).sort();
  }, [allParks, registry]);

  const colleagues = useMemo(() => {
    if (userDepots.length === 0) return [];
    return allUsers.filter(u => 
      u.email?.toLowerCase() !== user?.email?.toLowerCase() && 
      !u.isArchived && 
      (
        (u.depots?.some(d => userDepots.includes(d))) || 
        (u.depot && userDepots.includes(u.depot))
      )
    );
  }, [allUsers, userDepots, user?.email]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 800, 800, 0.7);
        setValue("imageUrl", compressed, { shouldValidate: true });
      } catch (err) {
        toast({ title: "Upload Failed", variant: "destructive" });
      }
    }
  };

  const toggleColleague = (name: string) => {
    const newSelected = watchColleagues.includes(name)
      ? watchColleagues.filter(n => n !== name)
      : [...watchColleagues, name];
    setValue("selectedColleagues", newSelected, { shouldDirty: true });
  };

  const onSubmit = async (data: FormData) => {
    if (!db || !user) return;

    try {
      await addDoc(collection(db, "tasks"), {
        title: data.title,
        objective: data.note || "Ad-hoc work log",
        park: data.park,
        assignedTo: profile?.name || user.displayName || user.email,
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        status: 'Pending Approval',
        completionNote: data.note,
        completionImageUrl: data.imageUrl,
        collaborators: data.selectedColleagues,
        isLog: true,
        createdAt: new Date().toISOString()
      });

      toast({ title: "Work Logged", description: "Successfully sent for approval." });
      reset();
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Error", description: "Failed to log work.", variant: "destructive" });
    }
  };

  // When modal closes without submitting, optionally reset. 
  // Handled here via onOpenChange wrapper to keep it clean.
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" /> Log Work Done
          </DialogTitle>
          <DialogDescription>Report ad-hoc maintenance or operational tasks.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">What did you do?</Label>
            <Input 
              placeholder="e.g. Mowed grass at the north entrance" 
              {...register("title")}
              className={errors.title ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.title && <p className="text-[10px] font-bold text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location (Park)</Label>
            <Select value={watchPark} onValueChange={v => setValue("park", v, { shouldValidate: true })}>
              <SelectTrigger className={errors.park ? "border-destructive" : ""}>
                <SelectValue placeholder="Select Park" />
              </SelectTrigger>
              <SelectContent>
                {parks.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.park && <p className="text-[10px] font-bold text-destructive">{errors.park.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Who assisted you?</Label>
            <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/20">
              {colleagues.map(u => (
                <Badge 
                  key={u.id}
                  variant={watchColleagues.includes(u.name) ? "default" : "outline"}
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
                {watchImageUrl ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden border">
                    <Image src={watchImageUrl} alt="Proof" fill className="object-cover" />
                    <button 
                      type="button"
                      onClick={() => setValue("imageUrl", "", { shouldDirty: true })}
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
                {...register("note")}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button 
              type="submit"
              className="w-full font-bold h-12 uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Logging..." : "Submit for Approval"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
