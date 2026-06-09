import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const LAUNCH_DATE = new Date("2026-06-10T12:00:00").getTime()

export function proxy(request: NextRequest) {
  if (Date.now() >= LAUNCH_DATE) return NextResponse.next()

  const { pathname } = request.nextUrl
  if (pathname.startsWith("/countdown")) return NextResponse.next()

  return NextResponse.redirect(new URL("/countdown", request.url))
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/|api/auth).*)"],
}
