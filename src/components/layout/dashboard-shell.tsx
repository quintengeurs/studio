
"use client";

import { useEffect } from "react";
import { AppSidebar } from "@/components/nav/app-sidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { MobileBottomNav } from "@/components/nav/mobile-bottom-nav";
import { MobileTopHeader } from "@/components/nav/mobile-top-header";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

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
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && !isPublic) {
      router.push("/login");
    }
  }, [user, loading, router, isPublic]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !isPublic) {
    return null;
  }

  const showNav = !!user;

  return (
    <div className="flex min-h-screen bg-background w-full overflow-x-hidden">
      {showNav && !isMobile && <AppSidebar />}
      <SidebarInset className={`flex flex-col ${showNav ? 'pb-20 md:pb-0' : ''} w-full min-w-0`}>
        {showNav && isMobile ? (
          <MobileTopHeader />
        ) : !hideHeader ? (
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-6 border-b bg-card sticky top-0 z-30">
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
        
        {showNav && isMobile && <MobileBottomNav />}
      </SidebarInset>
    </div>
  );
}
