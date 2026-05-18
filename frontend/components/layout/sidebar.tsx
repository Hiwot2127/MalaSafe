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
  BrainCircuit,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/brand/logo';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Upload Data', href: '/upload', icon: Upload },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Predictions', href: '/predictions', icon: BrainCircuit },
  { name: 'Risk Maps', href: '/maps', icon: Map },
  { name: 'Alerts', href: '/alerts', icon: AlertTriangle },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col border-r border-border/80 bg-card/80 backdrop-blur-xl">
      <div className="border-b border-border/80 px-4 py-5">
        <Link href="/dashboard" className="block">
          <Logo size="sm" />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Navigation
        </p>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'ms-sidebar-link',
                isActive ? 'ms-sidebar-link-active' : 'ms-sidebar-link-inactive'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/80 p-4">
        <p className="text-center text-[10px] font-medium text-muted-foreground">
          Ethiopia · Malaria surveillance
        </p>
        <p className="mt-1 text-center text-[10px] text-muted-foreground/70">© 2026 MalaSafe</p>
      </div>
    </aside>
  );
}
