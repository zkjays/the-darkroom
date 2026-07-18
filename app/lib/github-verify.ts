// ── GitHub ownership check for Builder work proofs ─────────────────────────
// Given a github.com/{owner}/{repo} proof link and the submitter's already
// OAuth-verified github_username (app/api/github/callback/route.ts), confirms
// whether that username is the repo's owner via the public GitHub REST API.
// v0 is owner-only (no contributor check) — see the plan for the reasoning.

export { parseGithubRepoUrl } from "./github-url";

export type GithubCheckStatus = "owner_match" | "no_match" | "private_or_missing" | "error";

export type GithubCheckResult =
  | { status: "owner_match"; repoOwner: string }
  | { status: "no_match"; repoOwner: string }
  | { status: "private_or_missing" }
  | { status: "error" };

// Global (not per-client) budget — the constraint is the server's shared
// GitHub API quota, not abuse from a given browser. 45/h unauthenticated
// (real ceiling is 60/h, leave headroom), 4500/h with GITHUB_SERVER_TOKEN
// (real ceiling is 5000/h).
const githubApiUsage = { count: 0, resetAt: Date.now() + 60 * 60 * 1000 };

function reserveGithubApiSlot(): boolean {
  const now = Date.now();
  if (now > githubApiUsage.resetAt) {
    githubApiUsage.count = 0;
    githubApiUsage.resetAt = now + 60 * 60 * 1000;
  }
  const ceiling = process.env.GITHUB_SERVER_TOKEN ? 4500 : 45;
  if (githubApiUsage.count >= ceiling) return false;
  githubApiUsage.count++;
  return true;
}

// Returns null (not GithubCheckResult) when the shared rate-limit budget is
// exhausted — this is a deliberate skip, not a failed check, so the caller
// should leave github_check_status untouched rather than writing "error".
export async function checkGithubOwnership(
  owner: string,
  repo: string,
  verifiedUsername: string
): Promise<GithubCheckResult | null> {
  if (!reserveGithubApiSlot()) return null;

  const token = process.env.GITHUB_SERVER_TOKEN;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      signal: controller.signal,
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "thedarkroom",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    clearTimeout(timeout);

    if (res.status === 404) return { status: "private_or_missing" };
    if (!res.ok) {
      console.log("github-verify: repo fetch failed —", res.status, owner, repo);
      return { status: "error" };
    }

    const data = await res.json();
    const repoOwner = data?.owner?.login as string | undefined;
    if (!repoOwner) return { status: "error" };

    return repoOwner.toLowerCase() === verifiedUsername.toLowerCase()
      ? { status: "owner_match", repoOwner }
      : { status: "no_match", repoOwner };
  } catch (e) {
    clearTimeout(timeout);
    console.log("github-verify: unexpected error —", e);
    return { status: "error" };
  }
}
