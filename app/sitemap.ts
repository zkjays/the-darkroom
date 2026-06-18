import type { MetadataRoute } from "next";
import { getServiceSupabase } from "@/app/lib/supabase";

const BASE = "https://www.thedarkroom.xyz";

// ISR 1h, comme le leaderboard — le sitemap se rafraîchit sans rebuild complet.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/leaderboard`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE}/opportunities`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE}/darkroom-id`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];

  // Profils publics — chaque builder s'ajoute seul au sitemap.
  const db = getServiceSupabase();
  const { data, error } = await db
    .from("darkroom_ids")
    .select("handle, updated_at")
    .eq("profile_public", true);

  if (error || !data) {
    // Garde-fou : ne jamais casser le sitemap, renvoyer au moins les routes statiques.
    return staticRoutes;
  }

  const profileRoutes: MetadataRoute.Sitemap = data.map((p) => ({
    url: `${BASE}/p/${p.handle}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...profileRoutes];
}
