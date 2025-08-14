"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: fd.get("password") }),
    });
    setLoading(false);
    if (res.ok) router.push("/admin");
    else setErr("Sai mật khẩu.");
  }

  return (
    <section className="max-w-sm mx-auto px-4 py-12">
      <h2 className="text-2xl tracking-wider">Đăng nhập Admin</h2>
      <form onSubmit={onSubmit} className="mt-6 grid gap-3">
        <input type="password" name="password" required placeholder="Mật khẩu" className="bg-transparent border border-white/20 px-4 py-3" />
        <button disabled={loading} className="px-5 py-3 bg-white text-black hover:opacity-80 disabled:opacity-50">
          {loading ? "Đang kiểm tra..." : "Đăng nhập"}
        </button>
        {err && <p className="text-red-400 text-sm">{err}</p>}
      </form>
    </section>
  );
}


