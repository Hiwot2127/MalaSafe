'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { User, Mail, Shield, Calendar, Settings } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';

function ProfileRow({
  icon: Icon,
  label,
  value,
  iconClass,
}: {
  icon: typeof User;
  label: string;
  value: string;
  iconClass: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border/60 bg-muted/20 p-4">
      <div className={`rounded-xl p-3 ${iconClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-base font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Your account and workspace preferences"
        icon={Settings}
      />

      <div className="ms-card p-6">
        <h2 className="mb-6 text-lg font-semibold text-foreground">User profile</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ProfileRow
            icon={User}
            label="Full name"
            value={user?.full_name || 'N/A'}
            iconClass="bg-primary/10 text-primary"
          />
          <ProfileRow
            icon={Mail}
            label="Email"
            value={user?.email || 'N/A'}
            iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
          <ProfileRow
            icon={Shield}
            label="Role"
            value={user?.role?.replace(/_/g, ' ').toUpperCase() || 'N/A'}
            iconClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          />
          <ProfileRow
            icon={Calendar}
            label="Member since"
            value={user?.created_at ? formatDateTime(user.created_at) : 'N/A'}
            iconClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
        </div>
      </div>

      <div className="ms-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Account details</h2>
        <dl className="space-y-2 text-sm text-muted-foreground">
          <div className="flex justify-between gap-4 border-b border-border/40 py-2">
            <dt>User ID</dt>
            <dd className="font-mono text-xs text-foreground">{user?.id || 'N/A'}</dd>
          </div>
          {user?.district_id && (
            <div className="flex justify-between gap-4 py-2">
              <dt>District ID</dt>
              <dd className="font-mono text-xs text-foreground">{user.district_id}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="ms-card border-dashed p-6">
        <h2 className="text-lg font-semibold text-foreground">Preferences</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Use the theme toggle in the header for light / dark mode. Notification settings coming soon.
        </p>
      </div>
    </div>
  );
}
