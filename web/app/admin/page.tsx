"use client";
import { useEffect, useRef, useState } from "react";
import AppointmentNotifier from "@/components/AppointmentNotifier";

// Rebuilt Admin page: simple, robust, polling-based (no SSE)
export default function AdminHome() {
  type Conv = {
    id: string;
    customerName?: string;
    customerPhone?: string;
    status?: string;
    unreadForAdmin?: number;
    lastMessagePreview?: string;
    updatedAt?: unknown;
  };
  type Msg = {
    id: string;
    sender: "CUSTOMER" | "ADMIN";
    content: string | null;
    attachmentUrl?: string | null;
    attachmentType?: string | null;
    createdAt?: unknown;
  };
  type Appt = {
    id: string;
    fullName: string;
    phone: string;
    email?: string | null;
    note?: string | null;
    scheduledAt: unknown;
    status?: string;
  };

  const [conversations, setConversations] = useState<Conv[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [appointments, setAppointments] = useState<Appt[]>([]);
  const [convFilter, setConvFilter] = useState<"active" | "archived" | "all">("active");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);

  // Poll conversations every 5s (and immediately)
  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const res = await fetch("/api/admin/conversations", { cache: "no-store", credentials: "include" });
        if (!res.ok) return;
        const list = (await res.json()) as (Conv & { updatedAt?: unknown })[];
        const sorted = [...list].sort((a, b) => getDate(b.updatedAt) - getDate(a.updatedAt));
        if (!stopped) setConversations(sorted);
      } catch {}
    };
    load();
    const t = setInterval(load, 5000);
    return () => { stopped = true; clearInterval(t); };
  }, []);

  // Poll messages for selected conversation
  useEffect(() => {
    if (!selectedId) return;
    let stopped = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/chat/messages?conversationId=${selectedId}`, { cache: "no-store" });
        if (!res.ok) return;
        const list = (await res.json()) as Msg[];
        if (!stopped) setMessages(list);
      } catch {}
    };
    load();
    const t = setInterval(load, 2000);
    // mark as read
    fetch("/api/admin/conversations/read", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ conversationId: selectedId }) }).catch(() => {});
    return () => { stopped = true; clearInterval(t); };
  }, [selectedId]);

  // Poll appointments every 5s (gần real-time) và phát âm nếu phát hiện tăng
  useEffect(() => {
    let stopped = false;
    let lastUnprocessed = 0;
    const load = async () => {
      try {
        const res = await fetch("/api/admin/appointments", { cache: "no-store", credentials: "include" });
        if (!res.ok) return;
        const list = (await res.json()) as Appt[];
        if (!stopped) setAppointments(list);
        const unprocessed = list.filter(a => (a.status || 'unprocessed') === 'unprocessed').length;
        if (unprocessed > lastUnprocessed) {
          const audio = new Audio('/audio/luxury_new_order/booking.mp3');
          audio.play().catch(()=>{});
        }
        lastUnprocessed = unprocessed;
      } catch {}
    };
    load();
    const t = setInterval(load, 5000);
    return () => { stopped = true; clearInterval(t); };
  }, []);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [messages.length]);

  async function send() {
    if (!selectedId) return;
    const content = inputRef.current?.value?.trim();
    if (!content) return;
    if (sendingRef.current) return;
    sendingRef.current = true;
    inputRef.current!.value = "";
    // optimistic
    const optimisticId = `local-${Date.now()}`;
    setMessages((prev) => [...prev, { id: optimisticId, sender: "ADMIN", content, attachmentUrl: null, attachmentType: null }]);
    try {
      await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedId, sender: "ADMIN", content }),
      });
      // refresh
      const res = await fetch(`/api/chat/messages?conversationId=${selectedId}`, { cache: "no-store" });
      if (res.ok) setMessages(await res.json());
      await fetch("/api/admin/conversations/read", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ conversationId: selectedId }) }).catch(() => {});
    } catch {}
    sendingRef.current = false;
  }

  async function archiveSelected() {
    if (!selectedId) return;
    await fetch("/api/admin/conversations/update", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id: selectedId, action: "archive" }) });
  }

  async function deleteSelected() {
    if (!selectedId) return;
    await fetch("/api/admin/conversations/update", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id: selectedId, action: "delete" }) });
    setSelectedId(null);
    setMessages([]);
  }

  return (
    <section className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
      <AppointmentNotifier />
      <div className="border border-white/10 md:col-span-1 max-h-[65vh] flex flex-col">
        <div className="px-3 py-2 text-sm tracking-wide border-b border-white/10 flex items-center gap-2">
          <span className="opacity-80">Hội thoại</span>
          <div className="ml-auto flex gap-1">
            <button onClick={() => setConvFilter("active")} className={`px-2 py-1 text-xs border ${convFilter === "active" ? "bg-white text-black" : "border-white/20"}`}>Hoạt động</button>
            <button onClick={() => setConvFilter("archived")} className={`px-2 py-1 text-xs border ${convFilter === "archived" ? "bg-white text-black" : "border-white/20"}`}>Đã lưu</button>
            <button onClick={() => setConvFilter("all")} className={`px-2 py-1 text-xs border ${convFilter === "all" ? "bg-white text-black" : "border-white/20"}`}>Tất cả</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto divide-y divide-white/10">
          {conversations
            .filter((c) => (convFilter === "all" ? true : convFilter === "archived" ? ((c.status || "").toUpperCase() === "ARCHIVED") : ((c.status || "").toUpperCase() !== "ARCHIVED")))
            .map((c) => (
              <button key={c.id} onClick={() => setSelectedId(c.id)} className={`w-full text-left px-3 py-2 hover:bg-white/5 ${selectedId === c.id ? "bg-white/5" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-sm">{c.customerName || "Khách"} — {c.customerPhone || ""}</div>
                    <div className="text-xs text-white/60">#{c.id.slice(0, 6)} • {c.status}</div>
                  </div>
                  {(c.unreadForAdmin ?? 0) > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{c.unreadForAdmin}</span>
                  )}
                </div>
                {c.lastMessagePreview && <div className="text-xs opacity-70 mt-1 line-clamp-1">{c.lastMessagePreview}</div>}
              </button>
            ))}
        </div>
      </div>

      <div className="border border-white/10 md:col-span-2 min-h-[65vh] max-h-[65vh] flex flex-col">
        <div className="px-3 py-2 text-sm tracking-wide border-b border-white/10">{selectedId ? `Hội thoại #${selectedId.slice(0, 6)}` : "Chọn 1 hội thoại"}</div>
        {selectedId ? (
          <>
            <div ref={listRef} className="flex-1 overflow-auto p-3 space-y-2">
              {messages.map((m) => (
                <div key={m.id} className={`max-w-[80%] ${m.sender === "ADMIN" ? "self-end ml-auto text-right" : ""}`}>
                  <div className={`inline-block px-3 py-2 ${m.sender === "ADMIN" ? "bg-white text-black" : "bg-white/10"}`}>
                    <div className="text-xs opacity-60">{m.sender === "ADMIN" ? "Bạn (Admin)" : "Khách"}</div>
                    {m.content ? <div>{m.content}</div> : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 flex gap-2 items-center border-t border-white/10">
              <input
                ref={inputRef}
                placeholder="Nhập tin nhắn..."
                className="bg-transparent border border-white/20 px-4 py-3 flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <button onClick={() => { send(); }} className="px-5 py-3 bg-white text-black hover:opacity-80">Gửi</button>
              <div className="flex items-center gap-2">
                <button onClick={archiveSelected} className="px-3 py-2 border border-white/20 text-sm">Lưu trữ</button>
                <button onClick={deleteSelected} className="px-3 py-2 border border-white/20 text-sm text-red-400">Xoá</button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-6 text-white/60">Chọn một hội thoại ở bên trái để bắt đầu</div>
        )}
      </div>

      <div className="md:col-span-3">
        <h2 className="text-2xl tracking-wider">Quản lý lịch hẹn</h2>
        <div className="mt-4 overflow-x-auto border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left px-3 py-2">Khách</th>
                <th className="text-left px-3 py-2">Điện thoại</th>
                <th className="text-left px-3 py-2">Email</th>
                <th className="text-left px-3 py-2">Thời gian</th>
                <th className="text-left px-3 py-2">Ghi chú</th>
                <th className="text-left px-3 py-2">Trạng thái</th>
                <th className="text-right px-3 py-2">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id} className="border-t border-white/10">
                  <td className="px-3 py-2">{a.fullName}</td>
                  <td className="px-3 py-2">{a.phone}</td>
                  <td className="px-3 py-2">{a.email || "—"}</td>
                  <td className="px-3 py-2">{formatDate(a.scheduledAt)}</td>
                  <td className="px-3 py-2">{a.note || ""}</td>
                  <td className="px-3 py-2">
                    <select
                      defaultValue={(a as unknown as { status?: string }).status || "unprocessed"}
                      className="bg-transparent border border-white/20 px-2 py-1 text-xs"
                      onChange={async (e) => {
                        await fetch('/api/admin/appointments/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ id: a.id, status: (e.target as HTMLSelectElement).value }) });
                      }}
                    >
                      <option value="unprocessed">Chưa xử lý</option>
                      <option value="processed">Đã xử lý</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button className="text-xs text-red-400 border border-white/20 px-2 py-1" onClick={async()=>{ await fetch('/api/admin/appointments/delete',{method:'POST', headers:{'Content-Type':'application/json'}, credentials: 'include', body: JSON.stringify({id:a.id})}); }}>Xoá</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function formatDate(v: unknown): string {
  const ts = v as { toDate?: () => Date };
  if (typeof ts?.toDate === 'function') return ts.toDate().toLocaleString('vi-VN');
  const d = new Date(v as string | number | Date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN');
}

function getDate(v: unknown): number {
  const ts = v as { toDate?: () => Date };
  if (typeof ts?.toDate === 'function') return ts.toDate().getTime();
  const d = new Date(v as string | number | Date);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}
