'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { formatDateTime } from '@/lib/utils';
import {
  EditorialCard,
  PageHeader,
  SectionHeader,
} from '@/components/editorial';

export default function SettingsPage() {
  const { user } = useAuth();

  const role = user?.role?.replace(/_/g, ' ').toUpperCase() ?? 'N/A';

  const profileRows: Array<{ label: string; value: string }> = [
    { label: 'Full name', value: user?.full_name ?? 'N/A' },
    { label: 'Email', value: user?.email ?? 'N/A' },
    { label: 'Role', value: role },
    { label: 'Member since', value: user?.created_at ? formatDateTime(user.created_at) : 'N/A' },
  ];

  const accountRows: Array<{ label: string; value: string }> = [
    { label: 'User ID', value: user?.id ?? 'N/A' },
    ...(user?.district_id ? [{ label: 'District ID', value: user.district_id }] : []),
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-14">
      <PageHeader
        eyebrow="MalaSafe · Console"
        title="Settings"
        description="Account details, audit identifiers, and operational preferences."
      />

      {/* Section 001 - Profile */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="001" label="Profile" />
        <EditorialCard>
          <dl className="divide-y divide-border">
            {profileRows.map((row) => (
              <Row key={row.label} label={row.label} value={row.value} />
            ))}
          </dl>
        </EditorialCard>
      </section>

      {/* Section 002 - Account */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="002" label="Account" />
        <EditorialCard>
          <dl className="divide-y divide-border">
            {accountRows.map((row) => (
              <Row key={row.label} label={row.label} value={row.value} mono />
            ))}
          </dl>
        </EditorialCard>
      </section>

      {/* Section 003 - Preferences */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="003" label="Preferences" />
        <EditorialCard className="px-6 py-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Coming soon
          </p>
          <p className="mt-3 max-w-prose font-sans text-sm leading-relaxed text-foreground/85">
            Theme and notification preferences will be available in a future update.
            For now, settings inherit from the district-level configuration in the
            backend.
          </p>
        </EditorialCard>
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 px-6 py-4 sm:grid-cols-[180px_1fr] sm:items-baseline sm:gap-6">
      <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`text-foreground ${
          mono
            ? 'font-mono text-sm tabular-nums'
            : 'font-sans text-sm font-medium tabular-nums'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
