"use client";
import { useRef, useMemo } from "react";
import { compressImage } from "@/lib/image-compress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Package, X, Send } from "lucide-react";
import { useFirestore, useUser } from "@/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { useDataContext } from "@/context/DataContext";
import { useUserContext } from "@/context/UserContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { requestSchema } from "@/lib/schemas";
import { z } from "zod";

type FormData = z.infer<typeof requestSchema>;

interface RequestModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function RequestModal({ trigger, open, onOpenChange }: RequestModalProps) {
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const { profile } = useUserContext();
  const { registryConfig, configLoading } = useDataContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const depots = useMemo(() => registryConfig?.teams ? [...registryConfig.teams].sort() : [], [registryConfig?.teams]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      category: "Materials",
      description: "",
      depot: "",
      imageUrl: ""
    }
  });

  const watchCategory = watch("category");
  const watchDepot = watch("depot");
  const watchImageUrl = watch("imageUrl");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedDataUrl = await compressImage(file);
        setValue("imageUrl", compressedDataUrl, { shouldValidate: true });
      } catch (error) {
        toast({ title: "Image Error", description: "Could not process image.", variant: "destructive" });
      }
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!db || !user) return;

    const requestData = {
      ...data,
      orgId: profile?.orgId || "hackney-council",
      requestedBy: profile?.name || user.displayName || user.email || "Unknown Staff",
      status: "Open",
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, "requests"), requestData);
      
      reset();
      
      if (onOpenChange) {
        onOpenChange(false);
      }
      
      toast({
        title: "Request Submitted",
        description: "Your request has been sent to the stores management team.",
      });
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) reset();
    if (onOpenChange) onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-headline">
            <Package className="h-5 w-5 text-primary" />
            Resource Request
          </DialogTitle>
          <DialogDescription>
            Request tools, materials, or equipment from central stores.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Category</Label>
            <Select 
              value={watchCategory} 
              onValueChange={(v: any) => setValue("category", v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Materials">Materials (Sand, Soil, Plants)</SelectItem>
                <SelectItem value="Tools">Tools (Hand tools, Power tools)</SelectItem>
                <SelectItem value="Equipment">Equipment (Machinery, Vehicles)</SelectItem>
                <SelectItem value="PPE">PPE / Clothing</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="depot">Collection Depot</Label>
            <Select 
              value={watchDepot} 
              onValueChange={(v) => setValue("depot", v, { shouldValidate: true })}
            >
              <SelectTrigger id="depot" className={errors.depot ? "border-destructive" : ""}>
                <SelectValue placeholder={configLoading ? "Loading Depots..." : "Select Collection Depot"} />
              </SelectTrigger>
              <SelectContent>
                {depots.map(depot => (
                  <SelectItem key={depot} value={depot}>{depot}</SelectItem>
                ))}
                {depots.length === 0 && !configLoading && (
                  <SelectItem value="none" disabled>No Depots Found</SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.depot && <p className="text-[10px] font-bold text-destructive">{errors.depot.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="desc">Request Details</Label>
            <Textarea 
              id="desc" 
              placeholder="Be specific about what you need and quantity..." 
              {...register("description")}
              className={errors.description ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.description && <p className="text-[10px] font-bold text-destructive">{errors.description.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Reference Image (Optional)</Label>
            {watchImageUrl ? (
              <div className="relative aspect-video w-full rounded-md overflow-hidden border">
                <Image src={watchImageUrl} alt="Request Preview" fill className="object-cover" />
                <Button 
                  type="button"
                  size="icon" 
                  variant="destructive" 
                  className="absolute top-2 right-2 h-7 w-7 rounded-full"
                  onClick={() => setValue("imageUrl", "", { shouldDirty: true })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button 
                type="button"
                variant="outline" 
                className="w-full h-20 border-dashed border-2 flex flex-col gap-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Tap to Capture Image</span>
              </Button>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload} 
            />
          </div>
          <DialogFooter>
            <Button 
              type="submit"
              className="w-full font-bold mt-4" 
              disabled={isSubmitting}
            >
              <Send className="mr-2 h-4 w-4" /> {isSubmitting ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
