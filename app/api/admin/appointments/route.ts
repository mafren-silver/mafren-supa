import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, fullName:fullname, phone, email, note, scheduledAt:scheduledat, status, createdAt:createdat"
    )
    .order("scheduledat", { ascending: false });
  if (error) return NextResponse.json({ error: String(error.message) }, { status: 500 });
  const list = (data as Array<Record<string, unknown>> | null) || [];
  const normalized = list.map((row) => ({ ...row, status: (row.status as string | null) || "unprocessed" }));
  return NextResponse.json(normalized);
}


