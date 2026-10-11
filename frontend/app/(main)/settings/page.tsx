'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

interface Settings {
  name: string; phone: string; address: string; email: string; working_hours: string; show_prices: boolean;
}
interface Member { id: string; name: string; position: string | null; bio: string | null; photo_url: string | null; }

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const inp = "w-full bg-white border border-[#e4e4e7] rounded-md px-3 py-2 text-sm text-[#09090b] placeholder-[#a1a1aa] focus:outline-none focus:border-brand transition-colors";

function photoSrc(u: string | null) {
  if (!u) return null;
  return u.startsWith('http') ? u : `${BACKEND}${u}`;
}
function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 border-b border-[#e4e4e7] flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-[#09090b]">{title}</span>
        {hint && <span className="text-[11px] text-[#a1a1aa]">{hint}</span>}
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

  const loadTeam = () => api.getTeam().then(setTeam).catch(console.error);

  useEffect(() => {
    api.getSettings().then(d => {
      setForm({
        name: d.name || '', phone: d.phone || '', address: d.address || '',
        email: d.email || '', working_hours: d.working_hours || '', show_prices: d.show_prices !== false,
      });
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
        phone: form.phone, address: form.address, email: form.email,
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

  if (loading) return <div className="px-4 sm:px-6 py-5 sm:py-7 text-sm text-[#a1a1aa]">Ачааллаж байна...</div>;

  const previewUrl = mFile ? URL.createObjectURL(mFile) : editing && editing !== 'new' ? photoSrc(editing.photo_url) : null;

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-base sm:text-lg font-bold text-[#09090b]">Тохиргоо</h1>
        <p className="text-xs sm:text-sm text-[#71717a] mt-0.5">Вэбсайтад харагдах мэдээлэл, манай баг</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title="Холбоо барих мэдээлэл" hint="Нүүр хуудсанд харагдана">
          <div className="p-5 grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs text-[#71717a] block mb-1.5">Компанийн нэр</label>
              <input value={form.name} disabled className={inp + ' bg-[#fafafa] text-[#a1a1aa] cursor-not-allowed'} />
            </div>
            <div>
              <label className="text-xs text-[#71717a] block mb-1.5">Утасны дугаар</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="99001122" className={inp} />
            </div>
            <div>
              <label className="text-xs text-[#71717a] block mb-1.5">И-мэйл</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@company.mn" className={inp} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-[#71717a] block mb-1.5">Хаяг</label>
              <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Улаанбаатар хот, ..." className={inp} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-[#71717a] block mb-1.5">Ажлын цаг</label>
              <input value={form.working_hours} onChange={e => set('working_hours', e.target.value)} placeholder="Даваа - Бямба: 09:00 - 19:00" className={inp} />
            </div>
          </div>
        </Section>

        <div className="bg-white border border-[#e4e4e7] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-[#09090b]">Вэбсайтад үнэ харуулах</div>
              <div className="text-xs text-[#a1a1aa] mt-0.5">Үйлчлүүлэгчид машины үнийг харуулах эсэх</div>
            </div>
            <button type="button" onClick={() => set('show_prices', !form.show_prices)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.show_prices ? 'bg-brand' : 'bg-[#e4e4e7]'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.show_prices ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">{error}</div>}
        {saved && <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg px-3 py-2 text-xs text-[#16a34a]">Хадгалагдлаа</div>}

        <button type="submit" disabled={saving}
          className="w-full sm:w-auto sm:px-10 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-40 text-white text-xs font-black uppercase tracking-widest rounded-md transition-colors">
          {saving ? 'Хадгалж байна...' : 'Хадгалах'}
        </button>
      </form>

      <Section title="Манай баг" hint={`${team.length} гишүүн`}>
        <div className="divide-y divide-[#f4f4f5]">
          {team.map(m => (
            <div key={m.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-brand-soft text-brand flex items-center justify-center font-black text-sm shrink-0">
                {photoSrc(m.photo_url)
                  ? <img src={photoSrc(m.photo_url)!} alt="" className="w-full h-full object-cover" />
                  : initials(m.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-[#09090b] truncate">{m.name}</div>
                <div className="text-xs text-[#71717a] truncate">{m.position || '—'}</div>
              </div>
              <button onClick={() => openMember(m)} className="text-xs font-semibold text-[#71717a] hover:text-brand px-2 py-1">Засах</button>
              <button onClick={() => removeMember(m)} className="text-xs font-semibold text-[#a1a1aa] hover:text-red-600 px-2 py-1">Хасах</button>
            </div>
          ))}
          {team.length === 0 && <div className="px-5 py-8 text-center text-sm text-[#a1a1aa]">Гишүүн нэмээгүй байна</div>}
        </div>
        <div className="p-4 border-t border-[#e4e4e7] bg-[#fafafa]">
          <button type="button" onClick={() => openMember('new')}
            className="text-xs font-black uppercase tracking-widest text-brand hover:text-brand-dark">+ Гишүүн нэмэх</button>
        </div>
      </Section>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:px-4"
          onClick={e => { if (e.target === e.currentTarget) setEditing(null); }}>
          <form onSubmit={saveMember} className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl shadow-2xl max-h-[92dvh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-[#e4e4e7] flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#09090b]">{editing === 'new' ? 'Гишүүн нэмэх' : 'Гишүүн засах'}</h2>
              <button type="button" onClick={() => setEditing(null)} className="text-[#a1a1aa] hover:text-[#09090b] text-lg leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-brand-soft text-brand flex items-center justify-center font-black text-xl shrink-0">
                  {previewUrl ? <img src={previewUrl} alt="" className="w-full h-full object-cover" /> : initials(mForm.name || '?')}
                </div>
                <div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => setMFile(e.target.files?.[0] || null)} />
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="text-xs font-bold border border-[#e4e4e7] hover:border-brand hover:text-brand rounded-md px-3 py-2 transition-colors">
                    {previewUrl ? 'Зураг солих' : 'Зураг оруулах'}
                  </button>
                  <div className="text-[11px] text-[#a1a1aa] mt-1.5">Нүүр царай тод харагдах зураг</div>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#71717a] block mb-1.5">Нэр *</label>
                <input value={mForm.name} onChange={e => setMForm(p => ({ ...p, name: e.target.value }))} className={inp} required />
              </div>
              <div>
                <label className="text-xs text-[#71717a] block mb-1.5">Албан тушаал</label>
                <input value={mForm.position} onChange={e => setMForm(p => ({ ...p, position: e.target.value }))} placeholder="Борлуулалтын менежер" className={inp} />
              </div>
              <div>
                <label className="text-xs text-[#71717a] block mb-1.5">Танилцуулга</label>
                <textarea value={mForm.bio} onChange={e => setMForm(p => ({ ...p, bio: e.target.value }))} rows={3} className={inp + ' resize-none'} />
              </div>
              {mError && <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-xs text-red-600">{mError}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(null)}
                  className="flex-1 py-2.5 text-sm text-[#71717a] border border-[#e4e4e7] rounded-md hover:border-[#d4d4d8]">Болих</button>
                <button type="submit" disabled={mBusy}
                  className="flex-1 py-2.5 text-xs font-black uppercase tracking-widest bg-brand hover:bg-brand-dark disabled:opacity-40 text-white rounded-md">
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
