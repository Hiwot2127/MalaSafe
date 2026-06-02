import { apiClient } from './client';

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

export const exportsApi = {
  async downloadAnalyticsSummary(days = 30): Promise<void> {
    const response = await apiClient.post(
      '/exports/analytics-summary',
      null,
      { params: { days }, responseType: 'blob' },
    );
    downloadBlob(response.data, `malasafe_analytics_summary_${days}d.pdf`);
  },

  async downloadDistrictReport(districtId: string, months = 12): Promise<void> {
    const response = await apiClient.post(
      `/exports/district-report/${districtId}`,
      null,
      { params: { months }, responseType: 'blob' },
    );
    downloadBlob(response.data, `malasafe_district_${districtId}.pdf`);
  },
};