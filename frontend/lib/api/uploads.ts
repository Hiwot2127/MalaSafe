import { apiClient } from "./client";
import type {
  UploadResponse,
  UploadPreviewResponse,
  UploadedFile,
} from "@/types/upload";

const FORM_HEADERS = { "Content-Type": "multipart/form-data" } as const;

/** Identifier -> woreda (district) name lookups, used to label the upload EDA. */
export interface GeoNameMaps {
  by_org_unit: Record<string, string>;
  by_district_code: Record<string, string>;
}

export const uploadsApi = {
  /** Upload monthly malaria CSV (real upload - writes to DB). */
  uploadMalaria: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post(
      "/uploads/malaria/monthly",
      formData,
      { headers: FORM_HEADERS },
    );
    return response.data;
  },

  /**
   * Dry-run the monthly upload - same parsing + per-row validation as the
   * real endpoint, but no rows are written. Powers the pre-upload modal.
   */
  previewMonthlyMalariaUpload: async (file: File): Promise<UploadPreviewResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post(
      "/uploads/malaria/monthly/preview",
      formData,
      { headers: FORM_HEADERS },
    );
    return response.data;
  },

  uploadClimate: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post("/uploads/climate", formData, {
      headers: FORM_HEADERS,
    });
    return response.data;
  },

  downloadMalariaTemplate: async (): Promise<Blob> => {
    const response = await apiClient.get(
      "/uploads/templates/malaria/monthly",
      { responseType: "blob" },
    );
    return response.data;
  },

  downloadClimateTemplate: async (): Promise<Blob> => {
    const response = await apiClient.get("/uploads/templates/climate", {
      responseType: "blob",
    });
    return response.data;
  },

  getUploadHistory: async (): Promise<UploadedFile[]> => {
    const response = await apiClient.get("/uploads/history");
    return response.data;
  },

  /** Woreda name lookups so the EDA can show names instead of raw identifiers. */
  getGeoNames: async (): Promise<GeoNameMaps> => {
    const response = await apiClient.get<GeoNameMaps>("/uploads/geo-names");
    return response.data;
  },
};
