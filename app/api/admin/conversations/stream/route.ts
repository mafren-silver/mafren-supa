import { getDb } from "@/lib/firebaseAdmin";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();
  let hb: NodeJS.Timeout | undefined;
  let unsubscribe: (() => void) | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const db = getDb();
      const ref = db.collection("conversations").orderBy("updatedAt", "desc");
      unsubscribe = ref.onSnapshot((snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch { /* closed */ }
      });
      hb = setInterval(() => {
        try { controller.enqueue(encoder.encode(`: ping\n\n`)); } catch { /* closed */ }
      }, 25000);
    },
    cancel() {
      if (hb) clearInterval(hb);
      try { unsubscribe && unsubscribe(); } catch {}
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
}


