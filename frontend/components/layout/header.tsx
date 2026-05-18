'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { LogOut } from 'lucide-react';
import { StatusPill } from '@/components/editorial';

export default function Header() {
  const { user, logout } = useAuth();

  const role = user?.role?.replace(/_/g, ' ').toUpperCase() ?? 'USER';

  return (
    <header className="flex items-center justify-between gap-6 border-b border-border bg-background px-8 py-5">
      <div className="flex flex-col gap-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Signed in
        </p>
        <div className="flex items-baseline gap-3">
          <p className="font-display text-lg leading-tight tracking-tight">
            {user?.full_name || 'User'}
          </p>
          <StatusPill kind="neutral">{role}</StatusPill>
        </div>
      </div>

      <div className="flex items-center gap-5">
        {user?.email ? (
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {user.email}
          </span>
        ) : null}
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 border border-border bg-card px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:bg-secondary"
        >
          <LogOut className="size-3.5" strokeWidth={1.5} aria-hidden />
          Log out
        </button>
      </div>
    </header>
  );
}
