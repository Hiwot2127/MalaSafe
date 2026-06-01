'use client';

import { PageHeader, EditorialCard, SectionHeader } from '@/components/editorial';
import { Settings2, ShieldCheck, Mail, Database, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 animate-fade-in w-full">
      <PageHeader
        eyebrow="MalaSafe · Admin"
        title="Platform Settings"
        description="Configure global application variables, security preferences, and system behavior."
      />

      <div className="grid gap-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>

        {/* Security Preferences */}
        <section className="flex flex-col gap-4">
          <SectionHeader index="01" label="Security" tone="valid" />
          <EditorialCard className="p-0 border-border/40 overflow-hidden bg-background/60 backdrop-blur-md">
            <div className="p-6 sm:p-8 space-y-8">
              <div className="flex gap-4 items-start border-b border-border/40 pb-8">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h4 className="text-base font-semibold text-foreground">Require Two-Factor Authentication</h4>
                    <p className="text-sm text-muted-foreground">Enforce 2FA for all administrator accounts.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                      <span className="inline-block h-4 w-4 translate-x-6 transform rounded-full bg-white transition-transform" />
                    </button>
                    <span className="text-sm font-medium">Enabled by default</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
                  <Settings2 className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h4 className="text-base font-semibold text-foreground">Session Timeout</h4>
                    <p className="text-sm text-muted-foreground">Automatically log out inactive administrators after a set duration.</p>
                  </div>
                  <div className="max-w-[200px]">
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                      <option>15 Minutes</option>
                      <option>30 Minutes</option>
                      <option>1 Hour</option>
                      <option>4 Hours</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </EditorialCard>
        </section>

        {/* System Config */}
        <section className="flex flex-col gap-4 mt-4">
          <SectionHeader index="02" label="System" />
          <EditorialCard className="p-0 border-border/40 overflow-hidden bg-background/60 backdrop-blur-md">
            <div className="p-6 sm:p-8 space-y-8">
              <div className="flex gap-4 items-start border-b border-border/40 pb-8">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                  <Database className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h4 className="text-base font-semibold text-foreground">Data Retention</h4>
                    <p className="text-sm text-muted-foreground">How long to keep detailed audit logs before archiving.</p>
                  </div>
                  <div className="max-w-[200px]">
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                      <option>90 Days</option>
                      <option>6 Months</option>
                      <option>1 Year</option>
                      <option>Indefinitely</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h4 className="text-base font-semibold text-foreground">System Notifications</h4>
                    <p className="text-sm text-muted-foreground">Email address for critical system alerts (e.g. database failure, ML drift).</p>
                  </div>
                  <div className="max-w-md">
                    <input
                      type="email"
                      defaultValue="admin_malasafe@gmail.com"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
            </div>
          </EditorialCard>
        </section>

      </div>

      <div className="flex items-center justify-end gap-4 border-t border-border/40 pt-6 mt-4 pb-12 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <Button variant="outline" className="gap-2">
          <RotateCcw className="h-4 w-4" /> Reset Defaults
        </Button>
        <Button className="gap-2 px-8 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]">
          <Save className="h-4 w-4" /> Save Changes
        </Button>
      </div>

    </div>
  );
}
