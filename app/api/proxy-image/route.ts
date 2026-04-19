import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = ["pbs.twimg.com", "abs.twimg.com", "ton.twimg.com"];
const MAX_BYTES = 5 * 1024 * 1024;

export async function GET(req: NextRequest) {
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
