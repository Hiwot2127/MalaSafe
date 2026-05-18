import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

type AlertBannerProps = {
  variant?: 'error' | 'success' | 'info';
  children: React.ReactNode;
  className?: string;
};

export function AlertBanner({ variant = 'error', children, className }: AlertBannerProps) {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200',
    success:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200',
    info: 'border-primary/30 bg-primary/5 text-foreground',
  };

  const Icon = variant === 'success' ? CheckCircle2 : AlertCircle;

  return (
    <div className={cn('flex gap-3 rounded-lg border px-4 py-3 text-sm', styles[variant], className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  );
}
