'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

interface Settings {
  name: string; phone: string; address: string; email: string; working_hours: string; show_prices: boolean;
}
interface Member { id: string; name: string; position: string | null; bio: string | null; photo_url: string | null; }

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const inp = "w-full bg-white border border-[#e6e0d8] rounded-md px-3 py-2 text-sm text-[#1c1917] placeholder-[#6f6a64] focus:outline-none focus:border-brand transition-colors";

function photoSrc(u: string | null) {
  if (!u) return null;
  return u.startsWith('http') ? u : `${BACKEND}${u}`;
}
function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e6e0d8] rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 border-b border-[#e6e0d8] flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-[#1c1917]">{title}</span>
        {hint && <span className="text-xs text-[#6f6a64]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [form, setForm]       = useState<Settings>({ name: '', phone: '', address: '', email: '', working_hours: '', show_prices: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState('');

  const [team, setTeam]       = useState<Member[]>([]);
  const [editing, setEditing] = useState<Member | 'new' | null>(null);
  const [mForm, setMForm]     = useState({ name: '', position: '', bio: '' });
  const [mFile, setMFile]     = useState<File | null>(null);
  const [mBusy, setMBusy]     = useState(false);
  const [mError, setMError]   = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [logo, setLogo]       = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoErr, setLogoErr]   = useState('');
  const logoRef = useRef<HTMLInputElement>(null);

  async function pickLogo(file: File | undefined) {
    if (!file) return;
    setLogoBusy(true); setLogoErr('');
    try { const r = await api.uploadLogo(file); setLogo(r.logo_url); }
    catch (err: unknown) { setLogoErr(err instanceof Error ? err.message : 'Алдаа гарлаа'); }
    finally { setLogoBusy(false); if (logoRef.current) logoRef.current.value = ''; }
  }
  async function dropLogo() {
    if (!confirm('Логог устгах уу?')) return;
    setLogoBusy(true); setLogoErr('');
    try { await api.deleteLogo(); setLogo(null); }
    catch (err: unknown) { setLogoErr(err instanceof Error ? err.message : 'Алдаа гарлаа'); }
    finally { setLogoBusy(false); }
  }

  const [seed, setSeed] = useState<{ running: boolean; done: number; total: number; message: string; error: string | null; failed?: string[]; finishedAt?: string | null } | null>(null);
  const [seedErr, setSeedErr] = useState('');

  useEffect(() => {
    api.demoSeedStatus().then(setSeed).catch(() => {});
  }, []);

  useEffect(() => {
    if (!seed?.running) return;
    const t = setInterval(() => {
      api.demoSeedStatus().then(setSeed).catch(() => {});
    }, 3000);
    return () => clearInterval(t);
  }, [seed?.running]);

  async function startSeed() {
    if (!confirm('10 жишээ машин (зурагтай) оруулах уу? Өмнө оруулсан жишээ машинууд шинэчлэгдэнэ.')) return;
    setSeedErr('');
    try { setSeed(await api.startDemoSeed()); }
    catch (err: unknown) { setSeedErr(err instanceof Error ? err.message : 'Алдаа гарлаа'); }
  }

  const loadTeam = () => api.getTeam().then(setTeam).catch(console.error);

  useEffect(() => {
    api.getSettings().then(d => {
      setForm({
        name: d.name || '', phone: d.phone || '', address: d.address || '',
        email: d.email || '', working_hours: d.working_hours || '', show_prices: d.show_prices !== false,
      });
      setLogo(d.logo_url || null);
    }).finally(() => setLoading(false));
    loadTeam();
  }, []);

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    try {
      await api.saveSettings({
        name: form.name, phone: form.phone, address: form.address, email: form.email,
        working_hours: form.working_hours, show_prices: form.show_prices,
      });
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally { setSaving(false); }
  }

  function openMember(m: Member | 'new') {
    setEditing(m); setMFile(null); setMError('');
    setMForm(m === 'new' ? { name: '', position: '', bio: '' } : { name: m.name, position: m.position || '', bio: m.bio || '' });
  }

  async function saveMember(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setMBusy(true); setMError('');
    try {
      const rec = editing === 'new'
        ? await api.createTeamMember(mForm)
        : await api.updateTeamMember(editing.id, mForm);
      if (mFile) await api.uploadTeamPhoto(rec.id, mFile);
      setEditing(null);
      await loadTeam();
    } catch (err: unknown) {
      setMError(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally { setMBusy(false); }
  }

  async function removeMember(m: Member) {
    if (!confirm(`"${m.name}"-г багаас хасах уу?`)) return;
    await api.deleteTeamMember(m.id);
    loadTeam();
  }

  if (loading) return <div className="px-4 sm:px-6 py-5 sm:py-7 text-sm text-[#6f6a64]">Ачааллаж байна...</div>;

  const previewUrl = mFile ? URL.createObjectURL(mFile) : editing && editing !== 'new' ? photoSrc(editing.photo_url) : null;

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-base sm:text-lg font-bold text-[#1c1917]">Тохиргоо</h1>
        <p className="text-xs sm:text-sm text-[#5f5a54] mt-0.5">Вэбсайтад харагдах мэдээлэл, манай баг</p>
      </div>

      <Section title="Компанийн лого" hint="Header дээр харагдана">
        <div className="p-5 flex items-center gap-5">
          <div className="w-28 h-20 rounded-md border border-dashed border-[#d4ccc2] bg-[#faf8f5] flex items-center justify-center overflow-hidden shrink-0">
            {logo
              ? <img src={photoSrc(logo)!} alt="Лого" className="max-w-full max-h-full object-contain" />
              : <span className="text-xs text-[#6f6a64]">Лого байхгүй</span>}
          </div>
          <div className="space-y-2">
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => pickLogo(e.target.files?.[0])} />
            <div className="flex gap-2">
              <button type="button" onClick={() => logoRef.current?.click()} disabled={logoBusy}
                className="text-sm border border-[#e6e0d8] hover:border-brand hover:text-brand rounded-md px-4 py-2 transition-colors disabled:opacity-40 font-medium">
                {logoBusy ? 'Хүлээнэ үү...' : logo ? 'Лого солих' : 'Лого оруулах'}
              </button>
              {logo && (
                <button type="button" onClick={dropLogo} disabled={logoBusy}
                  className="text-xs font-bold text-[#6f6a64] hover:text-brand px-2 disabled:opacity-40">Устгах</button>
              )}
            </div>
            <div className="text-xs text-[#6f6a64]">PNG (тунгалаг дэвсгэртэй) эсвэл JPG. Хэвтээ хэлбэртэй лого сайн харагдана.</div>
            {logoErr && <div className="text-xs text-brand">{logoErr}</div>}
          </div>
        </div>
      </Section>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title="Холбоо барих мэдээлэл" hint="Нүүр хуудсанд харагдана">
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs text-[#5f5a54] block mb-1.5">Компанийн нэр</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Компанийн нэр" className={inp} required />
            </div>
            <div>
              <label className="text-xs text-[#5f5a54] block mb-1.5">Утасны дугаар</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="99001122" className={inp} />
            </div>
            <div>
              <label className="text-xs text-[#5f5a54] block mb-1.5">И-мэйл</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@company.mn" className={inp} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-[#5f5a54] block mb-1.5">Хаяг</label>
              <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Улаанбаатар хот, ..." className={inp} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-[#5f5a54] block mb-1.5">Ажлын цаг</label>
              <input value={form.working_hours} onChange={e => set('working_hours', e.target.value)} placeholder="Даваа - Бямба: 09:00 - 19:00" className={inp} />
            </div>
          </div>
        </Section>

        <div className="bg-white border border-[#e6e0d8] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-[#1c1917]">Вэбсайтад үнэ харуулах</div>
              <div className="text-xs text-[#6f6a64] mt-0.5">Үйлчлүүлэгчид машины үнийг харуулах эсэх</div>
            </div>
            <button type="button" onClick={() => set('show_prices', !form.show_prices)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 before:content-[''] before:absolute before:-inset-3 ${form.show_prices ? 'bg-brand' : 'bg-[#e6e0d8]'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.show_prices ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {error && <div className="bg-brand-soft border border-brand/20 rounded-lg px-3 py-2 text-xs text-brand">{error}</div>}
        {saved && <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-700">Хадгалагдлаа</div>}

        <button type="submit" disabled={saving}
          className="w-full sm:w-auto sm:px-10 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-40 text-white text-sm rounded-md transition-colors font-medium">
          {saving ? 'Хадгалж байна...' : 'Хадгалах'}
        </button>
      </form>

      <Section title="Манай баг" hint={`${team.length} гишүүн`}>
        <div className="divide-y divide-[#f3efe9]">
          {team.map(m => (
            <div key={m.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-brand-soft text-brand flex items-center justify-center font-bold text-sm shrink-0">
                {photoSrc(m.photo_url)
                  ? <img src={photoSrc(m.photo_url)!} alt="" className="w-full h-full object-cover" />
                  : initials(m.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-[#1c1917] truncate">{m.name}</div>
                <div className="text-xs text-[#5f5a54] truncate">{m.position || '—'}</div>
              </div>
              <button onClick={() => openMember(m)} className="text-xs font-semibold text-[#5f5a54] hover:text-brand px-3 py-2.5">Засах</button>
              <button onClick={() => removeMember(m)} className="text-xs font-semibold text-[#6f6a64] hover:text-brand px-3 py-2.5">Хасах</button>
            </div>
          ))}
          {team.length === 0 && <div className="px-5 py-8 text-center text-sm text-[#6f6a64]">Гишүүн нэмээгүй байна</div>}
        </div>
        <div className="p-4 border-t border-[#e6e0d8] bg-[#faf8f5]">
          <button type="button" onClick={() => openMember('new')}
            className="text-xs font-medium text-brand hover:text-brand-dark py-2.5 pr-3">+ Гишүүн нэмэх</button>
        </div>
      </Section>

      <Section title="Жишээ өгөгдөл" hint="Demo харуулахад">
        <div className="p-5 space-y-3">
          <p className="text-sm text-[#5f5a54] leading-relaxed">
            Toyota, Lexus-ийн 10 жишээ машиныг мэдээлэл, зурагтай нь вэбсайтад оруулна.
            Нэг минут орчим үргэлжилнэ. Дахин дарахад өмнөх жишээ машинууд шинэчлэгдэнэ, бусад машинд хөндлөнгөөс орохгүй.
          </p>
          <button type="button" onClick={startSeed} disabled={seed?.running}
            className="px-5 py-2.5 bg-[#111] hover:bg-brand disabled:opacity-50 text-white text-sm rounded-md transition-colors font-medium">
            {seed?.running ? 'Оруулж байна...' : 'Жишээ машин оруулах'}
          </button>
          {seed?.running && (
            <div>
              <div className="h-1.5 bg-[#f3efe9] rounded-full overflow-hidden">
                <div className="h-full bg-brand transition-all" style={{ width: `${seed.total ? (seed.done / seed.total) * 100 : 5}%` }} />
              </div>
              <div className="text-xs text-[#5f5a54] mt-1.5">{seed.message} ({seed.done}/{seed.total || 10})</div>
            </div>
          )}
          {seed && !seed.running && !seed.error && seed.total > 0 && !(seed.failed?.length) && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-700">Дууслаа - нүүр хуудсыг шинэчилж харна уу</div>
          )}
          {!!seed?.failed?.length && !seed.running && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-700 space-y-1">
              <div className="font-bold">{seed.failed.length} машин амжилтгүй болсон:</div>
              {seed.failed.map((f) => <div key={f}>{f}</div>)}
            </div>
          )}
          {(seed?.error || seedErr) && (
            <div className="bg-brand-soft border border-brand/20 rounded-lg px-3 py-2 text-xs text-brand">{seed?.error || seedErr}</div>
          )}
        </div>
      </Section>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:px-4"
          onClick={e => { if (e.target === e.currentTarget) setEditing(null); }}>
          <form onSubmit={saveMember} className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl shadow-2xl max-h-[92dvh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-[#e6e0d8] flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1c1917]">{editing === 'new' ? 'Гишүүн нэмэх' : 'Гишүүн засах'}</h2>
              <button type="button" onClick={() => setEditing(null)} className="text-[#6f6a64] hover:text-[#1c1917] text-lg leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-brand-soft text-brand flex items-center justify-center font-bold text-xl shrink-0">
                  {previewUrl ? <img src={previewUrl} alt="" className="w-full h-full object-cover" /> : initials(mForm.name || '?')}
                </div>
                <div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => setMFile(e.target.files?.[0] || null)} />
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="text-xs font-bold border border-[#e6e0d8] hover:border-brand hover:text-brand rounded-md px-3 py-2 transition-colors">
                    {previewUrl ? 'Зураг солих' : 'Зураг оруулах'}
                  </button>
                  <div className="text-xs text-[#6f6a64] mt-1.5">Нүүр царай тод харагдах зураг</div>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#5f5a54] block mb-1.5">Нэр *</label>
                <input value={mForm.name} onChange={e => setMForm(p => ({ ...p, name: e.target.value }))} className={inp} required />
              </div>
              <div>
                <label className="text-xs text-[#5f5a54] block mb-1.5">Албан тушаал</label>
                <input value={mForm.position} onChange={e => setMForm(p => ({ ...p, position: e.target.value }))} placeholder="Борлуулалтын менежер" className={inp} />
              </div>
              <div>
                <label className="text-xs text-[#5f5a54] block mb-1.5">Танилцуулга</label>
                <textarea value={mForm.bio} onChange={e => setMForm(p => ({ ...p, bio: e.target.value }))} rows={3} className={inp + ' resize-none'} />
              </div>
              {mError && <div className="bg-brand-soft border border-brand/20 rounded-md px-3 py-2 text-xs text-brand">{mError}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(null)}
                  className="flex-1 py-2.5 text-sm text-[#5f5a54] border border-[#e6e0d8] rounded-md hover:border-[#d4ccc2]">Болих</button>
                <button type="submit" disabled={mBusy}
                  className="flex-1 py-2.5 text-sm bg-brand hover:bg-brand-dark disabled:opacity-40 text-white rounded-md font-medium">
                  {mBusy ? 'Хадгалж байна...' : 'Хадгалах'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
