import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";

export async function GET() {
  const db = getDb();
  const snap = await db.collection("conversations").orderBy("updatedAt", "desc").get();
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json(list);
}


