"use client";
import { useEffect, useRef, useState } from "react";

export default function AppointmentNotifier() {
  const lastCount = useRef(0);
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    let stopped = false; let timer: NodeJS.Timeout | undefined; let es: EventSource | undefined;
    let clickArmed = false;
    const unlock = () => { clickArmed = true; window.removeEventListener('click', unlock); };
    // Play policy: browsers cần user gesture đầu tiên
    window.addEventListener('click', unlock, { once: true });

    const playAlert = () => {
      if (!enabled) return;
      const candidates = [
        '/audio/luxury_new_order:booking.mp3', // original filename with colon
        '/audio/message_received.mp3',
      ];
      const tryPlay = (idx: number) => {
        if (idx >= candidates.length) return;
        try {
          const a = new Audio(candidates[idx]);
          a.play().catch(() => tryPlay(idx + 1));
        } catch {
          tryPlay(idx + 1);
        }
      };
      tryPlay(0);
    };
    const open = () => {
      if (stopped) return;
      try {
        es = new EventSource('/api/admin/appointments/stream');
        es.onmessage = (e) => {
          try {
            const list = JSON.parse(e.data) as Array<{ status?: string; createdAt?: string | { toDate?: () => Date } }>;
            // chỉ kêu âm thanh khi có lịch mới unprocessed
            const numUnprocessed = list.filter((a) => (a.status || 'unprocessed') === 'unprocessed').length;
            if (numUnprocessed > lastCount.current && clickArmed) { playAlert(); }
            lastCount.current = numUnprocessed;
          } catch {}
        };
        es.onerror = () => { try { es && es.close(); } catch {}; if (!stopped) timer = setTimeout(open, 2000); };
      } catch { timer = setTimeout(open, 2000); }
    };
    open();
    return () => { stopped = true; if (timer) clearTimeout(timer); try { es && es.close(); } catch {}; window.removeEventListener('click', unlock); };
  }, []);
  return (
    <button
      onClick={() => setEnabled((v) => !v)}
      title={enabled ? 'Tắt âm báo' : 'Bật âm báo'}
      className="fixed right-3 top-3 z-40 text-xs border border-white/20 px-2 py-1 bg-black/50"
    >
      Âm báo: {enabled ? 'Bật' : 'Tắt'}
    </button>
  );
}


