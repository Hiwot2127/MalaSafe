'use client';

import { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { RiskMapResponse, RiskLevel } from '@/types/map';

// 5-stop sequential ramp from low to very high. Pulled from the design tokens
// in app/globals.css (--risk-1 … --risk-5) so the map circles, legend, and
// table pills all share one palette.
const RISK_COLORS: Record<RiskLevel, string> = {
  low: 'hsl(145 22% 52%)',        // --risk-1 sage
  moderate: 'hsl(75 30% 50%)',    // --risk-2 olive
  medium: 'hsl(38 56% 50%)',      // --risk-3 saffron
  high: 'hsl(20 56% 50%)',        // --risk-4 orange-clay
  very_high: 'hsl(12 50% 46%)',   // --risk-5 terracotta
};

const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'Low',
  moderate: 'Moderate',
  medium: 'Moderate',
  high: 'High',
  very_high: 'Very High',
};

const ETHIOPIA_CENTER: [number, number] = [9.145, 40.4897];
const ETHIOPIA_ZOOM = 6;

function radiusFor(cases: number, maxCases: number): number {
  if (maxCases <= 0) return 6;
  const scaled = Math.sqrt(cases / maxCases) * 22;
  return Math.max(5, Math.min(28, scaled));
}

type Point = {
  key: string;
  lat: number;
  lng: number;
  name: string;
  region: string;
  risk: RiskLevel;
  cases: number;
  deaths: number;
  confidence?: number;
};

function HoverCard({ p, color }: { p: Point; color: string }) {
  return (
    <div
      style={{
        minWidth: 180,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        color: '#111827',
        background: '#ffffff',
        borderRadius: 10,
        boxShadow:
          '0 8px 20px -6px rgba(0,0,0,0.18), 0 4px 8px -4px rgba(0,0,0,0.10)',
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ height: 3, background: color }} />
      <div style={{ padding: '8px 10px 9px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>
            {p.name}
          </div>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              padding: '2px 6px',
              borderRadius: 999,
              color: '#ffffff',
              background: color,
              whiteSpace: 'nowrap',
            }}
          >
            {RISK_LABELS[p.risk] ?? p.risk}
          </span>
        </div>
        <div style={{ fontSize: 10.5, color: '#6b7280', marginTop: 1 }}>
          {p.region}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 14,
            marginTop: 6,
            fontSize: 11.5,
            color: '#374151',
          }}
        >
          <span>
            <span style={{ color: '#6b7280' }}>Cases </span>
            <strong>{p.cases.toLocaleString()}</strong>
          </span>
          <span>
            <span style={{ color: '#6b7280' }}>Deaths </span>
            <strong>{p.deaths.toLocaleString()}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function RiskMap({ data }: { data: RiskMapResponse }) {
  const points = useMemo<Point[]>(
    () =>
      data.features
        .map((f): Point | null => {
          const p = f.properties;
          const lat = p.latitude;
          const lng = p.longitude;
          if (typeof lat !== 'number' || typeof lng !== 'number') return null;
          return {
            key: p.district_code,
            lat,
            lng,
            name: p.district_name,
            region: p.region,
            risk: (p.risk_level ?? 'low') as RiskLevel,
            cases: p.recent_cases ?? 0,
            deaths: p.recent_deaths ?? 0,
            confidence: p.confidence_score,
          };
        })
        .filter((x): x is Point => x !== null),
    [data]
  );

  const maxCases = useMemo(
    () => points.reduce((m, p) => Math.max(m, p.cases), 0),
    [points]
  );

  return (
    <>
      <div className="h-full w-full overflow-hidden">
        <MapContainer
          center={ETHIOPIA_CENTER}
          zoom={ETHIOPIA_ZOOM}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {points.map((p) => {
            const color = RISK_COLORS[p.risk] ?? '#9ca3af';
            return (
              <CircleMarker
                key={p.key}
                center={[p.lat, p.lng]}
                radius={radiusFor(p.cases, maxCases)}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.6,
                  weight: 1.5,
                }}
              >
                <Tooltip
                  direction="top"
                  offset={[0, -8]}
                  opacity={1}
                  className="risk-tooltip"
                  sticky
                >
                  <HoverCard p={p} color={color} />
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
      {points.length === 0 && (
        <p className="border-t border-border bg-card px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          No district coordinates returned - markers can&apos;t be plotted.
        </p>
      )}
    </>
  );
}
