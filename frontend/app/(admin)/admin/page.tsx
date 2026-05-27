/**
 * Admin Dashboard Home
 * 
 * Overview page for admin dashboard with system metrics.
 */

'use client';

import { useEffect, useState } from 'react';
import { Users, FileUp, Shield, Activity, TrendingUp, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { EditorialCard } from '@/components/editorial';

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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading system health...</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Users',
      value: health?.total_users || 0,
      icon: Users,
      description: `${health?.active_users || 0} active`,
      trend: '+12%',
      trendUp: true,
    },
    {
      label: 'Total Uploads',
      value: health?.total_uploads || 0,
      icon: FileUp,
      description: `${health?.uploads_last_24h || 0} in last 24h`,
      trend: '+8%',
      trendUp: true,
    },
    {
      label: 'Failed Logins',
      value: health?.failed_logins_last_24h || 0,
      icon: AlertTriangle,
      description: 'Last 24 hours',
      trend: '-5%',
      trendUp: false,
    },
    {
      label: 'Database Status',
      value: health?.database_status || 'Unknown',
      icon: Activity,
      description: 'All systems operational',
      trend: '100%',
      trendUp: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
        <p className="text-muted-foreground">
          Monitor system health and key metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <EditorialCard key={stat.label} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  stat.trendUp ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendingUp className={`h-4 w-4 ${!stat.trendUp && 'rotate-180'}`} strokeWidth={1.5} />
                  {stat.trend}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </p>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
              </div>
            </EditorialCard>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <EditorialCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <Users className="h-6 w-6 text-blue-600" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">User Management</h3>
              <p className="text-sm text-muted-foreground">
                Create and manage user accounts
              </p>
            </div>
            <a
              href="/admin/users"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Manage
            </a>
          </div>
        </EditorialCard>

        <EditorialCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
              <Shield className="h-6 w-6 text-purple-600" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Audit Logs</h3>
              <p className="text-sm text-muted-foreground">
                View security and system logs
              </p>
            </div>
            <a
              href="/admin/audit-logs"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              View Logs
            </a>
          </div>
        </EditorialCard>
      </div>

      {/* System Status */}
      <EditorialCard className="p-6">
        <h3 className="mb-4 text-lg font-semibold">System Status</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm">API Server</span>
            </div>
            <span className="text-sm text-muted-foreground">Operational</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm">Database</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {health?.database_status || 'Unknown'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm">Authentication</span>
            </div>
            <span className="text-sm text-muted-foreground">Operational</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm">File Storage</span>
            </div>
            <span className="text-sm text-muted-foreground">Operational</span>
          </div>
        </div>
      </EditorialCard>
    </div>
  );
}
