'use client';

import { Database, Cpu, BellRing, ArrowRight } from 'lucide-react';
import { useInView } from '@/components/ui/use-in-view';

export function AIPipeline() {
  const { ref, isInView } = useInView({ threshold: 0.2 });

  const steps = [
    {
      icon: Database,
      title: 'Data Ingestion',
      desc: 'Woreda case reports & real-time climate telemetry',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      delay: 'delay-100',
    },
    {
      icon: Cpu,
      title: 'LightGBM Model',
      desc: 'Decades of historical data driving 30-day forecasts',
      color: 'text-primary',
      bg: 'bg-primary/10',
      delay: 'delay-300',
    },
    {
      icon: BellRing,
      title: 'Automated Alerts',
      desc: 'Early warning triage for District Health Officers',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      delay: 'delay-500',
    },
  ];

  return (
    <div ref={ref} className="relative mx-auto mt-12 w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(var(--primary-rgb),0.05),transparent_70%)]" />
      
      <div className="flex flex-col items-center justify-center gap-6 md:flex-row md:gap-4 lg:gap-8">
        {steps.map((step, i) => (
          <div key={i} className="flex flex-col md:flex-row items-center gap-4 lg:gap-8">
            {/* Card */}
            <div
              className={`glass-panel group relative flex w-full max-w-xs flex-col items-center p-8 text-center transition-all duration-700 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(var(--primary-rgb),0.15)] ${
                isInView ? `translate-y-0 opacity-100 ${step.delay}` : 'translate-y-8 opacity-0'
              }`}
            >
              <div className={`mb-5 inline-flex rounded-2xl ${step.bg} p-4 transition-transform group-hover:scale-110`}>
                <step.icon className={`size-8 ${step.color}`} strokeWidth={1.5} />
              </div>
              <h3 className="mb-2 font-display text-lg font-bold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
            </div>

            {/* Connector Arrow (hidden on last item) */}
            {i < steps.length - 1 && (
              <div
                className={`hidden md:block transition-all duration-700 ${
                  isInView ? 'translate-x-0 opacity-100 delay-[400ms]' : '-translate-x-4 opacity-0'
                }`}
              >
                <ArrowRight className="size-6 text-muted-foreground/50" />
              </div>
            )}
            {/* Connector Arrow (Mobile vertical) */}
            {i < steps.length - 1 && (
              <div
                className={`block md:hidden transition-all duration-700 ${
                  isInView ? 'translate-y-0 opacity-100 delay-[400ms]' : '-translate-y-4 opacity-0'
                }`}
              >
                <ArrowRight className="size-6 rotate-90 text-muted-foreground/50" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
