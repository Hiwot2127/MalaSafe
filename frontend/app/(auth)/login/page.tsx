'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import {
  EditorialInput,
  PrimaryButton,
} from '@/components/editorial';

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
      {/* Editorial column — visible on lg+ */}
      <aside className="relative hidden flex-col justify-between bg-primary px-12 py-14 text-primary-foreground lg:flex">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] opacity-70">
            MalaSafe · Surveillance
          </p>
          <p className="font-mono text-[11px] tabular-nums opacity-70">v.1 · 2026</p>
        </div>

        <div className="flex max-w-md flex-col gap-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] opacity-70">
            Field report 01 / 06
          </p>
          <h2 className="font-display font-semibold text-5xl leading-[1.02] tracking-tight">
            Watch the rains.
            <br />
            Predict the cases.
          </h2>
          <p className="font-sans text-base leading-relaxed opacity-80">
            Operational malaria surveillance for the Ethiopian highlands —
            monthly case ingest, climate fusion, drift checks, and a re-prediction
            in time for the next outbreak window.
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-6 border-t border-primary-foreground/15 pt-6">
          <div className="flex flex-col gap-1">
            <dt className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-60">
              Districts
            </dt>
            <dd className="font-display font-semibold text-2xl tabular-nums tracking-tight">1,158</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-60">
              Coverage
            </dt>
            <dd className="font-display font-semibold text-2xl tabular-nums tracking-tight">12 reg.</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-60">
              Model
            </dt>
            <dd className="font-display font-semibold text-2xl tabular-nums tracking-tight">LGBM</dd>
          </div>
        </dl>
      </aside>

      {/* Form column */}
      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="flex w-full max-w-sm flex-col gap-10">
          <header className="flex flex-col gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              MalaSafe · Console
            </p>
            <h1 className="font-display font-semibold text-3xl leading-[1.05] tracking-tight">
              Sign in
            </h1>
            <p className="font-sans text-sm leading-relaxed text-muted-foreground">
              Authorised personnel only. Sessions log to the audit ledger.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
              >
                Email
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
              <div
                role="alert"
                className="border border-status-error/40 bg-status-error-tint px-3 py-2.5 font-sans text-sm text-status-error"
              >
                {error}
              </div>
            ) : null}

            <PrimaryButton type="submit" disabled={loading} fullWidth>
              {loading ? 'Signing in…' : 'Sign in'}
            </PrimaryButton>
          </form>

          <aside className="flex flex-col gap-2 border border-border bg-secondary px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Demo credentials
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs text-foreground">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="tabular-nums">admin@malasafe.gov.et</dd>
              <dt className="text-muted-foreground">Pass</dt>
              <dd className="tabular-nums">Admin@123</dd>
            </dl>
          </aside>
        </div>
      </section>
    </div>
  );
}
