'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useNotificationCount } from '@/lib/hooks/use-notification-count';
import { Avatar, NotificationBell, StatusPill } from '@/components/editorial';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

function firstNameOf(full: string | null | undefined): string {
  if (!full) return 'there';
  return full.trim().split(/\s+/)[0] ?? 'there';
}

export default function Header() {
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const count = useNotificationCount();
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  const role = user?.role?.replace(/_/g, ' ').toUpperCase() ?? 'USER';
  const isDark = mounted && resolvedTheme === 'dark';
  const pageName = pathname === '/dashboard' ? 'Overview' : pathname?.split('/')[1]?.replace(/-/g, ' ') ?? 'Overview';

  return (
    <header className="sticky top-0 z-40 flex h-[4.5rem] shrink-0 items-center justify-between border-b border-border/40 px-8 backdrop-blur-2xl bg-background/40">
      <div className="flex w-[200px] flex-col gap-0.5">
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          <span>MalaSafe</span>
          <span className="text-border">/</span>
          <span className="text-primary animate-in fade-in slide-in-from-left-2 duration-500">{pageName}</span>
        </div>
        <div className="flex items-center gap-3">
          <p className="font-display text-base font-semibold leading-tight tracking-[-0.018em] capitalize animate-in fade-in zoom-in-95 duration-300">
            {pageName}
          </p>
        </div>
      </div>

      <div className="hidden flex-1 items-center justify-center md:flex animate-in fade-in slide-in-from-top-2 duration-500">
        <button className="group flex h-9 w-64 items-center gap-2 rounded-md border border-border/40 bg-background/50 px-3 text-muted-foreground shadow-sm backdrop-blur-md transition-all hover:border-primary/50 hover:bg-background/80 hover:text-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <span className="font-sans text-sm">Search anywhere...</span>
          <kbd className="ml-auto inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 transition-opacity group-hover:border-primary/30 group-hover:text-primary">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
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
