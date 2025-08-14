import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  const { customerName, customerPhone, customerEmail } = await req.json();
  if (!customerName || !customerPhone) {
    return new NextResponse("Thiếu thông tin", { status: 400 });
  }
  const db = getDb();
  const doc = await db.collection("conversations").add({
    customerName,
    customerPhone,
    customerEmail: customerEmail || null,
    status: "OPEN",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return NextResponse.json({ id: doc.id });
}


