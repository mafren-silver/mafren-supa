import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { id, status } = await req.json();
  if (!id || !status) return new NextResponse("Missing", { status: 400 });
  const db = getDb();
  await db.collection("appointments").doc(id).update({ status });
  return NextResponse.json({ ok: true });
}


