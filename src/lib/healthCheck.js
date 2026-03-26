/**
 * Orato AI — Backend Health Check
 *
 * Checks if the backend proxy is reachable on app startup.
 * Caches the result so we don't re-check on every render.
 */

import logger from "@/lib/logger.js";

const API_BASE = import.meta.env.VITE_API_URL || "";
let _status = null; // null = unchecked, object = result

/**
 * Check backend health. Cached after first call.
 * @returns {{ ok: boolean, provider: string, message: string }}
 */
export async function checkBackendHealth() {
  if (_status) return _status;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${API_BASE}/api/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    _status = {
      ok: true,
      provider: data.provider || "unknown",
      message: `Backend connected (${data.provider})`,
    };

    logger.info(`Backend health: ✅ Connected — provider: ${data.provider}`);
    return _status;
  } catch (err) {
    _status = {
      ok: false,
      provider: "mock",
      message: "Backend not running — using fallback mode",
    };

    logger.warn("Backend health: ❌ Not reachable — using local mock mode");
    logger.warn("  Start backend: cd server && node index.js");
    return _status;
  }
}

/** Reset cached status (useful for retry). */
export function resetHealthCheck() {
  _status = null;
}
