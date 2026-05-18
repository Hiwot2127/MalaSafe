'use client';

import { useEffect, useState } from 'react';
import { analyticsApi } from '@/lib/api/analytics';
import { TrendDataPoint } from '@/types/analytics';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  const [trendType, setTrendType] = useState<'weekly' | 'monthly'>('weekly');
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrends = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await analyticsApi.getTrends({
          trend_type: trendType,
          limit: 20,
        });
        setTrends(response.data ?? []);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch trends');
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, [trendType]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Analytics</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Malaria trends and insights
          </p>
        </div>

        <select
          value={trendType}
          onChange={(e) => setTrendType(e.target.value as 'weekly' | 'monthly')}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="weekly">Weekly Trends</option>
          <option value="monthly">Monthly Trends</option>
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600 dark:text-gray-400">Loading trends...</div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {!loading && !error && trends.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <BarChart3 className="w-16 h-16 mb-4" />
          <p>No trend data available</p>
        </div>
      )}

      {!loading && !error && trends.length > 0 && (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {trendType === 'weekly' ? 'Weekly' : 'Monthly'} Trends
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                    Period
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                    Year
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                    Cases
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                    Deaths
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                    CFR (%)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {trends.map((trend, index) => {
                  const cfr = trend.cases > 0 ? ((trend.deaths / trend.cases) * 100).toFixed(2) : '0.00';
                  return (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                        {trendType === 'weekly' ? `Week ${trend.week}` : `Month ${trend.month}`}
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                        {trend.year}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                        {trend.cases.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                        {trend.deaths.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                        {cfr}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      {!loading && !error && trends.length > 0 && (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Cases</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
              {trends.reduce((sum, t) => sum + t.cases, 0).toLocaleString()}
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Deaths</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
              {trends.reduce((sum, t) => sum + t.deaths, 0).toLocaleString()}
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average CFR</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
              {(() => {
                const totalCases = trends.reduce((sum, t) => sum + t.cases, 0);
                const totalDeaths = trends.reduce((sum, t) => sum + t.deaths, 0);
                return totalCases > 0 ? ((totalDeaths / totalCases) * 100).toFixed(2) : '0.00';
              })()}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
