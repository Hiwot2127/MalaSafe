'use client';

import { useToast } from '@/lib/hooks/use-toast';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => {
        const Icon =
          toast.variant === 'success'
            ? CheckCircle
            : toast.variant === 'destructive'
              ? AlertCircle
              : Info;

        const colorClass =
          toast.variant === 'success'
            ? 'border-green-500/40 bg-green-950/90 text-green-100'
            : toast.variant === 'destructive'
              ? 'border-red-500/40 bg-red-950/90 text-red-100'
              : 'border-border/40 bg-background/90 text-foreground';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border backdrop-blur-xl shadow-2xl px-5 py-4 min-w-[320px] max-w-md animate-in slide-in-from-bottom-5 fade-in duration-300 ${colorClass}`}
            role="status"
          >
            <Icon className="size-5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
            <div className="flex-1 space-y-1">
              <p className="font-sans text-sm font-semibold leading-tight">
                {toast.title}
              </p>
              {toast.description ? (
                <p className="font-sans text-xs leading-relaxed opacity-90">
                  {toast.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="flex-shrink-0 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Dismiss notification"
            >
              <X className="size-4" strokeWidth={2} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
