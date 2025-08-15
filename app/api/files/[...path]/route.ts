// Do not over-constrain handler param types to satisfy Next.js route typing
// Use Web Request and leave context untyped
import type {} from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(_req: Request, { params }: any) {
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "uploads";
  const raw = params?.path;
  const segments = Array.isArray(raw) ? raw : [raw];
  const objectPath = segments.join("/");
  if (!objectPath) return new Response("Not Found", { status: 404 });
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(bucket).download(objectPath);
  if (error || !data) return new Response("Not Found", { status: 404 });
  const arrayBuf = await data.arrayBuffer();
  const contentType = (data as Blob).type || "application/octet-stream";
  return new Response(Buffer.from(arrayBuf), { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=315360000000, immutable" } });
}


