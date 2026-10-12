"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BACKEND, Company, imgUrl } from "@/lib/site";
import { IcPhone } from "./icons";
import { BrandMark } from "./BrandMark";

function AdminModal({ onClose, company }: { onClose: () => void; company: Company | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Аль хэдийн нэвтэрсэн бол шууд явна
    const saved = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (saved) {
      fetch(`${BACKEND}/api/settings`, { headers: { Authorization: `Bearer ${saved}` } })
        .then((r) => {
          if (r.ok) router.push("/dashboard");
          else if (r.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
          }
        })
        .catch(() => {});
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BACKEND}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Алдаа гарлаа");
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа");
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7 animate-[fadeUp_0.18s_ease]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 transition-colors"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="mb-6">
          {company?.logo_url ? (
            <div className="mb-4"><BrandMark logoUrl={company.logo_url} name={company.name} size={36} showName={false} /></div>
          ) : (
          <div className="w-8 h-8 bg-brand rounded-lg mb-4 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          )}
          <h2 className="text-lg font-bold text-[#1c1917]">Админ нэвтрэх</h2>
          <p className="text-sm text-gray-500 mt-0.5">Удирдлагын систем</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="И-мэйл"
            required
            autoFocus
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1c1917] transition-colors"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Нууц үг"
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1c1917] transition-colors"
          />
          {error && (
            <div className="bg-brand-soft border border-brand/20 rounded-xl px-4 py-2.5 text-xs text-brand">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand hover:bg-brand-dark disabled:opacity-40 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            {loading ? "Нэвтэрж байна..." : "Нэвтрэх"}
          </button>
        </form>
      </div>
    </div>
  );
}

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const days = ["Ням", "Дав", "Мяг", "Лха", "Пүр", "Баа", "Бям"];
  return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${days[now.getDay()]} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function SiteHeader({ company }: { company: Company | null }) {
  const [menuOpen, setMenu] = useState(false);
  const [adminModal, setAdminModal] = useState(false);
  const clock = useClock();
  const cname = company?.name ?? "";

  return (
    <>
      {adminModal && <AdminModal onClose={() => setAdminModal(false)} company={company} />}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        {/* Top bar */}
        <div className="bg-brand text-white text-xs">
          <div className="max-w-7xl mx-auto px-4 h-9 flex items-center justify-between">
            <span className="opacity-80 font-mono tracking-wide">{clock}</span>
            <div className="flex items-center gap-4">
              {company?.phone && (
                <a
                  href={`tel:${company.phone}`}
                  className="flex items-center gap-1.5 font-semibold h-9"
                >
                  <IcPhone cls="w-3 h-3" />
                  {company.phone}
                </a>
              )}
              <span className="opacity-40 hidden sm:inline">|</span>
              <span className="opacity-80 hidden sm:block">
                {company?.address || "Улаанбаатар хот"}
              </span>
            </div>
          </div>
        </div>
        {/* Main nav */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-3">
              <BrandMark logoUrl={company?.logo_url} name={cname} size={40} nameClassName="font-bold text-[#111] text-lg tracking-tight" />
            </a>

            <nav className="hidden md:flex items-center gap-1">
              {[
                ["/", "Нүүр хуудас"],
                ["/#cars", "Машинууд"],
                ["/about", "Бидний тухай"],
                ["/#contact", "Холбоо барих"],
              ].map(([h, l]) => (
                <a
                  key={h}
                  href={h}
                  className="px-4 py-2 text-sm text-[#333] hover:text-brand transition-colors border-b-2 border-transparent hover:border-brand font-medium"
                >
                  {l}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              {company?.phone && (
                <a
                  href={`tel:${company.phone}`}
                  className="hidden lg:flex items-center gap-2 bg-brand hover:bg-[#111] text-white text-sm px-5 py-3 rounded-sm transition-colors font-medium"
                >
                  <IcPhone /> Залгах
                </a>
              )}
              <button
                onClick={() => setAdminModal(true)}
                className="hidden md:flex items-center gap-1.5 border border-gray-200 hover:border-[#1c1917] hover:text-[#1c1917] text-gray-500 text-xs font-semibold px-3 py-1.5 rounded transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                Админ
              </button>
              <button
                onClick={() => setMenu(!menuOpen)}
                className="md:hidden w-9 h-9 flex items-center justify-center rounded hover:bg-gray-100"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  {menuOpen ? (
                    <>
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </>
                  ) : (
                    <>
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <line x1="3" y1="18" x2="21" y2="18" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t bg-white px-4 py-3 space-y-1">
            {[
              ["/", "Нүүр хуудас"],
              ["/#cars", "Машинууд"],
              ["/about", "Бидний тухай"],
              ["/#contact", "Холбоо барих"],
            ].map(([h, l]) => (
              <a
                key={h}
                href={h}
                onClick={() => setMenu(false)}
                className="block py-2 px-3 text-sm font-semibold text-[#333] hover:text-brand rounded hover:bg-brand-soft"
              >
                {l}
              </a>
            ))}
            <button
              onClick={() => {
                setMenu(false);
                setAdminModal(true);
              }}
              className="w-full text-left py-2 px-3 text-sm font-semibold text-[#1c1917] rounded hover:bg-gray-50 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4 text-gray-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Админ нэвтрэх
            </button>
          </div>
        )}
      </header>
    </>
  );
}
