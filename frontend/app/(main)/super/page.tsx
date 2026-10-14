'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Features { reports: boolean; sales: boolean; team: boolean; leasing: boolean; compare: boolean }
interface Company {
  id: string; name: string; slug: string | null; plan: string; is_active: boolean; max_vehicles: number | null;
  features: Features; created_at: string; phone: string | null; email: string | null;
  vehicles: number; images: number; users: number; sales: number;
}
interface UserRow { id: string; name: string; email: string; role: string; is_active: boolean }

const FEATURE_LABELS: [keyof Features, string][] = [
  ['reports', 'Тайлан'], ['team', 'Манай баг'], ['leasing', 'Лизингийн тооцоолуур'], ['compare', 'Машин харьцуулах'],
];
const PLANS = [['basic', 'Basic'], ['standard', 'Standard'], ['pro', 'Pro']];
const inp = 'w-full bg-white border border-[#e6e0d8] rounded-md px-3 py-2 text-sm text-[#1c1917] placeholder-[#6f6a64] focus:outline-none focus:border-brand transition-colors';

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer">
      <span className="text-sm text-[#46413c]">{label}</span>
      <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 before:content-[''] before:absolute before:-inset-2 ${on ? 'bg-brand' : 'bg-[#d4ccc2]'}`}>
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${on ? 'left-5' : 'left-1'}`} />
      </button>
    </label>
  );
}

function CompanyCard({ c, onChange, onMsg }: { c: Company; onChange: (c: Company) => void; onMsg: (m: string) => void }) {
  const [limit, setLimit] = useState(c.max_vehicles == null ? '' : String(c.max_vehicles));
  const [pwOpen, setPwOpen] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [uid, setUid] = useState('');
  const [pw, setPw] = useState('');
  const [slugIn, setSlugIn] = useState('');

  async function save(patch: object) {
    try { const r = await api.superUpdateCompany(c.id, patch); onChange({ ...c, ...r }); onMsg('Хадгалагдлаа'); }
    catch (e: unknown) { onMsg(e instanceof Error ? e.message : 'Алдаа гарлаа'); }
  }
  async function openPw() {
    setPwOpen(v => !v);
    if (!users.length) { try { const u = await api.superCompanyUsers(c.id); setUsers(u); setUid(u[0]?.id || ''); } catch {} }
  }
  async function setPassword() {
    try { await api.superSetPassword(c.id, uid, pw); setPw(''); setPwOpen(false); onMsg('Нууц үг шинэчлэгдлээ'); }
    catch (e: unknown) { onMsg(e instanceof Error ? e.message : 'Алдаа гарлаа'); }
  }

  const pct = c.max_vehicles ? Math.min(100, (c.vehicles / c.max_vehicles) * 100) : 0;
  const siteEnv = c.slug ? `NEXT_PUBLIC_SITE_COMPANY=${c.slug}` : '';

  return (
    <div className={`bg-white border border-[#e6e0d8] rounded-xl shadow-sm overflow-hidden ${c.is_active ? '' : 'opacity-70'}`}>
      <div className="px-5 py-4 border-b border-[#e6e0d8] flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[#1c1917] truncate">{c.name}</div>
          <div className="text-xs text-[#6f6a64] mt-0.5 truncate">{c.slug || 'slug байхгүй'} · {String(c.created_at).slice(0, 10)}</div>
        </div>
        <Toggle on={c.is_active} onChange={v => save({ is_active: v })} label={c.is_active ? 'Идэвхтэй' : 'Хаалттай'} />
      </div>

      <div className="px-5 py-4 grid grid-cols-4 gap-2 text-center border-b border-[#e6e0d8]">
        {[['Машин', c.vehicles], ['Зураг', c.images], ['Хэрэглэгч', c.users], ['Борлуулалт', c.sales]].map(([l, v]) => (
          <div key={l as string}><div className="text-lg font-semibold tabular-nums text-[#1c1917]">{v}</div><div className="text-xs text-[#6f6a64]">{l}</div></div>
        ))}
      </div>

      <div className="px-5 py-4 space-y-4">
        <div>
          <div className="flex items-center justify-between text-xs text-[#6f6a64] mb-1.5">
            <span>Машины хязгаар</span><span className="tabular-nums">{c.vehicles} / {c.max_vehicles ?? '∞'}</span>
          </div>
          {c.max_vehicles ? <div className="h-1.5 bg-[#f3efe9] rounded-full overflow-hidden"><div className={`h-full ${pct >= 100 ? 'bg-brand' : 'bg-[#46413c]'}`} style={{ width: `${pct}%` }} /></div> : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-[#6f6a64] mb-1.5">Багц</div>
            <select value={c.plan} onChange={e => save({ plan: e.target.value })} className={inp}>
              {PLANS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <div>
            <div className="text-xs text-[#6f6a64] mb-1.5">Машины хязгаар</div>
            <input inputMode="numeric" value={limit} placeholder="Хязгааргүй"
              onChange={e => setLimit(e.target.value.replace(/\D/g, ''))}
              onBlur={() => { const v = limit === '' ? null : Number(limit); if (v !== c.max_vehicles) save({ max_vehicles: v }); }} className={inp} />
          </div>
        </div>

        <div>
          <div className="text-xs text-[#6f6a64] mb-1">Боломжууд</div>
          <div className="divide-y divide-[#f3efe9]">
            {FEATURE_LABELS.map(([k, l]) => (
              <Toggle key={k} on={c.features[k]} label={l} onChange={v => save({ features: { ...c.features, [k]: v } })} />
            ))}
          </div>
        </div>

        {!c.slug && (
          <div className="bg-[#faf8f5] border border-[#e6e0d8] rounded-md px-3 py-2.5">
            <div className="text-xs text-[#6f6a64] mb-1.5">Slug тохируулах (нийтийн сайтыг таних нэр)</div>
            <div className="flex gap-2">
              <input value={slugIn} onChange={e => setSlugIn(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="auto-ulaanbaatar" className={inp} />
              <button type="button" disabled={slugIn.length < 3} onClick={() => save({ slug: slugIn })}
                className="shrink-0 bg-brand hover:bg-brand-dark disabled:opacity-40 text-white text-sm font-medium px-4 rounded-md">Хадгалах</button>
            </div>
          </div>
        )}

        {siteEnv && (
          <div className="bg-[#faf8f5] border border-[#e6e0d8] rounded-md px-3 py-2.5">
            <div className="text-xs text-[#6f6a64] mb-1">Нийтийн сайтын тохиргоо (Vercel Environment)</div>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs text-[#1c1917] break-all">{siteEnv}</code>
              <button type="button" onClick={() => { navigator.clipboard?.writeText(siteEnv); onMsg('Хуулагдлаа'); }}
                className="shrink-0 text-xs font-medium text-brand hover:text-brand-dark px-2 py-2">Хуулах</button>
            </div>
          </div>
        )}

        <div>
          <button type="button" onClick={openPw} className="text-sm font-medium text-[#46413c] hover:text-brand py-1.5">Нууц үг шинэчлэх</button>
          {pwOpen && (
            <div className="mt-2 space-y-2">
              <select value={uid} onChange={e => setUid(e.target.value)} className={inp}>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
              <div className="flex gap-2">
                <input type="text" value={pw} onChange={e => setPw(e.target.value)} placeholder="Шинэ нууц үг (8+ тэмдэгт)" className={inp} />
                <button type="button" onClick={setPassword} disabled={!uid || pw.length < 8}
                  className="shrink-0 bg-brand hover:bg-brand-dark disabled:opacity-40 text-white text-sm font-medium px-4 rounded-md">Хадгалах</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SuperPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', plan: 'basic', max_vehicles: '', admin_name: '', admin_email: '', admin_password: '' });
  const [formErr, setFormErr] = useState('');

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    if (!u.superadmin) { router.replace('/dashboard'); return; }
    api.superCompanies().then(setCompanies).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Алдаа гарлаа'));
  }, [router]);

  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 2500); return () => clearTimeout(t); }, [msg]);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setFormErr('');
    try {
      await api.superCreateCompany({ ...form, max_vehicles: form.max_vehicles === '' ? null : Number(form.max_vehicles) });
      setOpen(false);
      setForm({ name: '', slug: '', plan: 'basic', max_vehicles: '', admin_name: '', admin_email: '', admin_password: '' });
      setCompanies(await api.superCompanies());
      setMsg('Компани нэмэгдлээ');
    } catch (err: unknown) { setFormErr(err instanceof Error ? err.message : 'Алдаа гарлаа'); }
    finally { setBusy(false); }
  }

  const totals = companies ? {
    active: companies.filter(c => c.is_active).length, vehicles: companies.reduce((a, c) => a + c.vehicles, 0), images: companies.reduce((a, c) => a + c.images, 0),
  } : null;
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-[1500px] mx-auto w-full space-y-4 sm:space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-[#1c1917]">Суперадмин</h1>
          <p className="text-xs sm:text-sm text-[#5f5a54] mt-0.5">Компани нэмэх, багц, боломж, хэрэглээ</p>
        </div>
        <button onClick={() => setOpen(true)} className="shrink-0 bg-brand hover:bg-brand-dark text-white text-sm font-medium px-4 py-2.5 rounded-md transition-colors">+ Компани нэмэх</button>
      </div>

      {msg && <div className="fixed top-4 right-4 z-[60] bg-[#1c1917] text-white text-sm px-4 py-2.5 rounded-md shadow-lg">{msg}</div>}
      {error && <div className="bg-brand-soft border border-brand/20 rounded-lg px-3 py-2 text-sm text-brand">{error}</div>}

      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {[['Компани', `${totals.active} / ${companies!.length}`, 'идэвхтэй'], ['Нийт машин', String(totals.vehicles), ''], ['Нийт зураг', String(totals.images), 'хадгалалтын хэмжээг заана'], ['Дундаж', companies!.length ? String(Math.round(totals.vehicles / companies!.length)) : '0', 'машин / компани']].map(([l, v, s]) => (
            <div key={l} className="rounded-sm bg-white border border-zinc-200 border-t-[3px] border-t-brand px-4 py-3.5 shadow-sm">
              <div className="text-xs text-[#5f5a54] mb-2">{l}</div>
              <div className="text-xl font-semibold tabular-nums text-[#1c1917] leading-none">{v}</div>
              {s && <div className="text-xs text-[#6f6a64] mt-1.5">{s}</div>}
            </div>
          ))}
        </div>
      )}

      {companies === null && !error ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{[0, 1, 2].map(i => <div key={i} className="h-72 rounded-xl bg-[#f3efe9] animate-pulse" />)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {companies?.map(c => (
            <CompanyCard key={c.id} c={c} onMsg={setMsg}
              onChange={n => setCompanies(list => list!.map(x => x.id === n.id ? { ...x, ...n } : x))} />
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:px-4" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <form onSubmit={create} className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-xl shadow-2xl max-h-[92dvh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-[#e6e0d8] flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1c1917]">Шинэ компани</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-[#6f6a64] hover:text-[#1c1917] text-xl leading-none w-9 h-9">×</button>
            </div>
            <div className="p-5 space-y-3">
              <div><div className="text-xs text-[#5f5a54] mb-1.5">Компанийн нэр *</div><input value={form.name} onChange={set('name')} className={inp} required /></div>
              <div><div className="text-xs text-[#5f5a54] mb-1.5">Slug * (латин жижиг үсэг, тоо, зураас - сайтын таних нэр)</div><input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} placeholder="auto-ulaanbaatar" className={inp} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-xs text-[#5f5a54] mb-1.5">Багц</div><select value={form.plan} onChange={set('plan')} className={inp}>{PLANS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
                <div><div className="text-xs text-[#5f5a54] mb-1.5">Машины хязгаар</div><input inputMode="numeric" value={form.max_vehicles} onChange={e => setForm(f => ({ ...f, max_vehicles: e.target.value.replace(/\D/g, '') }))} placeholder="Хязгааргүй" className={inp} /></div>
              </div>
              <div className="pt-2 text-xs font-medium text-[#46413c]">Админ хэрэглэгч</div>
              <div><div className="text-xs text-[#5f5a54] mb-1.5">Нэр *</div><input value={form.admin_name} onChange={set('admin_name')} className={inp} required /></div>
              <div><div className="text-xs text-[#5f5a54] mb-1.5">И-мэйл *</div><input type="email" value={form.admin_email} onChange={set('admin_email')} className={inp} required /></div>
              <div><div className="text-xs text-[#5f5a54] mb-1.5">Нууц үг * (8+ тэмдэгт)</div><input type="text" value={form.admin_password} onChange={set('admin_password')} className={inp} minLength={8} required /></div>
              {formErr && <div className="bg-brand-soft border border-brand/20 rounded-md px-3 py-2 text-sm text-brand">{formErr}</div>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 text-sm text-[#5f5a54] border border-[#e6e0d8] rounded-md hover:border-[#d4ccc2]">Болих</button>
                <button type="submit" disabled={busy} className="flex-1 py-2.5 text-sm font-medium bg-brand hover:bg-brand-dark disabled:opacity-40 text-white rounded-md">{busy ? 'Үүсгэж байна...' : 'Үүсгэх'}</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
