'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  FileText,
  Map,
  TrendingUp,
  Upload,
  Users,
} from 'lucide-react';
import { analyticsApi } from '@/lib/api/analytics';
import { DashboardSummary } from '@/types/analytics';
import { formatApiError } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { AlertBanner } from '@/components/ui/alert-banner';
import { LoadingScreen } from '@/components/ui/loading-screen';

const quickActions = [
  { href: '/upload', label: 'Upload Data', desc: 'Import CSV files', icon: Upload, color: 'from-blue-500/20 to-blue-600/5 ring-blue-500/20' },
  { href: '/maps', label: 'Risk Maps', desc: 'District risk levels', icon: Map, color: 'from-emerald-500/20 to-emerald-600/5 ring-emerald-500/20' },
  { href: '/analytics', label: 'Analytics', desc: 'Trends & insights', icon: BarChart3, color: 'from-violet-500/20 to-violet-600/5 ring-violet-500/20' },
  { href: '/predictions', label: 'Predictions', desc: 'AI risk scores', icon: BrainCircuit, color: 'from-cyan-500/20 to-cyan-600/5 ring-cyan-500/20' },
  { href: '/reports', label: 'Reports', desc: 'Overview & print', icon: FileText, color: 'from-amber-500/20 to-amber-600/5 ring-amber-500/20' },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await analyticsApi.getDashboard();
        setStats(response.summary);
      } catch (err: any) {
        setError(formatApiError(err.response?.data?.detail, 'Failed to fetch dashboard data'));
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return <LoadingScreen message="Loading dashboard…" />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="National overview of malaria surveillance indicators"
        icon={Activity}
      />

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total cases"
          value={stats?.total_cases ?? 0}
          hint={stats?.period || 'Current period'}
          icon={Activity}
          variant="blue"
        />
        <StatCard
          label="Total deaths"
          value={stats?.total_deaths ?? 0}
          hint={`CFR: ${stats?.case_fatality_rate?.toFixed(2) ?? '0.00'}%`}
          icon={TrendingUp}
          variant="red"
        />
        <StatCard
          label="Active alerts"
          value={stats?.active_alerts ?? 0}
          hint="Requiring attention"
          icon={AlertTriangle}
          variant="amber"
        />
        <StatCard
          label="High-risk districts"
          value={stats?.high_risk_districts ?? 0}
          hint="Elevated risk level"
          icon={Users}
          variant="violet"
        />
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Quick actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`group ms-card-elevated flex flex-col items-center p-5 text-center ring-1 bg-gradient-to-b ${action.color}`}
              >
                <Icon className="mb-3 h-8 w-8 text-primary transition-transform group-hover:scale-110" />
                <p className="font-semibold text-foreground">{action.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{action.desc}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
