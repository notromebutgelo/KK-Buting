import { NextFunction, Request, Response } from "express";
import { ENV } from "../config/env";

type RateLimitOptions = {
  keyPrefix: string;
  windowMs: number;
  max: number;
  message: string;
  getKey?: (req: Request) => string;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function getClientIdentifier(req: Request) {
  const forwardedFor = req.headers["x-forwarded-for"];
  const forwardedValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const ipFromHeader = String(forwardedValue || "")
    .split(",")[0]
    ?.trim();

  return ipFromHeader || req.ip || "unknown";
}

function pruneExpiredEntries(now: number) {
  if (rateLimitStore.size < 5000) {
    return;
  }

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export function createRateLimiter(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    pruneExpiredEntries(now);

    const identifier = options.getKey?.(req) || getClientIdentifier(req);
    const key = `${options.keyPrefix}:${identifier}`;
    const current = rateLimitStore.get(key);

    if (!current || current.resetAt <= now) {
      const resetAt = now + options.windowMs;
      rateLimitStore.set(key, { count: 1, resetAt });
      res.setHeader("X-RateLimit-Limit", String(options.max));
      res.setHeader("X-RateLimit-Remaining", String(Math.max(options.max - 1, 0)));
      res.setHeader("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
      next();
      return;
    }

    if (current.count >= options.max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.setHeader("X-RateLimit-Limit", String(options.max));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("X-RateLimit-Reset", String(Math.ceil(current.resetAt / 1000)));
      res.status(429).json({ error: options.message });
      return;
    }

    current.count += 1;
    rateLimitStore.set(key, current);
    res.setHeader("X-RateLimit-Limit", String(options.max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(options.max - current.count, 0)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(current.resetAt / 1000)));
    next();
  };
}

export const authRateLimit = createRateLimiter({
  keyPrefix: "auth",
  windowMs: ENV.AUTH_RATE_LIMIT_WINDOW_MS,
  max: ENV.AUTH_RATE_LIMIT_MAX,
  message: "Too many authentication requests. Please try again shortly.",
});

export const qrRateLimit = createRateLimiter({
  keyPrefix: "qr",
  windowMs: ENV.QR_RATE_LIMIT_WINDOW_MS,
  max: ENV.QR_RATE_LIMIT_MAX,
  message: "Too many QR requests. Please wait a moment and try again.",
  getKey: (req) => {
    const merchantUid = String((req as Request & { user?: { uid?: string } }).user?.uid || "");
    return merchantUid || getClientIdentifier(req);
  },
});
