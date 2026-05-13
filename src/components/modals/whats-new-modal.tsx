"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Check } from "lucide-react";
import { useUserContext } from "@/context/UserContext";
import { useFirestore } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { ANNOUNCEMENTS, Announcement } from "@/lib/announcements";

export function WhatsNewModal() {
  const { profile, isAdmin } = useUserContext();
  const db = useFirestore();
  const [open, setOpen] = useState(false);
  const [unseen, setUnseen] = useState<Announcement[]>([]);
  const [hasDismissedInSession, setHasDismissedInSession] = useState(false);

  useEffect(() => {
    if (!profile || hasDismissedInSession) return;
    
    // Don't overwhelm brand new users who haven't even finished the tour, unless they are admins
    if (!isAdmin && profile.hasCompletedOnboarding === undefined) {
      return;
    }

    const seen = profile.seenAnnouncementIds || [];
    const newAnns = ANNOUNCEMENTS.filter(a => !seen.includes(a.id));
    
    if (newAnns.length > 0) {
      setUnseen(newAnns);
      // Slight delay so it doesn't pop up over loading states immediately
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [profile, isAdmin, hasDismissedInSession]);

  const handleDismiss = async () => {
    setOpen(false);
    setHasDismissedInSession(true);
    if (!profile || !db) return;
    try {
      const seen = profile.seenAnnouncementIds || [];
      const newlySeen = unseen.map(a => a.id);
      
      // Update local set of seen IDs to avoid re-triggering if the context refreshes
      const updatedSeen = Array.from(new Set([...seen, ...newlySeen]));
      
      await updateDoc(doc(db, "users", profile.id), {
        seenAnnouncementIds: updatedSeen
      });
    } catch (e) {
      console.warn("Could not save seen announcements", e);
    }
  };

  if (!unseen.length || hasDismissedInSession) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleDismiss(); else setOpen(val); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-headline text-primary">
            <Sparkles className="h-6 w-6" /> What's New
          </DialogTitle>
          <DialogDescription>
            Check out the latest features and updates we've added to the platform.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          {unseen.map(ann => (
            <div key={ann.id} className="space-y-2 bg-muted/30 p-4 rounded-xl border">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-base">{ann.title}</h4>
                <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground bg-background px-2 py-1 rounded-md">{ann.date}</span>
              </div>
              <p className="text-sm text-muted-foreground">{ann.description}</p>
              <ul className="space-y-2 mt-4 pt-4 border-t">
                {ann.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0 bg-primary/10 rounded-full p-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <DialogFooter className="border-t pt-4">
          <Button onClick={handleDismiss} className="w-full font-bold">Got it, thanks!</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
