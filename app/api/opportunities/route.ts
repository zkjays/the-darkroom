import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";

// GET /api/opportunities?category=X&limit=50
export async function GET(req: NextRequest) {
  const db = getServiceSupabase();
  const category = req.nextUrl.searchParams.get("category");
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10), 100);

  let query = db
    .from("opportunities")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Opportunities fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch opportunities" }, { status: 500 });
  }

  return NextResponse.json({ opportunities: data ?? [] });
}

// POST /api/opportunities — admin only (via secret header)
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServiceSupabase();
  const body = await req.json();

  const { title, project, category, description, reward, deadline, link, source, tags } = body;

  if (!title || !category || !link) {
    return NextResponse.json({ error: "title, category and link are required" }, { status: 400 });
  }

  const { data, error } = await db
    .from("opportunities")
    .insert({
      title,
      project: project ?? null,
      category,
      description: description ?? null,
      reward: reward ?? null,
      deadline: deadline ?? null,
      link,
      source: source ?? "manual",
      tags: tags ?? [],
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Opportunity insert error:", error);
    return NextResponse.json({ error: "Failed to create opportunity" }, { status: 500 });
  }

  return NextResponse.json({ opportunity: data }, { status: 201 });
}

// DELETE /api/opportunities?id=X — admin only
export async function DELETE(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServiceSupabase();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await db
    .from("opportunities")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  return NextResponse.json({ success: true });
}
