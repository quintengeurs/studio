
"use client";

import { 
  LayoutDashboard, 
  MapPin, 
  AlertTriangle, 
  CheckSquare, 
  Users, 
  Leaf,
  ClipboardCheck,
  LogOut,
  ListTodo,
  Archive,
  FolderArchive,
  UserX,
  PackagePlus,
  Truck,
  Map,
  Building2
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator
} from "@/components/ui/sidebar";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { signOut } from "firebase/auth";
import { useState, useMemo } from "react";
import { RequestModal } from "@/components/modals/request-modal";
import { collection, query, where, doc } from "firebase/firestore";
import { User as UserType, OPERATIVE_ROLES } from "@/lib/types";
import { getDefaultPermissionsForUser } from "@/lib/permissions";

const navItems = [
  { title: "Dashboard", icon: LayoutDashboard, href: "/" },
  { title: "My Tasks", icon: ListTodo, href: "/my-tasks" },
  { title: "Asset Register", icon: MapPin, href: "/assets" },
  { title: "Parks", icon: Map, href: "/parks" },
  { title: "Map Registry", icon: LayoutGrid, href: "/map" },
  { title: "Depots", icon: Building2, href: "/depots" },
  { title: "Inspections", icon: ClipboardCheck, href: "/inspections" },
  { title: "Issues", icon: AlertTriangle, href: "/issues" },
  { title: "Staff Requests", icon: Truck, href: "/requests" },
  { title: "All Tasks", icon: CheckSquare, href: "/tasks" },
  { title: "Users", icon: Users, href: "/users" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user } = useUser();
  const db = useFirestore();
  const [isRequestOpen, setIsRequestOpen] = useState(false);

  const emailId = useMemo(() => user?.email?.toLowerCase().replace(/[.#$[\]]/g, "_") || "", [user?.email]);
  const userProfileRef = useMemo(() => (db && emailId) ? doc(db, "users", emailId) : null, [db, emailId]);
  const { data: currentUserProfile } = useDoc<UserType>(userProfileRef as any);

  const profileResults = currentUserProfile ? [currentUserProfile] : []; // Keep for compatibility if needed

  const allUsers = profileResults; // Keep variable for compatibility where count is checked

  const permissions = useMemo(() => getDefaultPermissionsForUser(currentUserProfile, user?.email), [currentUserProfile, user?.email]);
  
  const profileRoles = currentUserProfile?.roles || (currentUserProfile?.role ? [currentUserProfile.role] : []);
  const isAdmin = profileRoles.includes('Admin') || user?.email?.toLowerCase() === 'quinten.geurs@gmail.com';

  const filteredNavItems = useMemo(() => {
    return navItems.filter(item => {
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
        case "Map Registry": return permissions.viewMap;
        default: return false;
      }
    });
  }, [permissions]);

  const showNewRequest = useMemo(() => {
    // If they can't see the staff requests view at all, they likely shouldn't be posting new requests
    // but typically standard officers CAN make requests. Let's allow everyone except purely contractors.
    return !profileRoles.includes('Contractor');
  }, [profileRoles]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
              <Leaf className="h-6 w-6" />
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden overflow-hidden">
              <span className="font-headline text-sm font-bold leading-tight text-primary truncate">Parks and Green Spaces</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Hackney</span>
            </div>
          </div>
        </SidebarHeader>
        
        <SidebarSeparator />
        
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Management</SidebarGroupLabel>
            <SidebarMenu>
              {filteredNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    isActive={pathname === item.href}
                    tooltip={item.title}
                    onClick={() => router.push(item.href)}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              <SidebarSeparator className="my-2" />
              
              {showNewRequest && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    tooltip="Quick Request" 
                    onClick={() => setIsRequestOpen(true)}
                    className="text-primary hover:text-primary font-bold"
                  >
                    <PackagePlus className="h-4 w-4" />
                    <span>New Staff Request</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
                <Avatar className="h-9 w-9 border-2 border-primary/20">
                  <AvatarImage src={user?.photoURL || undefined} />
                  <AvatarFallback>{user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col group-data-[collapsible=icon]:hidden overflow-hidden">
                  <span className="text-sm font-semibold truncate">{user?.displayName || 'User'}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{user?.email}</span>
                </div>
              </div>
            </SidebarMenuItem>
            <SidebarMenuItem className="mt-4">
              <SidebarMenuButton tooltip="Logout" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      
      <RequestModal open={isRequestOpen} onOpenChange={setIsRequestOpen} />
    </>
  );
}
