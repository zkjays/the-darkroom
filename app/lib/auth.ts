import { getServiceSupabase } from "@/app/lib/supabase";

export function getAuthToken(req: Request): string | null {
  return req.headers.get("x-darkroom-token");
}

export async function verifyAuth(handle: string, token: string | null): Promise<boolean> {
  if (!token) return false;
  const db = getServiceSupabase();
  const { data } = await db
    .from("darkroom_ids")
    .select("auth_token")
    .eq("handle", handle)
    .single();
  return data?.auth_token === token;
}
