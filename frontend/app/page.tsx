'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Shield, Map, Activity, BellRing, ArrowRight, CheckCircle2, TrendingUp, Users, Zap, Smartphone, Download, Globe2, Mail, Phone, BarChart3, Database, Clock, AlertTriangle, Target, Globe, ChevronDown, Quote } from 'lucide-react';
import { LogoMark } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { landingTranslations, type Language } from '@/lib/translations/landing';
import { MockMap } from '@/components/landing/mock-map';
import { LogoMarquee } from '@/components/landing/logo-marquee';
import { AIPipeline } from '@/components/landing/ai-pipeline';
import { useInView } from '@/components/ui/use-in-view';

function AnimatedSection({ children, className = '', delay = '' }: { children: React.ReactNode; className?: string; delay?: string }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ${
        isInView ? `translate-y-0 opacity-100 ${delay}` : 'translate-y-12 opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const [language, setLanguage] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load saved language preference
  useEffect(() => {
    const savedLang = localStorage.getItem('malasafe-language') as Language | null;
    if (savedLang && ['en', 'am', 'om', 'ti'].includes(savedLang)) {
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

  // Save language preference
  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('malasafe-language', lang);
    setIsLangDropdownOpen(false);
  };

  const languageOptions = [
    { code: 'en' as Language, name: 'English', nativeName: 'English' },
    { code: 'am' as Language, name: 'Amharic', nativeName: 'አማርኛ' },
    { code: 'om' as Language, name: 'Oromo', nativeName: 'Afaan Oromoo' },
    { code: 'ti' as Language, name: 'Tigrinya', nativeName: 'ትግርኛ' },
  ];

  const currentLanguage = languageOptions.find(lang => lang.code === language);

  const t = landingTranslations[language];

  return (
    <div className={`flex min-h-screen flex-col bg-background transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* Navigation - Refined */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <LogoMark size={28} priority />
            <div className="flex flex-col">
              <span className="font-display text-sm font-bold leading-none tracking-tight">MalaSafe</span>
              <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">EPHI • MOH</span>
            </div>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            <a href="#features" className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              {t.nav.features}
            </a>
            <a href="#platforms" className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              {t.nav.platforms}
            </a>
            <a href="#coverage" className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              {t.nav.coverage}
            </a>
            <a href="#faq" className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              {t.nav.faq}
            </a>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="flex items-center gap-1.5 rounded-md border border-border/40 bg-muted/30 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Select language"
              >
                <Globe className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span className="hidden sm:inline">{currentLanguage?.nativeName}</span>
                <span className="sm:hidden">{currentLanguage?.code.toUpperCase()}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isLangDropdownOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
              </button>

              {isLangDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border/50 bg-card shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  <div className="p-1">
                    {languageOptions.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                          language === lang.code
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <span>{lang.nativeName}</span>
                        <span className="text-xs opacity-60">{lang.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                {t.nav.signIn}
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="h-8">
                {t.nav.dashboard}
                <ArrowRight className="ml-1.5 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section - World-Class Design */}
        <section className="relative overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0 -z-20 bg-gradient-mesh opacity-40 dark:opacity-60" />
          <div className="absolute top-1/4 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px] animate-pulse-glow" />
          <div className="absolute bottom-1/4 right-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-fuchsia-600/15 blur-[120px] animate-float" style={{ animationDelay: '2s' }} />

          <div className="container mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
              {/* Left Column - Value Proposition */}
              <div className="flex flex-col justify-center space-y-8">
                {/* Badge */}
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  <span>{t.hero.badge}</span>
                </div>

                {/* Headline */}
                <div className="space-y-4">
                  <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
                    {t.hero.headline1}
                    <br />
                    {t.hero.headline2}
                    <br />
                    <span className="text-gradient">
                      {t.hero.headline3}
                    </span>
                  </h1>
                  <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
                    {t.hero.description}
                  </p>
                </div>

                {/* CTAs */}
                <div className="flex flex-wrap gap-3">
                  <Link href="/login">
                    <Button size="lg" className="h-11 px-6 shadow-sm">
                      {t.hero.accessPlatform}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <a href="#mobile-app">
                    <Button size="lg" variant="outline" className="h-11 px-6">
                      <Smartphone className="mr-2 h-4 w-4" />
                      {t.hero.getMobileApp}
                    </Button>
                  </a>
                </div>

                {/* Trust Indicators */}
                <div className="flex flex-wrap items-center gap-4 border-t border-border/40 pt-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-green-600 dark:text-green-500" strokeWidth={2} />
                    <span className="font-medium">{t.hero.ephiAuthorized}</span>
                  </div>
                  <div className="h-3 w-px bg-border" />
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-500" strokeWidth={2} />
                    <span className="font-medium">{t.hero.mohApproved}</span>
                  </div>
                  <div className="h-3 w-px bg-border" />
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-green-600 dark:text-green-500" strokeWidth={2} />
                    <span className="font-medium">{t.hero.realTimeData}</span>
                  </div>
                </div>
              </div>

              {/* Right Column - Mock Map */}
              <div className="flex items-center justify-center lg:justify-end">
                <MockMap />
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <AnimatedSection className="container mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              {
                icon: Map,
                value: 'Live',
                label: t.hero.stats.districts,
                sublabel: t.hero.stats.districtsSub,
                color: 'text-blue-600 dark:text-blue-400',
                bgColor: 'bg-blue-500/10'
              },
              {
                icon: TrendingUp,
                value: 'Trusted',
                label: t.hero.stats.accuracy,
                sublabel: t.hero.stats.accuracySub,
                color: 'text-green-600 dark:text-green-400',
                bgColor: 'bg-green-500/10'
              },
              {
                icon: Database,
                value: 'Current',
                label: t.hero.stats.records,
                sublabel: t.hero.stats.recordsSub,
                color: 'text-purple-600 dark:text-purple-400',
                bgColor: 'bg-purple-500/10'
              },
              {
                icon: Zap,
                value: 'Ready',
                label: t.hero.stats.aiModels,
                sublabel: t.hero.stats.aiModelsSub,
                color: 'text-amber-600 dark:text-amber-400',
                bgColor: 'bg-amber-500/10'
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="glass-panel group relative overflow-hidden rounded-xl p-5"
              >
                <div className={`mb-3 inline-flex rounded-lg ${stat.bgColor} p-2`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} strokeWidth={1.5} />
                </div>
                <div className="space-y-1">
                  <div className="font-display text-2xl font-bold tracking-tight">{stat.value}</div>
                  <div className="text-sm font-medium">{stat.label}</div>
                  <div className="text-xs text-muted-foreground">{stat.sublabel}</div>
                </div>
              </div>
            ))}
          </div>
        </AnimatedSection>

        <LogoMarquee />

        <AIPipeline />

        {/* Features Section - Enhanced */}
        <section id="features" className="border-y border-border/40 bg-muted/20 py-16 sm:py-20">
          <AnimatedSection className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {t.features.title}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                {t.features.subtitle}
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Activity,
                  title: t.features.aiPredictions,
                  description: t.features.aiPredictionsDesc,
                  badge: t.features.aiPredictionsBadge,
                  color: 'text-blue-600 dark:text-blue-400',
                  bgColor: 'bg-blue-500/10'
                },
                {
                  icon: Map,
                  title: t.features.gisMapping,
                  description: t.features.gisMappingDesc,
                  badge: t.features.gisMappingBadge,
                  color: 'text-green-600 dark:text-green-400',
                  bgColor: 'bg-green-500/10'
                },
                {
                  icon: BellRing,
                  title: t.features.smartAlerts,
                  description: t.features.smartAlertsDesc,
                  badge: t.features.smartAlertsBadge,
                  color: 'text-amber-600 dark:text-amber-400',
                  bgColor: 'bg-amber-500/10'
                },
                {
                  icon: Shield,
                  title: t.features.dataSecurity,
                  description: t.features.dataSecurityDesc,
                  badge: t.features.dataSecurityBadge,
                  color: 'text-purple-600 dark:text-purple-400',
                  bgColor: 'bg-purple-500/10'
                }
              ].map((feature, i) => (
                <div
                  key={i}
                  className="glass-panel group relative overflow-hidden rounded-xl border border-border/50 p-6 transition-all hover:border-primary/30 hover:shadow-[0_8px_32px_rgba(var(--primary-rgb),0.15)] hover:-translate-y-1"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className={`inline-flex rounded-lg ${feature.bgColor} p-2.5`}>
                      <feature.icon className={`h-5 w-5 ${feature.color}`} strokeWidth={1.5} />
                    </div>
                    <span className={`rounded-full ${feature.bgColor} px-2 py-0.5 text-xs font-medium ${feature.color}`}>
                      {feature.badge}
                    </span>
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </section>

        {/* Platforms Section - Improved */}
        <section id="platforms" className="py-16 sm:py-20">
          <AnimatedSection className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {t.platforms.title}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                {t.platforms.subtitle}
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Web Platform */}
              <div className="glass-panel group relative overflow-hidden rounded-2xl border border-border/50 p-8 transition-all hover:border-primary/30 hover:shadow-[0_8px_32px_rgba(var(--primary-rgb),0.15)] hover:-translate-y-1">
                <div className="mb-6 flex items-center gap-3">
                  <div className="inline-flex rounded-xl bg-blue-500/10 p-3">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold">{t.platforms.webPlatform}</h3>
                    <p className="text-sm text-muted-foreground">{t.platforms.webPlatformFor}</p>
                  </div>
                </div>

                <p className="mb-6 leading-relaxed text-muted-foreground">
                  {t.platforms.webPlatformDesc}
                </p>

                <ul className="mb-6 space-y-3">
                  {[
                    t.platforms.webFeature1,
                    t.platforms.webFeature2,
                    t.platforms.webFeature3,
                    t.platforms.webFeature4,
                    t.platforms.webFeature5
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" strokeWidth={2} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/login" className="block">
                  <Button className="w-full">
                    {t.platforms.accessDashboard}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {/* Mobile App */}
              <div className="glass-panel group relative overflow-hidden rounded-2xl border border-border/50 p-8 transition-all hover:border-primary/30 hover:shadow-[0_8px_32px_rgba(var(--primary-rgb),0.15)] hover:-translate-y-1">
                <div className="mb-6 flex items-center gap-3">
                  <div className="inline-flex rounded-xl bg-purple-500/10 p-3">
                    <Smartphone className="h-6 w-6 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold">{t.platforms.mobileApp}</h3>
                    <p className="text-sm text-muted-foreground">{t.platforms.mobileAppFor}</p>
                  </div>
                </div>

                <p className="mb-6 leading-relaxed text-muted-foreground">
                  {t.platforms.mobileAppDesc}
                </p>

                <ul className="mb-6 space-y-3">
                  {[
                    t.platforms.mobileFeature1,
                    t.platforms.mobileFeature2,
                    t.platforms.mobileFeature3,
                    t.platforms.mobileFeature4,
                    t.platforms.mobileFeature5
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" strokeWidth={2} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <a href="#mobile-app" className="block">
                  <Button variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    {t.platforms.downloadApp}
                  </Button>
                </a>
              </div>
            </div>
          </AnimatedSection>
        </section>

        {/* Ethiopian Coverage - Refined */}
        <section id="coverage" className="border-y border-border/40 bg-muted/20 py-16 sm:py-20">
          <AnimatedSection className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {t.coverage.title}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                {t.coverage.subtitle}
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 max-w-3xl mx-auto">
              {[
                {
                  icon: Globe2,
                  value: '12',
                  label: t.coverage.regions,
                  description: t.coverage.regionsDesc,
                  color: 'text-blue-600 dark:text-blue-400',
                  bgColor: 'bg-blue-500/10'
                },
                {
                  icon: Map,
                  value: '1,082',
                  label: t.coverage.woredas,
                  description: t.coverage.woredasDesc,
                  color: 'text-green-600 dark:text-green-400',
                  bgColor: 'bg-green-500/10'
                }
              ].map((stat, i) => (
                <div
                  key={i}
                  className="glass-panel rounded-xl border border-border/50 p-6 text-center transition-all hover:border-primary/30 hover:shadow-[0_8px_32px_rgba(var(--primary-rgb),0.15)] hover:-translate-y-1"
                >
                  <div className={`mx-auto mb-4 inline-flex rounded-xl ${stat.bgColor} p-3`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} strokeWidth={1.5} />
                  </div>
                  <div className="mb-2 font-display text-3xl font-bold">{stat.value}</div>
                  <div className="mb-1 text-sm font-semibold">{stat.label}</div>
                  <div className="text-xs text-muted-foreground">{stat.description}</div>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </section>

        {/* Contact & Trust Section - Enhanced */}
        <section className="border-t border-border/40 bg-muted/20 py-16 sm:py-20">
          <AnimatedSection className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Trust & Authority */}
              <div className="glass-panel rounded-2xl border border-border/50 p-8 transition-all hover:border-primary/30 hover:shadow-[0_8px_32px_rgba(var(--primary-rgb),0.15)] hover:-translate-y-1">
                <div className="mb-6 inline-flex rounded-xl bg-green-500/10 p-3">
                  <Shield className="h-7 w-7 text-green-600 dark:text-green-400" strokeWidth={1.5} />
                </div>
                <h3 className="mb-4 font-display text-2xl font-bold">{t.contact.trustTitle}</h3>
                <p className="mb-6 leading-relaxed text-muted-foreground">
                  {t.contact.trustDesc}
                </p>
                <ul className="space-y-3">
                  {[
                    t.contact.trustFeature1,
                    t.contact.trustFeature2,
                    t.contact.trustFeature3,
                    t.contact.trustFeature4
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" strokeWidth={2} />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact & Support */}
              <div className="glass-panel rounded-2xl border border-border/50 p-8 transition-all hover:border-primary/30 hover:shadow-[0_8px_32px_rgba(var(--primary-rgb),0.15)] hover:-translate-y-1">
                <div className="mb-6 inline-flex rounded-xl bg-blue-500/10 p-3">
                  <Mail className="h-7 w-7 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                </div>
                <h3 className="mb-4 font-display text-2xl font-bold">{t.contact.supportTitle}</h3>
                <p className="mb-6 leading-relaxed text-muted-foreground">
                  {t.contact.supportDesc}
                </p>
                <div className="space-y-4">
                  <a
                    href="mailto:admin_malasafe@gmail.com"
                    className="group flex items-center gap-3 text-sm transition-colors hover:text-primary"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-transform group-hover:scale-110">
                      <Mail className="h-5 w-5 text-primary" strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="font-medium">{t.contact.emailSupport}</div>
                      <div className="text-muted-foreground">admin_malasafe@gmail.com</div>
                    </div>
                  </a>
                  <a
                    href="tel:+251703245232"
                    className="group flex items-center gap-3 text-sm transition-colors hover:text-primary"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-transform group-hover:scale-110">
                      <Phone className="h-5 w-5 text-primary" strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="font-medium">{t.contact.emergencyHotline}</div>
                      <div className="text-muted-foreground">+251 70 324 5232</div>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </section>

        {/* FAQ Section - New */}
        <section id="faq" className="py-16 sm:py-20">
          <AnimatedSection className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="mb-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {t.faq.title}
              </h2>
              <p className="text-lg text-muted-foreground">
                {t.faq.subtitle}
              </p>
            </div>

            <div className="space-y-4">
              {[
                { q: t.faq.q1, a: t.faq.a1 },
                { q: t.faq.q2, a: t.faq.a2 },
                { q: t.faq.q3, a: t.faq.a3 },
                { q: t.faq.q4, a: t.faq.a4 },
                { q: t.faq.q5, a: t.faq.a5 },
                { q: t.faq.q6, a: t.faq.a6 }
              ].map((faq, i) => (
                <details
                  key={i}
                  className="glass-panel group rounded-xl border border-border/50 p-6 transition-all hover:border-primary/30"
                >
                  <summary className="flex cursor-pointer items-center justify-between font-semibold">
                    <span>{faq.q}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                </details>
              ))}
            </div>
          </AnimatedSection>
        </section>

        {/* CTA Banner - New */}
        <section className="border-y border-border/40 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 py-16">
          <AnimatedSection className="container mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="mb-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {t.cta.title}
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              {t.cta.subtitle}
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/login">
                <Button size="lg" className="h-12 px-8">
                  {t.cta.accessPlatform}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="mailto:support@malasafe.gov.et">
                <Button size="lg" variant="outline" className="h-12 px-8">
                  {t.cta.contactSupport}
                </Button>
              </a>
            </div>
          </AnimatedSection>
        </section>
      </main>

      {/* Footer - Refined */}
      <footer className="border-t border-border/40 bg-card/50 py-12">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="sm:col-span-2">
              <div className="mb-4 flex items-center gap-2.5">
                <LogoMark size={28} />
                <div className="flex flex-col">
                  <span className="font-display text-base font-bold">MalaSafe</span>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                    EPHI • MOH Ethiopia
                  </span>
                </div>
              </div>
              <p className="mb-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {t.footer.description}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <span>{t.footer.systemStatus}</span>
              </div>
            </div>

            {/* Platform */}
            <div>
              <h4 className="mb-4 text-sm font-semibold">{t.footer.platformTitle}</h4>
              <ul className="space-y-2.5">
                {[
                  { name: t.footer.dashboard, href: '/login' },
                  { name: t.footer.analytics, href: '/login' },
                  { name: t.footer.predictions, href: '/login' },
                  { name: t.footer.mobileApp, href: '#mobile-app' }
                ].map((item) => (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="mb-4 text-sm font-semibold">{t.footer.supportTitle}</h4>
              <ul className="space-y-2.5">
                {[
                  { name: t.footer.contact, href: 'mailto:support@malasafe.gov.et' },
                  { name: t.footer.documentation, href: '#' },
                  { name: t.footer.apiReference, href: '#' },
                  { name: t.footer.systemStatusLink, href: '#' }
                ].map((item) => (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-8 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              {t.footer.copyright}
            </p>
            <div className="flex gap-6 text-xs text-muted-foreground">
              <a href="#" className="transition-colors hover:text-foreground">
                {t.footer.privacy}
              </a>
              <a href="#" className="transition-colors hover:text-foreground">
                {t.footer.terms}
              </a>
              <a href="#" className="transition-colors hover:text-foreground">
                {t.footer.accessibility}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
