'use client';

import { useEffect, useState } from 'react';
import { Loader2, Map as MapIcon } from 'lucide-react';
import { mapsApi } from '@/lib/api/maps';
import { RiskMapResponse } from '@/types/map';
import { ETHIOPIAN_REGIONS } from '@/lib/constants';
import { getApiErrorMessage, getRiskBadgeColor } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { AlertBanner } from '@/components/ui/alert-banner';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';

const LEGEND = [
  { label: 'Low risk', className: 'bg-emerald-500' },
  { label: 'Medium risk', className: 'bg-amber-400' },
  { label: 'High risk', className: 'bg-orange-500' },
  { label: 'Very high risk', className: 'bg-red-500' },
];

export default function MapsPage() {
  const [mapData, setMapData] = useState<RiskMapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('');

  useEffect(() => {
    const fetchMapData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = selectedRegion ? { region: selectedRegion } : undefined;
        const response = await mapsApi.getRiskMap(params);
        setMapData(response);
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, 'Failed to fetch map data'));
        setMapData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchMapData();
  }, [selectedRegion]);

  const features = mapData?.features ?? [];
  const highRisk = features.filter(
    (f) => f.properties.risk_level === 'high' || f.properties.risk_level === 'very_high'
  ).length;
  const totalCases = features.reduce((s, f) => s + (f.properties.cases ?? 0), 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Risk maps"
        description="District-level malaria risk heatmap and surveillance overlay"
        icon={MapIcon}
        actions={
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="ms-select min-w-[180px]"
          >
            <option value="">All regions</option>
            {ETHIOPIAN_REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        }
      />

      {loading && (
        <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Loading map data…
        </div>
      )}

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      {!loading && !error && features.length === 0 && (
        <EmptyState
          icon={MapIcon}
          title="No map data available"
          description="Upload malaria data or select another region to populate the risk map."
        />
      )}

      {!loading && !error && features.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Districts" value={features.length} icon={MapIcon} variant="blue" />
            <StatCard label="High / very high risk" value={highRisk} icon={MapIcon} variant="red" />
            <StatCard label="Total cases (shown)" value={totalCases} icon={MapIcon} variant="amber" />
          </div>

          <div className="ms-card overflow-hidden p-0">
            <div className="flex h-72 flex-col items-center justify-center bg-gradient-to-br from-brand-navy/5 via-primary/5 to-brand-cyan/10 sm:h-96">
              <MapIcon className="mb-4 h-14 w-14 text-primary/70" />
              <p className="text-lg font-semibold text-foreground">Interactive map</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Leaflet integration — {features.length} districts loaded
              </p>
            </div>
          </div>

          <div className="ms-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Risk level legend</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {LEGEND.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className={`h-3 w-3 shrink-0 rounded-full ${item.className}`} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <div className="ms-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Districts ({features.length})
            </h2>
            <div className="ms-table-wrap">
              <table className="ms-table">
                <thead>
                  <tr>
                    <th>District</th>
                    <th>Region</th>
                    <th>Risk level</th>
                    <th className="text-right">Cases</th>
                    <th className="text-right">Deaths</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((feature, index) => (
                    <tr key={`${feature.properties.district_name}-${index}`}>
                      <td className="font-medium">{feature.properties.district_name}</td>
                      <td>{feature.properties.region}</td>
                      <td>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getRiskBadgeColor(feature.properties.risk_level)}`}
                        >
                          {feature.properties.risk_level.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="text-right tabular-nums">
                        {feature.properties.cases.toLocaleString()}
                      </td>
                      <td className="text-right tabular-nums">
                        {feature.properties.deaths.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
