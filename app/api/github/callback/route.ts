import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth-options";

function settingsRedirect(req: NextRequest, query: string) {
  const res = NextResponse.redirect(new URL(`/dashboard?tab=settings&${query}`, req.url));
  // State cookie is single-use — clear it on every branch (success or failure).
  res.cookies.delete("github_oauth_state");
  return res;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  // User clicked "Cancel" on GitHub's authorize screen — no API calls needed.
  if (params.get("error")) {
    return settingsRedirect(req, "github_error=cancelled");
  }

  const code = params.get("code");
  const state = params.get("state");
  const cookieState = req.cookies.get("github_oauth_state")?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return settingsRedirect(req, "github_error=state_mismatch");
  }

  // Defense in depth: state match already proves this browser initiated the
  // flow, but re-check the session too in case it expired mid-flow.
  const session = await getServerSession(authOptions);
  const sessionHandle = (session as { handle?: string } | null)?.handle;
  if (!sessionHandle) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("github_oauth_state");
    return res;
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return settingsRedirect(req, "github_error=not_configured");
  }

  try {
    const redirectUri = `${req.nextUrl.origin}/api/github/callback`;
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      console.log("github callback: token exchange failed —", tokenRes.status);
      return settingsRedirect(req, "github_error=token_exchange_failed");
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token as string | undefined;
    if (!accessToken) {
      console.log("github callback: no access_token in response —", tokenData);
      return settingsRedirect(req, "github_error=token_exchange_failed");
    }

    // Only used to resolve the username, never persisted — scope is "prove
    // ownership", not "read repos/contributions" (out of scope for now).
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "thedarkroom",
        Accept: "application/vnd.github+json",
      },
    });

    if (!userRes.ok) {
      console.log("github callback: user fetch failed —", userRes.status);
      return settingsRedirect(req, "github_error=profile_fetch_failed");
    }

    const userData = await userRes.json();
    const githubUsername = userData.login as string | undefined;
    if (!githubUsername) {
      console.log("github callback: no login in user response —", userData);
      return settingsRedirect(req, "github_error=profile_fetch_failed");
    }

    const db = getServiceSupabase();
    const { error: updateError } = await db
      .from("darkroom_ids")
      .update({
        github_username: githubUsername,
        github_verified: true,
        github_verified_at: new Date().toISOString(),
      })
      .eq("handle", sessionHandle);

    if (updateError) {
      // 23505 = unique_violation — this GitHub account is already verified on another profile.
      const isConflict = updateError.code === "23505";
      console.log("github callback: supabase update failed —", updateError);
      return settingsRedirect(req, isConflict ? "github_error=already_claimed" : "github_error=save_failed");
    }

    return settingsRedirect(req, "github=connected");
  } catch (e) {
    console.log("github callback: unexpected error —", e);
    return settingsRedirect(req, "github_error=unexpected");
  }
}
