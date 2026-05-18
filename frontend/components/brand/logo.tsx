import Image from 'next/image';
import { cn } from '@/lib/utils';

type LogoProps = {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
};

const sizes = {
  sm: { img: 36, text: 'text-lg' },
  md: { img: 48, text: 'text-xl' },
  lg: { img: 80, text: 'text-3xl' },
};

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const s = sizes[size];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative flex-shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-cyan/20 to-brand-deep/10 p-1.5 ring-1 ring-primary/20 shadow-sm">
        <Image
          src="/logo.png"
          alt="MalaSafe"
          width={s.img}
          height={s.img}
          className="rounded-xl object-cover"
          priority
        />
      </div>
      {showText && (
        <div className="min-w-0">
          <p className={cn('font-bold tracking-tight text-foreground', s.text)}>MalaSafe</p>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground sm:text-xs">
            Surveillance &amp; Prediction
          </p>
        </div>
      )}
    </div>
  );
}
