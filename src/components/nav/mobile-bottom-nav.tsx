
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  MapPin, 
  AlertTriangle, 
  CheckSquare, 
  Users, 
  Leaf,
  ClipboardCheck,
  ListTodo,
  Truck,
  Building2,
  Map
} from "lucide-react";
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
  { title: "Asset Register", icon: MapPin, href: "/assets" },
  { title: "Parks", icon: Map, href: "/parks" },
  { title: "Depots", icon: Building2, href: "/depots" },
  { title: "Inspections", icon: ClipboardCheck, href: "/inspections" },
  { title: "Issues", icon: AlertTriangle, href: "/issues" },
  { title: "Staff Requests", icon: Truck, href: "/requests" },
  { title: "All Tasks", icon: CheckSquare, href: "/tasks" },
  { title: "Users", icon: Users, href: "/users" },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const db = useFirestore();
  const [isRequestOpen, setIsRequestOpen] = useState(false);

  const emailId = useMemo(() => user?.email?.toLowerCase().replace(/[.#$[\]]/g, "_") || "", [user?.email]);
  const userProfileRef = useMemo(() => (db && emailId) ? doc(db, "users", emailId) : null, [db, emailId]);
  const { data: profile } = useDoc<UserProfile>(userProfileRef as any);
  
  const permissions = useMemo(() => getDefaultPermissionsForUser(profile, user?.email), [profile, user?.email]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      switch(item.title) {
          case "Dashboard": return permissions.viewDashboard;
          case "My Tasks": return permissions.viewMyTasks;
          case "Asset Register": return permissions.viewAssets;
          case "Parks": return permissions.viewParks;
          case "Depots": return permissions.viewDepots;
          case "Inspections": return permissions.viewInspections;
          case "Issues": return permissions.viewIssues;
          case "Staff Requests": return permissions.viewStaffRequests;
          case "All Tasks": return permissions.viewAllTasks;
          case "Users": return permissions.viewUsers;
          default: return false;
      }
    });
  }, [permissions]);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center border-t bg-card px-2 pb-safe shadow-lg overflow-x-auto no-scrollbar">
        <div className="flex items-center justify-around w-full min-w-max gap-1 px-1">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-md px-3 py-1 transition-colors min-w-[70px]",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
                <span className="text-[9px] font-bold uppercase tracking-wider">{item.title}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      
      <RequestModal open={isRequestOpen} onOpenChange={setIsRequestOpen} />
    </>
  );
}
