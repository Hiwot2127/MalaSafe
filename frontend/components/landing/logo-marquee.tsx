'use client';

import Image from 'next/image';
import { HeartPulse } from 'lucide-react';

const partners = [
  { name: 'MOH - Ministry of Health - Ethiopia', image: '/logo.png' },
  { name: 'EPHI - Ethiopian Public Health Institute', image: '/logo.png' },
  { name: 'Regional Health Bureaus', icon: HeartPulse },
];

// Duplicate for infinite scroll effect (4x to fill screen width)
const duplicatedPartners = [...partners, ...partners, ...partners, ...partners];

export function LogoMarquee() {
  return (
    <div className="relative flex w-full overflow-hidden border-y border-border/40 bg-muted/10 py-6 sm:py-8">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee-custom {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-custom {
          animation: marquee-custom 20s linear infinite;
        }
      `}} />
      {/* Fade masks */}
      <div className="absolute left-0 top-0 z-10 h-full w-20 bg-gradient-to-r from-background to-transparent" />
      <div className="absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-background to-transparent" />

      {/* Marquee Track */}
      <div className="flex w-max animate-marquee-custom gap-8 sm:gap-16 items-center">
        {duplicatedPartners.map((partner, i) => (
          <div
            key={i}
            className="flex w-max shrink-0 items-center justify-center gap-3 opacity-60 grayscale transition-all hover:opacity-100 hover:grayscale-0"
          >
            {partner.image ? (
              <Image src={partner.image} alt={partner.name} width={40} height={40} className="object-contain w-10 h-10" />
            ) : partner.icon ? (
              <partner.icon className="size-8 text-foreground" strokeWidth={1.5} />
            ) : null}
            <span className="font-display text-sm font-semibold tracking-tight text-foreground sm:text-base">
              {partner.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
