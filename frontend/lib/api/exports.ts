import { apiClient } from './client';

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

function formatDate(date: Date = new Date()): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

export const exportsApi = {
  async downloadAnalyticsSummary(days = 30): Promise<string> {
    const response = await apiClient.post(
      '/exports/analytics-summary',
      null,
      { params: { days }, responseType: 'blob' },
    );
    const filename = `MalaSafe_Analytics_Summary_${formatDate()}.pdf`;
    downloadBlob(response.data, filename);
    return filename;
  },

  async downloadDistrictReport(districtId: string, districtName?: string, months = 12): Promise<string> {
    const response = await apiClient.post(
      `/exports/district-report/${districtId}`,
      null,
      { params: { months }, responseType: 'blob' },
    );
    const safeName = districtName
      ? districtName.replace(/[^a-zA-Z0-9_-]/g, '_')
      : districtId;
    const filename = `MalaSafe_District_${safeName}_${formatDate()}.pdf`;
    downloadBlob(response.data, filename);
    return filename;
  },
};
