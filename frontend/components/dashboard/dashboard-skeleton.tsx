/**
 * Dashboard Skeleton Loader
 * 
 * Realistic skeleton that matches the actual dashboard layout.
 * Prevents layout shift and provides visual feedback during loading.
 */

export function DashboardSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-14 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col gap-3">
        <div className="h-3 w-48 bg-muted rounded" />
        <div className="h-10 w-96 bg-muted rounded" />
        <div className="h-5 w-full max-w-2xl bg-muted rounded" />
      </div>

      {/* Alert card skeleton */}
      <div className="rounded-2xl border border-border/40 bg-card p-6">
        <div className="flex flex-col gap-4">
          <div className="h-3 w-24 bg-muted rounded" />
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-4 w-full max-w-xl bg-muted rounded" />
        </div>
      </div>

      {/* Indicators section skeleton */}
      <section className="flex flex-col gap-5">
        <div className="flex items-baseline justify-between border-b border-border pb-3">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-6 w-24 bg-muted rounded-full" />
        </div>
        
        {/* KPI cards skeleton */}
        <div className="glass-panel overflow-hidden rounded-2xl shadow-lg border border-border/40">
          <div className="grid grid-cols-1 divide-y divide-border/40 sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-3 w-24 bg-muted rounded" />
                  <div className="h-5 w-16 bg-muted rounded-full" />
                </div>
                <div className="h-10 w-32 bg-muted rounded mb-4" />
                <div className="h-12 w-full bg-muted rounded mb-4" />
                <div className="h-3 w-40 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Summary cards skeleton */}
        <div className="grid grid-cols-1 gap-px bg-border/40 md:grid-cols-2 rounded-2xl overflow-hidden">
          {[1, 2].map((i) => (
            <div key={i} className="bg-background/40 backdrop-blur-md p-6">
              <div className="h-3 w-32 bg-muted rounded mb-3" />
              <div className="h-4 w-full bg-muted rounded mb-2" />
              <div className="h-4 w-3/4 bg-muted rounded" />
            </div>
          ))}
        </div>
      </section>

      {/* Quick links skeleton */}
      <section className="flex flex-col gap-5">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border/40 bg-background/60 p-6">
              <div className="h-3 w-20 bg-muted rounded mb-2" />
              <div className="h-6 w-32 bg-muted rounded mb-2" />
              <div className="h-4 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
