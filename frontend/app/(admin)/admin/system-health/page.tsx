/**
 * System Health Page
 * 
 * Admin page for monitoring system health and performance.
 */

'use client';

import { useEffect, useState } from 'react';
import { Activity, Database, Server, Zap, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { EditorialCard } from '@/components/editorial';
import { Button } from '@/components/ui/button';

interface SystemHealth {
  total_users: number;
  active_users: number;
  total_uploads: number;
  uploads_last_24h: number;
  failed_logins_last_24h: number;
  database_status: string;
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchHealth();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/system-health');
      setHealth(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatus = () => {
    if (!health) return 'unknown';
    
    // Check for critical issues
    if (health.database_status !== 'healthy') return 'critical';
    if (health.failed_logins_last_24h > 50) return 'warning';
    
    return 'healthy';
  };

  const healthStatus = getHealthStatus();

  const statusConfig = {
    healthy: {
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      icon: CheckCircle,
      label: 'All Systems Operational',
    },
    warning: {
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      icon: AlertTriangle,
      label: 'Minor Issues Detected',
    },
    critical: {
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      icon: AlertTriangle,
      label: 'Critical Issues',
    },
    unknown: {
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-100 dark:bg-gray-900/30',
      icon: Activity,
      label: 'Status Unknown',
    },
  };

  const StatusIcon = statusConfig[healthStatus].icon;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
          <p className="text-muted-foreground">
            Monitor system performance and health metrics
          </p>
        </div>
        <Button onClick={fetchHealth} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <EditorialCard className={`p-6 ${statusConfig[healthStatus].bgColor}`}>
        <div className="flex items-center gap-4">
          <div className={`flex h-16 w-16 items-center justify-center rounded-full ${statusConfig[healthStatus].bgColor}`}>
            <StatusIcon className={`h-8 w-8 ${statusConfig[healthStatus].color}`} strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <h2 className={`text-2xl font-bold ${statusConfig[healthStatus].color}`}>
              {statusConfig[healthStatus].label}
            </h2>
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </EditorialCard>

      {/* Metrics Grid */}
      {loading && !health ? (
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading system health...</p>
          </div>
        </div>
      ) : health && (
        <>
          {/* User Metrics */}
          <div>
            <h3 className="text-lg font-semibold mb-4">User Metrics</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <EditorialCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                    <Activity className="h-6 w-6 text-blue-600" strokeWidth={1.5} />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{health.total_users}</p>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Active Users</span>
                  <span className="font-semibold text-green-600">{health.active_users}</span>
                </div>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500"
                    style={{ width: `${(health.active_users / health.total_users) * 100}%` }}
                  />
                </div>
              </EditorialCard>

              <EditorialCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10">
                    <AlertTriangle className="h-6 w-6 text-red-600" strokeWidth={1.5} />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{health.failed_logins_last_24h}</p>
                    <p className="text-sm text-muted-foreground">Failed Logins</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Last 24 hours
                </p>
                {health.failed_logins_last_24h > 50 && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                    <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
                    <span>High number of failed attempts</span>
                  </div>
                )}
              </EditorialCard>
            </div>
          </div>

          {/* Upload Metrics */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Upload Metrics</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <EditorialCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
                    <Database className="h-6 w-6 text-purple-600" strokeWidth={1.5} />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{health.total_uploads}</p>
                    <p className="text-sm text-muted-foreground">Total Uploads</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  All time data uploads
                </p>
              </EditorialCard>

              <EditorialCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                    <Zap className="h-6 w-6 text-green-600" strokeWidth={1.5} />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{health.uploads_last_24h}</p>
                    <p className="text-sm text-muted-foreground">Recent Uploads</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Last 24 hours
                </p>
              </EditorialCard>
            </div>
          </div>

          {/* System Components */}
          <div>
            <h3 className="text-lg font-semibold mb-4">System Components</h3>
            <EditorialCard className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <div>
                      <p className="font-medium">API Server</p>
                      <p className="text-sm text-muted-foreground">FastAPI Backend</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-green-600">Operational</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      health.database_status === 'healthy' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="font-medium">Database</p>
                      <p className="text-sm text-muted-foreground">PostgreSQL</p>
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${
                    health.database_status === 'healthy' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {health.database_status === 'healthy' ? 'Operational' : 'Error'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <div>
                      <p className="font-medium">Authentication</p>
                      <p className="text-sm text-muted-foreground">JWT Service</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-green-600">Operational</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <div>
                      <p className="font-medium">File Storage</p>
                      <p className="text-sm text-muted-foreground">Upload System</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-green-600">Operational</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <div>
                      <p className="font-medium">Audit Logging</p>
                      <p className="text-sm text-muted-foreground">Security Logs</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-green-600">Operational</span>
                </div>
              </div>
            </EditorialCard>
          </div>
        </>
      )}
    </div>
  );
}
