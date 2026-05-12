'use client';

import { useState } from 'react';
import { Upload, Download, FileText } from 'lucide-react';
import { uploadsApi } from '@/lib/api/uploads';

export default function UploadPage() {
  const [uploadType, setUploadType] = useState<'weekly' | 'monthly' | 'climate'>('weekly');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [errors, setErrors] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage(null);
      setErrors([]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file' });
      return;
    }

    setLoading(true);
    setMessage(null);
    setErrors([]);

    try {
      let response;
      if (uploadType === 'climate') {
        response = await uploadsApi.uploadClimate(file);
      } else {
        response = await uploadsApi.uploadMalaria(file, uploadType);
      }

      setMessage({
        type: 'success',
        text: `Successfully uploaded ${response.records_processed} records`,
      });
      
      if (response.errors && response.errors.length > 0) {
        setErrors(response.errors);
      }
      
      setFile(null);
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Upload failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      let blob;
      let filename;
      
      if (uploadType === 'climate') {
        blob = await uploadsApi.downloadClimateTemplate();
        filename = 'climate_template.csv';
      } else {
        blob = await uploadsApi.downloadMalariaTemplate(uploadType);
        filename = `${uploadType}_malaria_template.csv`;
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: 'Failed to download template',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Upload Data</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Import malaria and climate data from CSV files
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload Form */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Upload CSV File
          </h2>

          <div className="space-y-4">
            {/* Upload Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data Type
              </label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="weekly">Weekly Malaria Data</option>
                <option value="monthly">Monthly Malaria Data</option>
                <option value="climate">Climate Data</option>
              </select>
            </div>

            {/* File Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                CSV File
              </label>
              <input
                id="file-input"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              {file && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Selected: {file.name}
                </p>
              )}
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={loading || !file}
              className="w-full flex items-center justify-center px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4 mr-2" />
              {loading ? 'Uploading...' : 'Upload File'}
            </button>

            {/* Download Template Button */}
            <button
              onClick={handleDownloadTemplate}
              className="w-full flex items-center justify-center px-4 py-2 text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </button>

            {/* Message */}
            {message && (
              <div
                className={`p-3 rounded-md ${
                  message.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                }`}
              >
                {message.text}
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Instructions
          </h2>

          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                Weekly Malaria Data
              </h3>
              <p>Required columns: district_code, week, year, cases, deaths</p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                Monthly Malaria Data
              </h3>
              <p>Required columns: district_code, month, year, cases, deaths</p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                Climate Data
              </h3>
              <p>Required columns: district_code, date, rainfall, temperature</p>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                Tips
              </h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Download the template for correct format</li>
                <li>Ensure district codes are valid</li>
                <li>Check for duplicate entries</li>
                <li>Verify numeric fields are valid</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
            Validation Errors ({errors.length})
          </h2>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left">Row</th>
                  <th className="px-4 py-2 text-left">Field</th>
                  <th className="px-4 py-2 text-left">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {errors.map((error, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2">{error.row}</td>
                    <td className="px-4 py-2">{error.field}</td>
                    <td className="px-4 py-2 text-red-600 dark:text-red-400">{error.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
