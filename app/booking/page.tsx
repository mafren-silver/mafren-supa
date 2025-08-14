"use client";
import { useRef, useState } from "react";

export default function BookingPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      fullName: String(fd.get("fullName") || ""),
      phone: String(fd.get("phone") || ""),
      email: fd.get("email") ? String(fd.get("email")) : undefined,
      date: String(fd.get("date") || ""),
      time: String(fd.get("time") || ""),
      note: fd.get("note") ? String(fd.get("note")) : undefined,
    };

    try {
      // Tránh Next client prefetch gây race-condition: dùng absolute URL khi có sẵn window
      const url = typeof window !== 'undefined' ? `${window.location.origin}/api/appointments` : '/api/appointments';
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const t = await res.text();
        setError(t || "Có lỗi xảy ra, vui lòng thử lại.");
        return;
      }
      setDone(true);
      (e.target as HTMLFormElement).reset();
    } catch {
      setError("Không thể kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="max-w-2xl mx-auto px-4 py-12">
      <h2 className="text-3xl tracking-wider">Đặt lịch hẹn tại studio</h2>
      <p className="text-white/70 mt-2">Chọn ngày/giờ trong khung làm việc. Chủ nhật đóng cửa.</p>

      <form onSubmit={onSubmit} className="mt-8 grid gap-4">
        <input name="fullName" required placeholder="Họ và tên" className="bg-transparent border border-white/20 px-4 py-3" />
        <input name="phone" required placeholder="Số điện thoại" className="bg-transparent border border-white/20 px-4 py-3" />
        <input type="email" name="email" placeholder="Email (tuỳ chọn)" className="bg-transparent border border-white/20 px-4 py-3" />
        <div className="grid grid-cols-2 gap-4">
          <input
            type="date"
            name="date"
            required
            min={new Date().toISOString().split("T")[0]}
            ref={dateRef}
            className="bg-transparent border border-white/20 px-4 py-3 cursor-pointer"
            inputMode="none"
            onMouseDown={(e) => {
              // 1 click mở picker (được tính là user gesture)
              try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch {}
            }}
            onKeyDown={(e) => {
              // tránh gõ phím mở bàn phím trên mobile
              if (e.key !== "Tab") e.preventDefault();
            }}
          />
          <select name="time" required className="bg-transparent border border-white/20 px-4 py-3">
            <option value="">Chọn giờ</option>
            {/* Khung làm việc: T2-T7 10:00–17:30, CN đóng cửa */}
            {generateWorkingSlots().map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <textarea name="note" placeholder="Ghi chú / kiểu dáng mong muốn..." className="bg-transparent border border-white/20 px-4 py-3 min-h-[120px]" />
        <button disabled={loading} className="px-5 py-3 bg-white text-black hover:opacity-80 disabled:opacity-50">
          {loading ? "Đang gửi..." : "Xác nhận đặt lịch"}
        </button>
        {done && <p className="text-emerald-400">Cảm ơn bạn! Chúng tôi sẽ liên hệ xác nhận sớm.</p>}
        {error && <p className="text-red-400">{error}</p>}
        <div className="text-xs text-white/50 mt-2">
          Giờ làm việc: Thứ Hai–Thứ Bảy 10:00–17:30 • Chủ Nhật nghỉ
        </div>
      </form>

      {/* Thông tin liên hệ & bản đồ */}
      <div className="mt-12 grid gap-4">
        <h3 className="text-xl tracking-wide">Liên hệ & chỉ đường</h3>
        <div className="text-white/80 space-y-1">
          <p>Địa chỉ: 127/15 Đ. Hoàng Diệu 2, Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh</p>
          <p>
            Điện thoại: <a href="tel:+84396682777" className="underline hover:opacity-80">+84 396 682 777</a>
          </p>
          <p>
            Google Maps: <a href="https://maps.app.goo.gl/gU4yBy32MyrUD8AA9" target="_blank" rel="noreferrer" className="underline hover:opacity-80">Mafren Jewelry</a>
          </p>
        </div>
        <div className="rounded border border-white/10 overflow-hidden">
          <iframe
            title="Bản đồ Mafren Jewelry"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full h-[280px] md:h-[360px]"
            src={
              "https://www.google.com/maps?q=" +
              encodeURIComponent(
                "127/15 Đ. Hoàng Diệu 2, Phường Linh Trung, Thủ Đức, Hồ Chí Minh"
              ) +
              "&output=embed"
            }
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}

function generateWorkingSlots(): string[] {
  const slots: string[] = [];
  // 10:00 -> 17:30, step 30'
  const start = 10 * 60;
  const end = 17 * 60 + 30;
  for (let m = start; m <= end; m += 30) {
    const hh = Math.floor(m / 60).toString().padStart(2, "0");
    const mm = (m % 60).toString().padStart(2, "0");
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}


