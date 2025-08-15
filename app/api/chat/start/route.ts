import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

export async function POST(req: NextRequest) {
  const { customerName, customerPhone, customerEmail } = await req.json();
  if (!customerName || !customerPhone) {
    return new NextResponse("Thiếu thông tin", { status: 400 });
  }
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      customerName,
      customerPhone,
      customerEmail: customerEmail || null,
      status: "OPEN",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      unreadForAdmin: 0,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: String(error.message) }, { status: 500 });
  return NextResponse.json({ id: data?.id });
}


