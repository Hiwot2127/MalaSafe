/**
 * Dashboard Error State
 * 
 * Graceful error handling with retry capability.
 * Provides context and actionable next steps.
 */

import { AlertTriangle, RefreshCw } from 'lucide-react';

interface DashboardErrorProps {
  error: Error | null;
  onRetry: () => void;
}

export function DashboardError({ error, onRetry }: DashboardErrorProps) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="rounded-full bg-status-error/10 p-4 mb-6">
          <AlertTriangle className="size-12 text-status-error" strokeWidth={1.5} />
        </div>
        
        <h2 className="font-display font-semibold text-2xl text-foreground mb-2">
          Unable to load dashboard
        </h2>
        
        <p className="text-center text-muted-foreground max-w-md mb-6">
          {error?.message || 'An unexpected error occurred while fetching dashboard data. This may be due to a network issue or server unavailability.'}
        </p>

        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground shadow-sm transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <RefreshCw className="size-4" strokeWidth={2} />
          Retry
        </button>

        <div className="mt-8 rounded-lg border border-border/40 bg-muted/30 p-4 max-w-md">
          <p className="font-mono text-xs text-muted-foreground">
            <strong className="text-foreground">Troubleshooting:</strong>
            <br />• Check your internet connection
            <br />• Verify the API server is running
            <br />• Contact system administrator if the issue persists
          </p>
        </div>
      </div>
    </div>
  );
}
