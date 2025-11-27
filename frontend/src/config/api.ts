// API Configuration for MyScheduling
const rawApiUrl = import.meta.env.VITE_API_URL?.trim();
const DEFAULT_BASE = '/api';

/**
 * Normalize the base API URL by trimming whitespace and trailing slashes.
 * Accepts either an absolute URL (https://example.com/api) or a relative base (/api).
 */
function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

const API_BASE_URL = rawApiUrl ? normalizeBaseUrl(rawApiUrl) : DEFAULT_BASE;

/**
 * Build a full API URL by combining the base with the provided path.
 * Ensures there is exactly one slash between base and path.
 */
export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export { API_BASE_URL };
