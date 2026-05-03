"use client";

import { useState, useEffect } from "react";
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
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { InfoItem, InfoItemType } from "@/lib/types";
import { Megaphone, FileText, Info, HandMetal, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUserContext } from "@/context/UserContext";

interface InfoItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: InfoItem | null;
}

export function InfoItemModal({ open, onOpenChange, editItem }: InfoItemModalProps) {
  const { toast } = useToast();
  const db = useFirestore();
  const { profile } = useUserContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    type: 'Information' as InfoItemType,
    title: "",
    content: "",
    url: "",
    ctaLabel: "I'm interested",
    allowResponse: true,
    isStaffVisible: true,
    isVolunteerVisible: false
  });

  useEffect(() => {
    if (editItem) {
      setFormData({
        type: editItem.type,
        title: editItem.title,
        content: editItem.content,
        url: editItem.url || "",
        ctaLabel: editItem.ctaLabel || "I'm interested",
        allowResponse: editItem.allowResponse !== false,
        isStaffVisible: editItem.isStaffVisible !== false, // Default to true if not set
        isVolunteerVisible: editItem.isVolunteerVisible || false
      });
    } else {
      setFormData({
        type: 'Information',
        title: "",
        content: "",
        url: "",
        ctaLabel: "I'm interested",
        allowResponse: true,
        isStaffVisible: true,
        isVolunteerVisible: false
      });
    }
  }, [editItem, open]);

  const handleSubmit = async () => {
    if (!db || !profile || !formData.title || !formData.content) return;
    
    setIsSubmitting(true);
    try {
      const itemData = {
        type: formData.type,
        title: formData.title,
        content: formData.content,
        url: formData.type === 'Document' ? formData.url : null,
        ctaLabel: (formData.type === 'CTA' || formData.allowResponse) ? formData.ctaLabel : null,
        allowResponse: formData.allowResponse,
        isStaffVisible: formData.isStaffVisible,
        isVolunteerVisible: formData.isVolunteerVisible,
        createdBy: editItem ? editItem.createdBy : profile.name,
        createdAt: editItem ? editItem.createdAt : new Date().toISOString(),
        isArchived: false,
      };

      if (editItem) {
        await updateDoc(doc(db, "info_items", editItem.id), itemData);
        toast({ title: "Item Updated", description: `"${formData.title}" has been updated.` });
      } else {
        await addDoc(collection(db, "info_items"), {
            ...itemData,
            interestedUserIds: []
        });
        toast({ title: "Item Added", description: `"${formData.title}" is now live in the Info Corner.` });
      }
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="font-headline text-2xl flex items-center gap-3">
            {getIcon()} 
            {editItem ? 'Edit' : 'Add'} Info Corner Item
          </DialogTitle>
          <DialogDescription>Share updates, documents, or opportunities with all staff.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
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

          <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/20">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold">Allow Response Engagement</Label>
              <p className="text-[10px] text-muted-foreground">Enable the &quot;I&quot;m Interested&quot; button for this item.</p>
            </div>
            <Switch 
              checked={formData.allowResponse} 
              onCheckedChange={v => setFormData({...formData, allowResponse: v})} 
            />
          </div>

          {formData.allowResponse && formData.type !== 'CTA' && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Response Button Label</Label>
              <Input 
                placeholder="e.g. I'm Interested" 
                value={formData.ctaLabel} 
                onChange={e => setFormData({...formData, ctaLabel: e.target.value})} 
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-xl bg-blue-50/50 border-blue-100">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-blue-900">Show to Staff</Label>
                <p className="text-[10px] text-blue-700/70">Display this in the Staff Info Corner.</p>
              </div>
              <Switch 
                checked={formData.isStaffVisible} 
                onCheckedChange={v => setFormData({...formData, isStaffVisible: v})} 
                className="data-[state=checked]:bg-blue-500"
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-xl bg-orange-50/50 border-orange-100">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-orange-900">Show to Volunteers</Label>
                <p className="text-[10px] text-orange-700/70">Display this in the Volunteering Portal.</p>
              </div>
              <Switch 
                checked={formData.isVolunteerVisible} 
                onCheckedChange={v => setFormData({...formData, isVolunteerVisible: v})} 
                className="data-[state=checked]:bg-orange-500"
              />
            </div>
          </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t mt-auto">
          <Button 
            className="w-full font-bold h-12 uppercase tracking-widest"
            disabled={!formData.title || !formData.content || (formData.type === 'Document' && !formData.url) || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? (editItem ? "Saving..." : "Posting...") : (editItem ? "Save Changes" : "Publish to Corner")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
