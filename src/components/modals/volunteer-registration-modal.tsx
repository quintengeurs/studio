
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useFirestore } from "@/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Heart, ShieldCheck } from "lucide-react";

interface VolunteerRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (email: string) => void;
  defaultEmail?: string;
}

export function VolunteerRegistrationModal({ 
  open, 
  onOpenChange, 
  onSuccess,
  defaultEmail = ""
}: VolunteerRegistrationModalProps) {
  const { toast } = useToast();
  const db = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState(defaultEmail);
  const [gdprConsent, setGdprConsent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !email || !gdprConsent) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "users"), {
        email: email.toLowerCase(),
        name: email.split('@')[0], // Use email prefix as temporary name
        gdprConsent: true,
        registeredAt: new Date().toISOString(),
        status: 'pending',
        isVolunteer: true, // Flag to distinguish from staff
        roles: ['Volunteer'],
        depot: 'Community'
      });
      
      localStorage.setItem("volunteerEmail", email.toLowerCase());
      toast({
        title: "Registration Received",
        description: "Thank you! Your registration is pending approval by our staff. You'll be able to see tasks once approved.",
      });
      onSuccess(email.toLowerCase());
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Registration Error",
        description: "Failed to register. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-orange-500 mb-2">
            <Heart className="h-5 w-5 fill-current" />
            <span className="text-xs font-bold uppercase tracking-widest">Join the Team</span>
          </div>
          <DialogTitle className="text-2xl font-headline">Volunteer Registration</DialogTitle>
          <DialogDescription>
            Register your interest to help maintain our parks. Once registered, you'll see a list of active tasks you can help with.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11"
            />
          </div>
          <div className="flex items-start space-x-3 p-4 rounded-xl bg-orange-50 border border-orange-100">
            <Checkbox 
              id="gdpr" 
              checked={gdprConsent} 
              onCheckedChange={(checked) => setGdprConsent(!!checked)}
              className="mt-1 border-orange-300 data-[state=checked]:bg-orange-500"
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="gdpr"
                className="text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-orange-900"
              >
                GDPR Consent
              </Label>
              <p className="text-xs text-orange-700/70">
                I agree to be contacted about future volunteering opportunities and for my participation to be logged in the system.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              className="w-full h-12 bg-orange-500 hover:bg-orange-600 font-bold"
              disabled={isSubmitting || !email || !gdprConsent}
            >
              {isSubmitting ? "Registering..." : "COMPLETE REGISTRATION"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
