'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Bell } from 'lucide-react';
import { alertsApi } from '@/lib/api/alerts';
import { Alert } from '@/types/map';
import { getRiskBadgeColor, formatDateTime } from '@/lib/utils';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterActive, setFilterActive] = useState<boolean | undefined>(true);
  const [filterRisk, setFilterRisk] = useState<string>('');

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: any = {};
        if (filterActive !== undefined) params.is_active = filterActive;
        if (filterRisk) params.risk_level = filterRisk;

        const response = await alertsApi.getAlerts(params);
        setAlerts(response);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch alerts');
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [filterActive, filterRisk]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Alerts</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Malaria outbreak alerts and notifications
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          value={filterActive === undefined ? 'all' : filterActive ? 'active' : 'inactive'}
          onChange={(e) => {
            const value = e.target.value;
            setFilterActive(value === 'all' ? undefined : value === 'active');
          }}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="all">All Alerts</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>

        <select
          value={filterRisk}
          onChange={(e) => setFilterRisk(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="">All Risk Levels</option>
          <option value="low">Low Risk</option>
          <option value="medium">Medium Risk</option>
          <option value="high">High Risk</option>
          <option value="very_high">Very High Risk</option>
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600 dark:text-gray-400">Loading alerts...</div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {!loading && !error && alerts.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <Bell className="w-16 h-16 mb-4" />
          <p>No alerts found</p>
        </div>
      )}

      {!loading && !error && alerts.length > 0 && (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className={`p-3 rounded-full ${
                    alert.risk_level === 'very_high' ? 'bg-red-100 dark:bg-red-900/20' :
                    alert.risk_level === 'high' ? 'bg-orange-100 dark:bg-orange-900/20' :
                    alert.risk_level === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                    'bg-green-100 dark:bg-green-900/20'
                  }`}>
                    <AlertTriangle className={`w-6 h-6 ${
                      alert.risk_level === 'very_high' ? 'text-red-600 dark:text-red-400' :
                      alert.risk_level === 'high' ? 'text-orange-600 dark:text-orange-400' :
                      alert.risk_level === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-green-600 dark:text-green-400'
                    }`} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {alert.district_name || 'Unknown District'}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getRiskBadgeColor(alert.risk_level)}`}>
                        {alert.risk_level.replace('_', ' ').toUpperCase()}
                      </span>
                      {alert.is_active && (
                        <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          ACTIVE
                        </span>
                      )}
                    </div>

                    <p className="text-gray-700 dark:text-gray-300 mb-2">
                      {alert.message}
                    </p>

                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      {alert.region && (
                        <span>Region: {alert.region}</span>
                      )}
                      <span>Created: {formatDateTime(alert.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {!loading && !error && alerts.length > 0 && (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Alerts</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
              {alerts.length}
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Alerts</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
              {alerts.filter(a => a.is_active).length}
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">High Risk</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
              {alerts.filter(a => a.risk_level === 'high' || a.risk_level === 'very_high').length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
