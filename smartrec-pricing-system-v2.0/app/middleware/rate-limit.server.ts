// Simple in-memory rate limiter (upgrade to Redis in production)
const requests = new Map<string, number[]>();

const RATE_LIMITS = {
  track: { windowMs: 60000, maxRequests: 100 }, // 100 requests per minute
  quota: { windowMs: 60000, maxRequests: 60 },  // 60 requests per minute
  config: { windowMs: 60000, maxRequests: 30 }, // 30 requests per minute
  stats: { windowMs: 60000, maxRequests: 20 },  // 20 requests per minute
};

export function rateLimit(endpoint: keyof typeof RATE_LIMITS, shop: string): boolean {
  const limit = RATE_LIMITS[endpoint];
  const key = `${endpoint}:${shop}`;
  const now = Date.now();
  const windowStart = now - limit.windowMs;

  let timestamps = requests.get(key) || [];
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= limit.maxRequests) {
    console.warn(`[RateLimit] ${key} exceeded: ${timestamps.length}/${limit.maxRequests}`);
    return false;
  }

  timestamps.push(now);
  requests.set(key, timestamps);
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of requests.entries()) {
    const filtered = timestamps.filter((t) => t > now - 300000);
    if (filtered.length === 0) {
      requests.delete(key);
    } else {
      requests.set(key, filtered);
    }
  }
}, 300000);
