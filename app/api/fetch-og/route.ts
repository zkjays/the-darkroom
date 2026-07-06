import { NextRequest, NextResponse } from "next/server";
import dns from "node:dns/promises";
import net from "node:net";

const fetchOgRateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = fetchOgRateLimit.get(key);
  if (!entry || now > entry.resetAt) {
    fetchOgRateLimit.set(key, { count: 1, resetAt: now + windowMs });
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

// Private/loopback/link-local ranges to block, for both literal IPs in the URL
// and IPs a hostname actually resolves to (protects against DNS rebinding).
const blockedRanges = new net.BlockList();
blockedRanges.addSubnet("10.0.0.0", 8, "ipv4");
blockedRanges.addSubnet("127.0.0.0", 8, "ipv4");
blockedRanges.addSubnet("172.16.0.0", 12, "ipv4");
blockedRanges.addSubnet("192.168.0.0", 16, "ipv4");
blockedRanges.addSubnet("169.254.0.0", 16, "ipv4"); // cloud metadata (AWS/GCP/Azure)
blockedRanges.addSubnet("0.0.0.0", 8, "ipv4");
blockedRanges.addSubnet("::1", 128, "ipv6"); // loopback
blockedRanges.addSubnet("fc00::", 7, "ipv6"); // unique-local
blockedRanges.addSubnet("fe80::", 10, "ipv6"); // link-local

function isBlockedAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return blockedRanges.check(address, "ipv4");
  if (family === 6) {
    if (blockedRanges.check(address, "ipv6")) return true;
    // IPv4-mapped IPv6 (e.g. ::ffff:169.254.169.254) — check the embedded IPv4 too
    const mapped = address.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
    if (mapped) return blockedRanges.check(mapped[1], "ipv4");
    return false;
  }
  // Not a recognizable IP literal — treat as unresolved/unsafe.
  return true;
}

// Block private/internal IP ranges and known cloud metadata endpoints.
// Resolves the hostname (DNS or literal) and validates the ACTUAL resolved
// address(es), not just a pattern match on the URL string — this closes the
// IPv6-literal gap, alternate IPv4 encodings (decimal/octal/hex), and
// DNS-rebinding (a public hostname that resolves to an internal IP).
async function isSafeUrl(rawUrl: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  // HTTPS only
  if (parsed.protocol !== "https:") return false;

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost and common internal hostnames
  const blockedHostnames = ["localhost", "metadata.google.internal"];
  if (blockedHostnames.includes(hostname)) return false;

  // Strip IPv6 literal brackets, e.g. "[::1]" -> "::1"
  const bareHost = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;

  try {
    const results = await dns.lookup(bareHost, { all: true, verbatim: true });
    if (results.length === 0) return false;
    return results.every((r) => !isBlockedAddress(r.address));
  } catch {
    // Hostname didn't resolve (typo, doesn't exist, etc.) — treat as unsafe.
    return false;
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({});

  if (!checkRateLimit(getClientKey(req), 30, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
  }

  if (!(await isSafeUrl(url))) {
    return NextResponse.json({}, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Darkroom/1.0; +https://thedarkroom.xyz)" },
      next: { revalidate: 0 },
    });
    clearTimeout(timeout);
    if (!res.ok) return NextResponse.json({});

    const html = await res.text();

    const getMeta = (prop: string): string | null => {
      const byProp = html.match(
        new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i")
      ) ?? html.match(
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, "i")
      );
      return byProp?.[1] ?? null;
    };

    const title =
      getMeta("og:title") ??
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ??
      null;
    const image = getMeta("og:image");
    const description = getMeta("og:description");

    return NextResponse.json({ title, image, description });
  } catch {
    clearTimeout(timeout);
    return NextResponse.json({});
  }
}
