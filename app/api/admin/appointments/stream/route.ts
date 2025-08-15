import { getSupabaseAdminClient } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();
  let hb: NodeJS.Timeout | undefined;
  const supabase = getSupabaseAdminClient();
  const channel = supabase.channel("realtime-appointments");
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const sendSnapshot = async () => {
        const { data } = await supabase
          .from("appointments")
          .select("id, fullName:fullname, phone, email, note, scheduledAt:scheduledat, status, createdAt:createdat")
          .order("scheduledat", { ascending: false });
        const list = ((data as Array<Record<string, unknown>> | null) || []).map((row) => ({ ...row, status: (row.status as string | null) || "unprocessed" }));
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(list)}\n\n`)); } catch {}
      };
      channel
        .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => {
          void sendSnapshot();
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await sendSnapshot();
          }
        });
      hb = setInterval(() => { try { controller.enqueue(encoder.encode(`: ping\n\n`)); } catch {} }, 25000);
    },
    cancel() {
      if (hb) clearInterval(hb);
      try { supabase.removeChannel(channel); } catch {}
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
}


