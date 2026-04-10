
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, AlertTriangle, ListTodo, MapPin, ClipboardCheck, PackagePlus, ClipboardList, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { RequestModal } from "@/components/modals/request-modal";
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { collection, query } from "firebase/firestore";
import { User as UserProfile } from "@/lib/types";

const items = [
  { title: "Dashboard", icon: LayoutDashboard, href: "/" },
  { title: "My Tasks", icon: ListTodo, href: "/my-tasks" },
  { title: "All Tasks", icon: ClipboardList, href: "/tasks" },
  { title: "Inspections", icon: ClipboardCheck, href: "/inspections" },
  { title: "Issues", icon: AlertTriangle, href: "/issues" },
  { title: "Assets", icon: MapPin, href: "/assets" },
  { title: "Parks", icon: MapPin, href: "/parks" },
  { title: "Depots", icon: Building2, href: "/depots" },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const db = useFirestore();
  const [isRequestOpen, setIsRequestOpen] = useState(false);

  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "users"));
  }, [db]);
  const { data: allUsers = [] } = useCollection<UserProfile>(usersQuery as any);
  const profile = allUsers.find(u => u.email?.toLowerCase() === user?.email?.toLowerCase());
  
  const profileRoles = profile?.roles || (profile?.role ? [profile.role] : []);
  const isAdmin = profileRoles.includes('Admin') || user?.email === 'quinten.geurs@gmail.com';
  const isContractor = profileRoles.includes('Contractor') && profileRoles.length === 1;
  const isManagement = profileRoles.some(r => ['Area Manager', 'Assistant Area Manager', 'Operations Manager', 'Head Gardener'].includes(r));
  const isKeeper = profileRoles.includes('Keeper');

  const filteredItems = items.filter(item => {
    if (isAdmin) return ["Dashboard", "Inspections", "Issues", "Parks", "Depots"].includes(item.title);
    
    if (isContractor) {
      return ["Dashboard", "Parks", "Depots"].includes(item.title);
    }
    
    if (isManagement) {
      return ["Dashboard", "Inspections", "Issues", "Parks", "Depots"].includes(item.title);
    }
    
    // Standard Officers
    const allowed = ["Dashboard", "Parks", "Depots", "Issues"];
    if (isKeeper) allowed.push("Inspections");
    return allowed.includes(item.title);
  });

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-card px-1 pb-safe shadow-lg overflow-x-auto">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-md px-2 py-1 transition-colors min-w-[60px]",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
              <span className="text-[9px] font-bold uppercase tracking-wider">{item.title}</span>
            </Link>
          );
        })}
      </nav>
      
      <RequestModal open={isRequestOpen} onOpenChange={setIsRequestOpen} />
    </>
  );
}
