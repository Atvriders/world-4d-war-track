/**
 * Custom error thrown when an API returns HTTP 429 (Too Many Requests).
 * Includes the Retry-After delay in milliseconds when the header is present.
 */
export class RateLimitError extends Error {
  retryAfterMs: number | undefined;

  constructor(source: string, retryAfterMs?: number) {
    const msg = retryAfterMs != null
      ? `${source}: rate-limited (429), retry after ${retryAfterMs / 1000}s`
      : `${source}: rate-limited (429)`;
    super(msg);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

/** Parse Retry-After header value into milliseconds. Handles both seconds and HTTP-date formats. */
export function parseRetryAfter(headerValue: string | null): number | undefined {
  if (!headerValue) return undefined;
  const seconds = Number(headerValue);
  if (!isNaN(seconds)) return seconds * 1000;
  // Try HTTP-date format
  const date = Date.parse(headerValue);
  if (!isNaN(date)) return Math.max(0, date - Date.now());
  return undefined;
}

/**
 * Check a fetch Response for 429 and throw RateLimitError if so.
 * Call this right after `fetch()` in each service before processing the body.
 */
export function throwIfRateLimited(res: Response, source: string): void {
  if (res.status === 429) {
    const retryAfterMs = parseRetryAfter(res.headers.get('Retry-After'));
    throw new RateLimitError(source, retryAfterMs);
  }
}
