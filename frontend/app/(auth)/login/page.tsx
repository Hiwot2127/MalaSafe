'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Activity, LineChart, ShieldCheck, Globe, Eye, EyeOff, Loader2, ArrowLeft, ChevronDown, Mail, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { getDefaultRedirect } from '@/lib/rbac';
import {
  AlertBanner,
  EditorialCard,
  EditorialInput,
  PrimaryButton,
} from '@/components/editorial';
import { LogoMark, LogoWordmark } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/theme-toggle';

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
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState<'en' | 'am' | 'om' | 'ti'>('en');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load saved language preference
  useEffect(() => {
    const savedLang = localStorage.getItem('malasafe-language') as 'en' | 'am' | 'om' | 'ti' | null;
    if (savedLang) {
      setLanguage(savedLang);
    }
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Detect Caps Lock
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockOn(true);
    } else {
      setCapsLockOn(false);
    }
  };

  // Save language preference
  const handleLanguageChange = (lang: 'en' | 'am' | 'om' | 'ti') => {
    setLanguage(lang);
    localStorage.setItem('malasafe-language', lang);
    setIsLangDropdownOpen(false);
  };

  // Calculate password strength
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

  const passwordStrength = getPasswordStrength(password);
  const passwordStrengthPercentage = (passwordStrength / 5) * 100;
  
  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 2) return 'bg-red-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength <= 2) return language === 'en' ? 'Weak' : language === 'am' ? 'ደካማ' : language === 'om' ? 'Dadhabaa' : 'ድኹም';
    if (passwordStrength <= 3) return language === 'en' ? 'Medium' : language === 'am' ? 'መካከለኛ' : language === 'om' ? 'Giddu galeessa' : 'ማእከላይ';
    return language === 'en' ? 'Strong' : language === 'am' ? 'ጠንካራ' : language === 'om' ? 'Cimaa' : 'ድልዱል';
  };

  const languageOptions = [
    { code: 'en' as const, name: 'English', nativeName: 'English' },
    { code: 'am' as const, name: 'Amharic', nativeName: 'አማርኛ' },
    { code: 'om' as const, name: 'Oromo', nativeName: 'Afaan Oromoo' },
    { code: 'ti' as const, name: 'Tigrinya', nativeName: 'ትግርኛ' },
  ];

  const currentLanguage = languageOptions.find(lang => lang.code === language);

  // Email validation
  const validateEmail = (email: string) => {
    if (!email) {
      setEmailError('');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError(t.emailInvalid);
    } else {
      setEmailError('');
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    validateEmail(value);
  };

  const translations = {
    en: {
      signIn: 'Sign in',
      emailLabel: 'Email address',
      passwordLabel: 'Password',
      signInButton: 'Sign in',
      signingIn: 'Signing in…',
      secureAccess: 'Secure access',
      description: 'Access the MalaSafe surveillance dashboard. Authorised personnel only.',
      passwordHelp: 'Contact IT support for password assistance',
      securityNotice: 'This system is for authorized use only. All activity is monitored and logged.',
      systemStatus: 'All systems operational',
      emailInvalid: 'Please enter a valid email address',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      backToHome: 'Back to home',
      forgotPassword: 'Forgot password?',
      capsLockWarning: 'Caps Lock is on',
      passwordStrength: 'Password strength',
    },
    am: {
      signIn: 'ግባ',
      emailLabel: 'ኢሜይል አድራሻ',
      passwordLabel: 'የይለፍ ቃል',
      signInButton: 'ግባ',
      signingIn: 'በመግባት ላይ…',
      secureAccess: 'ደህንነቱ የተጠበቀ መዳረሻ',
      description: 'የማላሴፍ ክትትል ዳሽቦርድ ይድረሱ። ለተፈቀደላቸው ሰራተኞች ብቻ።',
      passwordHelp: 'ለይለፍ ቃል እገዛ የአይቲ ድጋፍን ያነጋግሩ',
      securityNotice: 'ይህ ስርዓት ለተፈቀደ አጠቃቀም ብቻ ነው። ሁሉም እንቅስቃሴዎች ይከታተላሉ።',
      systemStatus: 'ሁሉም ስርዓቶች እየሰሩ ነው',
      emailInvalid: 'እባክዎ ትክክለኛ ኢሜይል አድራሻ ያስገቡ',
      showPassword: 'የይለፍ ቃል አሳይ',
      hidePassword: 'የይለፍ ቃል ደብቅ',
      backToHome: 'ወደ መነሻ ተመለስ',
      forgotPassword: 'የይለፍ ቃል ረሱ?',
      capsLockWarning: 'Caps Lock ክፍት ነው',
      passwordStrength: 'የይለፍ ቃል ጥንካሬ',
    },
    om: {
      signIn: 'Seeni',
      emailLabel: 'Teessoo email',
      passwordLabel: 'Jecha darbii',
      signInButton: 'Seeni',
      signingIn: 'Seenaa jira…',
      secureAccess: 'Qaqqabummaa nageenya',
      description: 'Dashboard hordoffii MalaSafe seeni. Hojjettootaaf hayyamamaniif qofa.',
      passwordHelp: 'Gargaarsa jecha darbiitiif deeggarsa IT quunnamaa',
      securityNotice: 'Sirni kun itti fayyadama hayyamamaaf qofa. Sochiiwwan hundi ni hordofamu.',
      systemStatus: 'Sirnoonni hundi hojii irra jiru',
      emailInvalid: 'Maaloo teessoo email sirrii galchaa',
      showPassword: 'Jecha darbii agarsiisi',
      hidePassword: 'Jecha darbii dhoksi',
      backToHome: 'Gara manaatti deebi\'i',
      forgotPassword: 'Jecha darbii irraanfatte?',
      capsLockWarning: 'Caps Lock banaa jira',
      passwordStrength: 'Humna jecha darbii',
    },
    ti: {
      signIn: 'ኣትው',
      emailLabel: 'ኢመይል ኣድራሻ',
      passwordLabel: 'ምስጢር ቃል',
      signInButton: 'ኣትው',
      signingIn: 'ይኣትው ኣሎ…',
      secureAccess: 'ድሕነት ዘለዎ መእተዊ',
      description: 'ናይ ማላሴፍ ክትትል ዳሽቦርድ ኣትው። ንዝተፈቐደሎም ሰራሕተኛታት ጥራይ።',
      passwordHelp: 'ንምስጢር ቃል ሓገዝ ናይ አይቲ ደገፍ ተራኸቡ',
      securityNotice: 'እዚ ስርዓት ንዝተፈቐደ ኣጠቓቕማ ጥራይ እዩ። ኩሉ ንጥፈታት ይክታተል።',
      systemStatus: 'ኩሎም ስርዓታት ይሰርሑ ኣለዉ',
      emailInvalid: 'በጃኹም ቅኑዕ ኢመይል ኣድራሻ ኣእትዉ',
      showPassword: 'ምስጢር ቃል ኣርኢ',
      hidePassword: 'ምስጢር ቃል ሕብእ',
      backToHome: 'ናብ መበገሲ ተመለስ',
      forgotPassword: 'ምስጢር ቃል ረሲዕካዮ?',
      capsLockWarning: 'Caps Lock ክፉት እዩ',
      passwordStrength: 'ሓይሊ ምስጢር ቃል',
    },
  };

  const t = translations[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await login(email, password);
      setLoginSuccess(true);
      
      // Check if password change is required
      if (response.force_password_change) {
        // Redirect to change password page
        setTimeout(() => {
          router.push('/change-password');
          router.refresh();
        }, 800);
        return;
      }
      
      // Get redirect path based on role
      const nextParam = searchParams.get('next');
      const defaultRedirect = getDefaultRedirect(response.user.role);
      const redirectTo = nextParam || defaultRedirect;
      
      // Brief success state before redirect
      setTimeout(() => {
        router.push(redirectTo);
        router.refresh();
      }, 800);
    } catch (err: unknown) {
      const maybe = err as { response?: { data?: { detail?: string } } };
      const errorDetail = maybe?.response?.data?.detail || 'Login failed. Please check your credentials.';
      
      setError(errorDetail);
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background text-foreground lg:grid-cols-[1.05fr_1fr] relative overflow-hidden">
      {/* Background Mesh */}
      <div className="absolute inset-0 -z-20 bg-gradient-mesh opacity-40 dark:opacity-60" />
      {/* Brand column - hidden on mobile, full mockup expression on lg+ */}
      <aside className={`relative hidden flex-col justify-between px-12 py-14 text-foreground lg:flex backdrop-blur-sm border-r border-border/40 transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        {/* Subtle radial wash to soften the flat brand panel */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(var(--primary-rgb),0.15),transparent_55%)]"
        />

        <div className="relative flex flex-col gap-5">
          <LogoMark size={64} variant="outline" priority />
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] opacity-70">
            MalaSafe · Surveillance
          </p>
        </div>

        <div className="relative flex max-w-md flex-col gap-6">
          <h2 className="font-display text-5xl font-semibold leading-[1.04] tracking-tight text-gradient">
            MalaSafe
          </h2>
          <p className="font-sans text-lg leading-relaxed text-muted-foreground">
            Empowering national malaria surveillance through data-driven decision
            support and real-time analytics.
          </p>

          <div className="mt-8 flex items-center justify-center animate-in fade-in zoom-in duration-1000 delay-300 fill-mode-both">
            {/* Glowing Secure Authentication Visualization */}
            <div className="relative flex h-48 w-48 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" style={{ animationDuration: '3s' }} />
              <div className="absolute inset-4 animate-pulse rounded-full border border-primary/40 bg-primary/10" />
              <div className="absolute inset-8 animate-[spin_8s_linear_infinite] rounded-full border border-dashed border-primary/50" />
              <ShieldCheck className="relative z-10 h-16 w-16 text-primary drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.8)]" />
            </div>
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
      <section className={`relative z-10 flex items-center justify-center px-6 py-12 sm:px-10 transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="glass-panel p-10 flex w-full max-w-[420px] flex-col gap-8 rounded-2xl">
          {/* Back Button, Theme Toggle & Language Dropdown */}
          <div className="flex items-center justify-between gap-2">
            <Link 
              href="/"
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" strokeWidth={1.5} />
              <span className="font-mono uppercase tracking-wider">{t.backToHome}</span>
            </Link>
            
            <div className="flex items-center gap-2">
              <ThemeToggle />
              
              {/* Language Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                  className="flex items-center gap-1.5 rounded-md border border-border/40 bg-muted/30 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Select language"
                >
                  <Globe className="h-3 w-3" strokeWidth={1.5} />
                  <span className="hidden sm:inline">{currentLanguage?.nativeName}</span>
                  <span className="sm:hidden">{currentLanguage?.code.toUpperCase()}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${isLangDropdownOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                </button>

                {isLangDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-40 rounded-lg border border-border/50 bg-card shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                    <div className="p-1">
                      {languageOptions.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => handleLanguageChange(lang.code)}
                          className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-xs transition-colors ${
                            language === lang.code
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          <span>{lang.nativeName}</span>
                          {language === lang.code && (
                            <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <header className="flex flex-col gap-3">
            <LogoWordmark caption="Console · Sign in" size={32} className="lg:hidden" />
            <p className="hidden font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground lg:block">
              {t.secureAccess}
            </p>
            <h1 className="font-display text-3xl font-semibold leading-[1.05] tracking-tight">
              {t.signIn}
            </h1>
            <p className="font-sans text-sm leading-relaxed text-muted-foreground">
              {t.description}
            </p>
          </header>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
              <label
                htmlFor="email"
                className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
              >
                {t.emailLabel}
              </label>
              <div className="group relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary pointer-events-none" strokeWidth={1.5} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@malasafe.gov.et"
                  value={email}
                  onChange={handleEmailChange}
                  disabled={loading || loginSuccess}
                  autoFocus
                  required
                  className={`flex h-10 w-full rounded-md border border-border/40 bg-background/40 backdrop-blur-md px-3 py-2 text-sm text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 pl-10 ${emailError ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50' : ''}`}
                />
              </div>
              {emailError && (
                <p className="text-xs text-red-500 animate-in fade-in slide-in-from-top-1 duration-200">
                  {emailError}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
                >
                  {t.passwordLabel}
                </label>
                <a
                  href="mailto:support@malasafe.gov.et?subject=Password Reset Request"
                  className="text-[10px] text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  {t.forgotPassword}
                </a>
              </div>
              <div className="group relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary pointer-events-none" strokeWidth={1.5} />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyDown}
                  disabled={loading || loginSuccess}
                  required
                  className="flex h-10 w-full rounded-md border border-border/40 bg-background/40 backdrop-blur-md px-3 py-2 text-sm text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:text-primary"
                  aria-label={showPassword ? t.hidePassword : t.showPassword}
                  disabled={loading || loginSuccess}
                >
                  {showPassword ? (
                     <EyeOff className="size-4" strokeWidth={1.5} />
                  ) : (
                    <Eye className="size-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>
              
              {/* Caps Lock Warning */}
              {capsLockOn && password && (
                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-500 animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertTriangle className="h-3 w-3" strokeWidth={2} />
                  <span>{t.capsLockWarning}</span>
                </div>
              )}

              {/* Password Strength Indicator */}
              {password && passwordStrength > 0 && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                      style={{ width: `${passwordStrengthPercentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {t.passwordStrength}: <span className="font-medium">{getPasswordStrengthLabel()}</span>
                  </p>
                </div>
              )}
            </div>

            {error ? (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertBanner tone="error" title="Sign in failed" description={error} />
              </div>
            ) : null}

            {loginSuccess && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-3 rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 animate-in zoom-in duration-300" strokeWidth={2} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      {language === 'en' ? 'Login successful!' : language === 'am' ? 'መግባት ተሳክቷል!' : language === 'om' ? 'Seenuun milkaa\'e!' : 'ምእታው ዓወተ!'}
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      {language === 'en' ? 'Redirecting to dashboard...' : language === 'am' ? 'ወደ ዳሽቦርድ በማዞር ላይ...' : language === 'om' ? 'Gara dashboard geessaa jira...' : 'ናብ ዳሽቦርድ የሰጋግር ኣሎ...'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
              <PrimaryButton type="submit" disabled={loading || !!emailError || loginSuccess} fullWidth>
                {loginSuccess ? (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="size-4 animate-pulse" strokeWidth={2} />
                    {language === 'en' ? 'Success!' : language === 'am' ? 'ተሳክቷል!' : language === 'om' ? 'Milkaa\'e!' : 'ዓወተ!'}
                  </span>
                ) : loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    {t.signingIn}
                  </span>
                ) : (
                  t.signInButton
                )}
              </PrimaryButton>
            </div>
          </form>

          {/* System Status */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span>{t.systemStatus}</span>
          </div>

          {/* Security Notice */}
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
              {t.securityNotice}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
