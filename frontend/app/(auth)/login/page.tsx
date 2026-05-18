'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { getApiErrorMessage } from '@/lib/utils';
import { API_URL } from '@/lib/constants';
import { Logo } from '@/components/brand/logo';
import { AlertBanner } from '@/components/ui/alert-banner';
import { LoginHero3D } from '@/components/auth/login-hero-3d';
import { LoginFormCard } from '@/components/auth/login-form-card';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const base = API_URL.replace(/\/api\/v1\/?$/, '');
    fetch(`${base}/api/v1/health`)
      .then((r) => setApiOnline(r.ok))
      .catch(() => setApiOnline(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Incorrect email or password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden">
      {/* Brand panel — 3D hero */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-brand-navy via-brand-deep to-brand-cyan lg:flex lg:flex-col lg:p-12">
        <Logo size="md" className="relative z-10 [&_p]:text-white [&_span]:text-white/70" />
        <LoginHero3D className="relative z-10 flex-1" />
      </div>

      {/* Form panel */}
      <div className="relative flex w-full flex-col justify-center overflow-hidden px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="pointer-events-none absolute -right-20 top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 left-10 h-48 w-48 rounded-full bg-brand-cyan/10 blur-3xl" />

        <div className="relative z-10 mx-auto w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <LoginHero3D compact />
          </div>

          <LoginFormCard className="ms-card border-border/60 bg-card/95 p-8 shadow-xl shadow-primary/10 backdrop-blur-sm">
            <h1 className="text-2xl font-bold text-foreground">Sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Access the MalaSafe surveillance dashboard
            </p>

            {apiOnline === false && (
              <AlertBanner variant="error" className="mt-6">
                API server is offline. Start the backend:{' '}
                <code className="text-xs">cd backend &amp;&amp; uvicorn app.main:app --reload</code>
              </AlertBanner>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5" autoComplete="off">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                  Email address
                </label>
                <input
                  id="email"
                  name="malasafe-email"
                  type="email"
                  placeholder="Admin Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="ms-input transition-shadow focus:shadow-md focus:shadow-primary/15"
                  autoComplete="off"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
                  Password
                </label>
                <input
                  id="password"
                  name="malasafe-password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="ms-input transition-shadow focus:shadow-md focus:shadow-primary/15"
                  autoComplete="new-password"
                />
              </div>

              {error && <AlertBanner variant="error">{error}</AlertBanner>}

              <button
                type="submit"
                disabled={loading}
                className="ms-btn-primary w-full transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? 'Signing in…' : 'Sign in to dashboard'}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Demo credentials</p>
              <p className="mt-2">admin@malasafe.gov.et</p>
              <p>Admin@123!</p>
            </div>
          </LoginFormCard>
        </div>
      </div>
    </div>
  );
}
