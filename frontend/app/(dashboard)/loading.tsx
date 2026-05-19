export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-64 animate-pulse rounded-sm bg-muted" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="h-32 animate-pulse rounded-sm bg-muted" />
        <div className="h-32 animate-pulse rounded-sm bg-muted" />
        <div className="h-32 animate-pulse rounded-sm bg-muted" />
      </div>
      <div className="h-64 animate-pulse rounded-sm bg-muted" />
    </div>
  );
}
