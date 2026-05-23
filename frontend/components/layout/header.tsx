'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useNotificationCount } from '@/lib/hooks/use-notification-count';
import { Avatar, NotificationBell, StatusPill } from '@/components/editorial';

function firstNameOf(full: string | null | undefined): string {
  if (!full) return 'there';
  return full.trim().split(/\s+/)[0] ?? 'there';
}

export default function Header() {
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const count = useNotificationCount();

  useEffect(() => setMounted(true), []);

  const role = user?.role?.replace(/_/g, ' ').toUpperCase() ?? 'USER';
  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <header className="flex h-[4.5rem] shrink-0 items-center justify-between gap-6 border-b border-white/10 bg-background/80 backdrop-blur-xl px-8 shadow-sm z-10 transition-all duration-300">
      <div className="flex flex-col gap-0.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Welcome back
        </p>
        <div className="flex items-center gap-3">
          <p className="font-display text-base font-semibold leading-tight tracking-[-0.018em]">
            {firstNameOf(user?.full_name)}
          </p>
          <StatusPill kind="neutral">{role}</StatusPill>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell count={count} />

        <button
          type="button"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-secondary"
        >
          {mounted ? (
            isDark ? (
              <Sun className="size-4" strokeWidth={1.75} aria-hidden />
            ) : (
              <Moon className="size-4" strokeWidth={1.75} aria-hidden />
            )
          ) : (
            <span className="size-4" aria-hidden />
          )}
        </button>

        <Link
          href="/settings"
          aria-label="Open settings"
          className="rounded-full transition-opacity hover:opacity-80"
        >
          <Avatar name={user?.full_name} size="md" />
        </Link>

        <button
          type="button"
          onClick={logout}
          aria-label="Log out"
          title="Log out"
          className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-secondary"
        >
          <LogOut className="size-4" strokeWidth={1.5} aria-hidden />
        </button>
      </div>
    </header>
  );
}
