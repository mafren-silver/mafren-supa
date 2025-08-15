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
  const filename = `chat/${Date.now()}_${file.name}`;
  const supabase = getSupabaseAdminClient();
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "uploads";
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filename, buffer, { contentType: file.type || "application/octet-stream", upsert: false });
  if (error) return NextResponse.json({ error: String(error.message) }, { status: 500 });
  const path = encodeURIComponent(data?.path || filename);
  const url = `/api/files/${path}`; // permanent proxy link
  return NextResponse.json({ url, contentType: file.type, name: file.name });
}


