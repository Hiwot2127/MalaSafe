'use client';

import { useEffect, useState } from 'react';
import { Users, UserCheck, UserX, Lock, Key, Upload, Activity, AlertTriangle, XCircle } from 'lucide-react';
import { DashboardSummary } from '@/types/admin';
import { apiClient } from '@/lib/api/client';

interface SummaryCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'green' | 'red' | 'amber' | 'gray' | 'purple' | 'orange';
}

function SummaryCard({ title, value, icon: Icon, description, color = 'blue' }: SummaryCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    green: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
    red: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    gray: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
    purple: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
    orange: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  };

  return (
    <div className="glass-panel p-6 rounded-xl border border-border/40 hover:border-border/60 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value.toLocaleString()}</p>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className={`rounded-lg border p-2.5 ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

export function DashboardSummaryCards() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await apiClient.get('/admin/dashboard-summary');
        setSummary(response.data);
      } catch (err) {
        console.error('Failed to fetch dashboard summary:', err);
        setError('Failed to load dashboard summary');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="glass-panel p-6 rounded-xl border border-border/40 animate-pulse">
            <div className="h-4 bg-muted rounded w-24 mb-4" />
            <div className="h-8 bg-muted rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="glass-panel p-6 rounded-xl border border-red-500/20 bg-red-500/5">
        <div className="flex items-center gap-3">
          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" strokeWidth={2} />
          <p className="text-sm text-red-700 dark:text-red-300">{error || 'Failed to load summary'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        title="Total Users"
        value={summary.total_users}
        icon={Users}
        description="All registered users"
        color="blue"
      />
      
      <SummaryCard
        title="Active Users"
        value={summary.active_users}
        icon={UserCheck}
        description="Currently active"
        color="green"
      />
      
      <SummaryCard
        title="Inactive Users"
        value={summary.inactive_users}
        icon={UserX}
        description="Disabled accounts"
        color="gray"
      />
      
      <SummaryCard
        title="Locked Accounts"
        value={summary.locked_users}
        icon={Lock}
        description="Due to failed logins"
        color="red"
      />
      
      <SummaryCard
        title="Password Resets"
        value={summary.password_reset_required}
        icon={Key}
        description="Require password change"
        color="amber"
      />
      
      <SummaryCard
        title="Monthly Uploads"
        value={summary.monthly_uploads}
        icon={Upload}
        description="This month"
        color="purple"
      />
      
      <SummaryCard
        title="Predictions"
        value={summary.predictions_generated}
        icon={Activity}
        description="Total generated"
        color="blue"
      />
      
      <SummaryCard
        title="Active Alerts"
        value={summary.active_alerts}
        icon={AlertTriangle}
        description="Unresolved"
        color="orange"
      />
      
      {summary.failed_login_attempts > 0 && (
        <div className="sm:col-span-2 lg:col-span-4">
          <div className="glass-panel p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" strokeWidth={2} />
              <div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  {summary.failed_login_attempts} failed login attempts in the last 24 hours
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Monitor for potential security threats
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
