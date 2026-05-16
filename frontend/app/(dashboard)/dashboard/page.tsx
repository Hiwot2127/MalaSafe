'use client';

import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, TrendingUp, Upload, Users } from 'lucide-react';
import { analyticsApi } from '@/lib/api/analytics';
import { DashboardSummary } from '@/types/analytics';

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
        setError(err.response?.data?.detail || 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Overview of malaria surveillance data
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Cases Card */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Cases
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats?.total_cases?.toLocaleString() || 0}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                {stats?.period || 'Current period'}
              </p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full">
              <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Total Deaths Card */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Deaths
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats?.total_deaths?.toLocaleString() || 0}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                CFR: {stats?.case_fatality_rate?.toFixed(2) || 0}%
              </p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-full">
              <TrendingUp className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        {/* Active Alerts Card */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Alerts
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats?.active_alerts || 0}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                Requiring attention
              </p>
            </div>
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-full">
              <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        {/* High Risk Districts Card */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                High Risk Districts
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats?.high_risk_districts || 0}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                Elevated risk level
              </p>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-full">
              <Users className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Quick Actions
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <a
            href="/upload"
            className="p-4 text-center border-2 border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
            <p className="font-medium text-gray-900 dark:text-gray-100">Upload Data</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Import CSV files</p>
          </a>
          <a
            href="/maps"
            className="p-4 text-center border-2 border-green-200 dark:border-green-800 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
          >
            <Activity className="w-8 h-8 mx-auto mb-2 text-green-600 dark:text-green-400" />
            <p className="font-medium text-gray-900 dark:text-gray-100">View Risk Maps</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Interactive heatmap</p>
          </a>
          <a
            href="/analytics"
            className="p-4 text-center border-2 border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
          >
            <Activity className="w-8 h-8 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
            <p className="font-medium text-gray-900 dark:text-gray-100">View Analytics</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Trends and insights</p>
          </a>
        </div>
      </div>
    </div>
  );
}
