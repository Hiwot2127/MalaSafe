'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Upload,
  BarChart3,
  Map,
  AlertTriangle,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  index: string;
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const navigation: NavItem[] = [
  { index: '01', name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { index: '02', name: 'Upload', href: '/upload', icon: Upload },
  { index: '03', name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { index: '04', name: 'Risk maps', href: '/maps', icon: Map },
  { index: '05', name: 'Alerts', href: '/alerts', icon: AlertTriangle },
  { index: '06', name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card">
      {/* Brand block — mono eyebrow + Fraunces title. */}
      <div className="flex flex-col gap-1.5 border-b border-border px-6 py-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          MalaSafe · 01
        </p>
        <p className="font-display text-xl leading-tight tracking-tight text-foreground">
          Surveillance
        </p>
      </div>

      <nav className="flex-1 px-3 py-6">
        <p className="px-3 pb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Navigation
        </p>
        <ul className="flex flex-col">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            const Icon = item.icon;
            return (
              <li key={item.href} className="relative">
                {/* Active keyline */}
                <span
                  aria-hidden
                  className={cn(
                    'absolute inset-y-1 left-0 w-[2px] bg-foreground transition-opacity',
                    isActive ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 transition-colors',
                    isActive
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
                  )}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={1.5} />
                  <span className="flex flex-1 items-baseline justify-between gap-3">
                    <span className="font-sans text-sm">{item.name}</span>
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                      {item.index}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border px-6 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          © 2026 · MalaSafe
        </p>
      </div>
    </aside>
  );
}
