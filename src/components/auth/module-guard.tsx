'use client';

import { ReactNode } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useUserContext } from '@/context/UserContext';
import { Module } from '@/lib/roles';

export function ModuleGuard({
  module,
  children,
  title = 'Access denied',
  message = 'You do not have the required license module to access this feature.',
}: {
  module: Module;
  children: ReactNode;
  title?: string;
  message?: string;
}) {
  const { hasModule, permissions } = useUserContext();
  const isAllowed = hasModule(module);

  if (!isAllowed) {
    return (
      <DashboardShell title={title} description="">
        <div className="p-6 rounded-3xl border border-muted bg-muted/50 text-center">
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </DashboardShell>
    );
  }

  return <>{children}</>;
}
