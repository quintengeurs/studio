
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
import { Heart, ShieldCheck, X, Lock, Mail } from "lucide-react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useAuth, useFirestore } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface VolunteerRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (email: string) => void;
  defaultEmail?: string;
  orgId: string;
}

export function VolunteerRegistrationModal({ 
  open, 
  onOpenChange, 
  onSuccess,
  defaultEmail = "",
  orgId
}: VolunteerRegistrationModalProps) {
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [gdprConsent, setGdprConsent] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!db || !email || !password || !gdprConsent || !auth) return;
    
    setIsSubmitting(true);
    try {
      // 1. Create Auth Account
      const userCredential = await createUserWithEmailAndPassword(auth, email.toLowerCase(), password);
      const uid = userCredential.user.uid;

      // 2. Create User Profile
      await setDoc(doc(db, "users", uid), {
        id: uid,
        email: email.toLowerCase(),
        name: email.split('@')[0],
        gdprConsent: true,
        registeredAt: new Date().toISOString(),
        status: 'pending',
        isVolunteer: true,
        roles: ['Volunteer'],
        depot: 'Community',
        orgId: orgId,
        totalPoints: 0,
        completedTasksCount: 0
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
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-2 text-orange-500 mb-2">
            <Heart className="h-5 w-5 fill-current" />
            <span className="text-xs font-bold uppercase tracking-widest">Join the Team</span>
          </div>
          <DialogTitle className="text-2xl font-headline">Volunteer Registration</DialogTitle>
          <DialogDescription>
            Register your interest to help maintain our parks. Once registered, you&quot;ll see a list of active tasks you can help with.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6">
          <form onSubmit={handleSubmit} className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 h-11"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Create Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 h-11"
                />
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">Minimum 6 characters required for security.</p>
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
          </form>
        </div>
        <DialogFooter className="p-6 border-t">
          <Button 
            type="submit" 
            className="w-full h-12 bg-orange-500 hover:bg-orange-600 font-bold"
            disabled={isSubmitting || !email || !password || password.length < 6 || !gdprConsent}
            onClick={() => handleSubmit()}
          >
            {isSubmitting ? "Registering..." : "COMPLETE REGISTRATION"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
