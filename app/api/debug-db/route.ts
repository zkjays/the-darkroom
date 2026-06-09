import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getServiceSupabase();

  // Test exact same upsert as generate route (claude success path)
  const { error: e1 } = await db.from("darkroom_ids").upsert(
    { handle: "__debug__", social_proof: 55, builder_proof: 60, work_proof: 0, score: 40, generate_at: new Date().toISOString() },
    { onConflict: "handle" }
  );

  // Test claim update format
  const { error: e2 } = await db.from("darkroom_ids").update(
    { score: 40, archetype: "test", tagline: "test", social_proof: 55, builder_proof: 60, work_proof: 0, analysis: "test", darkroom_line: "test", claim_count: 1, updated_at: new Date().toISOString(), auth_token: "test", is_og: false }
  ).eq("handle", "__debug__");

  // Clean up
  await db.from("darkroom_ids").delete().eq("handle", "__debug__");

  return NextResponse.json({
    generate_upsert: e1 ? { error: e1.code, message: e1.message } : "OK",
    claim_update: e2 ? { error: e2.code, message: e2.message } : "OK",
  });
}
