import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { id, action } = await req.json();
  if (!id || !action) return new NextResponse("Missing", { status: 400 });
  const db = getDb();
  if (action === "archive") {
    // Use merge set to avoid NOT_FOUND when doc does not exist anymore
    await db.collection("conversations").doc(id).set({ status: "ARCHIVED", unreadForAdmin: 0 }, { merge: true });
  } else if (action === "delete") {
    // delete subcollection messages then the doc (simple sweep)
    const messages = await db.collection("conversations").doc(id).collection("messages").get();
    const batch = db.batch();
    messages.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    await db.collection("conversations").doc(id).delete();
  }
  return NextResponse.json({ ok: true });
}


