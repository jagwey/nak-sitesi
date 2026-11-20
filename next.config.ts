import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/** Origin of the public media bucket (MinIO in dev, CDN/S3 in prod), allowed for images only. */
function mediaOrigin(): string | null {
  try {
    return process.env.S3_PUBLIC_BASE_URL ? new URL(process.env.S3_PUBLIC_BASE_URL).origin : null;
  } catch {
    return null;
  }
}

function contentSecurityPolicy(): string {
  const media = mediaOrigin();
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // Next injects inline bootstrap scripts; without per-request nonces 'unsafe-inline' is required.
    // 'unsafe-eval' only in dev (React refresh / source maps).
    "script-src": ["'self'", "'unsafe-inline'", ...(isProd ? [] : ["'unsafe-eval'"])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", ...(media ? [media] : [])],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...(isProd ? [] : ["ws:", "wss:"])],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    ...(isProd ? { "upgrade-insecure-requests": [] } : {}),
  };
  return Object.entries(directives)
    .map(([k, v]) => [k, ...v].join(" "))
    .join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self), interest-cohort=()" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
];

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [390, 640, 768, 1024, 1280, 1536, 1920],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
