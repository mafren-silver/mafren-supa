import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

export async function GET(req: NextRequest) {
  const conversationId = req.nextUrl.searchParams.get("conversationId");
  if (!conversationId) return new NextResponse("Thiếu conversationId", { status: 400 });
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversationId:conversationid, sender, content, attachmentUrl:attachmenturl, attachmentType:attachmenttype, createdAt:createdat")
    .eq("conversationid", conversationId)
    .order("createdat", { ascending: true });
  if (error) return NextResponse.json({ error: String(error.message) }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { conversationId, sender, content, attachmentUrl, attachmentType } = body as {
    conversationId?: string;
    sender?: "CUSTOMER" | "ADMIN";
    content?: string;
    attachmentUrl?: string;
    attachmentType?: string;
  };
  if (!conversationId || !sender || (!content && !attachmentUrl)) {
    return new NextResponse("Thiếu dữ liệu", { status: 400 });
  }
  const supabase = getSupabaseAdminClient();
  const lastPreview = content ? String(content).slice(0, 120) : attachmentType || "attachment";
  // Update conversation metadata; increment unreadForAdmin when customer sends
  if (sender === "CUSTOMER") {
    const { data: current } = await supabase
      .from("conversations")
      .select("unreadforadmin")
      .eq("id", conversationId)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentUnread = (current as any)?.unreadforadmin;
    const nextUnread = (typeof currentUnread === "number" ? currentUnread : 0) + 1;
    await supabase
      .from("conversations")
      .update({
        updatedat: new Date().toISOString(),
        unreadforadmin: nextUnread,
        lastmessagepreview: lastPreview,
      })
      .eq("id", conversationId);
  } else {
    await supabase
      .from("conversations")
      .update({
        updatedat: new Date().toISOString(),
        lastmessagepreview: lastPreview,
      })
      .eq("id", conversationId);
  }
  const { error } = await supabase.from("messages").insert({
    conversationid: conversationId,
    sender,
    content: content ? String(content).slice(0, 2000) : null,
    attachmenturl: attachmentUrl || null,
    attachmenttype: attachmentType || null,
    createdat: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: String(error.message) }, { status: 500 });
  return NextResponse.json({ ok: true });
}


