import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth-options";

const uploadRateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = uploadRateLimit.get(key);
  if (!entry || now > entry.resetAt) {
    uploadRateLimit.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_BYTES = 5 * 1024 * 1024;

function isValidImage(buf: Uint8Array): boolean {
  if (buf.length < 12) return false;
  // JPEG: FF D8 FF
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return true;
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return true;
  // GIF: 47 49 46 38 (GIF8)
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return true;
  // WebP: RIFF....WEBP
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true;
  return false;
}

const BUCKET = "goal-proofs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const handle = formData.get("handle") as string | null;

    if (!file || !handle) {
      return NextResponse.json({ error: "Missing file or handle" }, { status: 400 });
    }

    const sessionHandle = session.handle;
    if (sessionHandle !== handle) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Storage/bandwidth cost abuse: cap uploads per authenticated handle. This is a
    // stronger key than IP since the route already requires auth.
    if (!checkRateLimit(handle, 15, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 413 });
    }

    const ext = ALLOWED_MIME_TYPES[file.type];
    if (!ext) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 415 });
    }

    const filename = `${handle}/${crypto.randomUUID()}.${ext}`;
    const buffer = new Uint8Array(await file.arrayBuffer());

    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 413 });
    }

    if (!isValidImage(buffer)) {
      console.warn(`upload: magic bytes mismatch for handle=${handle} type=${file.type}`);
      return NextResponse.json({ error: "Invalid image file" }, { status: 415 });
    }

    const db = getServiceSupabase();

    const { error } = await db.storage
      .from(BUCKET)
      .upload(filename, buffer, { contentType: file.type });

    if (error) {
      // Log full detail server-side; never echo Supabase internals to the client.
      console.error("upload: storage error:", JSON.stringify(error));
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(filename);
    return NextResponse.json({ url: urlData.publicUrl });

  } catch (error) {
    console.error("Upload error:", JSON.stringify(error));
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
