import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const { fullName, phone, email, date, time, note } = await req.json();
    if (!fullName || !phone || !date || !time) {
      return new NextResponse("Thiếu dữ liệu", { status: 400 });
    }
    const scheduledAt = new Date(`${date}T${time}:00`);
    // Validate: không cho quá khứ, Chủ nhật đóng cửa, và chỉ trong 10:00–17:30
    const now = new Date();
    if (scheduledAt.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
      return new NextResponse("Ngày không hợp lệ", { status: 400 });
    }
    const day = scheduledAt.getDay(); // 0=CN,1=T2..6=T7
    if (day === 0) return new NextResponse("Chủ nhật đóng cửa", { status: 400 });
    const minutes = scheduledAt.getHours() * 60 + scheduledAt.getMinutes();
    const open = 10 * 60;
    const close = 17 * 60 + 30;
    if (minutes < open || minutes > close) {
      return new NextResponse("Ngoài giờ làm việc (10:00–17:30)", { status: 400 });
    }
    const db = getDb();
    await db.collection("appointments").add({
      fullName,
      phone,
      email: email || null,
      note: note || null,
      scheduledAt,
      status: "unprocessed",
      createdAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return new NextResponse("Lỗi server", { status: 500 });
  }
}


