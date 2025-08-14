import { getDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();
  let hb: NodeJS.Timeout | undefined;
  let unsubscribe: (() => void) | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const db = getDb();
      const ref = db.collection("appointments").orderBy("scheduledAt", "desc");
      unsubscribe = ref.onSnapshot((snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown> & { status?: string; scheduledAt?: unknown; createdAt?: unknown };
          const scheduledAt = typeof (data.scheduledAt as { toDate?: () => Date })?.toDate === 'function'
            ? (data.scheduledAt as { toDate: () => Date }).toDate().toISOString()
            : data.scheduledAt;
          const createdAt = typeof (data.createdAt as { toDate?: () => Date })?.toDate === 'function'
            ? (data.createdAt as { toDate: () => Date }).toDate().toISOString()
            : data.createdAt;
          return { id: d.id, status: data.status || "unprocessed", ...data, scheduledAt, createdAt };
        });
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(list)}\n\n`)); } catch { /* closed */ }
      });
      hb = setInterval(() => { try { controller.enqueue(encoder.encode(`: ping\n\n`)); } catch { /* closed */ } }, 25000);
    },
    cancel() {
      if (hb) clearInterval(hb);
      try { unsubscribe && unsubscribe(); } catch {}
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
}


