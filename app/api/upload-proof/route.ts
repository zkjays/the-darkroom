import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";
import { getAuthToken, verifyAuth } from "@/app/lib/auth";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const handle = formData.get("handle") as string | null;

  if (!file || !handle) {
    return NextResponse.json({ error: "Missing file or handle" }, { status: 400 });
  }

  const token = getAuthToken(req);
  if (!(await verifyAuth(handle, token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 413 });
  }

  const ext = ALLOWED_MIME_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 415 });
  }

  const filename = `${crypto.randomUUID()}.${ext}`;
  const buffer = new Uint8Array(await file.arrayBuffer());
  const db = getServiceSupabase();

  const { error } = await db.storage
    .from("goal-proofs")
    .upload(filename, buffer, { contentType: file.type });

  if (error) return NextResponse.json({ error: "Upload failed", detail: error.message }, { status: 500 });

  const { data: urlData } = db.storage.from("goal-proofs").getPublicUrl(filename);
  return NextResponse.json({ url: urlData.publicUrl });
}
