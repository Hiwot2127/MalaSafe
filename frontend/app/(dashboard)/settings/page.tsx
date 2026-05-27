'use client';

import {
  Calendar,
  Fingerprint,
  Mail,
  MapPin,
  Settings as SettingsIcon,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { formatDateTime } from '@/lib/utils';
import {
  EditorialCard,
  PageHeader,
  ProfileCard,
  SectionHeader,
} from '@/components/editorial';

export default function SettingsPage() {
  const { user } = useAuth();

  const role = user?.role === 'admin' 
    ? 'MOH Data Officer' 
    : user?.role?.replace(/_/g, ' ').toUpperCase() ?? 'N/A';

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-14">
      <PageHeader
        eyebrow="MalaSafe · Console"
        title="Settings"
        description="Account details, audit identifiers, and operational preferences."
      />

      {/* Section 001 - Profile */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="001" label="Profile" tone="signal" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ProfileCard
            icon={UserIcon}
            label="Full name"
            value={user?.full_name ?? 'N/A'}
            tone="primary"
          />
          <ProfileCard
            icon={Mail}
            label="Email address"
            value={user?.email ?? 'N/A'}
            tone="signal"
          />
          <ProfileCard
            icon={Shield}
            label="Role"
            value={role}
            tone="valid"
            meta="Signed in"
          />
          <ProfileCard
            icon={Calendar}
            label="Member since"
            value={user?.created_at ? formatDateTime(user.created_at) : 'N/A'}
            tone="warn"
          />
        </div>
      </section>

      {/* Section 002 - Account identifiers */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="002" label="Account identifiers" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ProfileCard
            icon={Fingerprint}
            label="User ID"
            value={
              <span className="font-mono text-xs tabular-nums">
                {user?.id ?? 'N/A'}
              </span>
            }
            tone="primary"
          />
          {user?.district_id ? (
            <ProfileCard
              icon={MapPin}
              label="District ID"
              value={
                <span className="font-mono text-xs tabular-nums">
                  {user.district_id}
                </span>
              }
              tone="signal"
            />
          ) : null}
        </div>
      </section>

      {/* Section 003 - Preferences */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="003" label="Preferences" />
        <EditorialCard className="flex items-start gap-4 px-6 py-6">
          <span
            aria-hidden
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
          >
            <SettingsIcon className="size-5" strokeWidth={1.75} />
          </span>
          <div className="flex flex-col gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Coming soon
            </p>
            <p className="max-w-prose font-sans text-sm leading-relaxed text-foreground/85">
              Theme and notification preferences will be available in a future
              update. The theme toggle in the header switches between light and
              dark; the rest of the settings still inherit from the district-level
              configuration in the backend.
            </p>
          </div>
        </EditorialCard>
      </section>
    </div>
  );
}
