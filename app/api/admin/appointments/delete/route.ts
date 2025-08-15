import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return new NextResponse("Missing", { status: 400 });
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: String(error.message) }, { status: 500 });
  return NextResponse.json({ ok: true });
}


