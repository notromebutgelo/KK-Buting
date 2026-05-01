import { NextFunction, Request, Response } from "express";
import { ENV } from "../config/env";

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("X-Download-Options", "noopen");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  res.setHeader("Origin-Agent-Cluster", "?1");
  res.setHeader(
    "Permissions-Policy",
    "camera=(self), geolocation=(self), microphone=(), payment=(), usb=()",
  );

  if (ENV.IS_PRODUCTION) {
    res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }

  if (req.path.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store");
  }

  next();
}
