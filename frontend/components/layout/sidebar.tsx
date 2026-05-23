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
  Activity,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoMark } from '@/components/brand/logo';

interface NavItem {
  index: string;
  name: string;
  href: string;
  icon: LucideIcon;
}

const navigation: NavItem[] = [
  { index: '01', name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { index: '02', name: 'Upload', href: '/upload', icon: Upload },
  { index: '03', name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { index: '04', name: 'Risk maps', href: '/maps', icon: Map },
  { index: '05', name: 'Predictions', href: '/predictions', icon: Activity },
  { index: '06', name: 'Reports', href: '/reports', icon: FileText },
  { index: '07', name: 'Alerts', href: '/alerts', icon: AlertTriangle },
  { index: '08', name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-white/10 bg-card/90 backdrop-blur-xl z-20 shadow-[4px_0_24px_-8px_rgba(0,0,0,0.1)] dark:shadow-[4px_0_24px_-8px_rgba(0,0,0,0.3)] transition-all duration-300">
      {/* Brand block - locked to the same height as the top bar so the rule
          across the top of the app is continuous. */}
      <div className="flex h-[4.5rem] shrink-0 items-center gap-3 border-b border-white/10 px-6">
        <LogoMark size={32} priority />
        <div className="flex flex-col gap-0.5 leading-none">
          <p className="font-display text-base font-semibold tracking-[-0.018em] text-foreground">
            MalaSafe
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Surveillance · 01
          </p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-6">
        <p className="px-3 pb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Navigation
        </p>
        <ul className="flex flex-col gap-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            const Icon = item.icon;
            return (
              <li key={item.href} className="relative group">
                {/* Active keyline with glow */}
                <span
                  aria-hidden
                  className={cn(
                    'absolute inset-y-1 left-0 w-[3px] rounded-r-md bg-primary transition-all duration-300',
                    isActive ? 'opacity-100 shadow-[0_0_12px_var(--color-primary)]' : 'opacity-0 scale-y-0',
                  )}
                />
                <Link
                  href={item.href}
                  className={cn(
                    'mx-1 flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-300 ease-out active:scale-[0.98]',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium shadow-sm'
                      : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground hover:shadow-sm',
                  )}
                >
                  <Icon className={cn("size-4 shrink-0 transition-transform duration-300 group-hover:scale-110", isActive && "text-primary")} strokeWidth={1.5} />
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
