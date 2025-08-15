import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { id, action } = await req.json();
  if (!id || !action) return new NextResponse("Missing", { status: 400 });
  const supabase = getSupabaseAdminClient();
  if (action === "archive") {
    const { error } = await supabase.from("conversations").update({ status: "ARCHIVED", unreadForAdmin: 0 }).eq("id", id);
    if (error) return NextResponse.json({ error: String(error.message) }, { status: 500 });
  } else if (action === "delete") {
    const { error: delMessagesErr } = await supabase.from("messages").delete().eq("conversationId", id);
    if (delMessagesErr) return NextResponse.json({ error: String(delMessagesErr.message) }, { status: 500 });
    const { error: delConvErr } = await supabase.from("conversations").delete().eq("id", id);
    if (delConvErr) return NextResponse.json({ error: String(delConvErr.message) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}


