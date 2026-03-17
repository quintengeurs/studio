
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, AlertTriangle, ListTodo, MapPin, ClipboardCheck, PackagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { RequestModal } from "@/components/modals/request-modal";

const items = [
  { title: "Dashboard", icon: LayoutDashboard, href: "/" },
  { title: "My Tasks", icon: ListTodo, href: "/my-tasks" },
  { title: "Inspections", icon: ClipboardCheck, href: "/inspections" },
  { title: "Issues", icon: AlertTriangle, href: "/issues" },
  { title: "Assets", icon: MapPin, href: "/assets" },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [isRequestOpen, setIsRequestOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-card px-1 pb-safe shadow-lg overflow-x-auto">
        {items.map((item) => {
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
        
        <button
          onClick={() => setIsRequestOpen(true)}
          className="flex flex-col items-center justify-center gap-1 rounded-md px-2 py-1 text-primary min-w-[60px]"
        >
          <PackagePlus className="h-5 w-5 stroke-[2.5px]" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Request</span>
        </button>
      </nav>
      
      <RequestModal open={isRequestOpen} onOpenChange={setIsRequestOpen} />
    </>
  );
}
