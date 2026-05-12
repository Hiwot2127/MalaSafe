import { apiClient } from './client';
import { UploadResponse, UploadedFile } from '@/types/upload';

export const uploadsApi = {
  uploadMalaria: async (file: File, uploadType: 'weekly' | 'monthly'): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_type', uploadType);

    const response = await apiClient.post('/uploads/malaria', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  uploadClimate: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/uploads/climate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  downloadMalariaTemplate: async (uploadType: 'weekly' | 'monthly'): Promise<Blob> => {
    const response = await apiClient.get(`/uploads/templates/malaria/${uploadType}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  downloadClimateTemplate: async (): Promise<Blob> => {
    const response = await apiClient.get('/uploads/templates/climate', {
      responseType: 'blob',
    });
    return response.data;
  },

  getUploadHistory: async (): Promise<UploadedFile[]> => {
    const response = await apiClient.get('/uploads/history');
    return response.data;
  },
};
