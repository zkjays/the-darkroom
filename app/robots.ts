import type { MetadataRoute } from "next";

const BASE = "https://www.thedarkroom.xyz";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/admin", "/api", "/login"],
    },
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
