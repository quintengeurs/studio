'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('[Global Error Boundary]:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full bg-card border-2 border-destructive/20 rounded-3xl p-8 shadow-2xl text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Something went wrong</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            The application encountered an unexpected error. This might be due to a temporary network issue or a system update.
          </p>
        </div>

        {error.message && (
          <div className="bg-muted/50 rounded-xl p-4 text-left">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1 font-bold">Error Details</p>
            <p className="text-xs font-mono break-all opacity-80">{error.message}</p>
          </div>
        )}

        <div className="pt-2 flex flex-col gap-3">
          <Button 
            onClick={() => reset()} 
            variant="default"
            className="w-full font-bold h-12 rounded-xl group"
          >
            <RotateCcw className="mr-2 w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
            Try to Recover
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="w-full font-bold h-12 rounded-xl"
          >
            Reload Entire Page
          </Button>
        </div>
        
        <p className="text-[10px] text-muted-foreground italic">
          If this persists, please contact support with the error details above.
        </p>
      </div>
    </div>
  );
}
