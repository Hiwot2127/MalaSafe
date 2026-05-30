'use client';

import { useEffect, useState } from 'react';
import { Users, FileUp, Shield, Activity, TrendingUp, AlertTriangle, Settings, ArrowRight } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { EditorialCard, PageHeader } from '@/components/editorial';
import Link from 'next/link';

interface SystemHealth {
  total_users: number;
  active_users: number;
  total_uploads: number;
  uploads_last_24h: number;
  failed_logins_last_24h: number;
  database_status: string;
}

export default function AdminDashboardPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await apiClient.get('/admin/system-health');
        setHealth(response.data);
      } catch (error) {
        console.error('Failed to fetch system health:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-14 animate-fade-in mx-auto max-w-6xl w-full">
        <PageHeader eyebrow="MalaSafe · Admin" title="System Overview" description="Loading system metrics..." />
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  const isHealthy = health?.database_status === 'ok' || health?.database_status === 'operational';

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 animate-fade-in w-full">
      <PageHeader
        eyebrow="MalaSafe · Admin"
        title="System Overview"
        description="Monitor system health, active users, and system auditing across the MalaSafe platform."
      />

      {/* Stats Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <EditorialCard className="p-6 relative overflow-hidden group hover:border-primary/30 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <Users className="h-6 w-6 text-blue-600" strokeWidth={1.5} />
            </div>
            <div className="flex items-center gap-1 text-sm font-medium text-green-600">
              <TrendingUp className="h-4 w-4" strokeWidth={1.5} /> Active
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-display font-bold tracking-tight text-foreground">{health?.total_users || 0}</p>
            <p className="text-sm font-medium text-muted-foreground">Total Users</p>
            <p className="mt-1 text-xs text-muted-foreground font-mono">{health?.active_users || 0} active</p>
          </div>
        </EditorialCard>

        <EditorialCard className="p-6 relative overflow-hidden group hover:border-primary/30 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
              <FileUp className="h-6 w-6 text-purple-600" strokeWidth={1.5} />
            </div>
            <div className="flex items-center gap-1 text-sm font-medium text-green-600">
              <TrendingUp className="h-4 w-4" strokeWidth={1.5} /> Syncing
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-display font-bold tracking-tight text-foreground">{health?.total_uploads || 0}</p>
            <p className="text-sm font-medium text-muted-foreground">Data Uploads</p>
            <p className="mt-1 text-xs text-muted-foreground font-mono">+{health?.uploads_last_24h || 0} in 24h</p>
          </div>
        </EditorialCard>

        <EditorialCard className="p-6 relative overflow-hidden group hover:border-primary/30 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10">
              <AlertTriangle className="h-6 w-6 text-red-600" strokeWidth={1.5} />
            </div>
            <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4 rotate-180" strokeWidth={1.5} /> Low
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-display font-bold tracking-tight text-foreground">{health?.failed_logins_last_24h || 0}</p>
            <p className="text-sm font-medium text-muted-foreground">Failed Logins</p>
            <p className="mt-1 text-xs text-muted-foreground font-mono">Last 24 hours</p>
          </div>
        </EditorialCard>

        <EditorialCard className="p-6 relative overflow-hidden group hover:border-primary/30 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
              <Activity className="h-6 w-6 text-green-600" strokeWidth={1.5} />
            </div>
            <div className={`flex items-center gap-1 text-sm font-medium ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
               {isHealthy ? '100%' : 'Failing'}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-display font-bold tracking-tight text-foreground capitalize">{health?.database_status || 'Unknown'}</p>
            <p className="text-sm font-medium text-muted-foreground">Database</p>
            <p className="mt-1 text-xs text-muted-foreground font-mono">Status connection</p>
          </div>
        </EditorialCard>
      </div>

      {/* Main Content Area */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        
        {/* Quick Actions (Spans 2 columns) */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <EditorialCard className="p-0 overflow-hidden relative group border-border/40 bg-background/60 backdrop-blur-md">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="p-6 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20">
                  <Users className="h-6 w-6 text-blue-600" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold tracking-tight">User Management</h3>
                  <p className="text-sm text-muted-foreground">Create, suspend, or modify permissions for platform operators.</p>
                </div>
              </div>
              <Link href="/admin/users" className="group/btn flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-sm">
                Manage <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
              </Link>
            </div>
          </EditorialCard>

          <EditorialCard className="p-0 overflow-hidden relative group border-border/40 bg-background/60 backdrop-blur-md">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="p-6 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 ring-1 ring-purple-500/20">
                  <Shield className="h-6 w-6 text-purple-600" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold tracking-tight">Security Audit Logs</h3>
                  <p className="text-sm text-muted-foreground">Review login attempts, data updates, and system-level actions.</p>
                </div>
              </div>
              <Link href="/admin/audit-logs" className="group/btn flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-sm">
                View Logs <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
              </Link>
            </div>
          </EditorialCard>

          <EditorialCard className="p-0 overflow-hidden relative group border-border/40 bg-background/60 backdrop-blur-md">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="p-6 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 ring-1 ring-orange-500/20">
                  <Settings className="h-6 w-6 text-orange-600" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold tracking-tight">Platform Settings</h3>
                  <p className="text-sm text-muted-foreground">Configure global application variables and parameters.</p>
                </div>
              </div>
              <Link href="/admin/settings" className="group/btn flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-sm">
                Configure <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
              </Link>
            </div>
          </EditorialCard>
        </div>

        {/* System Status Sidebar */}
        <div className="flex flex-col gap-5 h-full">
          <EditorialCard className="p-6 h-full flex flex-col bg-background/40 backdrop-blur-md border-border/40">
            <h3 className="font-display text-lg font-semibold tracking-tight mb-6 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" strokeWidth={1.5} />
              Service Health
            </h3>
            <div className="space-y-6 flex-1">
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </div>
                  <span className="font-medium">API Server</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-green-600 bg-green-500/10 px-2.5 py-1 rounded-full ring-1 ring-green-500/20">Operational</span>
              </div>
              
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-3 w-3">
                    {isHealthy ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                      </>
                    ) : (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </>
                    )}
                  </div>
                  <span className="font-medium">PostgreSQL</span>
                </div>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ring-1 capitalize ${isHealthy ? 'text-green-600 bg-green-500/10 ring-green-500/20' : 'bg-red-500/10 text-red-600 ring-red-500/20'}`}>
                  {health?.database_status || 'Unknown'}
                </span>
              </div>

              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </div>
                  <span className="font-medium">Redis Cache</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-green-600 bg-green-500/10 px-2.5 py-1 rounded-full ring-1 ring-green-500/20">Operational</span>
              </div>

              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </div>
                  <span className="font-medium">Celery Worker</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-green-600 bg-green-500/10 px-2.5 py-1 rounded-full ring-1 ring-green-500/20">Operational</span>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-border/40">
              <p className="text-xs text-muted-foreground text-center">Auto-refreshes every 30s</p>
            </div>
          </EditorialCard>
        </div>

      </div>
    </div>
  );
}
