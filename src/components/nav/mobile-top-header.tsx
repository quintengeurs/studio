
"use client";

import { useState, useMemo } from "react";
import { Leaf, User as UserIcon, Clock, ChevronRight, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth, useUser, useFirestore, useMemoFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection, query, where, limit, doc } from "firebase/firestore";
import { Task, User as UserProfile, OPERATIVE_ROLES } from "@/lib/types";
import { useDoc } from "@/firebase/firestore/use-doc";


export function MobileTopHeader() {
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();

  const emailId = user?.email?.toLowerCase().replace(/[.#$[\]]/g, "_") || "";
  
  // 1. Check by UID
  const profileByUidRef = useMemo(() => db && user?.uid ? doc(db, "users", user.uid) : null, [db, user?.uid]);
  const { data: profileByUid } = useDoc<UserProfile>(profileByUidRef as any);
  
  // 2. Check by Email ID (legacy/sync pattern)
  const profileByEmailRef = useMemo(() => db && emailId ? doc(db, "users", emailId) : null, [db, emailId]);
  const { data: profileByEmail } = useDoc<UserProfile>(profileByEmailRef as any);

  // 3. Check by Email Field (search pattern)
  const userProfileQuery = useMemoFirebase(() => 
    db && user?.email ? query(collection(db, "users"), where("email", "==", user.email)) : null,
  [db, user?.email]);
  const { data: profileResults = [] } = useCollection<UserProfile>(userProfileQuery as any);
  
  const profile = profileByEmail || profileByUid || profileResults[0];
  
  const isOperative = profile?.role && (OPERATIVE_ROLES as any).includes(profile.role);

  const tasksQuery = useMemoFirebase(() => {
    if (!user || !db) return null;
    return query(
      collection(db, "tasks"),
      where("assignedTo", "==", user.displayName || user.email || ""),
      limit(5)
    );
  }, [user, db]);

  const { data: myTasks, loading } = useCollection<Task>(tasksQuery as any);


  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          <Leaf className="h-6 w-6" />
        </Link>
        
        <div className="flex flex-col">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Welcome back</span>
          <span className="text-sm font-bold text-foreground leading-none truncate max-w-[150px]">
            {user?.displayName || user?.email?.split('@')[0] || 'User'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-10 px-2 flex items-center gap-2 hover:bg-destructive/5 text-muted-foreground hover:text-destructive transition-colors group"
          onClick={handleLogout}
        >
          <div className="flex flex-col items-end mr-1 hidden sm:flex">
             <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Log Out</span>
          </div>
          <Avatar className="h-8 w-8 border-2 border-primary/20 group-hover:border-destructive/30 transition-colors">
            <AvatarImage src={user?.photoURL || undefined} />
            <AvatarFallback className="text-[10px] font-bold bg-primary/5 text-primary group-hover:bg-destructive/5 group-hover:text-destructive">
              {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </div>
    </header>
  );
}
