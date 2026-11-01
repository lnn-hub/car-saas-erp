'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useSessionUser } from '@/lib/client-state';
import { ROLE_LABEL } from '@/lib/role';

interface User { id: string; name: string; email: string; role: 'ADMIN' | 'SALES' | 'FINANCE'; is_active: boolean }

const ROLE_HINT: Record<string, string> = {
  ADMIN: 'Бүх эрхтэй: тохиргоо, ажилтан, тайлан',
  FINANCE: 'Өртөг, ашиг, тайлан харна. Тохиргоо өөрчлөхгүй',
  SALES: 'Машин нэмэх, зарах, хүсэлт харах. Өртөг, ашиг, тайлан харахгүй',
};
const inp = 'w-full bg-white border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder-zinc-400 focus:outline-none focus:border-ink/40 transition-colors';

// Админ ажилтан нэмэх, эрх солих, идэвхгүй болгох, нууц үг шинэчлэх
export function StaffManager() {
  const [users, setUsers] = useState<User[]>([]);
  const me = useSessionUser()?.id || '';
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'SALES' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = () => api.getUsers().then(setUsers).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Алдаа'));
  useEffect(() => { load(); }, []);

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(''), 2500); };

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.createUser(form);
      setForm({ name: '', email: '', password: '', role: 'SALES' });
      setAdding(false);
      flash('Ажилтан нэмэгдлээ. Нэвтрэх и-мэйл, нууц үгийг өөрт нь дамжуулаарай.');
      load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Алдаа'); }
    finally { setBusy(false); }
  }

  async function update(u: User, data: Partial<User> & { password?: string }) {
    setError('');
    try {
      const r = await api.updateUser(u.id, data);
      setUsers((xs) => xs.map((x) => (x.id === u.id ? r : x)));
      flash(data.password ? 'Нууц үг шинэчлэгдлээ' : 'Хадгалагдлаа');
    } catch (err) { setError(err instanceof Error ? err.message : 'Алдаа'); }
  }

  function resetPassword(u: User) {
    const pw = prompt(`${u.name}-ийн шинэ нууц үг (8+ тэмдэгт):`);
    if (pw) update(u, { password: pw });
  }

  return (
    <section className="bg-white ring-1 ring-ink/[0.06] rounded-[22px] overflow-hidden shadow-card">
      <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between gap-3">
        <span className="font-display text-base font-semibold text-ink">Ажилтнууд (нэвтрэх эрх)</span>
        <button type="button" onClick={() => setAdding((v) => !v)} className="text-xs font-medium text-brand hover:text-brand-dark py-2">
          {adding ? 'Болих' : '+ Ажилтан нэмэх'}
        </button>
      </div>

      {adding && (
        <form onSubmit={create} className="p-5 border-b border-zinc-100 bg-zinc-50/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Нэр" required className={inp} />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" placeholder="И-мэйл (нэвтрэх нэр)" required className={inp} />
          <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="text" placeholder="Анхны нууц үг (8+ тэмдэгт)" minLength={8} required className={inp} />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inp}>
            <option value="SALES">Борлуулагч</option>
            <option value="FINANCE">Нягтлан</option>
            <option value="ADMIN">Админ</option>
          </select>
          <p className="sm:col-span-2 text-xs text-zinc-500">{ROLE_HINT[form.role]}</p>
          <button type="submit" disabled={busy} className="sm:col-span-2 h-11 rounded-full bg-ink hover:bg-brand disabled:opacity-40 text-white text-sm font-medium transition-colors">
            {busy ? 'Нэмж байна...' : 'Ажилтан нэмэх'}
          </button>
        </form>
      )}

      {error && <div className="mx-5 mt-4 bg-danger-soft border border-danger-line rounded-xl px-3 py-2 text-xs text-danger">{error}</div>}
      {msg && <div className="mx-5 mt-4 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-800">{msg}</div>}

      <ul className="divide-y divide-zinc-100">
        {users.map((u) => {
          const self = u.id === me;
          return (
            <li key={u.id} className={`px-5 py-3.5 flex flex-wrap items-center gap-3 ${u.is_active ? '' : 'opacity-50'}`}>
              <div className="flex-1 min-w-[180px]">
                <div className="text-sm font-medium text-ink">{u.name}{self && <span className="text-zinc-400 font-normal"> (та)</span>}</div>
                <div className="text-xs text-zinc-500">{u.email}</div>
              </div>
              <select value={u.role} disabled={self} onChange={(e) => update(u, { role: e.target.value as User['role'] })}
                title={ROLE_HINT[u.role]}
                className="h-9 px-3 rounded-full border border-zinc-200 bg-white text-sm text-ink disabled:opacity-60">
                {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button type="button" onClick={() => resetPassword(u)} className="h-9 px-3 rounded-full text-sm text-zinc-600 hover:bg-zinc-100">Нууц үг</button>
              {!self && (
                <button type="button" onClick={() => update(u, { is_active: !u.is_active })}
                  className={`h-9 px-3 rounded-full text-sm ${u.is_active ? 'text-zinc-500 hover:text-danger hover:bg-danger-soft' : 'text-emerald-700 hover:bg-emerald-50'}`}>
                  {u.is_active ? 'Хаах' : 'Идэвхжүүлэх'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
