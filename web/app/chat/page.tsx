"use client";
import { useEffect, useRef, useState } from "react";

type TimestampLike = { toDate?: () => Date } | string | number | null | undefined;
type Msg = { id: string; sender: "CUSTOMER" | "ADMIN"; content: string; createdAt?: TimestampLike };

export default function ChatPage() {
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!convId) return;
    const load = async () => {
      const res = await fetch(`/api/chat/messages?conversationId=${convId}`, { cache: "no-store" });
      if (res.ok) setMessages(await res.json());
    };
    load();
    const t: NodeJS.Timeout = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [convId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function startConversation(fd: FormData) {
    setLoading(true);
    const res = await fetch("/api/chat/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: fd.get("name"),
        customerPhone: fd.get("phone"),
        customerEmail: fd.get("email"),
      }),
    });
    setLoading(false);
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
    await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: convId, sender: "CUSTOMER", content }),
    });
  }

  if (!convId) {
    return (
      <section className="max-w-md mx-auto px-4 py-12">
        <h2 className="text-2xl tracking-wider">Nhắn tin với MAFREN</h2>
        <p className="text-white/70 mt-2">Điền thông tin để bắt đầu hội thoại.</p>
        <form
          className="mt-6 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            startConversation(new FormData(e.currentTarget));
          }}
        >
          <input name="name" required placeholder="Họ và tên" className="bg-transparent border border-white/20 px-4 py-3" />
          <input name="phone" required placeholder="Số điện thoại" className="bg-transparent border border-white/20 px-4 py-3" />
          <input type="email" name="email" placeholder="Email (tuỳ chọn)" className="bg-transparent border border-white/20 px-4 py-3" />
          <button disabled={loading} className="px-5 py-3 bg-white text-black hover:opacity-80 disabled:opacity-50">
            {loading ? "Đang tạo..." : "Bắt đầu chat"}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="max-w-2xl mx-auto px-4 py-12">
      <h2 className="text-2xl tracking-wider">Hội thoại #{convId.slice(0, 6)}</h2>
      <div ref={listRef} className="mt-6 h-[50vh] overflow-auto border border-white/10 p-4 space-y-2">
        {messages.map((m) => (
          <div key={m.id} className={`max-w-[80%] ${m.sender === "CUSTOMER" ? "self-end ml-auto text-right" : ""}`}>
            <div className={`inline-block px-3 py-2 ${m.sender === "CUSTOMER" ? "bg-white text-black" : "bg-white/10"}`}>
              <div className="text-xs opacity-60">{m.sender === "CUSTOMER" ? "Bạn" : "MAFREN"}</div>
              <div>{m.content}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input ref={inputRef} placeholder="Nhập tin nhắn..." className="bg-transparent border border-white/20 px-4 py-3 flex-1" />
        <button onClick={send} className="px-5 py-3 bg-white text-black hover:opacity-80">
          Gửi
        </button>
      </div>
      <p className="text-xs text-white/50 mt-2">Tin nhắn cập nhật mỗi 2 giây.</p>
    </section>
  );
}


