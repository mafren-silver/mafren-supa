import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { id, action } = await req.json();
  if (!id || !action) return new NextResponse("Missing", { status: 400 });
  const supabase = getSupabaseAdminClient();
  if (action === "archive") {
    const { error } = await supabase.from("conversations").update({ status: "ARCHIVED", unreadforadmin: 0 }).eq("id", id);
    if (error) return NextResponse.json({ error: String(error.message) }, { status: 500 });
  } else if (action === "delete") {
    try {
      // Collect attachment paths to delete from storage
      const { data: msgs } = await supabase
        .from("messages")
        .select("attachmenturl")
        .eq("conversationid", id);
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "uploads";
      const paths: string[] = [];
      for (const m of (msgs as Array<{ attachmenturl?: string | null }> | null) || []) {
        const u = m.attachmenturl || "";
        if (!u) continue;
        if (u.startsWith("/api/files/")) {
          const p = decodeURIComponent(u.replace("/api/files/", ""));
          if (p) paths.push(p);
          continue;
        }
        try {
          const url = new URL(u);
          // Handle supabase signed URL: /storage/v1/object/sign/<bucket>/<path>
          const seg = url.pathname.split("/").filter(Boolean);
          const idx = seg.findIndex((s) => s === "sign");
          if (idx >= 0 && seg[idx + 1] === bucket) {
            const p = seg.slice(idx + 2).join("/");
            if (p) paths.push(p);
          }
        } catch {}
      }
      if (paths.length) {
        try { await supabase.storage.from(bucket).remove(paths); } catch {}
      }
      const { error: delMessagesErr } = await supabase.from("messages").delete().eq("conversationid", id);
      if (delMessagesErr) return NextResponse.json({ error: String(delMessagesErr.message) }, { status: 500 });
      const { error: delConvErr } = await supabase.from("conversations").delete().eq("id", id);
      if (delConvErr) return NextResponse.json({ error: String(delConvErr.message) }, { status: 500 });
    } catch (e) {
      return NextResponse.json({ error: String((e as Error).message || e) }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}


