'use client';

export function MockMap() {
  return (
    <div className="relative flex aspect-[4/3] w-full max-w-lg items-center justify-center rounded-2xl border border-border/50 bg-background/50 p-6 shadow-xl backdrop-blur-sm lg:aspect-square">
      {/* Background Glow */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,rgba(var(--primary-rgb),0.15),transparent_70%)]" />
      
      {/* Stylized SVG representation of Ethiopia's shape */}
      <div className="relative z-10 w-full h-full opacity-80 dark:opacity-60 text-primary">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)]">
          {/* Base Map Shape (accurate geographical outline of Ethiopia) */}
          <path
            d="M 33.4,11.1 L 37.5,14.2 L 41.4,12.6 L 43.0,14.0 L 47.7,14.1 L 53.5,16.8 L 55.3,19.1 L 58.3,21.3 L 61.0,25.2 L 63.3,27.4 L 61.0,30.4 L 58.7,33.5 L 59.2,35.4 L 59.3,37.5 L 63.1,37.6 L 64.7,37.1 L 66.2,38.3 L 64.7,40.7 L 67.2,44.4 L 69.7,47.6 L 72.3,50.0 L 94.3,58.0 L 100.0,58.0 L 81.0,78.2 L 72.2,78.5 L 66.2,83.3 L 61.8,83.4 L 60.0,85.5 L 55.4,85.5 L 52.7,83.3 L 46.5,86.1 L 44.5,88.9 L 40.0,88.4 L 38.5,87.6 L 37.0,87.8 L 34.8,87.7 L 26.3,82.0 L 21.6,82.0 L 19.3,79.8 L 19.3,76.0 L 15.8,74.8 L 11.8,67.5 L 8.7,65.9 L 7.6,63.2 L 4.1,60.0 L 0.0,59.5 L 2.3,55.6 L 5.9,55.5 L 6.9,53.4 L 6.8,47.4 L 8.8,40.3 L 12.0,38.4 L 12.7,35.7 L 15.5,30.5 L 19.6,27.2 L 22.4,20.5 L 23.4,14.7 L 31.3,16.1 L 33.4,11.1 Z"
            fill="currentColor"
            fillOpacity="0.15"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeDasharray="1 2"
          />

          {/* AI Alert Hotspots (Pulsing) */}
          <circle cx="45" cy="45" r="2" className="animate-pulse fill-rose-500" />
          <circle cx="45" cy="45" r="4" className="animate-ping fill-rose-500 opacity-20" />
          
          <circle cx="65" cy="55" r="1.5" className="animate-pulse fill-amber-500 delay-100" />
          <circle cx="65" cy="55" r="3" className="animate-ping fill-amber-500 opacity-20 delay-100" />
          
          <circle cx="50" cy="65" r="2.5" className="animate-pulse fill-indigo-500 delay-300" />
          <circle cx="50" cy="65" r="5" className="animate-ping fill-indigo-500 opacity-20 delay-300" />

          {/* Data connection lines */}
          <path d="M 45 45 L 65 55 L 50 65 Z" stroke="currentColor" strokeWidth="0.2" fill="none" className="opacity-30" />
        </svg>

        {/* Floating Data Card */}
        <div className="absolute -right-4 top-1/4 animate-float rounded-lg border border-border/50 bg-card p-3 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500"></span>
            </span>
            <span className="font-mono text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              High Risk Alert
            </span>
          </div>
          <div className="mt-1 font-display text-sm font-bold text-foreground">+42% Anomaly</div>
        </div>
        
        {/* Floating Data Card 2 */}
        <div className="absolute -left-4 bottom-1/4 animate-float rounded-lg border border-border/50 bg-card p-3 shadow-lg backdrop-blur-md" style={{ animationDelay: '1.5s' }}>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
            </span>
            <span className="font-mono text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              LightGBM Forecast
            </span>
          </div>
          <div className="mt-1 font-display text-sm font-bold text-foreground">Next 30 Days</div>
        </div>
      </div>
    </div>
  );
}
