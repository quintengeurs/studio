"use client";
import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Save, Heart } from "lucide-react";
import { useFirestore, useUser } from "@/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useDataContext } from "@/context/DataContext";
import { useUserContext } from "@/context/UserContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { volunteerTaskSchema } from "@/lib/schemas";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Camera } from "lucide-react";

type FormData = z.infer<typeof volunteerTaskSchema>;

interface VolunteerTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function VolunteerTaskModal({ open, onOpenChange, onSuccess }: VolunteerTaskModalProps) {
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const { allParks, registryConfig } = useDataContext();
  const { organization, profile } = useUserContext();

  const hasParksModule = organization?.activeFeatures?.includes('parks');

  const activeParks = useMemo(() => {
    return allParks.filter(p => p.name).map(p => p.name).sort();
  }, [allParks]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: zodResolver(volunteerTaskSchema),
    defaultValues: {
      title: "",
      objective: "",
      park: "",
      dueDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
      maxVolunteers: 1,
      volunteerPoints: 10,
      rewardDescription: "",
      imageUrl: ""
    }
  });

  const watchPark = watch("park");
  const watchImageUrl = watch("imageUrl");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { compressImage } = await import("@/lib/image-compress");
        const compressedDataUrl = await compressImage(file, 1200, 800, 0.7);
        setValue("imageUrl", compressedDataUrl, { shouldValidate: true });
      } catch (error) {
        toast({ title: "Image Error", description: "Could not process image.", variant: "destructive" });
      }
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!db || !user) return;

    const taskData = {
      ...data,
      orgId: profile?.orgId || organization?.id || "hackney-council",
      status: "Todo",
      assignedTo: "Volunteer Team",
      isVolunteerEligible: true,
      source: "manual",
      isLog: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedBy: profile?.name || user.displayName || user.email || "Staff",
      // Map imageUrl to volunteerImageUrl for the volunteer hub
      volunteerImageUrl: data.imageUrl || ""
    };

    try {
      await addDoc(collection(db, "tasks"), taskData);
      toast({
        title: "Volunteer Opportunity Created",
        description: "The task is now visible to active community volunteers.",
      });
      reset();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Task creation failed:", error);
      toast({
        title: "Creation Failed",
        description: "There was a problem publishing the opportunity.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white rounded-3xl border-2 border-orange-500/10 shadow-2xl overflow-hidden p-0">
        <DialogHeader className="bg-gradient-to-b from-orange-50 to-white px-6 pt-6 pb-4 border-b border-orange-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shadow-inner">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-headline text-orange-900">New Volunteer Opportunity</DialogTitle>
              <DialogDescription className="text-orange-600/70">
                Publish a community task to your active volunteer network.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-6 space-y-5">
          <div className="grid gap-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="grid gap-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Opportunity Title</Label>
                <Input 
                  {...register("title")} 
                  placeholder="e.g., Community Litter Pick..." 
                  className="h-12 bg-muted/20 border-orange-100 focus-visible:ring-orange-500"
                />
                {errors.title && <p className="text-[10px] font-bold text-destructive">{errors.title.message}</p>}
              </div>

              <div className="grid gap-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Reference Image</Label>
                <div className="flex gap-2">
                  <Input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    id="opp-image"
                    onChange={handleImageUpload}
                  />
                  <Button 
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-12 w-full border-dashed border-2 flex items-center justify-center gap-2",
                      watchImageUrl ? "border-green-200 bg-green-50 text-green-600" : "border-orange-100 bg-muted/20 text-muted-foreground hover:bg-orange-50"
                    )}
                    onClick={() => document.getElementById('opp-image')?.click()}
                  >
                    <Camera className="h-4 w-4" />
                    {watchImageUrl ? "Image Selected" : "Upload Photo"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div className="grid gap-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {hasParksModule ? "Location" : "Meeting Point"}
                </Label>
                {hasParksModule ? (
                  <Select value={watchPark} onValueChange={(val) => setValue("park", val, { shouldValidate: true })}>
                    <SelectTrigger className="h-12 bg-muted/20 border-orange-100 focus:ring-orange-500">
                      <SelectValue placeholder="Select Park" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeParks.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input 
                    {...register("park")} 
                    placeholder="e.g., Town Hall Entrance" 
                    className="h-12 bg-muted/20 border-orange-100 focus-visible:ring-orange-500"
                  />
                )}
                {errors.park && <p className="text-[10px] font-bold text-destructive">{errors.park.message}</p>}
              </div>

              <div className="grid gap-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Deadline / Date</Label>
                <Input 
                  type="date"
                  {...register("dueDate")} 
                  className="h-12 bg-muted/20 border-orange-100 focus-visible:ring-orange-500"
                />
                {errors.dueDate && <p className="text-[10px] font-bold text-destructive">{errors.dueDate.message}</p>}
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Detailed Objective</Label>
              <Textarea 
                {...register("objective")} 
                placeholder="What exactly needs to be done? Provide clear instructions for the volunteers..." 
                className="min-h-[100px] resize-none bg-muted/20 border-orange-100 focus-visible:ring-orange-500"
              />
              {errors.objective && <p className="text-[10px] font-bold text-destructive">{errors.objective.message}</p>}
            </div>

            <div className="grid sm:grid-cols-2 gap-5 p-4 rounded-xl border border-orange-100 bg-orange-50/30">
              <div className="grid gap-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-orange-600">Points Awarded</Label>
                <Input 
                  type="number"
                  {...register("volunteerPoints")} 
                  className="h-12 font-bold text-lg border-orange-200 focus-visible:ring-orange-500"
                />
                {errors.volunteerPoints && <p className="text-[10px] font-bold text-destructive">{errors.volunteerPoints.message}</p>}
              </div>

              <div className="grid gap-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-orange-600">Max Volunteers</Label>
                <Input 
                  type="number"
                  {...register("maxVolunteers")} 
                  className="h-12 font-bold text-lg border-orange-200 focus-visible:ring-orange-500"
                />
                {errors.maxVolunteers && <p className="text-[10px] font-bold text-destructive">{errors.maxVolunteers.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-primary font-bold">Visibility Start Date</Label>
                <Input id="startDate" type="date" {...register("startDate")} />
                {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-primary font-bold">Archiving/Expiry Date</Label>
                <Input id="endDate" type="date" {...register("endDate")} />
                {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
              </div>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="grid gap-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Reward (Optional)</Label>
                <Input 
                  {...register("rewardDescription")} 
                  placeholder="e.g., Free Coffee at Pavilion" 
                  className="h-12 bg-pink-50/30 border-pink-100 focus-visible:ring-pink-500 placeholder:text-pink-300"
                />
                {errors.rewardDescription && <p className="text-[10px] font-bold text-destructive">{errors.rewardDescription.message}</p>}
              </div>

              <div className="grid gap-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Redemption Code (Optional)</Label>
                <Input 
                  {...register("rewardCode")} 
                  placeholder="e.g., COFFEE123" 
                  className="h-12 bg-pink-50/30 border-pink-100 focus-visible:ring-pink-500 placeholder:text-pink-300 uppercase"
                />
                {errors.rewardCode && <p className="text-[10px] font-bold text-destructive">{errors.rewardCode.message}</p>}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-orange-50 gap-2">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => { reset(); onOpenChange(false); }}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-orange-500 hover:bg-orange-600 font-bold px-8 shadow-lg shadow-orange-500/20"
            >
              {isSubmitting ? "Publishing..." : "Publish Opportunity"}
              {!isSubmitting && <Sparkles className="ml-2 h-4 w-4" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
