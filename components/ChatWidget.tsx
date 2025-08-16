"use client";
import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

type Msg = { id: string; sender: "CUSTOMER" | "ADMIN"; content: string | null; attachmentUrl?: string | null; attachmentType?: string | null; createdAt?: unknown };

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [starting, setStarting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadLabel, setUploadLabel] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastLenRef = useRef(0);
  const sendingRef = useRef(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const zaloUrl = "https://zalo.me/0396682777"; // +84 396 682 777
  const instagramUrl = "https://www.instagram.com/mafren_jewelry/";
  const STORAGE_KEY = "mafren_conversation_id";

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  useEffect(() => {
    // resume conversation from localStorage if exists
    if (typeof window !== 'undefined' && !convId) {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setConvId(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (convId) window.localStorage.setItem(STORAGE_KEY, convId);
    else window.localStorage.removeItem(STORAGE_KEY);
  }, [convId]);

  // Fetch existing messages immediately after we have a conversation id
  useEffect(() => {
    if (!convId) return;
    (async () => {
      try {
        const res = await fetch(`/api/chat/messages?conversationId=${encodeURIComponent(convId)}`);
        if (res.ok) {
          const data = (await res.json()) as Msg[];
          lastLenRef.current = data.length;
          setMessages(data);
        }
      } catch {}
    })();
  }, [convId]);

  useEffect(() => {
    if (!convId) return;
    const sse = new EventSource(`/api/chat/stream?conversationId=${convId}`);
    sse.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as Msg[];
        const isNew = data.length > lastLenRef.current;
        lastLenRef.current = data.length;
        setMessages(data);
        if (isNew) new Audio("/audio/message_received.mp3").play().catch(()=>{});
      } catch {}
    };
    sse.onerror = () => sse.close();
    return () => sse.close();
  }, [convId]);

  async function start(name: string, phone: string, email?: string) {
    if (!name || !phone) return;
    setStarting(true);
    const res = await fetch("/api/chat/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerName: name, customerPhone: phone, customerEmail: email }),
    });
    setStarting(false);
    if (res.ok) {
      const data = await res.json();
      setConvId(data.id);
      try { window.localStorage.setItem(STORAGE_KEY, data.id); } catch {}
    }
  }

  async function send() {
    if (!convId) return;
    const content = inputRef.current?.value?.trim();
    if (!content) return;
    inputRef.current!.value = "";
    if (sendingRef.current) return;
    sendingRef.current = true;
    await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: convId, sender: "CUSTOMER", content }),
    });
    sendingRef.current = false;
    new Audio("/audio/message_sent.mp3").play().catch(()=>{});
  }

  async function sendAttachment(f: File) {
    if (!convId || !f) return;
    const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB
    if (f.size > MAX_UPLOAD_BYTES) {
      alert("Tệp quá lớn (tối đa 50MB). Vui lòng nén hoặc chọn tệp nhỏ hơn.");
      return;
    }
    let toUpload: File = f;
    try {
      if (f.type.startsWith("image/") && f.size > 1024 * 1024) {
        setUploading(true); setUploadLabel("Đang nén ảnh...");
        // compress image to ~1MB using canvas
        const img = document.createElement("img");
        const url = URL.createObjectURL(f);
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = (e) => reject(e);
          img.src = url;
        });
        const maxBytes = 1024 * 1024; // 1MB
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const scale = Math.sqrt(Math.min(1, (maxBytes / f.size)));
          const w = Math.max(1, Math.floor(img.naturalWidth * scale));
          const h = Math.max(1, Math.floor(img.naturalHeight * scale));
          canvas.width = w; canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);
          const mime = f.type.startsWith("image/") ? f.type : "image/jpeg";
          const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b || new Blob()), mime, 0.8));
          if (blob.size <= maxBytes) {
            toUpload = new File([blob], f.name, { type: mime });
          }
        }
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      // fallback: gửi nguyên bản nếu nén thất bại
      console.warn("Compress failed, fallback to direct upload:", e);
    }
    try {
      setUploadLabel("Đang tải lên..."); setUploading(true);
      // Option A: Signed upload URL (server signs; client uploads with PUT) to satisfy strict RLS
      const sign = await fetch('/api/storage/upload-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: toUpload.name, contentType: toUpload.type }) });
      if (!sign.ok) throw new Error(await sign.text());
      const { path, token, contentType } = await sign.json();
      const supabase = getSupabaseClient();
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'uploads';
      const uploadRes = await fetch(`https://camjmeyydgpwlwukxvti.supabase.co/storage/v1/object/upload/sign/${bucket}/${encodeURIComponent(path)}?token=${encodeURIComponent(token)}`, {
        method: 'PUT',
        headers: { 'Content-Type': contentType || toUpload.type || 'application/octet-stream' },
        body: toUpload,
      });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const url = `/api/files/${encodeURIComponent(path)}`;
      if (sendingRef.current) return;
      sendingRef.current = true;
      await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId, sender: "CUSTOMER", attachmentUrl: url, attachmentType: toUpload.type }),
      });
      sendingRef.current = false;
      new Audio("/audio/message_sent.mp3").play().catch(()=>{});
    } catch (err) {
      alert((err as Error).message || "Không thể tải tệp lên.");
    } finally {
      setUploading(false); setUploadLabel(null);
    }
  }

  function endChat() {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
    setConvId(null);
    setMessages([]);
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-40 px-4 py-3 bg-white text-black shadow-lg hover:opacity-90"
      >
        Chat với MAFREN
      </button>

          {open && (
        <div className={`fixed z-40 bg-black border border-white/15 shadow-xl ${expanded ? 'bottom-5 right-5 w-[90vw] md:w-[540px]' : 'bottom-20 right-5 w-[360px] max-w-[96vw]'}`}>
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="text-sm tracking-wide">Nhắn tin với MAFREN</div>
            <div className="flex items-center gap-2">
              {convId && (
                <button onClick={endChat} className="text-white/60 hover:text-white text-xs" title="Kết thúc chat">↺</button>
              )}
              <button onClick={() => setExpanded((v) => !v)} className="text-white/60 hover:text-white" title={expanded ? 'Thu nhỏ' : 'Phóng to'}>{expanded ? '⤡' : '⤢'}</button>
              <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white">✕</button>
            </div>
          </div>

          {!convId ? (
            <div className="p-4 space-y-2">
              <input id="cw_name" placeholder="Họ và tên" className="w-full bg-transparent border border-white/20 px-3 py-2" />
              <input id="cw_phone" placeholder="Số điện thoại" className="w-full bg-transparent border border-white/20 px-3 py-2" />
              <input id="cw_email" placeholder="Email (tuỳ chọn)" className="w-full bg-transparent border border-white/20 px-3 py-2" />
              <button
                disabled={starting}
                onClick={() =>
                  start(
                    (document.getElementById("cw_name") as HTMLInputElement)?.value,
                    (document.getElementById("cw_phone") as HTMLInputElement)?.value,
                    (document.getElementById("cw_email") as HTMLInputElement)?.value
                  )
                }
                className="w-full px-3 py-2 bg-white text-black hover:opacity-90 disabled:opacity-50"
              >
                {starting ? "Đang tạo..." : "Bắt đầu chat"}
              </button>
                  <div className="flex gap-2 pt-1">
                    <a
                      href={zaloUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 text-center px-3 py-2 border border-white/20 hover:bg-white/10 text-sm"
                      aria-label="Liên hệ Zalo"
                    >
                      Zalo
                    </a>
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 text-center px-3 py-2 border border-white/20 hover:bg-white/10 text-sm"
                      aria-label="Xem Instagram"
                    >
                      Instagram
                    </a>
                  </div>
            </div>
          ) : (
            <div className="p-3 flex flex-col gap-2">
              <div ref={listRef} className={`${expanded ? 'h-[70vh]' : 'h-64'} overflow-auto space-y-2`}>
                {messages.map((m) => (
                  <div key={m.id} className={`max-w-[80%] ${m.sender === "CUSTOMER" ? "self-end ml-auto text-right" : ""}`}>
                    <div className={`inline-block px-3 py-2 ${m.sender === "CUSTOMER" ? "bg-white text-black" : "bg-white/10"}`}>
                      <div className="text-xs opacity-60">{m.sender === "CUSTOMER" ? "Bạn" : "MAFREN"}</div>
                      {m.attachmentUrl ? (
                        m.attachmentType?.startsWith("image/") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.attachmentUrl} alt="attachment" className="max-w-[200px] mt-1 cursor-zoom-in" onClick={() => setPreviewUrl(m.attachmentUrl || null)} />
                        ) : m.attachmentType?.startsWith("video/") ? (
                          <video src={m.attachmentUrl || undefined} controls className="max-w-[220px] mt-1 rounded" />
                        ) : (
                          <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="underline">Tệp đính kèm</a>
                        )
                      ) : null}
                      {m.content ? <div>{m.content}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  placeholder="Nhập tin nhắn..."
                  className="bg-transparent border border-white/20 px-3 py-2 flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <label className={`px-3 py-2 border border-white/20 cursor-pointer text-sm ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>+
                  <input type="file" accept="image/*,video/*" className="hidden" disabled={uploading} onChange={(e) => e.target.files && sendAttachment(e.target.files[0])} />
                </label>
                <button onClick={send} disabled={uploading} className={`px-4 py-2 bg-white text-black hover:opacity-90 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>Gửi</button>
              </div>
              {uploading && (
                <div className="flex items-center gap-2 text-xs text-white/80 mt-1">
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>{uploadLabel || 'Đang xử lý...'}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
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
    </>
  );
}


