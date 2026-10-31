"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BACKEND, Company } from "@/lib/site";
import { IcPhone, IcPin } from "./icons";
import { BrandMark } from "./BrandMark";

const NAV: [string, string][] = [
  ["/", "Нүүр"],
  ["/#cars", "Машинууд"],
  ["/about", "Бидний тухай"],
  ["/#contact", "Холбоо барих"],
];

function IcLock({ cls = "w-4 h-4" }: { cls?: string }) {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

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

  const field =
    "w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3.5 text-sm text-ink placeholder:text-zinc-500 focus:outline-none focus:bg-white focus:border-ink/40 focus:ring-4 focus:ring-ink/5 transition";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white rounded-[28px] shadow-lift w-full max-w-sm p-7 sm:p-8 animate-[fadeUp_0.25s_var(--ease-out-expo)]">
        <button
          onClick={onClose}
          aria-label="Хаах"
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-ink transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="mb-7">
          <div className="mb-5">
            {company?.logo_url ? (
              <BrandMark logoUrl={company.logo_url} name={company.name} size={40} showName={false} />
            ) : (
              <div className="w-11 h-11 bg-ink rounded-2xl flex items-center justify-center text-white">
                <IcLock />
              </div>
            )}
          </div>
          <h2 className="text-xl font-semibold text-ink">Админ нэвтрэх</h2>
          <p className="text-sm text-zinc-500 mt-1">Удирдлагын системд тавтай морил</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="И-мэйл" required autoFocus className={field} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Нууц үг" required className={field} />
          {error && (
            <div className="bg-danger-soft border border-danger-line rounded-2xl px-4 py-2.5 text-xs text-danger">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink hover:bg-brand disabled:opacity-40 text-white font-medium py-3.5 rounded-full text-sm transition-colors"
          >
            {loading ? "Нэвтэрж байна..." : "Нэвтрэх"}
          </button>
        </form>
      </div>
    </div>
  );
}

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return "";
  const days = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];
  return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} · ${days[now.getDay()]} · ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function SiteHeader({ company }: { company: Company | null }) {
  const pathname = usePathname();
  const [menuOpen, setMenu] = useState(false);
  const [adminModal, setAdminModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const clock = useClock();
  const cname = company?.name ?? "";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (h: string) => (h === "/" ? pathname === "/" : !h.includes("#") && pathname.startsWith(h));

  return (
    <>
      {adminModal && <AdminModal onClose={() => setAdminModal(false)} company={company} />}

      {/* Мэдээллийн мөр (гүйлгэхэд алга болно) */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-9 flex items-center justify-between gap-4 text-[12px] text-zinc-500">
        <span className="tabular-nums truncate" suppressHydrationWarning>{clock}</span>
        <div className="flex items-center gap-5 shrink-0">
          {company?.address && (
            <span className="hidden sm:flex items-center gap-1.5">
              <IcPin cls="w-3.5 h-3.5" /> {company.address}
            </span>
          )}
          {company?.phone && (
            <a href={`tel:${company.phone}`} className="flex items-center gap-1.5 font-medium text-ink hover:text-brand transition-colors h-9">
              <IcPhone cls="w-3.5 h-3.5" /> {company.phone}
            </a>
          )}
        </div>
      </div>

      <header className="sticky top-0 z-50 px-3 sm:px-4 pt-2 pb-2 pointer-events-none">
        <div
          className={`pointer-events-auto max-w-7xl mx-auto rounded-full h-16 pl-4 pr-2 sm:pl-6 flex items-center justify-between gap-3 transition-all duration-500 ${
            scrolled || menuOpen ? "glass" : "bg-white/60 border border-white/80 shadow-card backdrop-blur-md"
          }`}
        >
          <a href="/" className="flex items-center min-w-0" aria-label={cname || "Нүүр"}>
            <BrandMark logoUrl={company?.logo_url} name={cname} size={34} nameClassName="font-display font-semibold text-ink text-[17px] tracking-tight" />
          </a>

          <nav className="hidden md:flex items-center gap-0.5 rounded-full bg-zinc-100/70 p-1">
            {NAV.map(([h, l]) => (
              <a
                key={h}
                href={h}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive(h) ? "bg-white text-ink shadow-card" : "text-zinc-600 hover:text-ink"
                }`}
              >
                {l}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {company?.phone && (
              <a
                href={`tel:${company.phone}`}
                className="hidden lg:inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white text-sm font-medium pl-4 pr-5 h-12 rounded-full transition-colors"
              >
                <span className="w-7 h-7 -ml-1 rounded-full bg-white/15 flex items-center justify-center">
                  <IcPhone cls="w-3.5 h-3.5" />
                </span>
                Залгах
              </a>
            )}
            <button
              onClick={() => setAdminModal(true)}
              aria-label="Админ нэвтрэх"
              title="Админ нэвтрэх"
              className="hidden md:flex w-12 h-12 items-center justify-center rounded-full text-zinc-600 hover:text-ink hover:bg-zinc-100 transition-colors"
            >
              <IcLock />
            </button>
            <button
              onClick={() => setMenu(!menuOpen)}
              aria-label="Цэс"
              aria-expanded={menuOpen}
              className="md:hidden w-12 h-12 flex items-center justify-center rounded-full bg-ink text-white"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                {menuOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="4" y1="9" x2="20" y2="9" />
                    <line x1="4" y1="15" x2="20" y2="15" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="pointer-events-auto md:hidden max-w-7xl mx-auto mt-2 glass rounded-[28px] p-2 animate-[fadeUp_0.25s_var(--ease-out-expo)]">
            {NAV.map(([h, l]) => (
              <a
                key={h}
                href={h}
                onClick={() => setMenu(false)}
                className={`flex items-center justify-between px-5 py-4 rounded-2xl text-base font-medium transition-colors ${
                  isActive(h) ? "bg-white text-ink" : "text-zinc-700 hover:bg-white/70"
                }`}
              >
                {l}
                <svg className="w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6" /></svg>
              </a>
            ))}
            <div className="grid grid-cols-2 gap-2 p-2 pt-3">
              {company?.phone && (
                <a href={`tel:${company.phone}`} className="flex items-center justify-center gap-2 bg-brand text-white rounded-full py-3.5 text-sm font-medium">
                  <IcPhone cls="w-4 h-4" /> Залгах
                </a>
              )}
              <button
                onClick={() => {
                  setMenu(false);
                  setAdminModal(true);
                }}
                className={`flex items-center justify-center gap-2 bg-white text-ink border border-zinc-200 rounded-full py-3.5 text-sm font-medium ${company?.phone ? "" : "col-span-2"}`}
              >
                <IcLock /> Админ
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
