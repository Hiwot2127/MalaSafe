'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle, Lock, ShieldCheck } from 'lucide-react';
import { LogoWordmark } from '@/components/brand/logo';
import { AlertBanner, PrimaryButton } from '@/components/editorial';
import { authApi } from '@/lib/api/auth';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password strength calculation
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return Math.min(strength, 5);
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const passwordStrengthPercentage = (passwordStrength / 5) * 100;

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 2) return 'bg-red-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength <= 2) return 'Weak';
    if (passwordStrength <= 3) return 'Medium';
    return 'Strong';
  };

  // Password requirements check
  const passwordRequirements = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(newPassword) },
    { label: 'Contains number', met: /[0-9]/.test(newPassword) },
    { label: 'Contains special character', met: /[^a-zA-Z0-9]/.test(newPassword) },
  ];

  const allRequirementsMet = passwordRequirements.every(req => req.met);
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!allRequirementsMet) {
      setError('Password does not meet all requirements');
      setLoading(false);
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      setSuccess(true);

      // Redirect to dashboard after success
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 2000);
    } catch (err: unknown) {
      const maybe = err as { response?: { data?: { detail?: string } } };
      setError(
        maybe?.response?.data?.detail ||
        'Failed to change password. Please try again.',
      );
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 py-12">
      <div className="glass-panel p-10 w-full max-w-[480px] rounded-2xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4">
          <LogoWordmark caption="Security · Password Change" size={32} />
          
          <div className="flex items-center gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3">
            <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-500" strokeWidth={2} />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Password Change Required
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                For security reasons, you must change your password before continuing.
              </p>
            </div>
          </div>

          <div>
            <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight">
              Change Your Password
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Create a strong, unique password to secure your account.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Current Password */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="current-password"
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
            >
              Current Password
            </label>
            <div className="group relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary pointer-events-none" strokeWidth={1.5} />
              <input
                id="current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading || success}
                required
                autoFocus
                className="flex h-10 w-full rounded-md border border-border/40 bg-background/40 backdrop-blur-md px-3 py-2 text-sm text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                disabled={loading || success}
              >
                {showCurrentPassword ? (
                  <EyeOff className="size-4" strokeWidth={1.5} />
                ) : (
                  <Eye className="size-4" strokeWidth={1.5} />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="new-password"
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
            >
              New Password
            </label>
            <div className="group relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary pointer-events-none" strokeWidth={1.5} />
              <input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading || success}
                required
                className="flex h-10 w-full rounded-md border border-border/40 bg-background/40 backdrop-blur-md px-3 py-2 text-sm text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                disabled={loading || success}
              >
                {showNewPassword ? (
                  <EyeOff className="size-4" strokeWidth={1.5} />
                ) : (
                  <Eye className="size-4" strokeWidth={1.5} />
                )}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {newPassword && passwordStrength > 0 && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                    style={{ width: `${passwordStrengthPercentage}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Password strength: <span className="font-medium">{getPasswordStrengthLabel()}</span>
                </p>
              </div>
            )}

            {/* Password Requirements */}
            {newPassword && (
              <div className="mt-2 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                {passwordRequirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    {req.met ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-500" strokeWidth={2} />
                    ) : (
                      <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30" />
                    )}
                    <span className={req.met ? 'text-foreground' : 'text-muted-foreground'}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="confirm-password"
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
            >
              Confirm New Password
            </label>
            <div className="group relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary pointer-events-none" strokeWidth={1.5} />
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading || success}
                required
                className="flex h-10 w-full rounded-md border border-border/40 bg-background/40 backdrop-blur-md px-3 py-2 text-sm text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                disabled={loading || success}
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-4" strokeWidth={1.5} />
                ) : (
                  <Eye className="size-4" strokeWidth={1.5} />
                )}
              </button>
            </div>

            {/* Password Match Indicator */}
            {confirmPassword && (
              <div className="flex items-center gap-2 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                {passwordsMatch ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-500" strokeWidth={2} />
                    <span className="text-green-600 dark:text-green-500">Passwords match</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500" strokeWidth={2} />
                    <span className="text-amber-600 dark:text-amber-500">Passwords do not match</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertBanner tone="error" title="Error" description={error} />
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-3 rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 animate-in zoom-in duration-300" strokeWidth={2} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Password changed successfully!
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Redirecting to dashboard...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <PrimaryButton
            type="submit"
            disabled={loading || !allRequirementsMet || !passwordsMatch || success}
            fullWidth
          >
            {success ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle2 className="size-4 animate-pulse" strokeWidth={2} />
                Success!
              </span>
            ) : loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Changing Password...
              </span>
            ) : (
              'Change Password'
            )}
          </PrimaryButton>
        </form>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground/70 leading-relaxed">
            Your password must be unique and not used for other accounts. Never share your password with anyone.
          </p>
          <p className="text-xs text-muted-foreground/50 mt-2">
            <a href="/data-use-policy" className="hover:text-primary transition-colors">
              Data Use Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
