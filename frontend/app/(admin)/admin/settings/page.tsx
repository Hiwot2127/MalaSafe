'use client';

import { PageHeader, EditorialCard, SectionHeader } from '@/components/editorial';
import { Info, Mail, Database, Server, Code, Calendar } from 'lucide-react';

export default function SystemInformationPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 animate-fade-in w-full">
      <PageHeader
        eyebrow="MalaSafe · Admin"
        title="System Information"
        description="View system configuration, contact information, and technical details."
      />

      <div className="grid gap-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        
        {/* Contact Information */}
        <section className="flex flex-col gap-4">
          <SectionHeader index="01" label="Contact & Support" tone="valid" />
          <EditorialCard className="p-0 border-border/40 overflow-hidden bg-background/60 backdrop-blur-md">
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex gap-4 items-start">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-foreground mb-1">System Administrator Email</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Contact email for system alerts, notifications, and administrative inquiries.
                  </p>
                  <a 
                    href="mailto:admin_malasafe@gmail.com"
                    className="inline-flex items-center gap-2 text-sm font-mono text-primary hover:underline"
                  >
                    <Mail className="h-4 w-4" strokeWidth={1.5} />
                    admin_malasafe@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex gap-4 items-start border-t border-border/40 pt-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
                  <Info className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-foreground mb-1">Emergency Hotline</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    For urgent malaria outbreak reports and system emergencies.
                  </p>
                  <a 
                    href="tel:+251703245232"
                    className="inline-flex items-center gap-2 text-sm font-mono text-primary hover:underline"
                  >
                    <Server className="h-4 w-4" strokeWidth={1.5} />
                    +251 70 324 5232
                  </a>
                </div>
              </div>
            </div>
          </EditorialCard>
        </section>

        {/* System Configuration */}
        <section className="flex flex-col gap-4 mt-4">
          <SectionHeader index="02" label="System Configuration" tone="neutral" />
          <EditorialCard className="p-0 border-border/40 overflow-hidden bg-background/60 backdrop-blur-md">
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex gap-4 items-start">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                  <Database className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-foreground mb-1">Database</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    PostgreSQL database for malaria surveillance data, user accounts, and audit logs.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-mono">PostgreSQL 15+</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Connection:</span>
                      <span className="font-mono">localhost:5432</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Database:</span>
                      <span className="font-mono">malasafe</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 items-start border-t border-border/40 pt-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
                  <Code className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-foreground mb-1">Application Stack</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Modern web stack with FastAPI backend and Next.js frontend.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Backend:</span>
                      <span className="font-mono">FastAPI + Python 3.11+</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Frontend:</span>
                      <span className="font-mono">Next.js 14 + TypeScript</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ML Engine:</span>
                      <span className="font-mono">LightGBM + scikit-learn</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 items-start border-t border-border/40 pt-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-500/10">
                  <Calendar className="h-5 w-5 text-teal-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-foreground mb-1">Data Retention</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    System retains malaria surveillance data indefinitely for historical analysis and audit logs for compliance.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Malaria Data:</span>
                      <span className="font-medium text-green-600">Indefinitely</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Audit Logs:</span>
                      <span className="font-medium text-green-600">1 Year</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">User Sessions:</span>
                      <span className="font-medium text-amber-600">4 Hours</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </EditorialCard>
        </section>

        {/* Deployment Information */}
        <section className="flex flex-col gap-4 mt-4">
          <SectionHeader index="03" label="Deployment" tone="neutral" />
          <EditorialCard className="p-0 border-border/40 overflow-hidden bg-background/60 backdrop-blur-md">
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex gap-4 items-start">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
                  <Server className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-foreground mb-1">Environment</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Current deployment environment and endpoints.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mode:</span>
                      <span className="font-mono">Production</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Frontend:</span>
                      <span className="font-mono">localhost:3000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Backend API:</span>
                      <span className="font-mono">localhost:8000</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </EditorialCard>
        </section>

      </div>
      
      <div className="border-t border-border/40 pt-6 mt-4 pb-12 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <p className="text-xs text-center text-muted-foreground">
          MalaSafe Malaria Surveillance System • EPHI & MOH Ethiopia • Version 1.0.0
        </p>
      </div>

    </div>
  );
}
