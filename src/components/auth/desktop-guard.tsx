"use client";

import { useUser, useCollection, useMemoFirebase, useFirestore } from "@/firebase";
import { useIsMobile } from "@/hooks/use-mobile";
import { collection, query, where } from "firebase/firestore";
import { useMemo } from "react";
import { User as UserProfile } from "@/lib/types";
import { AlertCircle, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signOut } from "firebase/auth";
import { useAuth } from "@/firebase";

export function DesktopGuard({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const { user, loading: userLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();

  const usersQuery = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return query(collection(db, "users"), where("email", "==", user.email));
  }, [db, user?.email]);
  const { data: profileResults = [], loading: collectionLoading } = useCollection<UserProfile>(usersQuery as any);
  
  const currentUserProfile = profileResults[0];

  const isLoading = userLoading || collectionLoading;
  
  // By default, if the field is missing, we allow desktop view for backward compatibility
  const allowDesktop = currentUserProfile?.allowDesktopView ?? true;
  const isRestricted = !isMobile && !allowDesktop;

  if (isLoading) return null;

  if (user && isRestricted) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center p-6 z-[10000]">
        <Card className="max-w-md w-full border-2 border-primary/20 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl font-headline font-bold">Desktop Access Restricted</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your account is configured for mobile access only. Please log in using the mobile app or a device with a smaller screen.
            </p>
            <div className="pt-4 border-t space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Admin Note</p>
              <p className="text-xs font-medium bg-muted p-3 rounded-lg border">
                Contact your system administrator to enable desktop-optimized view for this profile.
              </p>
            </div>
            <Button 
                variant="outline" 
                className="w-full font-bold"
                onClick={() => signOut(auth)}
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
