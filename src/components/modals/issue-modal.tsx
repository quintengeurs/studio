"use client";

import { useState, useRef, useMemo } from "react";
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
import { User, RegistryConfig, ParkDetail } from "@/lib/types";
import { format } from "date-fns";
import Image from "next/image";

const ISSUE_CATEGORIES = ["Vandalism", "Maintenance", "Safety Hazard", "Litter/Waste", "Lighting", "Playground", "Wildlife", "Other"];

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registry = localRegistry || contextRegistry;

  const parks = useMemo(() => {
    const list = [...(registry?.parks || []), ...allParks.map(p => p.name)];
    return Array.from(new Set(list)).sort();
  }, [allParks, registry]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "Medium" as "Low" | "Medium" | "High" | "Urgent",
    category: "General",
    park: "",
    imageUrl: "",
    location: null as { latitude: number, longitude: number } | null
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

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Not Supported", description: "Geolocation is not supported.", variant: "destructive" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        }));
        toast({ title: "Location Captured" });
      },
      () => {
        toast({ title: "Location Error", description: "Check permissions.", variant: "destructive" });
      }
    );
  };

  const handleSubmit = async () => {
    if (!db || !user || isSubmitting) return;
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, "issues"), {
        ...formData,
        status: 'Open',
        reportedBy: user.displayName || user.email,
        createdAt: new Date().toISOString()
      });

      toast({ title: "Issue Raised", description: "Successfully created the issue report." });
      setFormData({ title: "", description: "", priority: "Medium", category: "General", park: "", imageUrl: "", location: null });
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Error", description: "Failed to create issue.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" /> Raise an Issue
          </DialogTitle>
          <DialogDescription>Report maintenance, safety hazards, or vandalism.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Location (Park)</Label>
              <Select value={formData.park} onValueChange={v => setFormData(prev => ({ ...prev, park: v }))}>
                <SelectTrigger><SelectValue placeholder="Select Park" /></SelectTrigger>
                <SelectContent>
                  {parks.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Category</Label>
              <Select value={formData.category} onValueChange={v => setFormData(prev => ({ ...prev, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  {ISSUE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Short Title</Label>
            <Input 
              placeholder="e.g. Broken bench near pond" 
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Priority</Label>
            <Select value={formData.priority} onValueChange={(v: any) => setFormData(prev => ({ ...prev, priority: v }))}>
              <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
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
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Photo</Label>
              <div className="flex flex-col gap-2">
                {formData.imageUrl ? (
                  <div className="relative aspect-square rounded-lg overflow-hidden border">
                    <Image src={formData.imageUrl} alt="Issue" fill className="object-cover" />
                    <button 
                      onClick={() => setFormData(prev => ({ ...prev, imageUrl: "" }))}
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
                <MapPin className={formData.location ? "text-primary" : "text-muted-foreground"} size={16} />
                <span className="text-xs">{formData.location ? "Location Linked" : "Capture Location"}</span>
              </Button>
              {formData.location && (
                <p className="text-[9px] text-muted-foreground text-center">
                  {formData.location.latitude.toFixed(5)}, {formData.location.longitude.toFixed(5)}
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            className="w-full font-bold h-12 uppercase tracking-widest"
            disabled={!formData.title || !formData.park || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
