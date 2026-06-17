import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth-options";

const REFERRALS_NEEDED = 25;

// GET /api/second-brain — server-side gate for the Second Brain template.
// Unlocked when the authenticated user has >= 25 valid referrals (decision 14/06).
// The vault download URL is NEVER returned unless the gate passes.
export async function GET() {
  const session = await getServerSession(authOptions);
  const handle = (session as { handle?: string } | null)?.handle;
  if (!handle) {
    return NextResponse.json({ unlocked: false, count: 0, needed: REFERRALS_NEEDED });
  }

  const db = getServiceSupabase();
  const { count, error } = await db
    .from("referrals")
    .select("*", { count: "exact", head: true })
    .eq("referrer_handle", handle);

  if (error) {
    return NextResponse.json({ unlocked: false, count: 0, needed: REFERRALS_NEEDED });
  }

  const total = count ?? 0;
  const unlocked = total >= REFERRALS_NEEDED;

  return NextResponse.json({
    unlocked,
    count: total,
    needed: REFERRALS_NEEDED,
    // Gated asset — only revealed once the referral threshold is met
    download_url: unlocked ? process.env.SECOND_BRAIN_VAULT_URL ?? null : null,
  });
}
