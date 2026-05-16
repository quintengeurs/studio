import type {Metadata, Viewport} from 'next';

export const viewport: Viewport = {
  themeColor: '#16a34a',
};
import './globals.css';
import {SidebarProvider} from '@/components/ui/sidebar';
import {Toaster} from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { DesktopGuard } from '@/components/auth/desktop-guard';
import { GlobalErrorBoundary } from '@/components/error-boundary';

export const metadata: Metadata = {
  title: 'Parks and Green Spaces | Hackney Parks Management',
  description: 'Asset tracking, issue reporting, and task management for park operatives.',
  manifest: '/manifest.json',
};

import { UserProvider } from '@/context/UserContext';
import { DataProvider } from '@/context/DataContext';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <GlobalErrorBoundary>
          <FirebaseClientProvider>
            <UserProvider>
              <DataProvider>
                <SidebarProvider defaultOpen={true}>
                  <DesktopGuard>
                    {children}
                  </DesktopGuard>
                </SidebarProvider>
              </DataProvider>
            </UserProvider>
          </FirebaseClientProvider>
        </GlobalErrorBoundary>
        <Toaster />
      </body>
    </html>
  );
}
