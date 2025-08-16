import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { name, contentType } = await req.json();
    const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "uploads";
    const original = String(name || "upload");
    const safe = original
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9._-]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 80) || "file";
    const path = `chat/${Date.now()}_${safe}`;
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data) return NextResponse.json({ error: String(error?.message || "cannot sign") }, { status: 500 });
    return NextResponse.json({ path, token: data.token, contentType: String(contentType || "application/octet-stream") });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "bad request" }, { status: 400 });
  }
}


