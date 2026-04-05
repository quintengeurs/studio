
"use client";
import { useState, useRef } from "react";
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
import { Input } from "@/components/ui/input";
import { Camera, Package, X, Send } from "lucide-react";
import { useFirestore, useUser } from "@/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { RequestCategory } from "@/lib/types";

interface RequestModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function RequestModal({ trigger, open, onOpenChange }: RequestModalProps) {
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    category: "Materials" as RequestCategory,
    description: "",
    depot: "",
    imageUrl: "",
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedDataUrl = await compressImage(file);
        setFormData((prev) => ({ ...prev, imageUrl: compressedDataUrl }));
      } catch (error) {
        toast({ title: "Image Error", description: "Could not process image.", variant: "destructive" });
      }
    }
  };

  const handleSubmit = async () => {
    if (!db || !user) return;

    const requestData = {
      ...formData,
      requestedBy: user.displayName || user.email || "Unknown Staff",
      status: "Open",
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, "requests"), requestData);
      
      setFormData({
        category: "Materials",
        description: "",
        depot: "",
        imageUrl: "",
      });
      
      if (onOpenChange) {
        onOpenChange(false);
      }
      
      toast({
        title: "Request Submitted",
        description: "Your request has been sent to the stores management team.",
      });
    } catch (error) {
      console.error("Error adding document: ", error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your request. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Category</Label>
            <Select 
              value={formData.category} 
              onValueChange={(v: RequestCategory) => setFormData({ ...formData, category: v })}
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
            <Input 
              id="depot" 
              placeholder="e.g. Millfields Depot" 
              value={formData.depot}
              onChange={(e) => setFormData({ ...formData, depot: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="desc">Request Details</Label>
            <Textarea 
              id="desc" 
              placeholder="Be specific about what you need and quantity..." 
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Reference Image (Optional)</Label>
            {formData.imageUrl ? (
              <div className="relative aspect-video w-full rounded-md overflow-hidden border">
                <Image src={formData.imageUrl} alt="Request Preview" fill className="object-cover" />
                <Button 
                  size="icon" 
                  variant="destructive" 
                  className="absolute top-2 right-2 h-7 w-7 rounded-full"
                  onClick={() => setFormData({ ...formData, imageUrl: "" })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button 
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
              capture="environment" 
              onChange={handleImageUpload} 
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            className="w-full font-bold" 
            onClick={handleSubmit}
            disabled={!formData.description || !formData.depot}
          >
            <Send className="mr-2 h-4 w-4" /> Send Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
