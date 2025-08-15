import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

export async function GET() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("id, customerName:customername, customerPhone:customerphone, customerEmail:customeremail, status, unreadForAdmin:unreadforadmin, lastMessagePreview:lastmessagepreview, createdAt:createdat, updatedAt:updatedat")
    .order("updatedat", { ascending: false });
  if (error) return NextResponse.json({ error: String(error.message) }, { status: 500 });
  return NextResponse.json(data || []);
}


