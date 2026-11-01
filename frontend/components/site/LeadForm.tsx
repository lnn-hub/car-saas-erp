"use client";
import { useEffect, useState } from "react";
import { BACKEND, companyQuery } from "@/lib/site";

const DAYS = ["Өнөөдөр", "Маргааш", "Энэ долоо хоногт", "Хамаагүй"];
const SLOTS = ["Өглөө 9-12", "Өдөр 12-17", "Орой 17-20"];

export type LeadKind = "VIEWING" | "REQUEST";

export function LeadForm({ open, onClose, kind, vehicle }: {
  open: boolean;
  onClose: () => void;
  kind: LeadKind;
  vehicle?: { id: string; title: string } | null;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [day, setDay] = useState(DAYS[1]);
  const [slot, setSlot] = useState(SLOTS[1]);
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // spam бот барих нуусан талбар
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDone(false);
    setError("");
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${BACKEND}/api/public/leads${companyQuery()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          vehicle_id: vehicle?.id,
          name,
          phone,
          preferred_time: kind === "VIEWING" ? `${day}, ${slot}` : null,
          message,
          website,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Илгээж чадсангүй. Дахин оролдоно уу");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 h-12 text-base sm:text-[15px] text-ink placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:border-ink/40 focus:ring-4 focus:ring-ink/5 transition";
  const chip = (on: boolean) =>
    `h-10 px-3.5 rounded-full text-sm font-medium border transition-colors ${on ? "bg-ink border-ink text-white" : "bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400"}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-[pageIn_0.2s_ease-out]" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] shadow-lift max-h-[92dvh] overflow-y-auto animate-[sheetUp_0.4s_var(--ease-out-expo)] sm:animate-[fadeUp_0.3s_var(--ease-out-expo)]">
        <div className="sm:hidden pt-2.5 flex justify-center">
          <span className="w-10 h-1 rounded-full bg-zinc-200" />
        </div>
        <button onClick={onClose} aria-label="Хаах" className="absolute top-4 right-4 w-10 h-10 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-ink">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>

        {done ? (
          <div className="px-6 sm:px-8 pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))] text-center">
            <div className="w-16 h-16 rounded-full bg-brand-soft text-brand flex items-center justify-center mx-auto">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <h3 className="font-display text-xl font-semibold text-ink mt-5">Хүсэлт илгээгдлээ</h3>
            <p className="text-zinc-600 text-sm mt-2">Бид тантай удахгүй утсаар холбогдоно. Баярлалаа!</p>
            <button onClick={onClose} className="mt-7 w-full h-12 rounded-full bg-ink hover:bg-brand text-white text-sm font-medium transition-colors">Хаах</button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 sm:px-8 pt-6 sm:pt-8 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-8">
            <h3 className="font-display text-xl font-semibold text-ink pr-12">
              {kind === "VIEWING" ? "Үзэх цаг товлох" : "Хүсэлт үлдээх"}
            </h3>
            <p className="text-sm text-zinc-500 mt-1 pr-10">
              {kind === "VIEWING"
                ? vehicle ? vehicle.title : "Машиныг очиж үзэх, туршиж унах цагаа сонгоно уу"
                : "Ямар машин хайж байгаагаа бичээрэй. Олоод танд мэдэгдэнэ."}
            </p>

            <div className="space-y-3 mt-6">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Таны нэр" autoComplete="name" required maxLength={120} className={field} />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Утасны дугаар" type="tel" inputMode="tel" autoComplete="tel" required className={field} />
              <input value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" name="website" />
            </div>

            {kind === "VIEWING" && (
              <div className="mt-5 space-y-3">
                <div>
                  <div className="text-sm font-medium text-zinc-500 mb-2">Хэзээ?</div>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((d) => <button type="button" key={d} onClick={() => setDay(d)} className={chip(day === d)}>{d}</button>)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-zinc-500 mb-2">Цаг</div>
                  <div className="flex flex-wrap gap-2">
                    {SLOTS.map((s) => <button type="button" key={s} onClick={() => setSlot(s)} className={chip(slot === s)}>{s}</button>)}
                  </div>
                </div>
              </div>
            )}

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={1000}
              required={kind === "REQUEST"}
              placeholder={kind === "VIEWING" ? "Нэмэлт тайлбар (заавал биш)" : "Жишээ: Toyota Prius, 2018 оноос хойш, 40 саяас доош"}
              className={`${field} h-auto py-3 mt-5 resize-none`}
            />

            {error && <div className="mt-3 bg-danger-soft border border-danger-line rounded-2xl px-4 py-2.5 text-sm text-danger">{error}</div>}

            <button type="submit" disabled={busy} className="mt-5 w-full h-12 rounded-full bg-brand hover:bg-brand-dark disabled:opacity-50 text-white text-sm font-medium transition-colors">
              {busy ? "Илгээж байна..." : "Илгээх"}
            </button>
            <p className="text-xs text-zinc-400 text-center mt-3">Таны мэдээллийг зөвхөн тантай холбогдоход ашиглана.</p>
          </form>
        )}
      </div>
    </div>
  );
}
