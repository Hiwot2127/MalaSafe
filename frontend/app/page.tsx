import Link from 'next/link';
import { Shield, Map, Activity, BellRing, ArrowRight } from 'lucide-react';
import { LogoMark } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/20">
      {/* Public Header */}
      <header className="flex h-20 items-center justify-between px-8 border-b border-border/50 bg-background/60 backdrop-blur-xl z-50 sticky top-0 transition-all duration-300">
        <div className="flex items-center gap-3">
          <LogoMark size={32} priority />
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            MalaSafe
          </span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="font-medium">
              Sign in
            </Button>
          </Link>
          <Link href="/login">
            <Button className="group font-medium shadow-md shadow-primary/20">
              Get Started
              <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center">
        {/* Hero Section */}
        <section className="relative flex w-full flex-col items-center justify-center px-6 py-32 text-center overflow-hidden">
          {/* Decorative background blurs - professional colors */}
          <div className="absolute top-1/4 left-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-primary/20 blur-[120px] animate-float" />
          <div className="absolute bottom-1/4 right-1/4 -z-10 h-[300px] w-[300px] rounded-full bg-violet-600/10 blur-[100px] animate-float" style={{ animationDelay: '2s' }} />

          <div className="animate-fade-in-up flex flex-col items-center max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-8 shadow-sm backdrop-blur-sm">
              <span className="flex size-2 rounded-full bg-primary animate-pulse" />
              MalaSafe v1.0 is Live
            </div>
            
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
              Predicting Outbreaks.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-600">Protecting Communities.</span>
            </h1>
            
            <p className="max-w-2xl text-lg sm:text-xl text-muted-foreground mb-10 leading-relaxed font-sans">
              An advanced AI-powered malaria surveillance platform. We transform climate, epidemiological, and health data into actionable insights for proactive interventions.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link href="/login">
                <Button size="lg" className="h-14 px-8 text-base shadow-xl shadow-primary/25 hover:shadow-2xl hover:-translate-y-1 transition-all">
                  Access Dashboard
                  <ArrowRight className="ml-2 size-5" />
                </Button>
              </Link>
              <Link href="/mobile">
                <Button size="lg" variant="outline" className="h-14 px-8 text-base bg-background/50 backdrop-blur hover:bg-muted transition-all">
                  Download Mobile App
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="w-full max-w-7xl px-6 py-24">
          <div className="text-center mb-16 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Surveillance built for scale
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Combining historical epidemiology with real-time climate telemetry to generate high-confidence risk forecasts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "AI Predictions",
                description: "LightGBM models trained on decades of data to forecast district-level risk up to 30 days out.",
                icon: Activity,
                delay: "200ms"
              },
              {
                title: "Risk Surfaces",
                description: "Interactive heatmaps overlaying case counts and climate anomalies across Ethiopia.",
                icon: Map,
                delay: "300ms"
              },
              {
                title: "Early Alerts",
                description: "Automated triage alerting officials when a district breaks historical confidence intervals.",
                icon: BellRing,
                delay: "400ms"
              },
              {
                title: "Data Integrity",
                description: "Built-in validation pipelines to ensure high fidelity for all ingested surveillance data.",
                icon: Shield,
                delay: "500ms"
              }
            ].map((feature, i) => (
              <div 
                key={i} 
                className="glass-panel p-8 rounded-2xl flex flex-col gap-4 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-primary/20 animate-fade-in-up group bg-background/50"
                style={{ animationDelay: feature.delay }}
              >
                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="size-6" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-xl font-semibold tracking-tight">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card py-12 px-8 mt-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 opacity-80">
            <LogoMark size={24} />
            <span className="font-display font-semibold tracking-tight">MalaSafe</span>
          </div>
          <p className="text-sm text-muted-foreground font-mono uppercase tracking-widest">
            © 2026 EPHI & MOH Ethiopia
          </p>
        </div>
      </footer>
    </div>
  );
}
