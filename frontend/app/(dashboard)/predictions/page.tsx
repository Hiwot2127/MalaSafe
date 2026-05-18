'use client';

import { useEffect, useState } from 'react';
import { BrainCircuit, Loader2 } from 'lucide-react';
import { predictionsApi } from '@/lib/api/predictions';
import type { DistrictOption, PredictionHistoryItem, PredictionListItem } from '@/types/predictions';
import { formatDate, getApiErrorMessage, getRiskBadgeColor } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { AlertBanner } from '@/components/ui/alert-banner';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingScreen } from '@/components/ui/loading-screen';

export default function PredictionsPage() {
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [latest, setLatest] = useState<PredictionListItem[]>([]);
  const [history, setHistory] = useState<PredictionHistoryItem[]>([]);
  const [historyMeta, setHistoryMeta] = useState<{ code: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [dRes, lRes] = await Promise.all([
          predictionsApi.getDistricts(),
          predictionsApi.getLatest(50),
        ]);
        setDistricts(dRes.districts ?? []);
        setLatest(lRes.predictions ?? []);
        if (dRes.districts?.length) {
          setSelectedId((prev) => prev || dRes.districts[0].id);
        }
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, 'Failed to load predictions'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const res = await predictionsApi.getHistory(selectedId, { limit: 30 });
        setHistory(res.predictions ?? []);
        setHistoryMeta({ code: res.district_code, name: res.district_name });
      } catch (err: unknown) {
        setHistory([]);
        setHistoryMeta(null);
        setError(getApiErrorMessage(err, 'Failed to load district history'));
      } finally {
        setHistoryLoading(false);
      }
    };
    loadHistory();
  }, [selectedId]);

  if (loading) {
    return <LoadingScreen message="Loading predictions…" />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Predictions"
        description="AI risk scores and per-district prediction history"
        icon={BrainCircuit}
      />

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      <section className="ms-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Recent predictions</h2>
        {(latest?.length ?? 0) === 0 ? (
          <EmptyState
            icon={BrainCircuit}
            title="No prediction records yet"
            description="When the ML pipeline writes prediction rows to the database, they will appear here."
          />
        ) : (
          <div className="ms-table-wrap">
            <table className="ms-table">
              <thead>
                <tr>
                  <th>District</th>
                  <th>Region</th>
                  <th>Date</th>
                  <th>Risk</th>
                  <th className="text-right">Score</th>
                  <th className="text-right">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {latest.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="font-medium">{row.district_name}</span>
                      <span className="ml-1 text-muted-foreground">({row.district_code})</span>
                    </td>
                    <td>{row.region}</td>
                    <td>{formatDate(row.prediction_date)}</td>
                    <td>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getRiskBadgeColor(row.risk_level)}`}
                      >
                        {row.risk_level.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-right tabular-nums">{row.prediction_score.toFixed(2)}</td>
                    <td className="text-right tabular-nums">
                      {(row.confidence_score * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="ms-card p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-foreground">District history</h2>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            District
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="ms-select min-w-[220px]"
              disabled={districts.length === 0}
            >
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.region} — {d.district_name} ({d.district_code})
                </option>
              ))}
            </select>
          </label>
        </div>

        {historyLoading ? (
          <div className="flex items-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Loading history…
          </div>
        ) : (history?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">
            {historyMeta
              ? `No stored predictions for ${historyMeta.name} yet.`
              : 'Select a district to view history.'}
          </p>
        ) : (
          <div className="ms-table-wrap">
            <table className="ms-table">
              <thead>
                <tr>
                  <th>Prediction date</th>
                  <th>Risk</th>
                  <th className="text-right">Score</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>{formatDate(h.prediction_date)}</td>
                    <td>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getRiskBadgeColor(h.risk_level)}`}
                      >
                        {h.risk_level.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-right tabular-nums">{h.prediction_score.toFixed(2)}</td>
                    <td className="max-w-md text-muted-foreground">{h.prediction_reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
