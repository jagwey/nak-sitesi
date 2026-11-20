import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/** Origin of the public media bucket (MinIO in dev, CDN/S3 in prod), allowed for images only. */
const publicMedia = URL.parse(process.env.S3_PUBLIC_BASE_URL ?? "");

function contentSecurityPolicy(): string {
  const media = publicMedia?.origin;
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
    remotePatterns: publicMedia?.protocol === "https:"
      ? [{
          protocol: "https",
          hostname: publicMedia.hostname,
          port: publicMedia.port,
          pathname: `${publicMedia.pathname.replace(/\/+$/, "")}/**`,
          search: "",
        }]
      : [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: "/urun/turk-bayragi-mini", destination: "/urun/turk-bayragi", permanent: true },
      { source: "/urun/dogu-turkistan-bayragi-mini", destination: "/urun/dogu-turkistan-bayragi", permanent: true },
    ];
  },
};

export default nextConfig;
