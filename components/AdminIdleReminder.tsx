"use client";
import { useEffect, useRef, useState } from "react";

export default function AdminIdleReminder({ enabled }: { enabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [needsAttention, setNeedsAttention] = useState(false);
  const lastActionRef = useRef<number>(Date.now());

  // Theo dõi thao tác người dùng
  useEffect(() => {
    if (!enabled) return;
    const onActivity = () => (lastActionRef.current = Date.now());
    window.addEventListener("click", onActivity);
    window.addEventListener("keydown", onActivity);
    return () => {
      window.removeEventListener("click", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [enabled]);

  // Lắng nghe hội thoại và lịch hẹn để quyết định có cần nhắc không
  useEffect(() => {
    if (!enabled) return;
    const convES = new EventSource("/api/admin/conversations/stream");
    const apptES = new EventSource("/api/admin/appointments/stream");
    let convNeeds = false;
    let apptNeeds = false;
    const recompute = () => setNeedsAttention(convNeeds || apptNeeds);

    convES.onmessage = (e) => {
      try {
        const list = JSON.parse(e.data) as Array<{ unreadForAdmin?: number; status?: string }>;
        convNeeds = list.some((c) => (c.unreadForAdmin ?? 0) > 0 && c.status !== "ARCHIVED");
        recompute();
      } catch {}
    };
    apptES.onmessage = (e) => {
      try {
        const list = JSON.parse(e.data) as Array<{ status?: string }>;
        apptNeeds = list.some((a) => (a.status || "unprocessed") === "unprocessed");
        recompute();
      } catch {}
    };
    return () => { convES.close(); apptES.close(); };
  }, [enabled]);

  // Bộ đếm thời gian: chỉ nhắc khi thực sự còn việc cần xử lý
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => {
      if (document.hidden) return; // không nhắc khi tab ẩn
      if (!needsAttention) return; // mọi việc đã xử lý xong
      if (Date.now() - lastActionRef.current > 60_000) {
        setOpen(true);
        new Audio("/audio/task_reminder.mp3").play().catch(() => {});
      }
    }, 10_000);
    return () => clearInterval(t);
  }, [enabled, needsAttention]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-black border border-white/20 p-6 max-w-md w-[90%]">
        <div className="text-lg mb-2">Nhắc nhở xử lý</div>
        <p className="text-white/70">Bạn đã hơn 1 phút chưa trả lời tin nhắn hoặc xử lý lịch hẹn. Vui lòng kiểm tra lại hộp thư và mục lịch hẹn.</p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setOpen(false)} className="px-4 py-2 bg-white text-black">Đã hiểu</button>
        </div>
      </div>
    </div>
  );
}


