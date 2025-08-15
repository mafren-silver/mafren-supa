import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .order("scheduledAt", { ascending: false });
  if (error) return NextResponse.json({ error: String(error.message) }, { status: 500 });
  type Row = { id: string; fullName: string; phone: string; email: string | null; note: string | null; scheduledAt: string; status: string | null; createdAt: string | null };
  const list = (data as Row[] | null) || [];
  const normalized = list.map((row) => ({ ...row, status: row.status || "unprocessed" }));
  return NextResponse.json(normalized);
}


