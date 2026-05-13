
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
  Building2,
  LayoutGrid,
  Megaphone,
  BrainCircuit,
  ShieldCheck,
  Globe,
  Calendar,
  CalendarDays,
  Construction,
  Compass,
  Wrench,
  Trophy,
  Settings2
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
  SidebarSeparator,
  useSidebar
} from "@/components/ui/sidebar";
import { useState, useMemo } from "react";
import { useAuth, useUser } from "@/firebase";
import { signOut } from "firebase/auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserContext } from "@/context/UserContext";
import { User as UserType } from "@/lib/types";
import dynamic from "next/dynamic";

const RequestModal = dynamic(() => import("@/components/modals/request-modal").then(mod => mod.RequestModal), { 
  ssr: false,
  loading: () => null
});

const navItems = [
  { title: "Dashboard", icon: LayoutDashboard, href: "/" },
  { title: "Info Corner", icon: Megaphone, href: "/info-corner" },
  { title: "My Tasks", icon: ListTodo, href: "/my-tasks" },
  { title: "Asset Register", icon: MapPin, href: "/assets" },
  { title: "Parks", icon: Map, href: "/parks" },
  { title: "Parks Map", icon: LayoutGrid, href: "/map" },
  { title: "Depots", icon: Building2, href: "/depots" },
  { title: "Inspections", icon: ClipboardCheck, href: "/inspections" },
  { title: "Issues", icon: AlertTriangle, href: "/issues" },
  { title: "Staff Requests", icon: Truck, href: "/requests" },
  { title: "All Tasks", icon: CheckSquare, href: "/tasks" },
  { title: "Users", icon: Users, href: "/users" },
  { title: "Volunteering", icon: Users, href: "/volunteering" },
  { title: "Events", icon: Calendar, href: "/events" },
  { title: "Projects", icon: Construction, href: "/projects" },
  { title: "Development", icon: Compass, href: "/development" },
  { title: "Operational", icon: Wrench, href: "/operational" },
  { title: "Sports & Leisure", icon: Trophy, href: "/sports" },
  { title: "Master Calendar", icon: CalendarDays, href: "/calendar" },
  { title: "Smart Tasking", icon: BrainCircuit, href: "/smart-tasking" },
  { title: "System Management", icon: Settings2, href: "/system", isMasterOnly: true },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user } = useUser();
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const { setOpenMobile, isMobile } = useSidebar();

  const { profile: currentUserProfile, organization, permissions, isAdmin, isMaster } = useUserContext();

  const profileRoles = currentUserProfile?.roles || (currentUserProfile?.role ? [currentUserProfile.role] : []);

  const filteredNavItems = useMemo(() => {
    return navItems.filter(item => {
      if (item.isMasterOnly) return isMaster;

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
        case "Parks Map": return permissions.viewMap;
        case "Info Corner": return permissions.viewInfoCorner;
        case "Smart Tasking": return permissions.viewSmartTasking;
        case "Volunteering": return permissions.viewVolunteering;
        case "Events": return permissions.viewEvents;
        case "Projects": return permissions.viewProjects;
        case "Development": return permissions.viewDevelopment;
        case "Operational": return permissions.viewOperational;
        case "Sports & Leisure": return permissions.viewSports;
        case "Master Calendar": return permissions.viewCalendar;
        case "System Management": return isMaster;
        default: return false;
      }
    });
  }, [permissions, isMaster]);

  const showNewRequest = useMemo(() => {
    const hasFeature = organization?.activeFeatures?.includes('requests');
    return !profileRoles.includes('Contractor') && hasFeature;
  }, [profileRoles, organization]);

  const handleLogout = async () => {
    localStorage.removeItem('impersonatedOrgId');
    await signOut(auth);
    router.push("/login");
  };

  return (
    <>
      <Sidebar id="app-sidebar" collapsible="icon">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0 overflow-hidden">
              {organization?.branding?.logoUrl ? (
                <img src={organization.branding.logoUrl} className="h-full w-full object-cover" alt="Logo" />
              ) : (
                <Leaf className="h-6 w-6" />
              )}
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden overflow-hidden">
              <span className="font-headline text-sm font-bold leading-tight text-primary truncate">
                {organization?.name || "Parks and Green Spaces"}
              </span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {organization?.slug === 'hackney-council' ? 'Hackney Council' : (organization?.name || 'Authorised Access')}
              </span>
            </div>
          </div>
        </SidebarHeader>
        
        <SidebarSeparator />
        
        <SidebarContent>
          {isMaster && (
            <SidebarGroup>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-primary font-bold uppercase tracking-widest text-[10px]">Platform Admin</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild
                    isActive={pathname === "/platform"}
                    tooltip="Platform Management"
                    className="text-primary hover:text-primary font-bold"
                  >
                    <Link href="/platform" onClick={() => {
                      if (isMobile) setOpenMobile(false);
                      document.body.style.pointerEvents = 'auto';
                    }}>
                      <ShieldCheck className="h-4 w-4" />
                      <span>SaaS Control Hub</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          )}

          {isMaster && (
            <SidebarGroup>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Module Library (Admin)</SidebarGroupLabel>
              <SidebarMenu>
                {[
                  { title: "Events Hub", href: "/events", icon: Calendar },
                  { title: "Project Board", href: "/projects", icon: Construction },
                  { title: "Park Development", href: "/development", icon: Compass },
                  { title: "Operational Logs", href: "/operational", icon: Hammer },
                  { title: "Sports & Leisure", href: "/sports", icon: Zap }
                ].map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.title}
                    >
                      <Link href={item.href} onClick={() => {
                        if (isMobile) setOpenMobile(false);
                        document.body.style.pointerEvents = 'auto';
                      }}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
              <SidebarSeparator className="mt-4" />
            </SidebarGroup>
          )}

          <SidebarGroup>
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Management</SidebarGroupLabel>
            <SidebarMenu>
              {filteredNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.title}
                  >
                    <Link 
                      href={item.href} 
                      data-tour={item.title === 'My Tasks' ? 'nav-my-tasks' : item.title === 'Info Corner' ? 'nav-info-corner' : undefined}
                      onClick={() => {
                        if (isMobile) setOpenMobile(false);
                        document.body.style.pointerEvents = 'auto';
                      }}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
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
