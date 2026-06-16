'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useNotificationCount } from '@/lib/hooks/use-notification-count';
import { Avatar, NotificationBell, StatusPill } from '@/components/editorial';
import { usePathname } from 'next/navigation';
import { UserRole } from '@/types/auth';

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

  const role = user?.role === UserRole.ADMIN 
    ? 'Administrator' 
    : user?.role === UserRole.MOH_OFFICER
    ? 'MOH Officer'
    : user?.role === UserRole.EPHI_OFFICER
    ? 'EPHI Officer'
    : user?.role === UserRole.REGIONAL_OFFICER
    ? 'Regional Officer'
    : user?.role === UserRole.PUBLIC_USER
    ? 'Public User'
    : 'User';
  const isDark = mounted && resolvedTheme === 'dark';
  const pageSegment = pathname?.startsWith('/dashboard')
    ? pathname.split('/')[2]
    : pathname?.split('/')[1];
  const pageName = pathname === '/dashboard'
    ? 'Overview'
    : pageSegment?.replace(/-/g, ' ') ?? 'Overview';

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

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <NotificationBell count={count} />

        <button
          type="button"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition-all hover:bg-secondary hover:scale-105"
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
          href="/dashboard/settings"
          aria-label="Open settings"
          title="Profile & Settings"
          className="group rounded-full transition-all hover:opacity-80 hover:ring-2 hover:ring-primary/30 hover:ring-offset-2 hover:ring-offset-background"
        >
          <Avatar name={user?.full_name} size="md" />
        </Link>

        <button
          type="button"
          onClick={logout}
          aria-label="Log out"
          title="Sign out of MalaSafe"
          className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
        >
          <LogOut className="size-4" strokeWidth={1.5} aria-hidden />
        </button>
      </div>
    </header>
  );
}
