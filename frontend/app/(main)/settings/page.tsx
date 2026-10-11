'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Settings {
  name: string; phone: string; address: string; show_prices: boolean;
}

const inp = "w-full bg-white border border-[#e4e4e7] rounded-md px-3 py-2 text-sm text-[#09090b] placeholder-[#a1a1aa] focus:outline-none focus:border-[#09090b] transition-colors";

export default function SettingsPage() {
  const [form, setForm]       = useState<Settings>({ name: '', phone: '', address: '', show_prices: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.getSettings().then(d => {
      setForm({ name: d.name || '', phone: d.phone || '', address: d.address || '', show_prices: d.show_prices !== false });
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
      await api.saveSettings({ phone: form.phone, address: form.address, show_prices: form.show_prices });
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally { setSaving(false); }
  }

  if (loading) return <div className="px-4 sm:px-8 py-5 sm:py-7 text-sm text-[#a1a1aa]">Ачааллаж байна...</div>;

  return (
    <div className="px-4 sm:px-8 py-5 sm:py-7 max-w-xl">
      <h1 className="text-lg font-semibold text-[#09090b] mb-6">Тохиргоо</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#e4e4e7]">
            <span className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">Компанийн мэдээлэл</span>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="text-xs text-[#71717a] block mb-1.5">Компанийн нэр</label>
              <input value={form.name} disabled className={inp + ' bg-[#fafafa] text-[#a1a1aa] cursor-not-allowed'} />
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

        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[#09090b]">Вэбсайтад үнэ харуулах</div>
              <div className="text-xs text-[#a1a1aa] mt-0.5">Үйлчлүүлэгчид машины үнийг харуулах эсэх</div>
            </div>
            <button type="button" onClick={() => set('show_prices', !form.show_prices)}
              className={`relative w-10 h-6 rounded-full transition-colors ${form.show_prices ? 'bg-[#09090b]' : 'bg-[#e4e4e7]'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.show_prices ? 'left-5' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">{error}</div>}
        {saved && <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg px-3 py-2 text-xs text-[#16a34a]">Хадгалагдлаа</div>}

        <button type="submit" disabled={saving}
          className="w-full py-2.5 bg-[#09090b] hover:bg-[#27272a] disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors">
          {saving ? 'Хадгалж байна...' : 'Хадгалах'}
        </button>
      </form>
    </div>
  );
}
