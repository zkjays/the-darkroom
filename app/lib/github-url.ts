// Pure github.com/{owner}/{repo} URL parsing — no fetch, no env vars, safe to
// import from client components (kept separate from github-verify.ts, which
// pulls in the server-only ownership-check network call).

const GITHUB_REPO_RE =
  /^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]){0,38})\/([A-Za-z0-9._-]+?)(?:\.git)?\/?(?:[?#].*)?$/i;

export function parseGithubRepoUrl(url: string): { owner: string; repo: string } | null {
  const match = GITHUB_REPO_RE.exec(url.trim());
  if (!match) return null;
  const [, owner, repo] = match;
  if (!owner || !repo) return null;
  return { owner, repo };
}
