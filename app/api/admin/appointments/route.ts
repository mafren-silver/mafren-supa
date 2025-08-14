import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const db = getDb();
  const snap = await db.collection("appointments").orderBy("scheduledAt", "desc").get();
  const list = snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown> & { scheduledAt?: unknown; createdAt?: unknown; status?: string };
    const scheduledAt = typeof (data.scheduledAt as { toDate?: () => Date })?.toDate === 'function'
      ? (data.scheduledAt as { toDate: () => Date }).toDate().toISOString()
      : data.scheduledAt;
    const createdAt = typeof (data.createdAt as { toDate?: () => Date })?.toDate === 'function'
      ? (data.createdAt as { toDate: () => Date }).toDate().toISOString()
      : data.createdAt;
    return { id: d.id, status: data.status || "unprocessed", ...data, scheduledAt, createdAt };
  });
  return NextResponse.json(list);
}


