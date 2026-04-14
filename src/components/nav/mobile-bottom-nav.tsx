
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, AlertTriangle, ListTodo, MapPin, ClipboardCheck, PackagePlus, ClipboardList, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { RequestModal } from "@/components/modals/request-modal";
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { User as UserProfile } from "@/lib/types";
import { getDefaultPermissionsForUser } from "@/lib/permissions";

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
  
  const permissions = useMemo(() => getDefaultPermissionsForUser(profile), [profile]);

  const filteredItems = items.filter(item => {
    switch(item.title) {
        case "Dashboard": return permissions.viewDashboard;
        case "My Tasks": return permissions.viewMyTasks;
        case "All Tasks": return permissions.viewAllTasks;
        case "Inspections": return permissions.viewInspections;
        case "Issues": return permissions.viewIssues;
        case "Assets": return permissions.viewAssets;
        case "Parks": return permissions.viewParks;
        case "Depots": return permissions.viewDepots;
        default: return false;
    }
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
