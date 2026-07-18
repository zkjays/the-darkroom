import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth-options";

// Manual OAuth flow (not a NextAuth provider) — this only links a GitHub
// account to the already-logged-in Twitter/X session, it never issues a
// session itself. See auth-options.ts: the jwt() callback unconditionally
// overwrites token.handle/xId whenever account && profile exist, so adding
// GitHub as a second NextAuth provider would risk clobbering the primary
// identity on first click.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const sessionHandle = (session as { handle?: string } | null)?.handle;
  if (!sessionHandle) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GitHub OAuth not configured" }, { status: 503 });
  }

  const state = randomUUID();
  const redirectUri = `${req.nextUrl.origin}/api/github/callback`;

  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", "read:user");
  authorizeUrl.searchParams.set("allow_signup", "false");
  authorizeUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authorizeUrl);
  // Short-lived, single-use, scoped to /api/github so it never leaks to other routes.
  res.cookies.set("github_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/api/github",
  });
  return res;
}
