import Link from "next/link";
import { Company } from "@/lib/site";
import { IcPhone, IcWa } from "./icons";

export function SiteCta({ company }: { company: Company | null }) {
  const cname = company?.name ?? "";
  return (
    <>
      {/* ━━━ CTA BANNER ━━━ */}
      {company?.phone && (
        <section className="bg-[#111] relative overflow-hidden">
          <div className="pointer-events-none select-none absolute -top-6 left-1/2 -translate-x-1/2 text-[90px] sm:text-[220px] font-semibold uppercase tracking-tighter text-white/[0.03] whitespace-nowrap">
            {cname}
          </div>
          <div className="relative max-w-7xl mx-auto px-4 py-10 sm:py-14 flex flex-col md:flex-row items-center justify-between gap-6 border-l-4 border-brand">
            <div className="text-center md:text-left">
              <div className="text-xs font-semibold text-brand-light mb-2">
                Захиалга өгөх
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                Хүссэн машинаа хайж олоогүй юу?
              </h3>
              <p className="text-sm text-gray-400 mt-2">
                Бидэнтэй холбогдоорой — таны сонголтод тохирох машиныг олж өгнө.
              </p>
            </div>
            <a
              href={`tel:${company.phone}`}
              className="shrink-0 flex items-center gap-2 bg-brand hover:bg-white hover:text-[#111] text-white text-sm px-8 py-4 rounded-sm transition-colors font-medium"
            >
              <IcPhone cls="w-4 h-4" /> {company.phone}
            </a>
          </div>
        </section>
      )}
    </>
  );
}

export function SiteFooter({ company }: { company: Company | null }) {
  const cname = company?.name ?? "";
  return (
    <>
      {/* ━━━ FOOTER ━━━ */}
      <footer className="bg-[#0b0b0b] text-gray-500 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-brand rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {cname[0]}
                </span>
              </div>
              <span className="text-white font-bold text-base">{cname}</span>
            </div>
            <div className="flex items-center gap-6 text-xs">
              {[
                ["/#cars", "Машинууд"],
                ["/about", "Бидний тухай"],
                ["/#contact", "Холбоо барих"],
              ].map(([h, l]) => (
                <a
                  key={h}
                  href={h}
                  className="hover:text-white transition-colors"
                >
                  {l}
                </a>
              ))}
              <Link
                href="/admin"
                className="hover:text-white transition-colors"
              >
                Нэвтрэх
              </Link>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 text-xs text-center text-gray-600">
            © {new Date().getFullYear()} {cname}. Бүх эрх хуулиар хамгаалагдсан.
          </div>
        </div>
      </footer>
    </>
  );
}

export function MobileCallBar({ company }: { company: Company | null }) {
  if (!company?.phone) return null;
  const digits = company.phone.replace(/\D/g, "");
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex gap-2.5">
      <a href={`tel:${company.phone}`}
        className="flex-1 flex items-center justify-center gap-2 bg-brand active:bg-brand-dark text-white text-sm font-medium py-3 rounded-sm">
        <IcPhone cls="w-4 h-4" /> Залгах
      </a>
      <a href={`https://wa.me/976${digits}`} target="_blank" rel="noreferrer"
        className="flex-1 flex items-center justify-center gap-2 border border-zinc-300 text-zinc-700 active:bg-zinc-50 text-sm font-medium py-3 rounded-sm">
        <IcWa cls="w-4 h-4" /> WhatsApp
      </a>
    </div>
  );
}
