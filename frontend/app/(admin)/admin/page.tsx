'use client';

import { useEffect, useState } from 'react';
import { Users, FileUp, Shield, Activity, TrendingUp, ArrowRight } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/admin/system-health');
      setHealth(response.data);
    } catch (error) {
      console.error('Failed to fetch system health:', error);
      setError('Failed to load system health data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-10 animate-fade-in mx-auto max-w-6xl w-full">
        <PageHeader eyebrow="MalaSafe · Admin" title="Admin Dashboard" description="Loading..." />
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-10 animate-fade-in mx-auto max-w-6xl w-full">
        <PageHeader eyebrow="MalaSafe · Admin" title="Admin Dashboard" description="System overview" />
        <EditorialCard className="p-12 text-center border-red-500/50 bg-red-500/10">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
              <Activity className="h-8 w-8 text-red-600" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-lg font-semibold text-red-900 dark:text-red-100">{error}</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">Please try again</p>
            </div>
            <button 
              onClick={fetchHealth}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </EditorialCard>
      </div>
    );
  }

  const isHealthy = health?.database_status === 'healthy' || health?.database_status === 'ok' || health?.database_status === 'operational';

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 animate-fade-in w-full">
      <PageHeader
        eyebrow="MalaSafe · Admin"
        title="Admin Dashboard"
        description="Manage users, monitor uploads, and review system security."
      />

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <EditorialCard className="p-6 relative overflow-hidden group hover:border-primary/30 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20 transition-transform duration-300 group-hover:scale-110">
                <Users className="h-6 w-6 text-blue-600" strokeWidth={1.5} />
              </div>
            </div>
            <p className="text-3xl font-display font-bold tracking-tight">{health?.total_users || 0}</p>
            <p className="text-sm font-medium text-muted-foreground mt-1">Total Users</p>
            <p className="text-xs text-muted-foreground mt-1">{health?.active_users || 0} active</p>
          </div>
        </EditorialCard>

        <EditorialCard className="p-6 relative overflow-hidden group hover:border-primary/30 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10 ring-1 ring-purple-500/20 transition-transform duration-300 group-hover:scale-110">
                <FileUp className="h-6 w-6 text-purple-600" strokeWidth={1.5} />
              </div>
            </div>
            <p className="text-3xl font-display font-bold tracking-tight">{health?.total_uploads || 0}</p>
            <p className="text-sm font-medium text-muted-foreground mt-1">Total Uploads</p>
            <p className="text-xs text-muted-foreground mt-1">+{health?.uploads_last_24h || 0} today</p>
          </div>
        </EditorialCard>

        <EditorialCard className="p-6 relative overflow-hidden group hover:border-primary/30 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20 transition-transform duration-300 group-hover:scale-110">
                <Shield className="h-6 w-6 text-amber-600" strokeWidth={1.5} />
              </div>
            </div>
            <p className="text-3xl font-display font-bold tracking-tight">{health?.failed_logins_last_24h || 0}</p>
            <p className="text-sm font-medium text-muted-foreground mt-1">Failed Logins</p>
            <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
          </div>
        </EditorialCard>

        <EditorialCard className="p-6 relative overflow-hidden group hover:border-primary/30 transition-all duration-300">
          <div className={`absolute inset-0 bg-gradient-to-br ${isHealthy ? 'from-green-500/5' : 'from-red-500/5'} to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${isHealthy ? 'bg-green-500/10 ring-1 ring-green-500/20' : 'bg-red-500/10 ring-1 ring-red-500/20'} transition-transform duration-300 group-hover:scale-110`}>
                <Activity className={`h-6 w-6 ${isHealthy ? 'text-green-600' : 'text-red-600'}`} strokeWidth={1.5} />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
                {isHealthy ? '100%' : '⚠'}
              </div>
            </div>
            <p className="text-3xl font-display font-bold tracking-tight capitalize">{health?.database_status || 'Unknown'}</p>
            <p className="text-sm font-medium text-muted-foreground mt-1">Database</p>
            <p className={`text-xs font-medium mt-1 ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
              {isHealthy ? 'Healthy' : 'Needs attention'}
            </p>
          </div>
        </EditorialCard>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <EditorialCard className="p-0 overflow-hidden relative group border-border/40 bg-background/60 backdrop-blur-md hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="p-6 relative z-10">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <Users className="h-7 w-7 text-blue-600" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="font-display text-lg font-semibold mb-2 group-hover:text-primary transition-colors">User Management</h3>
            <p className="text-sm text-muted-foreground mb-4">Create and manage user accounts</p>
            <Link 
              href="/admin/users" 
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:gap-3 transition-all"
              aria-label="Manage user accounts"
            >
              Manage users <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </div>
        </EditorialCard>

        <EditorialCard className="p-0 overflow-hidden relative group border-border/40 bg-background/60 backdrop-blur-md hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="p-6 relative z-10">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-500/10 ring-1 ring-purple-500/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <FileUp className="h-7 w-7 text-purple-600" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="font-display text-lg font-semibold mb-2 group-hover:text-primary transition-colors">Upload Monitoring</h3>
            <p className="text-sm text-muted-foreground mb-4">Monitor data upload activity</p>
            <Link 
              href="/admin/upload-monitoring" 
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:gap-3 transition-all"
              aria-label="View upload monitoring"
            >
              View uploads <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </div>
        </EditorialCard>

        <EditorialCard className="p-0 overflow-hidden relative group border-border/40 bg-background/60 backdrop-blur-md hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="p-6 relative z-10">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <Shield className="h-7 w-7 text-amber-600" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="font-display text-lg font-semibold mb-2 group-hover:text-primary transition-colors">Audit Logs</h3>
            <p className="text-sm text-muted-foreground mb-4">Review security and activity logs</p>
            <Link 
              href="/admin/audit-logs" 
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:gap-3 transition-all"
              aria-label="View security audit logs"
            >
              View logs <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </div>
        </EditorialCard>
      </div>
    </div>
  );
}
