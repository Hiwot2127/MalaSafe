const API_BASE = process.env.E2E_API_URL ?? 'http://localhost:8000/api/v1';

export async function isBackendAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    return response.ok;
  } catch {
    return false;
  }
}

export const E2E_FULL_STACK = process.env.E2E_FULL_STACK === '1';

export const testUsers = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL ?? 'admin@test.com',
    password: process.env.E2E_ADMIN_PASSWORD ?? 'Admin123!',
  },
  moh: {
    email: process.env.E2E_MOH_EMAIL ?? 'moh@test.com',
    password: process.env.E2E_MOH_PASSWORD ?? 'Moh12345!',
  },
};
