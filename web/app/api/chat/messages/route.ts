import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(req: NextRequest) {
  const conversationId = req.nextUrl.searchParams.get("conversationId");
  if (!conversationId) return new NextResponse("Thiếu conversationId", { status: 400 });

  const db = getDb();
  const snap = await db
    .collection("conversations")
    .doc(conversationId)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .get();

  const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json(msgs);
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

  const db = getDb();
  const ref = db.collection("conversations").doc(conversationId);
  // Upsert conversation metadata to avoid NOT_FOUND when the doc was deleted or not yet created
  const lastPreview = content ? String(content).slice(0, 120) : attachmentType || "attachment";
  await ref.set(
    {
      updatedAt: FieldValue.serverTimestamp(),
      unreadForAdmin: sender === "CUSTOMER" ? FieldValue.increment(1) : FieldValue.increment(0),
      lastMessagePreview: lastPreview,
    },
    { merge: true }
  );

  await ref.collection("messages").add({
    sender,
    content: content ? String(content).slice(0, 2000) : null,
    attachmentUrl: attachmentUrl || null,
    attachmentType: attachmentType || null,
    createdAt: FieldValue.serverTimestamp(),
  });
  return NextResponse.json({ ok: true });
}


