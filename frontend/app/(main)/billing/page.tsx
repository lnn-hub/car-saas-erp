'use client';
import { useEffect, useState } from 'react';
import { Suspense } from 'react';
import { api } from '@/lib/api';

const BASE = 'http://localhost:4000/api';
function tok() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''; }
async function apiFetch(url: string, opts: RequestInit = {}) {
  const r = await fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${tok()}`, 'Content-Type': 'application/json', ...opts.headers },
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Алдаа');
  return d;
}

interface BillingStatus {
  name: string;
  subscription_status: string;
  subscription_plan: string;
  trial_ends_at: string;
  subscription_end_date: string | null;
}

const PLANS = [
  {
    key: 'starter',
    label: 'Starter',
    price: '29,000₮',
    desc: 'Жижиг дилерт',
    features: ['3 хүртэлх хэрэглэгч', 'Машин бүртгэл', 'Борлуулалт', 'Үндсэн тайлан'],
  },
  {
    key: 'pro',
    label: 'Pro',
    price: '59,000₮',
    desc: 'Дунд хэмжээний дилер',
    features: ['10 хүртэлх хэрэглэгч', 'Бүх тайлан + Excel', 'Санхүүгийн модуль', 'Үйлчлүүлэгчийн бүртгэл'],
    popular: true,
  },
  {
    key: 'business',
    label: 'Business',
    price: '99,000₮',
    desc: 'Томоохон дилер',
    features: ['Хязгааргүй хэрэглэгч', 'Бүх боломж', 'Тусгай тохиргоо', 'Зориулалтын дэмжлэг'],
  },
];

const PLAN_PRICES: Record<string, number> = { starter: 29000, pro: 59000, business: 99000 };

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  trialing: { label: 'Trial',       color: 'bg-amber-100 text-amber-700' },
  active:   { label: 'Идэвхтэй',   color: 'bg-emerald-100 text-emerald-700' },
  canceled: { label: 'Цуцлагдсан', color: 'bg-red-100 text-red-600' },
  inactive: { label: 'Идэвхгүй',   color: 'bg-[#f4f4f5] text-[#71717a]' },
};

function daysLeft(d: string) {
  return Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000));
}
function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,'0')}.${String(dt.getDate()).padStart(2,'0')}`;
}

function BillingContent() {
  const [status, setStatus]     = useState<BillingStatus | null>(null);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<{ plan: string; label: string; amount: number } | null>(null);
  const [paying, setPaying]     = useState(false);
  const [paid, setPaid]         = useState(false);

  useEffect(() => {
    api.getBillingStatus().then(setStatus).catch(console.error).finally(() => setLoading(false));
  }, []);

  function openModal(plan: string, label: string) {
    setPaid(false);
    setModal({ plan, label, amount: PLAN_PRICES[plan] || 0 });
  }

  async function confirmPayment() {
    if (!modal) return;
    setPaying(true);
    try {
      await apiFetch(`${BASE}/billing/demo/activate`, {
        method: 'POST',
        body: JSON.stringify({ plan: modal.plan }),
      });
      setPaid(true);
      const updated = await api.getBillingStatus();
      setStatus(updated);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally { setPaying(false); }
  }

  if (loading) return <div className="px-6 py-6 text-sm text-[#a1a1aa]">Ачааллаж байна...</div>;

  const st      = STATUS_LABELS[status?.subscription_status || 'inactive'] || STATUS_LABELS.inactive;
  const isActive = status?.subscription_status === 'active';
  const isTrial  = status?.subscription_status === 'trialing';

  return (
    <div className="px-6 py-6 space-y-6">
      <div>
        <h1 className="text-base font-semibold text-[#09090b]">Subscription</h1>
        <p className="text-xs text-[#a1a1aa] mt-0.5">Тарифф, QPay төлбөр</p>
      </div>

      {/* Одоогийн төлөв */}
      <div className="bg-white border border-[#e4e4e7] rounded-lg p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-semibold text-[#09090b]">{status?.name}</div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
              {isTrial && status?.trial_ends_at && (
                <span className="text-xs text-[#71717a]">{daysLeft(status.trial_ends_at)} хоног үлдсэн</span>
              )}
              {isActive && (
                <>
                  <span className="text-xs text-[#71717a] capitalize">{status?.subscription_plan} план</span>
                  {status?.subscription_end_date && (
                    <span className="text-xs text-[#a1a1aa]">· {fmtDate(status.subscription_end_date)} хүртэл</span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {isTrial && status?.trial_ends_at && (
          <div className="mt-4 pt-4 border-t border-[#f4f4f5]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-[#71717a]">Trial хугацаа</span>
              <span className="text-xs font-medium text-[#09090b]">
                {daysLeft(status.trial_ends_at)} / 14 хоног
              </span>
            </div>
            <div className="h-1.5 bg-[#f4f4f5] rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full"
                style={{ width: `${((14 - daysLeft(status.trial_ends_at)) / 14) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Тарифф */}
      <div className="text-sm font-medium text-[#09090b]">
        {isActive ? 'Тариффаа сунгах' : 'Тарифф сонгох'}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {PLANS.map(plan => (
          <div key={plan.key}
            className={`bg-white rounded-lg border p-5 flex flex-col ${plan.popular ? 'border-[#09090b] shadow-sm' : 'border-[#e4e4e7]'}`}>
            {plan.popular && (
              <div className="text-[10px] font-semibold text-white bg-[#09090b] rounded-sm px-2 py-0.5 self-start mb-3">
                АЛДАРТАЙ
              </div>
            )}
            <div className="text-sm font-semibold text-[#09090b]">{plan.label}</div>
            <div className="text-xs text-[#a1a1aa] mt-0.5 mb-3">{plan.desc}</div>
            <div className="text-xl font-bold text-[#09090b] tabular-nums">
              {plan.price}
              <span className="text-xs font-normal text-[#a1a1aa]">/сар</span>
            </div>
            <ul className="mt-4 space-y-2 flex-1">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-xs text-[#71717a]">
                  <svg className="w-3 h-3 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M5 13l4 4L19 7"/></svg>
                  {f}
                </li>
              ))}
            </ul>
            <button onClick={() => openModal(plan.key, plan.label)}
              className={`mt-5 w-full py-2 rounded-md text-sm font-medium transition-colors ${
                plan.popular
                  ? 'bg-[#09090b] hover:bg-[#27272a] text-white'
                  : 'border border-[#e4e4e7] text-[#09090b] hover:bg-[#f4f4f5]'
              }`}>
              QPay-ээр төлөх
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-[#a1a1aa] text-center">QPay — Монголын бүх банкны апп-аар төлнө</p>

      {/* Demo төлбөрийн modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl border border-[#e4e4e7] shadow-xl p-6 w-full max-w-sm">
            {paid ? (
              /* Амжилттай */
              <div className="text-center py-4">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 13l4 4L19 7"/></svg>
                </div>
                <h2 className="text-base font-semibold text-[#09090b] mb-1">Төлбөр амжилттай!</h2>
                <p className="text-sm text-[#71717a] mb-1">{modal.label} план идэвхжлээ</p>
                <p className="text-xs text-[#a1a1aa] mb-5">1 сарын хугацаатай</p>
                <button onClick={() => setModal(null)}
                  className="w-full bg-[#09090b] hover:bg-[#27272a] text-white font-medium py-2 rounded-md text-sm transition-colors">
                  Хаах
                </button>
              </div>
            ) : (
              /* Төлбөрийн дэлгэц */
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-sm font-semibold text-[#09090b]">QPay төлбөр</h2>
                    <p className="text-xs text-[#a1a1aa] mt-0.5">{modal.label} · {modal.amount.toLocaleString()}₮/сар</p>
                  </div>
                  <button onClick={() => setModal(null)} className="text-[#a1a1aa] hover:text-[#09090b]">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>

                {/* Mock QPay UI */}
                <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-lg p-5 mb-4 text-center">
                  {/* Fake QR placeholder */}
                  <div className="w-36 h-36 bg-white border border-[#e4e4e7] rounded-lg mx-auto mb-3 flex items-center justify-center">
                    <svg className="w-24 h-24 text-[#d4d4d8]" viewBox="0 0 100 100" fill="currentColor">
                      <rect x="10" y="10" width="30" height="30" rx="2"/>
                      <rect x="60" y="10" width="30" height="30" rx="2"/>
                      <rect x="10" y="60" width="30" height="30" rx="2"/>
                      <rect x="18" y="18" width="14" height="14" rx="1" fill="white"/>
                      <rect x="68" y="18" width="14" height="14" rx="1" fill="white"/>
                      <rect x="18" y="68" width="14" height="14" rx="1" fill="white"/>
                      <rect x="60" y="60" width="8" height="8" rx="1"/>
                      <rect x="72" y="60" width="18" height="8" rx="1"/>
                      <rect x="60" y="72" width="18" height="8" rx="1"/>
                      <rect x="82" y="72" width="8" height="18" rx="1"/>
                    </svg>
                  </div>
                  <p className="text-xs text-[#71717a]">Банкны аппаар скан хийнэ үү</p>
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                    <span className="text-[10px] text-[#a1a1aa]">Төлбөр хүлээж байна...</span>
                  </div>
                </div>

                {/* Bank app logos row */}
                <div className="flex justify-center gap-2 mb-5">
                  {['ХХБ', 'ГТБ', 'ТДБ', 'Хаан', 'Хас'].map(b => (
                    <div key={b} className="w-10 h-10 bg-[#f4f4f5] rounded-lg flex items-center justify-center text-[9px] text-[#71717a] font-medium">{b}</div>
                  ))}
                </div>

                <button onClick={confirmPayment} disabled={paying}
                  className="w-full bg-[#09090b] hover:bg-[#27272a] disabled:opacity-40 text-white font-medium py-2.5 rounded-md text-sm transition-colors">
                  {paying ? 'Боловсруулж байна...' : 'Төлбөр баталгаажуулах'}
                </button>
                <p className="text-center text-[10px] text-[#a1a1aa] mt-2">Demo горим — бодит төлбөр шаардахгүй</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="px-6 py-6 text-sm text-[#a1a1aa]">Ачааллаж байна...</div>}>
      <BillingContent />
    </Suspense>
  );
}
