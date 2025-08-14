import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { conversationId } = await req.json();
  if (!conversationId) return new NextResponse("Missing conversationId", { status: 400 });
  try {
    const db = getDb();
    // Dùng set(merge) để không lỗi khi doc chưa tồn tại/đã bị xoá
    await db.collection("conversations").doc(conversationId).set({ unreadForAdmin: 0, updatedAt: new Date() }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch {
    // Tránh làm vỡ UI do lỗi không quan trọng
    return NextResponse.json({ ok: true });
  }
}


