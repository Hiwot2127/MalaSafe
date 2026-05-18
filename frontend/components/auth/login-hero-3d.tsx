'use client';

import Image from 'next/image';
import { useCallback, useRef, useState } from 'react';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

type LoginHero3DProps = {
  className?: string;
  compact?: boolean;
};

export function LoginHero3D({ className, compact = false }: LoginHero3DProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50 });

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = sceneRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const max = compact ? 10 : 16;
      setTilt({
        rotateX: (0.5 - y) * max,
        rotateY: (x - 0.5) * max,
      });
      setGlare({ x: x * 100, y: y * 100 });
    },
    [compact]
  );

  const handleLeave = useCallback(() => {
    setTilt({ rotateX: 0, rotateY: 0 });
    setGlare({ x: 50, y: 50 });
  }, []);

  const logoSize = compact ? 140 : 240;

  return (
    <div className={cn('relative flex flex-col', compact ? 'items-center' : 'h-full justify-between', className)}>
      {!compact && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="login-orb login-orb-1" />
          <div className="login-orb login-orb-2" />
          <div className="login-orb login-orb-3" />
          <div className="login-grid" />
        </div>
      )}

      <div
        ref={sceneRef}
        className={cn('relative z-10', compact ? 'py-4' : 'flex flex-1 flex-col items-center justify-center')}
        style={{ perspective: '1200px' }}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
        <div
          className="relative"
          style={{
            transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
            transformStyle: 'preserve-3d',
            transition: 'transform 0.15s ease-out',
          }}
        >
          <div className="login-logo-3d relative">
            <div className="login-logo-shadow" aria-hidden />
          <div
            className="login-logo-frame"
            style={{
              background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.35) 0%, transparent 55%)`,
            }}
          >
            <Image
              src="/logo.png"
              alt="MalaSafe"
              width={logoSize}
              height={logoSize}
              className="login-logo-img"
              priority
            />
          </div>
            <div className="login-logo-ring" aria-hidden />
          </div>
        </div>

        {!compact && (
          <div className="mt-10 max-w-md text-center animate-fade-in">
            <h2 className="text-3xl font-bold leading-tight text-white drop-shadow-sm">
              Protecting Ethiopia from malaria
            </h2>
            <p className="mt-4 text-brand-sky/90">
              Real-time surveillance, risk mapping, and outbreak intelligence for health authorities
              nationwide.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur-sm">
              <Shield className="h-4 w-4" />
              Secure · Role-based access · Ministry-grade reporting
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
