import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Turbopack's dev HMR bootstrap injects its own inline <script> and needs a
// WebSocket connection back to the dev server. Separately, the App Router
// itself (not just Suspense/streaming routes) injects inline
// `self.__next_f.push(...)` scripts on every page to hydrate the RSC
// payload — 'unsafe-inline' is required in prod too, or every page's
// hydration (including the login button) breaks.
// TODO: swap 'unsafe-inline' for a per-request nonce (Next.js middleware
// pattern, https://nextjs.org/docs/app/guides/content-security-policy) to
// close this back up without breaking hydration.
const CSP = [
  "default-src 'self'",
  isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  // Work-proof covers come from arbitrary user-submitted links (og:image
  // auto-fetch) as well as our own Supabase Storage bucket — any single-host
  // allowlist blanks out most of them. Images can't execute script, so
  // allowing any https host is low-risk here (unlike script-src).
  "img-src 'self' data: https:",
  isDev ? "connect-src 'self' ws:" : "connect-src 'self'",
  "font-src 'self' data:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Content-Security-Policy", value: CSP },
        ],
      },
    ];
  },
};

export default nextConfig;
