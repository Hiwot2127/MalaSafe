'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { LogOut } from 'lucide-react';
import { StatusPill } from '@/components/editorial';

export default function Header() {
  const { user, logout } = useAuth();

  const role = user?.role?.replace(/_/g, ' ').toUpperCase() ?? 'USER';

  return (
    <header className="flex h-[4.5rem] shrink-0 items-center justify-between gap-6 border-b border-border bg-background px-8">
      <div className="flex flex-col gap-0.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Signed in
        </p>
        <div className="flex items-center gap-3">
          <p className="font-display text-base font-semibold leading-tight tracking-[-0.018em]">
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
