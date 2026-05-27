/**
 * Operational Dashboard Sidebar
 * 
 * Sidebar with role-based navigation filtering.
 */

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
  Database,
  FileUp,
  type LucideIcon,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoMark } from '@/components/brand/logo';
import { useAuth } from '@/lib/hooks/use-auth';
import { getNavigationForRole } from '@/lib/rbac';

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  // Get role-based navigation
  const navigation = getNavigationForRole(user.role);

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
        <div className="space-y-6">
          {navigation.map((section) => (
            <div key={section.title}>
              {section.title !== 'Overview' && (
                <p className="px-3 pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {section.title}
                </p>
              )}
              <ul className="flex flex-col gap-1">
                {section.items.map((item, index) => {
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
                          "group flex items-center gap-3 rounded-lg px-3 py-2.5 font-sans text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-primary/10 text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] border border-primary/20"
                            : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground",
                        )}
                      >
                        <Icon className={cn("size-4 shrink-0 transition-transform duration-300 group-hover:scale-110", isActive && "text-primary")} strokeWidth={1.5} />
                        <span className="flex flex-1 items-baseline justify-between gap-3">
                          <span className="font-sans text-sm">{item.label}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t border-border px-6 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="text-xs font-semibold">
              {user.full_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">{user.full_name}</p>
            <p className="truncate text-xs text-muted-foreground capitalize">
              {user.role.replace('_', ' ')}
            </p>
          </div>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          © 2026 · MalaSafe
        </p>
      </div>
    </aside>
  );
}
