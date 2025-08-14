import { NextRequest } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const conversationId = req.nextUrl.searchParams.get("conversationId");
  if (!conversationId) {
    return new Response("Missing conversationId", { status: 400 });
  }

  const encoder = new TextEncoder();
  let hb: NodeJS.Timeout | undefined;
  let unsubscribe: (() => void) | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const db = getDb();
      const ref = db
        .collection("conversations")
        .doc(conversationId)
        .collection("messages")
        .orderBy("createdAt", "asc");

      unsubscribe = ref.onSnapshot(
        (snap) => {
          const payload = JSON.stringify(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          try { controller.enqueue(encoder.encode(`data: ${payload}\n\n`)); } catch { /* closed */ }
        },
        (err) => {
          try { controller.enqueue(encoder.encode(`event: error\n` + `data: ${JSON.stringify({ message: String(err) })}\n\n`)); } catch { /* closed */ }
        }
      );

      // heartbeat to keep the connection alive
      hb = setInterval(() => { try { controller.enqueue(encoder.encode(`: ping\n\n`)); } catch { /* closed */ } }, 25000);
    },
    cancel() {
      if (hb) clearInterval(hb);
      try { unsubscribe && unsubscribe(); } catch {}
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}


