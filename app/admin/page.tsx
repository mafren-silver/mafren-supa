"use client";
import { useEffect, useRef, useState } from "react";
import AppointmentNotifier from "@/components/AppointmentNotifier";
import AdminIdleReminder from "@/components/AdminIdleReminder";

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
  const fileRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
    const input = inputRef.current;
    const content = input?.value ?? "";
    const trimmed = content.trim();
    if (!trimmed) { if (input) input.value = ""; return; }
    if (sendingRef.current) return;
    sendingRef.current = true;
    if (input) input.value = "";
    // optimistic
    const optimisticId = `local-${Date.now()}`;
    setMessages((prev) => [...prev, { id: optimisticId, sender: "ADMIN", content: trimmed, attachmentUrl: null, attachmentType: null }]);
    try {
      await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedId, sender: "ADMIN", content: trimmed }),
      });
      // refresh
      const res = await fetch(`/api/chat/messages?conversationId=${selectedId}`, { cache: "no-store" });
      if (res.ok) setMessages(await res.json());
      await fetch("/api/admin/conversations/read", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ conversationId: selectedId }) }).catch(() => {});
    } catch {}
    sendingRef.current = false;
  }

  async function sendAttachment(f: File) {
    if (!selectedId || !f) return;
    if (f.size > 50 * 1024 * 1024) {
      alert('Tệp quá lớn (tối đa 50MB). Vui lòng nén hoặc chọn tệp nhỏ hơn.');
      return;
    }
    let toUpload: File = f;
    try {
      if (f.type.startsWith("image/") && f.size > 1024 * 1024) {
        // Nén ảnh xuống khoảng <= 1MB bằng canvas
        const img = document.createElement("img");
        const url = URL.createObjectURL(f);
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = (e) => reject(e);
          img.src = url;
        });
        const maxBytes = 1024 * 1024;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const scale = Math.sqrt(Math.min(1, maxBytes / f.size));
          const w = Math.max(1, Math.floor(img.naturalWidth * scale));
          const h = Math.max(1, Math.floor(img.naturalHeight * scale));
          canvas.width = w; canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);
          const mime = f.type.startsWith("image/") ? f.type : "image/jpeg";
          const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b || new Blob()), mime, 0.8));
          if (blob.size <= maxBytes) toUpload = new File([blob], f.name, { type: mime });
        }
        URL.revokeObjectURL(url);
      }
    } catch {}
    // Use signed upload URL to avoid Vercel 413 and satisfy RLS
    try {
      const sign = await fetch('/api/storage/upload-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: toUpload.name, contentType: toUpload.type }) });
      if (!sign.ok) throw new Error(await sign.text());
      const { path, token, contentType } = await sign.json();
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'uploads';
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
      const uploadRes = await fetch(`${base}/storage/v1/object/upload/sign/${bucket}/${encodeURIComponent(path)}?token=${encodeURIComponent(token)}`, {
        method: 'PUT',
        headers: { 'Content-Type': contentType || toUpload.type || 'application/octet-stream' },
        body: toUpload,
      });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const url = `/api/files/${encodeURIComponent(path)}`;
      await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedId, sender: "ADMIN", attachmentUrl: url, attachmentType: toUpload.type }),
      });
    } catch (e) {
      alert((e as Error).message || 'Không thể tải tệp lên.');
      return;
    }
    // refresh messages
    const res = await fetch(`/api/chat/messages?conversationId=${selectedId}`, { cache: "no-store" });
    if (res.ok) setMessages(await res.json());
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
      {/* Nhắc nhở khi bỏ quên lịch hẹn > 1 phút hoặc có việc cần xử lý */}
      <AdminIdleReminder enabled />
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
                  <div className={`inline-block px-3 py-2 space-y-1 ${m.sender === "ADMIN" ? "bg-white text-black" : "bg-white/10"}`}>
                    <div className="text-xs opacity-60">{m.sender === "ADMIN" ? "Bạn (Admin)" : "Khách"}</div>
                    {m.attachmentUrl ? (
                      m.attachmentType?.startsWith("image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.attachmentUrl} alt="attachment" className="max-w-[260px] rounded cursor-zoom-in" onClick={() => setPreviewUrl(m.attachmentUrl || null)} />
                      ) : m.attachmentType?.startsWith("video/") ? (
                        <video src={m.attachmentUrl || undefined} controls className="max-w-[320px] rounded" />
                      ) : (
                        <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="underline break-all text-xs">
                          Tệp đính kèm
                        </a>
                      )
                    ) : null}
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
                  // Tránh gửi khi đang gõ tiếng Việt (IME composing)
                  // @ts-expect-error: nativeEvent is available at runtime
                  const composing = e.isComposing || e.nativeEvent?.isComposing || false;
                  if (e.key === "Enter" && !e.shiftKey && !composing) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <label className="px-3 py-2 border border-white/20 cursor-pointer text-sm" title="Tải lên ảnh/video">
                +
                <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => e.target.files && sendAttachment(e.target.files[0])} />
              </label>
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

      {previewUrl && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={() => setPreviewUrl(null)}>
          <div className="relative max-w-[70vw] max-h-[70vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="preview" className="max-w-[70vw] max-h-[70vh] object-contain" />
            <div className="absolute top-2 right-2 flex gap-2">
              <a href={previewUrl} download className="px-3 py-1 bg-white text-black text-xs">Tải xuống</a>
              <button onClick={() => setPreviewUrl(null)} className="px-3 py-1 bg-white text-black text-xs">Đóng</button>
            </div>
          </div>
        </div>
      )}
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
