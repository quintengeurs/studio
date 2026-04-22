"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useFirestore } from "@/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { InfoItemType } from "@/lib/types";
import { Megaphone, FileText, Info, HandMetal } from "lucide-react";
import { useUserContext } from "@/context/UserContext";

interface InfoItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InfoItemModal({ open, onOpenChange }: InfoItemModalProps) {
  const { toast } = useToast();
  const db = useFirestore();
  const { profile } = useUserContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    type: 'Information' as InfoItemType,
    title: "",
    content: "",
    url: "",
    ctaLabel: "I'm interested"
  });

  const handleSubmit = async () => {
    if (!db || !profile || !formData.title || !formData.content) return;
    
    setIsSubmitting(true);
    try {
      const newItem = {
        type: formData.type,
        title: formData.title,
        content: formData.content,
        url: formData.type === 'Document' ? formData.url : null,
        ctaLabel: formData.type === 'CTA' ? formData.ctaLabel : null,
        interestedUserIds: [],
        createdBy: profile.name,
        createdAt: new Date().toISOString(),
        isArchived: false,
      };

      await addDoc(collection(db, "info_items"), newItem);

      toast({ title: "Item Added", description: `"${formData.title}" is now live in the Info Corner.` });
      setFormData({
        type: 'Information',
        title: "",
        content: "",
        url: "",
        ctaLabel: "I'm interested"
      });
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to add item. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIcon = () => {
    switch (formData.type) {
      case 'Document': return <FileText className="h-5 w-5 text-blue-500" />;
      case 'CTA': return <HandMetal className="h-5 w-5 text-amber-500" />;
      default: return <Info className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-3">
            {getIcon()} 
            Add Info Corner Item
          </DialogTitle>
          <DialogDescription>Share updates, documents, or opportunities with all staff.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Item Type</Label>
            <Select 
              value={formData.type} 
              onValueChange={(v: InfoItemType) => setFormData({...formData, type: v})}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Information">General Information</SelectItem>
                <SelectItem value="Document">H&S / Official Document</SelectItem>
                <SelectItem value="CTA">Call to Action (Engagement)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Title</Label>
            <Input 
              placeholder={formData.type === 'Document' ? "e.g. Health & Safety Handbook 2026" : "e.g. New Uniform Distribution"}
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Content / Summary</Label>
            <Textarea 
              placeholder="Briefly describe what this is about..." 
              value={formData.content} 
              onChange={e => setFormData({...formData, content: e.target.value})} 
              className="min-h-[100px]"
            />
          </div>

          {formData.type === 'Document' && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Document URL</Label>
              <Input 
                placeholder="https://sharepoint.com/docs/..." 
                value={formData.url} 
                onChange={e => setFormData({...formData, url: e.target.value})} 
              />
              <p className="text-[10px] text-muted-foreground italic">Link to the document in SharePoint, Google Drive, or similar.</p>
            </div>
          )}

          {formData.type === 'CTA' && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Button Label</Label>
              <Input 
                placeholder="e.g. I'm Interested, Sign me up" 
                value={formData.ctaLabel} 
                onChange={e => setFormData({...formData, ctaLabel: e.target.value})} 
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            className="w-full font-bold h-12 uppercase tracking-widest"
            disabled={!formData.title || !formData.content || (formData.type === 'Document' && !formData.url) || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? "Posting..." : "Publish to Corner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
