
"use client";

import { useEffect } from "react";
import { AppSidebar } from "@/components/nav/app-sidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { MobileBottomNav } from "@/components/nav/mobile-bottom-nav";
import { MobileTopHeader } from "@/components/nav/mobile-top-header";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Shield,
  Settings,
  CreditCard,
  Bell,
  User as UserIcon,
  ChevronsUpDown,
  Sparkles,
  BadgeCheck,
  LogOut,
  UserCircle,
  Loader2
} from "lucide-react";
import { useAuth, useUser } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useUserContext } from "@/context/UserContext";
import dynamic from "next/dynamic";

const OnboardingTour = dynamic(
  () => import("@/components/onboarding/OnboardingTour").then(m => m.OnboardingTour),
  { ssr: false }
);

const WhatsNewModal = dynamic(
  () => import("@/components/modals/whats-new-modal").then(m => m.WhatsNewModal),
  { ssr: false }
);

interface DashboardShellProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  isPublic?: boolean;
  hideHeader?: boolean;
}

export function DashboardShell({ children, title, description, actions, isPublic, hideHeader }: DashboardShellProps) {
  const isMobile = useIsMobile();
  const { user, loading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { shouldShowTour, markTourComplete } = useOnboarding();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  useEffect(() => {
    if (!loading && !user && !isPublic) {
      router.push("/login");
    }
  }, [user, loading, router, isPublic]);

  const forceUnlock = () => {
    document.body.style.pointerEvents = 'auto';
    document.body.style.overflow = 'auto';
    document.body.removeAttribute('data-radix-scroll-lock');
  };

  // Global reset to prevent stuck modals/pointer-events on navigation
  useEffect(() => {
    const cleanup = () => {
      forceUnlock();
    };
    
    cleanup();
    // Also run on a short delay to catch late-closing modals
    const timer = setTimeout(cleanup, 100);
    return () => clearTimeout(timer);
  }, [title]); // Trigger on every page title change (navigation)

  const { profile, loading: profileLoading, isMaster } = useUserContext();
  const isVolunteer = (profile?.roles?.includes('Volunteer') || profile?.isVolunteer) && !isMaster;
  const showNav = !!user && !isPublic && !isVolunteer;

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Syncing Profile...</p>
        </div>
      </div>
    );
  }

  if (!user && !isPublic) {
    return null;
  }


  return (
    <div className="flex min-h-screen bg-background w-full overflow-x-hidden">
      {showNav && !isMobile && (
        <div className="flex shrink-0" style={{ pointerEvents: 'auto' }} onClick={forceUnlock}>
          <AppSidebar />
        </div>
      )}
      <SidebarInset className={`flex flex-col ${showNav ? 'pb-20 md:pb-0' : ''} w-full min-w-0`}>
        {showNav && isMobile ? (
          <div style={{ pointerEvents: 'auto' }} onClick={forceUnlock}>
            <MobileTopHeader />
          </div>
        ) : !hideHeader ? (
          <header 
            className="flex h-16 shrink-0 items-center justify-between gap-2 px-6 border-b bg-card sticky top-0 z-30"
            style={{ pointerEvents: 'auto' }}
            onClick={forceUnlock}
          >
            <div className="flex items-center gap-2">
              {showNav && (
                <>
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                </>
              )}
              <div>
                <h1 className="text-lg font-headline font-bold text-foreground leading-none">{title}</h1>
                {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {actions}
              <div className="ml-auto flex items-center gap-4">
                {user && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-10 w-10 rounded-full border-2 border-primary/10 p-0 hover:border-primary/30 transition-all">
                        <Avatar className="h-full w-full">
                          <AvatarImage src={user?.photoURL || undefined} />
                          <AvatarFallback className="bg-primary/5 text-primary font-bold">
                            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-bold leading-none">{user?.displayName || user?.email?.split('@')[0] || 'User'}</p>
                          <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem disabled>
                          <UserCircle className="mr-2 h-4 w-4" />
                          <span>Profile Settings</span>
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer font-bold">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </header>
        ) : null}
        
        <main className="p-4 md:p-6 w-full overflow-x-hidden">
          <div className="mx-auto max-w-7xl w-full">
            {isMobile && !hideHeader && (
               <div className="mb-6">
                <h1 className="text-2xl font-headline font-bold text-foreground break-words">{title}</h1>
                {description && <p className="text-sm text-muted-foreground mt-1 break-words">{description}</p>}
                {actions && <div className="mt-4">{actions}</div>}
              </div>
            )}
            <div className="w-full">
              {children}
            </div>
          </div>
        </main>
        
        {showNav && isMobile && (
          <div style={{ pointerEvents: 'auto' }} onClick={forceUnlock}>
            <MobileBottomNav />
          </div>
        )}
      </SidebarInset>
      {shouldShowTour && !!user && !isPublic && (
        <OnboardingTour onComplete={markTourComplete} />
      )}
      {!!user && !isPublic && (
        <WhatsNewModal />
      )}
    </div>
  );
}
