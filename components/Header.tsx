"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const nav = [
  { href: "/booking", label: "Đặt lịch hẹn" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onClickOutside = (e: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false); };
    if (open) {
      document.addEventListener('keydown', onKey);
      document.addEventListener('click', onClickOutside);
    }
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('click', onClickOutside); };
  }, [open]);

  return (
    <header className="border-b border-white/10 sticky top-0 backdrop-blur supports-[backdrop-filter]:bg-black/60 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="MAFREN" width={40} height={40} />
          <span className="tracking-widest text-sm sm:text-base">MAFREN JEWELRY ATELIER</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              prefetch={false}
              onClick={(e)=>{ if (pathname===n.href) { e.preventDefault(); } }}
              className={`text-sm px-3 py-2 hover:bg-white/10 ${pathname===n.href?"bg-white/10":"opacity-80"}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden inline-flex items-center justify-center w-9 h-9 border border-white/20"
          aria-label="Mở menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Menu</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </div>

      {/* Mobile panel */}
      {open && (
        <div ref={panelRef} className="md:hidden border-t border-white/10 bg-black/90">
          <div className="max-w-6xl mx-auto px-4 py-3 grid gap-2">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                prefetch={false}
                onClick={() => setOpen(false)}
                className={`block text-sm px-3 py-2 border border-white/10 ${pathname===n.href?"bg-white text-black":""}`}
              >
                {n.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}


