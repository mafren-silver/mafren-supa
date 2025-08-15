import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { conversationId } = await req.json();
  if (!conversationId) return new NextResponse("Missing conversationId", { status: 400 });
  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("conversations")
      .update({ unreadForAdmin: 0, updatedAt: new Date().toISOString() })
      .eq("id", conversationId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    // Tránh làm vỡ UI do lỗi không quan trọng
    return NextResponse.json({ ok: true });
  }
}


