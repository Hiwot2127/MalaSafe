'use client';

import { useTheme } from 'next-themes';
import { useAuth } from '@/lib/hooks/use-auth';
import { LogOut, Moon, Sun, User } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Header() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const roleLabel = user?.role?.replace(/_/g, ' ') ?? 'User';

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/80 bg-card/60 px-6 backdrop-blur-md">
      <div>
        <h2 className="text-base font-semibold text-foreground">
          Welcome back, {user?.full_name?.split(' ')[0] || 'User'}
        </h2>
        <p className="text-xs capitalize text-muted-foreground">{roleLabel}</p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 rounded-lg border border-border/80 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground sm:flex">
          <User className="h-3.5 w-3.5" />
          <span className="max-w-[180px] truncate">{user?.email}</span>
        </div>

        {mounted && (
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="ms-btn-ghost h-10 w-10 p-0"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        )}

        <button type="button" onClick={logout} className="ms-btn-secondary !h-10 !px-3 text-destructive hover:bg-destructive/10">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
