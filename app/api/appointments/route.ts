import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseClient";

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
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("appointments").insert({
      fullName,
      phone,
      email: email || null,
      note: note || null,
      scheduledAt: scheduledAt.toISOString(),
      status: "unprocessed",
      createdAt: new Date().toISOString(),
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/appointments] POST error:", err);
    return new NextResponse("Lỗi server", { status: 500 });
  }
}


