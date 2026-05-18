'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Activity, LineChart, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import {
  AlertBanner,
  EditorialCard,
  EditorialInput,
  PrimaryButton,
} from '@/components/editorial';
import { LogoMark, LogoWordmark } from '@/components/brand/logo';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      const maybe = err as { response?: { data?: { detail?: string } } };
      setError(
        maybe?.response?.data?.detail ||
        'Login failed. Please check your credentials.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background text-foreground lg:grid-cols-[1.05fr_1fr]">
      {/* Brand column - hidden on mobile, full mockup expression on lg+ */}
      <aside className="relative hidden flex-col justify-between bg-primary px-12 py-14 text-primary-foreground lg:flex">
        {/* Subtle radial wash to soften the flat brand panel */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_55%)]"
        />

        <div className="relative flex flex-col gap-5">
          <LogoMark size={64} variant="outline" priority />
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] opacity-70">
            MalaSafe · Surveillance
          </p>
        </div>

        <div className="relative flex max-w-md flex-col gap-6">
          <h2 className="font-display text-5xl font-semibold leading-[1.04] tracking-tight">
            MalaSafe
          </h2>
          <p className="font-sans text-lg leading-relaxed opacity-85">
            Empowering national malaria surveillance through data-driven decision
            support and real-time analytics.
          </p>

          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <EditorialCard className="bg-primary-foreground/10 border-primary-foreground/15 p-4 shadow-none">
              <div className="flex items-center gap-2 mb-2">
                <LineChart className="size-4" strokeWidth={1.5} aria-hidden />
                <p className="font-sans text-sm font-semibold">Real-time Data</p>
              </div>
              <p className="font-sans text-xs leading-relaxed opacity-80">
                Continuous monitoring of transmission trends across every region.
              </p>
            </EditorialCard>
            <EditorialCard className="bg-primary-foreground/10 border-primary-foreground/15 p-4 shadow-none">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="size-4" strokeWidth={1.5} aria-hidden />
                <p className="font-sans text-sm font-semibold">Decision Support</p>
              </div>
              <p className="font-sans text-xs leading-relaxed opacity-80">
                LightGBM models predict outbreaks so districts can move first.
              </p>
            </EditorialCard>
          </div>
        </div>

        <div className="relative flex items-center gap-2 border-t border-primary-foreground/15 pt-6">
          <ShieldCheck className="size-4" strokeWidth={1.5} aria-hidden />
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-75">
            Official National Health Portal
          </p>
        </div>
      </aside>

      {/* Form column */}
      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <header className="flex flex-col gap-3">
            <LogoWordmark caption="Console · Sign in" size={32} className="lg:hidden" />
            <p className="hidden font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground lg:block">
              Secure access
            </p>
            <h1 className="font-display text-3xl font-semibold leading-[1.05] tracking-tight">
              Sign in
            </h1>
            <p className="font-sans text-sm leading-relaxed text-muted-foreground">
              Access the MalaSafe surveillance dashboard. Authorised personnel only -
              sessions are written to the audit ledger.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
              >
                Email address
              </label>
              <EditorialInput
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@malasafe.gov.et"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
              >
                Password
              </label>
              <EditorialInput
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error ? (
              <AlertBanner tone="error" title="Sign in failed" description={error} />
            ) : null}

            <PrimaryButton type="submit" disabled={loading} fullWidth>
              {loading ? 'Signing in…' : 'Sign in'}
            </PrimaryButton>

            <p className="text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              256-bit AES · Secure session
            </p>
          </form>

          <EditorialCard className="bg-secondary/40 px-4 py-3 shadow-none">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
              Demo credentials
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs text-foreground">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="tabular-nums">admin@malasafe.gov.et</dd>
              <dt className="text-muted-foreground">Pass</dt>
              <dd className="tabular-nums">Admin@123</dd>
            </dl>
          </EditorialCard>
        </div>
      </section>
    </div>
  );
}
