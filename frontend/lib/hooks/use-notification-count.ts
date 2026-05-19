"use client";

import { useEffect, useState } from "react";
import { alertsApi } from "@/lib/api/alerts";

const POLL_INTERVAL_MS = 60_000;

/**
 * Returns the number of active alerts. `null` until the first fetch completes.
 * Polls every minute. Tolerates failures by leaving the previous count in place.
 */
export function useNotificationCount(): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    const tick = async () => {
      try {
        const res = await alertsApi.getAlerts(
          { active_only: true, limit: 1 },
          { signal: controller.signal },
        );
        if (mounted) setCount(res.active_count ?? 0);
      } catch {
        // Swallow — leave the prior count visible.
      }
    };

    tick();
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(id);
      controller.abort();
    };
  }, []);

  return count;
}
