/**
 * Upload Monitoring Page
 * 
 * Admin page for monitoring data uploads (METADATA ONLY - NO CSV CONTENTS).
 */

'use client';

import { useEffect, useState } from 'react';
import { FileUp, Download, AlertCircle, CheckCircle, Clock, Filter } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { EditorialCard } from '@/components/editorial';
import { Button } from '@/components/ui/button';

interface UploadMetadata {
  id: string;
  filename: string;
  upload_type: string;
  uploaded_by_email: string;
  uploaded_at: string;
  status: string;
  record_count: number | null;
  error_count: number | null;
  file_size_bytes: number | null;
}

export default function UploadMonitoringPage() {
  const [uploads, setUploads] = useState<UploadMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchUploads();
  }, [typeFilter]);

  const fetchUploads = async () => {
    try {
      setLoading(true);
      const params = typeFilter !== 'all' ? { upload_type: typeFilter } : {};
      const response = await apiClient.get('/admin/uploads', { params });
      setUploads(response.data);
    } catch (error) {
      console.error('Failed to fetch uploads:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" strokeWidth={1.5} />;
      case 'failed':
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" strokeWidth={1.5} />;
      case 'processing':
        return <Clock className="h-5 w-5 text-yellow-600 animate-spin" strokeWidth={1.5} />;
      default:
        return <FileUp className="h-5 w-5 text-gray-600" strokeWidth={1.5} />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    const colors = {
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      processing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    };
    return colors[statusLower as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${kb.toFixed(2)} KB`;
  };

  const formatUploadType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Monitoring</h1>
        <p className="text-muted-foreground">
          Monitor data uploads (metadata only - CSV contents not accessible to admins)
        </p>
      </div>

      {/* Warning Banner */}
      <EditorialCard className="border-amber-500/50 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5" strokeWidth={1.5} />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-100">
              Admin Access Restriction
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              As an admin, you can only view upload metadata (filename, uploader, date, counts). 
              You cannot access or download the actual CSV file contents.
            </p>
          </div>
        </div>
      </EditorialCard>

      {/* Filters */}
      <EditorialCard className="p-4">
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Upload Types</option>
            <option value="weekly_malaria">Weekly Malaria</option>
            <option value="monthly_malaria">Monthly Malaria</option>
            <option value="climate">Climate Data</option>
          </select>
          <Button variant="outline" size="sm" onClick={fetchUploads} aria-label="Refresh upload list">
            Refresh
          </Button>
        </div>
      </EditorialCard>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <EditorialCard className="p-4">
          <p className="text-sm text-muted-foreground">Total Uploads</p>
          <p className="text-2xl font-bold">{uploads.length}</p>
        </EditorialCard>
        <EditorialCard className="p-4">
          <p className="text-sm text-muted-foreground">Successful</p>
          <p className="text-2xl font-bold text-green-600">
            {uploads.filter(u => ['completed', 'success'].includes(u.status.toLowerCase())).length}
          </p>
        </EditorialCard>
        <EditorialCard className="p-4">
          <p className="text-sm text-muted-foreground">Failed</p>
          <p className="text-2xl font-bold text-red-600">
            {uploads.filter(u => ['failed', 'error'].includes(u.status.toLowerCase())).length}
          </p>
        </EditorialCard>
        <EditorialCard className="p-4">
          <p className="text-sm text-muted-foreground">Total Records</p>
          <p className="text-2xl font-bold">
            {uploads.reduce((sum, u) => sum + (u.record_count || 0), 0).toLocaleString()}
          </p>
        </EditorialCard>
      </div>

      {/* Uploads Table */}
      <EditorialCard>
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Loading uploads...</p>
            </div>
          </div>
        ) : uploads.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <FileUp className="h-12 w-12 text-muted-foreground mb-4" strokeWidth={1.5} />
            <p className="text-lg font-medium">No uploads found</p>
            <p className="text-sm text-muted-foreground">
              Upload data will appear here once users start uploading
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Uploader
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Records
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {uploads.map((upload) => (
                  <tr 
                    key={upload.id} 
                    className="hover:bg-muted/50 transition-colors focus-within:bg-muted/50"
                    tabIndex={0}
                    role="row"
                    aria-label={`Upload ${upload.filename} by ${upload.uploaded_by_email}, status: ${upload.status}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span aria-hidden="true">{getStatusIcon(upload.status)}</span>
                        <div>
                          <p className="font-medium text-sm">{upload.filename}</p>
                          {upload.error_count && upload.error_count > 0 && (
                            <p className="text-xs text-red-600">
                              {upload.error_count} errors
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        {formatUploadType(upload.upload_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {upload.uploaded_by_email}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(upload.status)}`}>
                        {upload.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {upload.record_count?.toLocaleString() || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatFileSize(upload.file_size_bytes)}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(upload.uploaded_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </EditorialCard>
    </div>
  );
}
