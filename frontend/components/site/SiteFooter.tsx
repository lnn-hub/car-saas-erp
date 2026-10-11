import Link from "next/link";
import { Company } from "@/lib/site";
import { IcPhone } from "./icons";

export function SiteCta({ company }: { company: Company | null }) {
  const cname = company?.name || "AutoDealer";
  return (
    <>
      {/* ━━━ CTA BANNER ━━━ */}
      {company?.phone && (
        <section className="bg-[#111] relative overflow-hidden">
          <div className="pointer-events-none select-none absolute -top-6 left-1/2 -translate-x-1/2 text-[90px] sm:text-[220px] font-black uppercase tracking-tighter text-white/[0.03] whitespace-nowrap">
            {cname}
          </div>
          <div className="relative max-w-7xl mx-auto px-4 py-10 sm:py-14 flex flex-col md:flex-row items-center justify-between gap-6 border-l-4 border-brand">
            <div className="text-center md:text-left">
              <div className="text-[10px] font-black text-brand-light uppercase tracking-[0.25em] mb-2">
                Захиалга өгөх
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                Хүссэн машинаа хайж олоогүй юу?
              </h3>
              <p className="text-sm text-gray-400 mt-2">
                Бидэнтэй холбогдоорой — таны сонголтод тохирох машиныг олж өгнө.
              </p>
            </div>
            <a
              href={`tel:${company.phone}`}
              className="shrink-0 flex items-center gap-2 bg-brand hover:bg-white hover:text-[#111] text-white text-[11px] font-black uppercase tracking-[0.2em] px-8 py-4 rounded-sm transition-colors"
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
  const cname = company?.name || "AutoDealer";
  return (
    <>
      {/* ━━━ FOOTER ━━━ */}
      <footer className="bg-[#0b0b0b] text-gray-500 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-brand rounded flex items-center justify-center">
                <span className="text-white font-black text-sm">
                  {cname[0]}
                </span>
              </div>
              <span className="text-white font-black text-base">{cname}</span>
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
