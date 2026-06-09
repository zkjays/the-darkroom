import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";

export const dynamic = "force-dynamic";

// Temporary diagnostic route — DELETE after debugging
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    return NextResponse.json({
      ok: false,
      error: "Missing env vars",
      has_url: !!url,
      has_key: !!key,
    });
  }

  const db = getServiceSupabase();

  // Test 1: simple select
  const { data: selectData, error: selectError } = await db
    .from("darkroom_ids")
    .select("handle, social_proof, builder_proof, generate_at, is_og")
    .limit(1);

  // Test 2: upsert with test handle
  const { error: upsertError } = await db
    .from("darkroom_ids")
    .upsert(
      {
        handle: "__debug_test__",
        social_proof: 42,
        builder_proof: 42,
        work_proof: 0,
        score: 29,
        total_score: 29,
        generate_at: new Date().toISOString(),
      },
      { onConflict: "handle" }
    );

  // Clean up test row
  await db.from("darkroom_ids").delete().eq("handle", "__debug_test__");

  return NextResponse.json({
    ok: !selectError && !upsertError,
    select: selectError ? { error: selectError.code, message: selectError.message, details: selectError.details } : { ok: true, sample: selectData?.[0] },
    upsert: upsertError ? { error: upsertError.code, message: upsertError.message, details: upsertError.details } : { ok: true },
  });
}
