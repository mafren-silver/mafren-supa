import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const conversationId = req.nextUrl.searchParams.get("conversationId");
  if (!conversationId) {
    return new Response("Missing conversationId", { status: 400 });
  }

  const encoder = new TextEncoder();
  let hb: NodeJS.Timeout | undefined;
  const supabase = getSupabaseAdminClient();
  const channel = supabase.channel(`realtime-messages-${conversationId}`);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const sendSnapshot = async () => {
        const { data } = await supabase
          .from("messages")
          .select("*")
          .eq("conversationId", conversationId)
          .order("createdAt", { ascending: true });
        const payload = JSON.stringify(data || []);
        try { controller.enqueue(encoder.encode(`data: ${payload}\n\n`)); } catch {}
      };
      channel
        .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversationId=eq.${conversationId}` }, () => {
          void sendSnapshot();
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await sendSnapshot();
          }
        });

      // heartbeat to keep the connection alive
      hb = setInterval(() => { try { controller.enqueue(encoder.encode(`: ping\n\n`)); } catch {} }, 25000);
    },
    cancel() {
      if (hb) clearInterval(hb);
      try { supabase.removeChannel(channel); } catch {}
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


