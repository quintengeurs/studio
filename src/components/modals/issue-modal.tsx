"use client";

import { useRef, useMemo } from "react";
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
import { Camera, X, AlertTriangle, MapPin } from "lucide-react";
import { useFirestore, useUser, useDoc } from "@/firebase";
import { collection, addDoc, doc } from "firebase/firestore";
import { compressImage } from "@/lib/image-compress";
import { useDataContext } from "@/context/DataContext";
import { RegistryConfig } from "@/lib/types";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const ISSUE_CATEGORIES = ["Vandalism", "Maintenance", "Safety Hazard", "Litter/Waste", "Lighting", "Playground", "Wildlife", "Other"];

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).default("Medium"),
  category: z.string().min(1, "Please select a category").default("General"),
  park: z.string().min(1, "Location is required"),
  imageUrl: z.string().optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number()
  }).nullable().optional()
});

type FormData = z.infer<typeof formSchema>;

interface IssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IssueModal({ open, onOpenChange }: IssueModalProps) {
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const { allParks, registryConfig: contextRegistry } = useDataContext();
  
  const registryRef = useMemo(() => db ? doc(db, "settings", "registry") : null, [db]);
  const { data: localRegistry } = useDoc<RegistryConfig>(registryRef as any);

  const registry = localRegistry || contextRegistry;

  const parks = useMemo(() => {
    const list = [...(registry?.parks || []), ...allParks.map(p => p.name)];
    return Array.from(new Set(list)).sort();
  }, [allParks, registry]);

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
      description: "",
      priority: "Medium",
      category: "Maintenance",
      park: "",
      imageUrl: "",
      location: null
    }
  });

  const watchPark = watch("park");
  const watchCategory = watch("category");
  const watchPriority = watch("priority");
  const watchImageUrl = watch("imageUrl");
  const watchLocation = watch("location");

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

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Not Supported", description: "Geolocation is not supported.", variant: "destructive" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue("location", {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }, { shouldValidate: true });
        toast({ title: "Location Captured" });
      },
      () => {
        toast({ title: "Location Error", description: "Check permissions.", variant: "destructive" });
      }
    );
  };

  const onSubmit = async (data: FormData) => {
    if (!db || !user) return;

    try {
      await addDoc(collection(db, "issues"), {
        ...data,
        status: 'Open',
        reportedBy: user.displayName || user.email,
        createdAt: new Date().toISOString()
      });

      toast({ title: "Issue Raised", description: "Successfully created the issue report." });
      reset();
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Error", description: "Failed to create issue.", variant: "destructive" });
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" /> Raise an Issue
          </DialogTitle>
          <DialogDescription>Report maintenance, safety hazards, or vandalism.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Location (Park)</Label>
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
              <Label className="text-xs font-bold uppercase text-muted-foreground">Category</Label>
              <Select value={watchCategory} onValueChange={v => setValue("category", v, { shouldValidate: true })}>
                <SelectTrigger className={errors.category ? "border-destructive" : ""}>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-[10px] font-bold text-destructive">{errors.category.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Short Title</Label>
            <Input 
              placeholder="e.g. Broken bench near pond" 
              {...register("title")}
              className={errors.title ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.title && <p className="text-[10px] font-bold text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Priority</Label>
            <Select value={watchPriority} onValueChange={(v: any) => setValue("priority", v, { shouldValidate: true })}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Details</Label>
            <Textarea 
              placeholder="Describe the issue in detail..." 
              {...register("description")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Photo</Label>
              <div className="flex flex-col gap-2">
                {watchImageUrl ? (
                  <div className="relative aspect-square rounded-lg overflow-hidden border">
                    <Image src={watchImageUrl} alt="Issue" fill className="object-cover" />
                    <button 
                      type="button"
                      onClick={() => setValue("imageUrl", "", { shouldDirty: true })}
                      className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                    <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Add Photo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">GPS Location</Label>
              <Button 
                variant="outline" 
                className="w-full h-10 gap-2 border-dashed border-2"
                onClick={handleGetLocation}
                type="button"
              >
                <MapPin className={watchLocation ? "text-primary" : "text-muted-foreground"} size={16} />
                <span className="text-xs">{watchLocation ? "Location Linked" : "Capture Location"}</span>
              </Button>
              {watchLocation && (
                <p className="text-[9px] text-muted-foreground text-center">
                  {watchLocation.latitude.toFixed(5)}, {watchLocation.longitude.toFixed(5)}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="submit"
              className="w-full font-bold h-12 uppercase tracking-widest"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
