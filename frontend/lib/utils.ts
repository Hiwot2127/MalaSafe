import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Turn FastAPI error `detail` (string, array, or object) into display text. */
export function formatApiError(detail: unknown, fallback = 'Something went wrong'): string {
  if (detail == null) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'msg' in item) {
          const e = item as { loc?: unknown[]; msg?: string };
          const field = Array.isArray(e.loc) ? e.loc.filter((p) => p !== 'body').join('.') : '';
          return field ? `${field}: ${e.msg}` : String(e.msg ?? item);
        }
        return String(item);
      })
      .join('; ');
  }
  if (typeof detail === 'object' && detail !== null && 'msg' in detail) {
    return String((detail as { msg: string }).msg);
  }
  return fallback;
}

/** Axios / fetch errors with clearer messages for login and API calls. */
export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const ax = err as { response?: { data?: { detail?: unknown } }; message?: string; code?: string };
    if (!ax.response) {
      if (ax.code === 'ERR_NETWORK' || ax.message?.includes('Network Error')) {
        return 'Cannot reach the API server. Start the backend: cd backend, then run uvicorn app.main:app --reload';
      }
      return ax.message || fallback;
    }
    return formatApiError(ax.response.data?.detail, fallback);
  }
  return fallback;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getRiskColor(riskLevel: string): string {
  const colors: Record<string, string> = {
    low: 'text-green-600 bg-green-50',
    medium: 'text-yellow-600 bg-yellow-50',
    moderate: 'text-yellow-600 bg-yellow-50',
    high: 'text-orange-600 bg-orange-50',
    very_high: 'text-red-600 bg-red-50',
  };
  return colors[riskLevel] || colors.low;
}

export function getRiskBadgeColor(riskLevel: string): string {
  const colors: Record<string, string> = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    moderate: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    very_high: 'bg-red-100 text-red-800',
  };
  return colors[riskLevel] || colors.low;
}
