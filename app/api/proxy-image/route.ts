import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = ["pbs.twimg.com", "abs.twimg.com", "ton.twimg.com"];
const MAX_BYTES = 5 * 1024 * 1024;

const proxyImageRateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = proxyImageRateLimit.get(key);
  if (!entry || now > entry.resetAt) {
    proxyImageRateLimit.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

function getClientKey(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function GET(req: NextRequest) {
  if (!checkRateLimit(getClientKey(req), 20, 60 * 60 * 1000)) {
    return new NextResponse(null, { status: 429 });
  }

  const urlParam = req.nextUrl.searchParams.get("url");
  if (!urlParam) return new NextResponse(null, { status: 404 });

  let parsed: URL;
  try {
    parsed = new URL(urlParam);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  if (parsed.protocol !== "https:") return new NextResponse(null, { status: 400 });
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) return new NextResponse(null, { status: 403 });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(urlParam, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return new NextResponse(null, { status: 404 });

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return new NextResponse(null, { status: 415 });

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) return new NextResponse(null, { status: 413 });

    return new NextResponse(buffer, { headers: { "Content-Type": contentType } });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
