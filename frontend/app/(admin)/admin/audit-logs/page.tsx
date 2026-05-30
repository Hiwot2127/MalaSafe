/**
 * Audit Logs Page
 * 
 * Admin page for viewing security and audit logs.
 */

'use client';

import { useEffect, useState } from 'react';
import { Shield, Search, Filter, Download, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { EditorialCard } from '@/components/editorial';
import { Button } from '@/components/ui/button';

interface AuditLog {
  id: string;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  description: string;
  timestamp: string;
  ip_address: string | null;
  status: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, resourceFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (actionFilter !== 'all') params.action = actionFilter;
      if (resourceFilter !== 'all') params.resource_type = resourceFilter;
      
      const response = await apiClient.get('/admin/audit-logs', { params });
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log =>
    log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.actor_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.action.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" strokeWidth={1.5} />;
      case 'failure':
        return <AlertTriangle className="h-4 w-4 text-red-600" strokeWidth={1.5} />;
      case 'warning':
        return <Info className="h-4 w-4 text-yellow-600" strokeWidth={1.5} />;
      default:
        return <Info className="h-4 w-4 text-gray-600" strokeWidth={1.5} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'failure':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('login')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
    if (action.includes('created') || action.includes('uploaded')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    }
    if (action.includes('deleted') || action.includes('deactivated')) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    }
    if (action.includes('updated') || action.includes('changed')) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Actor', 'Role', 'Action', 'Resource', 'Description', 'Status', 'IP Address'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.actor_email || 'System',
        log.actor_role || 'N/A',
        log.action,
        log.resource_type,
        `"${log.description.replace(/"/g, '""')}"`,
        log.status,
        log.ip_address || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in mx-auto max-w-6xl w-full">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">
            Security and system activity logs
          </p>
        </div>
        <Button onClick={exportLogs} className="gap-2">
          <Download className="h-4 w-4" strokeWidth={1.5} />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <EditorialCard className="p-4 border-border/40 bg-background/60 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <p className="text-sm font-medium text-muted-foreground relative z-10">Total Events</p>
          <p className="text-3xl font-display font-bold relative z-10 mt-1">{logs.length}</p>
        </EditorialCard>
        <EditorialCard className="p-4 border-border/40 bg-background/60 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <p className="text-sm font-medium text-muted-foreground relative z-10">Successful</p>
          <p className="text-3xl font-display font-bold text-green-600 relative z-10 mt-1">
            {logs.filter(l => l.status === 'success').length}
          </p>
        </EditorialCard>
        <EditorialCard className="p-4 border-border/40 bg-background/60 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <p className="text-sm font-medium text-muted-foreground relative z-10">Failed</p>
          <p className="text-3xl font-display font-bold text-red-600 relative z-10 mt-1">
            {logs.filter(l => l.status === 'failure').length}
          </p>
        </EditorialCard>
        <EditorialCard className="p-4 border-border/40 bg-background/60 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <p className="text-sm font-medium text-muted-foreground relative z-10">Login Attempts</p>
          <p className="text-3xl font-display font-bold relative z-10 mt-1">
            {logs.filter(l => l.action.includes('login')).length}
          </p>
        </EditorialCard>
      </div>

      {/* Filters */}
      <EditorialCard className="p-4 border-border/40 bg-background/60 backdrop-blur-md animate-fade-in-up" style={{ animationDelay: '150ms' }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Actions</option>
            <option value="login_success">Login Success</option>
            <option value="login_failure">Login Failure</option>
            <option value="user_created">User Created</option>
            <option value="user_updated">User Updated</option>
            <option value="password_reset">Password Reset</option>
            <option value="role_changed">Role Changed</option>
            <option value="data_uploaded">Data Uploaded</option>
          </select>

          {/* Resource Filter */}
          <select
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Resources</option>
            <option value="authentication">Authentication</option>
            <option value="user">User</option>
            <option value="upload">Upload</option>
            <option value="system">System</option>
          </select>
        </div>
      </EditorialCard>

      {/* Logs Table */}
      <EditorialCard className="border-border/40 bg-background/60 backdrop-blur-md animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Loading audit logs...</p>
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" strokeWidth={1.5} />
            <p className="text-lg font-medium">No audit logs found</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'Try adjusting your search or filters' : 'Audit logs will appear here as users interact with the system'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium">
                          {log.actor_email || 'System'}
                        </p>
                        {log.actor_role && (
                          <p className="text-xs text-muted-foreground capitalize">
                            {log.actor_role.replace('_', ' ')}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getActionBadgeColor(log.action)}`}>
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm max-w-md">
                      <p className="truncate">{log.description}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-2 text-sm font-medium ${getStatusColor(log.status)}`}>
                        {getStatusIcon(log.status)}
                        <span className="capitalize">{log.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {log.ip_address || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </EditorialCard>
    </div>
  );
}
