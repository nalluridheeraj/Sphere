/**
 * Resolve a media URL for display.
 * - S3 URLs (https://...) are already absolute → return as-is
 * - Local URLs (/uploads/...) → prefix with backend base
 * - Empty/null → return empty string
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export const resolveUrl = (url) => {
  if (!url) return '';
  // Already a full URL (S3, external, etc.)
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Local upload path → prefix with backend
  if (url.startsWith('/uploads')) return `${API_BASE}${url}`;
  return url;
};

export { API_BASE };
