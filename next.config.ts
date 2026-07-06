import type { NextConfig } from "next";

// Same Twitter/X CDN allowlist used by app/api/proxy-image/route.ts for image hosts.
const TWITTER_IMAGE_HOSTS = "https://pbs.twimg.com https://abs.twimg.com https://ton.twimg.com";

// Own Supabase Storage bucket (goal-proofs) — public URLs for user-uploaded cover images.
const SUPABASE_STORAGE_HOST = "https://vwvluwaeiigognkgxbes.supabase.co";

const isDev = process.env.NODE_ENV !== "production";

// Turbopack's dev HMR bootstrap injects its own inline <script> and needs a
// WebSocket connection back to the dev server — neither works under a strict
// script-src, and neither exists in a production build. Relax only in dev;
// production keeps the strict policy (no 'unsafe-inline'/'unsafe-eval').
// TODO: replace the prod script-src with a per-request nonce (Next.js
// middleware pattern) if streaming SSR ever needs an inline coordination
// script — 'self' alone is enough for now since this app renders no
// Suspense-streamed routes.
const CSP = [
  "default-src 'self'",
  isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: ${TWITTER_IMAGE_HOSTS} ${SUPABASE_STORAGE_HOST}`,
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
