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
import * as z from "zod";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  objective: z.string().min(10, "Please provide a clear objective (min 10 chars)").max(500),
  park: z.string().min(1, "Please select a location"),
  dueDate: z.string().min(1, "Please select a deadline"),
  maxVolunteers: z.coerce.number().min(1, "Must allow at least 1 volunteer").max(100),
  volunteerPoints: z.coerce.number().min(1, "Must award at least 1 point").max(1000),
  rewardDescription: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface VolunteerTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function VolunteerTaskModal({ open, onOpenChange, onSuccess }: VolunteerTaskModalProps) {
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const { profile } = useUserContext();
  const { allParks } = useDataContext();

  const activeParks = useMemo(() => {
    return allParks.filter(p => p.status === 'Active').map(p => p.name).sort();
  }, [allParks]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      objective: "",
      park: "",
      dueDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0], // Default 1 week
      maxVolunteers: 1,
      volunteerPoints: 10,
      rewardDescription: ""
    }
  });

  const watchPark = watch("park");

  const onSubmit = async (data: FormData) => {
    if (!db || !user) return;

    const taskData = {
      ...data,
      orgId: profile?.orgId || "hackney-council",
      status: "Todo",
      assignedTo: "Volunteer Team",
      isVolunteerEligible: true,
      source: "manual",
      isLog: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedBy: profile?.name || user.displayName || user.email || "Staff",
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
            <div className="grid gap-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Opportunity Title</Label>
              <Input 
                {...register("title")} 
                placeholder="e.g., Community Litter Pick, Bulb Planting..." 
                className="h-12 bg-muted/20 border-orange-100 focus-visible:ring-orange-500"
              />
              {errors.title && <p className="text-[10px] font-bold text-destructive">{errors.title.message}</p>}
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div className="grid gap-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Location</Label>
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
            
            <div className="grid gap-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Reward (Optional)</Label>
              <Input 
                {...register("rewardDescription")} 
                placeholder="e.g., Free Coffee at the Pavilion Cafe" 
                className="h-12 bg-pink-50/30 border-pink-100 focus-visible:ring-pink-500 placeholder:text-pink-300"
              />
              {errors.rewardDescription && <p className="text-[10px] font-bold text-destructive">{errors.rewardDescription.message}</p>}
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
