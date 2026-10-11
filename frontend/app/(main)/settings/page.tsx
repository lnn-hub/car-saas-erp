'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const SITE = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

interface Settings {
  name: string; slug: string; phone: string;
  address: string; logo_url: string; show_prices: boolean;
}

const inp = "w-full bg-white border border-[#e4e4e7] rounded-md px-3 py-2 text-sm text-[#09090b] placeholder-[#a1a1aa] focus:outline-none focus:border-[#09090b] transition-colors";

export default function SettingsPage() {
  const [form, setForm]     = useState<Settings>({ name: '', slug: '', phone: '', address: '', logo_url: '', show_prices: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState('');
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    api.getSettings().then(d => {
      setForm({ name: d.name || '', slug: d.slug || '', phone: d.phone || '', address: d.address || '', logo_url: d.logo_url || '', show_prices: d.show_prices !== false });
    }).finally(() => setLoading(false));
  }, []);

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    try {
      const updated = await api.saveSettings({
        slug: form.slug || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        logo_url: form.logo_url || undefined,
        show_prices: form.show_prices,
      });
      setForm(prev => ({ ...prev, ...updated }));
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally { setSaving(false); }
  }

  const showcaseUrl = form.slug ? `${SITE}/s/${form.slug}` : null;

  function copyLink() {
    if (!showcaseUrl) return;
    navigator.clipboard.writeText(showcaseUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return (
    <div className="px-8 py-7 text-sm text-[#a1a1aa]">Ачааллаж байна...</div>
  );

  return (
    <div className="px-8 py-7 max-w-xl">
      <h1 className="text-lg font-semibold text-[#09090b] mb-6">Компанийн тохиргоо</h1>

      {/* Showcase холбоос */}
      {showcaseUrl && (
        <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4 mb-6">
          <div className="text-xs font-semibold text-[#16a34a] mb-2">Таны нийтийн сайт</div>
          <div className="flex items-center gap-2">
            <a href={showcaseUrl} target="_blank" rel="noreferrer"
              className="flex-1 text-sm text-[#16a34a] font-medium truncate hover:underline">
              {showcaseUrl}
            </a>
            <button onClick={copyLink}
              className="text-xs px-3 py-1.5 bg-white border border-[#bbf7d0] rounded-lg text-[#16a34a] hover:bg-[#f0fdf4] transition-colors shrink-0 font-medium">
              {copied ? 'Хуулагдлаа' : 'Хуулах'}
            </button>
          </div>
          <p className="text-xs text-[#4ade80] mt-1.5">
            PUBLISHED машинууд автоматаар энд харагдана
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#e4e4e7]">
            <span className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">Үндсэн мэдээлэл</span>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="text-xs text-[#71717a] block mb-1.5">Компанийн нэр</label>
              <input value={form.name} disabled className={inp + ' bg-[#fafafa] text-[#a1a1aa] cursor-not-allowed'} />
            </div>
            <div>
              <label className="text-xs text-[#71717a] block mb-1.5">Сайтын хаяг (slug)</label>
              <div className="flex items-center gap-0">
                <span className="px-3 py-2 text-xs text-[#a1a1aa] bg-[#f4f4f5] border border-r-0 border-[#e4e4e7] rounded-l-md">/s/</span>
                <input value={form.slug} onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="mongol-auto" className={inp + ' rounded-l-none'} />
              </div>
              <p className="text-[10px] text-[#a1a1aa] mt-1">Жижиг үсэг, тоо, зураас (-) ашиглана</p>
            </div>
            <div>
              <label className="text-xs text-[#71717a] block mb-1.5">Утасны дугаар</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="99001122" className={inp} />
            </div>
            <div>
              <label className="text-xs text-[#71717a] block mb-1.5">Хаяг</label>
              <input value={form.address} onChange={e => set('address', e.target.value)}
                placeholder="Улаанбаатар хот, ..." className={inp} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#e4e4e7]">
            <span className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">Нийтийн сайтын тохиргоо</span>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[#09090b]">Үнэ харуулах</div>
                <div className="text-xs text-[#a1a1aa] mt-0.5">Үйлчлүүлэгчид машины үнийг харуулах</div>
              </div>
              <button type="button" onClick={() => set('show_prices', !form.show_prices)}
                className={`relative w-10 h-6 rounded-full transition-colors ${form.show_prices ? 'bg-[#09090b]' : 'bg-[#e4e4e7]'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.show_prices ? 'left-5' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">{error}</div>
        )}
        {saved && (
          <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg px-3 py-2 text-xs text-[#16a34a]">Хадгалагдлаа</div>
        )}

        <button type="submit" disabled={saving}
          className="w-full py-2.5 bg-[#09090b] hover:bg-[#27272a] disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors">
          {saving ? 'Хадгалж байна...' : 'Хадгалах'}
        </button>
      </form>
    </div>
  );
}
