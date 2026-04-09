import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const handle = formData.get("handle") as string | null;

  if (!file || !handle) {
    return NextResponse.json({ error: "Missing file or handle" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `${handle}-${Date.now()}.${ext}`;

  const buffer = new Uint8Array(await file.arrayBuffer());
  const db = getServiceSupabase();

  const { error } = await db.storage
    .from("goal-proofs")
    .upload(filename, buffer, { contentType: file.type });

  if (error) return NextResponse.json({ error: "Upload failed", detail: error.message }, { status: 500 });

  const { data: urlData } = db.storage.from("goal-proofs").getPublicUrl(filename);
  return NextResponse.json({ url: urlData.publicUrl });
}
