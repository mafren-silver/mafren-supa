import Link from "next/link";
import Image from "next/image";
import ChatWidget from "@/components/ChatWidget";

export default function HomePage() {
  return (
    <section className="max-w-6xl mx-auto px-4">
      <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center py-10 md:py-24">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-light tracking-wider leading-tight">
            MAFREN JEWELRY ATELIER
          </h1>
          <p className="mt-4 md:mt-6 text-white/70 leading-relaxed max-w-xl">
            Studio thiết kế & chế tác trang sức bạc theo yêu cầu. Tối giản, tinh tế, khác biệt.
          </p>
          <div className="mt-6 md:mt-10 flex gap-3">
            <Link href="/booking" className="px-5 md:px-6 py-3 border border-white text-white hover:bg-white hover:text-black transition w-full sm:w-auto text-center">
              Đặt lịch hẹn
            </Link>
          </div>
        </div>
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="MAFREN Logo"
            width={360}
            height={360}
            className="opacity-90 drop-shadow-[0_0_40px_rgba(255,255,255,0.05)] w-[220px] sm:w-[300px] md:w-[360px] h-auto"
            priority
          />
        </div>
      </div>
      <ChatWidget />
    </section>
  );
}
