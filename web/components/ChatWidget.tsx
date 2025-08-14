"use client";
import { useEffect, useRef, useState } from "react";

type Msg = { id: string; sender: "CUSTOMER" | "ADMIN"; content: string | null; attachmentUrl?: string | null; attachmentType?: string | null; createdAt?: unknown };

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [starting, setStarting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastLenRef = useRef(0);
  const sendingRef = useRef(false);
  const zaloUrl = "https://zalo.me/0396682777"; // +84 396 682 777
  const instagramUrl = "https://www.instagram.com/mafren_jewelry/";

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

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
    const fd = new FormData();
    fd.append("file", f);
    const up = await fetch("/api/chat/upload", { method: "POST", body: fd });
    if (!up.ok) return;
    const meta = await up.json();
    if (sendingRef.current) return;
    sendingRef.current = true;
    await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: convId, sender: "CUSTOMER", attachmentUrl: meta.url, attachmentType: meta.contentType }),
    });
    sendingRef.current = false;
    new Audio("/audio/message_sent.mp3").play().catch(()=>{});
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
        <div className="fixed bottom-20 right-5 z-40 w-[360px] max-w-[96vw] bg-black border border-white/15 shadow-xl">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="text-sm tracking-wide">Nhắn tin với MAFREN</div>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white">✕</button>
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
              <div ref={listRef} className="h-64 overflow-auto space-y-2">
                {messages.map((m) => (
                  <div key={m.id} className={`max-w-[80%] ${m.sender === "CUSTOMER" ? "self-end ml-auto text-right" : ""}`}>
                    <div className={`inline-block px-3 py-2 ${m.sender === "CUSTOMER" ? "bg-white text-black" : "bg-white/10"}`}>
                      <div className="text-xs opacity-60">{m.sender === "CUSTOMER" ? "Bạn" : "MAFREN"}</div>
                      {m.attachmentUrl ? (
                        m.attachmentType?.startsWith("image/") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.attachmentUrl} alt="attachment" className="max-w-[200px] mt-1" />
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
                <label className="px-3 py-2 border border-white/20 cursor-pointer text-sm">+
                  <input type="file" className="hidden" onChange={(e) => e.target.files && sendAttachment(e.target.files[0])} />
                </label>
                <button onClick={send} className="px-4 py-2 bg-white text-black hover:opacity-90">Gửi</button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}


