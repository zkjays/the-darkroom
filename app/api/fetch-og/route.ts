import { NextRequest, NextResponse } from "next/server";

// Block private/internal IP ranges and known cloud metadata endpoints
function isSafeUrl(rawUrl: string): boolean {
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

  // Block IP-based URLs (private + metadata ranges)
  const ipv4 = hostname.match(
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  );
  if (ipv4) {
    const [, a, b] = ipv4.map(Number);
    // 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 127.x.x.x, 169.254.x.x (cloud metadata)
    if (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254)
    ) {
      return false;
    }
  }

  return true;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({});

  if (!isSafeUrl(url)) {
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
