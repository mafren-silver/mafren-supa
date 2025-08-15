import { getSupabaseAdminClient } from "@/lib/supabaseClient";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();
  let hb: NodeJS.Timeout | undefined;
  const supabase = getSupabaseAdminClient();
  const channel = supabase.channel("realtime-conversations");
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const sendSnapshot = async () => {
        const { data } = await supabase
          .from("conversations")
          .select("id, customerName:customername, customerPhone:customerphone, customerEmail:customeremail, status, unreadForAdmin:unreadforadmin, lastMessagePreview:lastmessagepreview, createdAt:createdat, updatedAt:updatedat")
          .order("updatedat", { ascending: false });
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data || [])}\n\n`)); } catch {}
      };
      channel
        .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
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


