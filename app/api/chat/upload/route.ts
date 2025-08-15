import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return new NextResponse("Thiếu file", { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  // Sanitize filename to avoid storage errors with unicode/special chars
  const original = file.name || `upload`;
  const safeBase = original
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^A-Za-z0-9._-]/g, "_") // allow only safe chars
    .replace(/_+/g, "_")
    .slice(0, 80);
  const filename = `chat/${Date.now()}_${safeBase || "file"}`;
  const supabase = getSupabaseAdminClient();
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "uploads";
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filename, buffer, { contentType: file.type || "application/octet-stream", upsert: false });
  if (error) {
    console.error("[upload] storage error:", error);
    return NextResponse.json({ error: error.message || "upload failed" }, { status: 500 });
  }
  const path = encodeURIComponent(data?.path || filename);
  const url = `/api/files/${path}`; // permanent proxy link
  return NextResponse.json({ url, contentType: file.type, name: file.name });
}


