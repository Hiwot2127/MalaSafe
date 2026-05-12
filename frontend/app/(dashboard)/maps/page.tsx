'use client';

import { useEffect, useState } from 'react';
import { Map as MapIcon } from 'lucide-react';
import { mapsApi } from '@/lib/api/maps';
import { RiskMapResponse } from '@/types/map';
import { getRiskBadgeColor } from '@/lib/utils';

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
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch map data');
      } finally {
        setLoading(false);
      }
    };

    fetchMapData();
  }, [selectedRegion]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Risk Maps</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            District-level malaria risk heatmap
          </p>
        </div>

        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="">All Regions</option>
          <option value="Addis Ababa">Addis Ababa</option>
          <option value="Afar">Afar</option>
          <option value="Amhara">Amhara</option>
          <option value="Benishangul-Gumuz">Benishangul-Gumuz</option>
          <option value="Dire Dawa">Dire Dawa</option>
          <option value="Gambela">Gambela</option>
          <option value="Harari">Harari</option>
          <option value="Oromia">Oromia</option>
          <option value="Sidama">Sidama</option>
          <option value="SNNPR">SNNPR</option>
          <option value="Somali">Somali</option>
          <option value="Tigray">Tigray</option>
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-96 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="text-lg text-gray-600 dark:text-gray-400">Loading map data...</div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {!loading && !error && (!mapData || mapData.features.length === 0) && (
        <div className="flex flex-col items-center justify-center h-96 bg-white dark:bg-gray-800 rounded-lg shadow text-gray-500 dark:text-gray-400">
          <MapIcon className="w-16 h-16 mb-4" />
          <p>No map data available</p>
        </div>
      )}

      {!loading && !error && mapData && mapData.features.length > 0 && (
        <>
          {/* Map Placeholder */}
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="flex items-center justify-center h-96 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <div className="text-center text-gray-600 dark:text-gray-400">
                <MapIcon className="w-16 h-16 mx-auto mb-4" />
                <p className="text-lg font-medium">Interactive Map</p>
                <p className="text-sm mt-2">
                  Leaflet map integration will be displayed here
                </p>
                <p className="text-xs mt-2">
                  {mapData.features.length} districts loaded
                </p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Risk Level Legend
            </h2>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Low Risk</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Medium Risk</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">High Risk</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Very High Risk</span>
              </div>
            </div>
          </div>

          {/* District List */}
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Districts ({mapData.features.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                      District
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                      Region
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                      Risk Level
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                      Cases
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                      Deaths
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {mapData.features.map((feature, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                        {feature.properties.district_name}
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                        {feature.properties.region}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getRiskBadgeColor(feature.properties.risk_level)}`}>
                          {feature.properties.risk_level.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                        {feature.properties.cases.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
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
