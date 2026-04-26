export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;

/**
 * Returns true if updatedAt is within maxAgeMs, meaning a re-scrape can be skipped.
 * Returns false if updatedAt is null/undefined (never scraped) or stale.
 */
export function isFresh(updatedAt: Date | null | undefined, maxAgeMs: number): boolean {
  if (!updatedAt) return false;
  return Date.now() - updatedAt.getTime() < maxAgeMs;
}
