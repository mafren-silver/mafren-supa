"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";

type TimestampLike = { toDate?: () => Date } | string | number | null | undefined;
type Msg = { id: string; sender: "CUSTOMER" | "ADMIN"; content: string; createdAt?: TimestampLike };

export default function AdminConversation(props: any) {
  const convId: string = props?.params?.id as string;
  const [messages, setMessages] = useState<Msg[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

  async function send() {
    const content = inputRef.current?.value?.trim();
    if (!content) return;
    inputRef.current!.value = "";
    await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: convId, sender: "ADMIN", content }),
    });
  }

  async function sendAttachment(f: File) {
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    const up = await fetch("/api/chat/upload", { method: "POST", body: fd });
    if (!up.ok) return;
    const meta = await up.json();
    await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: convId, sender: "ADMIN", attachmentUrl: meta.url, attachmentType: meta.contentType }),
    });
  }

  return (
    <section className="max-w-3xl mx-auto px-4 py-12">
      <h2 className="text-2xl tracking-wider">Admin — Hội thoại #{convId.slice(0, 6)}</h2>
      <div ref={listRef} className="mt-6 h-[60vh] overflow-auto border border-white/10 p-4 space-y-2">
        {messages.map((m) => (
          <div key={m.id} className={`max-w-[80%] ${m.sender === "ADMIN" ? "self-end ml-auto text-right" : ""}`}>
            <div className={`inline-block px-3 py-2 ${m.sender === "ADMIN" ? "bg-white text-black" : "bg-white/10"}`}>
              <div className="text-xs opacity-60">{m.sender === "ADMIN" ? "Bạn (Admin)" : "Khách"}</div>
              <div>{m.content}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2 items-center">
        <input ref={inputRef} placeholder="Nhập tin nhắn..." className="bg-transparent border border-white/20 px-4 py-3 flex-1" />
        <label className="px-3 py-3 border border-white/20 cursor-pointer text-sm">+
          <input type="file" className="hidden" onChange={(e) => e.target.files && sendAttachment(e.target.files[0])} />
        </label>
        <button onClick={send} className="px-5 py-3 bg-white text-black hover:opacity-80">Gửi</button>
      </div>
    </section>
  );
}


