import { ImageResponse } from "next/og";
import { getServiceSupabase } from "@/app/lib/supabase";
import { sanitizeHandle } from "@/app/lib/sanitize";

export const runtime = "nodejs";
export const alt = "THE DARKROOM — proof of work, not promises";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand: #0a0a0a base · gold #c9a84c · teal #00d4aa
export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle: raw } = await params;
  const handle = sanitizeHandle(raw ?? "");

  let archetype = "";
  let score = 0;
  try {
    const db = getServiceSupabase();
    const { data } = await db
      .from("darkroom_ids")
      .select("archetype, score, bonus_points")
      .eq("handle", handle)
      .single();
    if (data) {
      archetype = data.archetype ?? "";
      score = (data.score ?? 0) + (data.bonus_points ?? 0);
    }
  } catch {
    /* fall back to a generic card */
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0a",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", color: "#00d4aa", fontSize: 28, letterSpacing: 6 }}>
          ◈ THE DARKROOM
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", color: "#ffffff", fontSize: 88, fontWeight: 700 }}>
            @{handle}
          </div>
          {archetype && (
            <div style={{ display: "flex", color: "#9ca3af", fontSize: 36, marginTop: 12 }}>
              {archetype}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", color: "rgba(201,168,76,0.7)", fontSize: 24, letterSpacing: 4 }}>
              ROOM SCORE
            </div>
            <div style={{ display: "flex", color: "#c9a84c", fontSize: 96, fontWeight: 700 }}>
              {score}
            </div>
          </div>
          <div style={{ display: "flex", color: "#6b7280", fontSize: 24 }}>
            proof of work — not promises
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
