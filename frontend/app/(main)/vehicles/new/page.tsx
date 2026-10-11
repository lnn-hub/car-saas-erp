'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { IconArrowLeft } from '@/components/icons';
import { BRANDS, BRANDS_MODELS, COLORS, getWeekday } from '@/lib/vehicle-data';

const inp = "w-full bg-white border border-[#e4e4e7] rounded-md px-3 py-2 text-sm text-[#09090b] placeholder-[#a1a1aa] focus:outline-none focus:border-[#09090b] transition-colors";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1989 }, (_, i) => CURRENT_YEAR - i);

export default function NewVehiclePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    vin: '', brand: '', model: '', year: 0,
    mileage: 0, color: '', fuel_type: 'PETROL', transmission: 'AUTO',
    engine_cc: '', description: '', arrived_at: '',
  });
  const [models, setModels] = useState<string[]>([]);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setForm(prev => ({ ...prev, year: CURRENT_YEAR, arrived_at: today }));
  }, []);

  function set(field: string, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'brand') {
      setModels(BRANDS_MODELS[value as string] || []);
      setForm(prev => ({ ...prev, brand: value as string, model: '' }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.createVehicle(form);
      router.push('/vehicles');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally { setLoading(false); }
  }

  const weekday = getWeekday(form.arrived_at);

  return (
    <div className="px-8 py-7 max-w-2xl">
      <button onClick={() => router.back()}
        className="flex items-center gap-1.5 text-[#a1a1aa] hover:text-[#09090b] text-sm transition-colors mb-6">
        <IconArrowLeft className="w-4 h-4" /> Буцах
      </button>
      <h1 className="text-lg font-semibold text-[#09090b] mb-6">Машин нэмэх</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Үндсэн мэдээлэл */}
        <Section title="Үндсэн мэдээлэл">
          <div className="grid grid-cols-2 gap-3">
            {/* Brand */}
            <Field label="Марк" required>
              <select value={form.brand} onChange={e => set('brand', e.target.value)} className={inp} required>
                <option value="">— Марк сонгох —</option>
                {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>

            {/* Model */}
            <Field label="Загвар" required>
              {models.length > 0 ? (
                <select value={form.model} onChange={e => set('model', e.target.value)} className={inp} required>
                  <option value="">— Загвар сонгох —</option>
                  {models.map(m => <option key={m} value={m}>{m}</option>)}
                  <option value="Бусад">Бусад</option>
                </select>
              ) : (
                <input value={form.model} onChange={e => set('model', e.target.value)}
                  placeholder="Загвар оруулах" className={inp} required />
              )}
            </Field>

            {/* Year */}
            <Field label="Он" required>
              <select value={form.year || ''} onChange={e => set('year', Number(e.target.value))} className={inp} required>
                <option value="">— Он сонгох —</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>

            {/* VIN */}
            <Field label="VIN код" required>
              <input value={form.vin} onChange={e => set('vin', e.target.value.toUpperCase())}
                placeholder="JT2BF22K1W0123456" maxLength={17}
                className={inp + ' uppercase tracking-widest'} required />
            </Field>

            {/* Arrived at */}
            <Field label="Ирсэн огноо">
              <div className="relative">
                <input type="date" value={form.arrived_at} onChange={e => set('arrived_at', e.target.value)}
                  className={inp} />
                {weekday && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#a1a1aa] pointer-events-none">
                    {weekday}
                  </span>
                )}
              </div>
            </Field>
          </div>
        </Section>

        {/* Техникийн үзүүлэлт */}
        <Section title="Техникийн үзүүлэлт">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Гүйлт (км)">
              <input type="number" value={form.mileage || ''} onChange={e => set('mileage', Number(e.target.value))}
                min={0} placeholder="50000" className={inp} />
            </Field>

            {/* Color with swatches */}
            <Field label="Өнгө">
              <div className="space-y-2">
                <select value={form.color} onChange={e => set('color', e.target.value)} className={inp}>
                  <option value="">— Өнгө сонгох —</option>
                  {COLORS.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
                </select>
                {form.color && (
                  <div className="flex gap-1.5 flex-wrap">
                    {COLORS.map(c => (
                      <button key={c.value} type="button" title={c.value}
                        onClick={() => set('color', c.value)}
                        className={`w-5 h-5 rounded-full border-2 transition-all ${form.color === c.value ? 'border-[#09090b] scale-110' : 'border-transparent hover:border-[#d4d4d8]'}`}
                        style={{ backgroundColor: c.hex, boxShadow: c.hex === '#ffffff' ? 'inset 0 0 0 1px #e4e4e7' : undefined }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Field>

            <Field label="Түлшний төрөл">
              <div className="grid grid-cols-2 gap-1.5">
                {[['PETROL','Бензин'],['DIESEL','Дизель'],['HYBRID','Хибрид'],['ELECTRIC','Цахилгаан']].map(([v,l]) => (
                  <button key={v} type="button" onClick={() => set('fuel_type', v)}
                    className={`py-1.5 text-xs rounded-md border transition-colors ${form.fuel_type === v ? 'bg-[#09090b] text-white border-[#09090b]' : 'border-[#e4e4e7] text-[#71717a] hover:border-[#d4d4d8] hover:text-[#09090b]'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Хурдны хайрцаг">
              <div className="grid grid-cols-2 gap-1.5">
                {[['AUTO','Автомат'],['MANUAL','Механик']].map(([v,l]) => (
                  <button key={v} type="button" onClick={() => set('transmission', v)}
                    className={`py-1.5 text-xs rounded-md border transition-colors ${form.transmission === v ? 'bg-[#09090b] text-white border-[#09090b]' : 'border-[#e4e4e7] text-[#71717a] hover:border-[#d4d4d8] hover:text-[#09090b]'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Хөдөлгүүр (cc)">
              <select value={form.engine_cc} onChange={e => set('engine_cc', e.target.value)} className={inp}>
                <option value="">— Сонгох —</option>
                {['1000','1200','1300','1400','1500','1600','1800','2000','2200','2400','2500','2700','3000','3500','4000','4500','5000'].map(cc => (
                  <option key={cc} value={cc}>{(Number(cc)/1000).toFixed(1)}L ({cc}cc)</option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        {/* Нэмэлт */}
        <Section title="Нэмэлт тайлбар">
          <Field label="">
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="Машины онцлог, нэмэлт мэдээлэл..." className={inp} />
          </Field>
        </Section>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-xs text-red-600">{error}</div>
        )}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2 text-sm text-[#71717a] border border-[#e4e4e7] rounded-md hover:border-[#d4d4d8] hover:text-[#09090b] transition-colors">
            Болих
          </button>
          <button type="submit" disabled={loading}
            className="px-4 py-2 text-sm font-medium bg-[#09090b] hover:bg-[#27272a] disabled:opacity-40 text-white rounded-md transition-colors">
            {loading ? 'Хадгалж байна...' : 'Хадгалах'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e4e4e7] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[#e4e4e7]">
        <span className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      {label && (
        <label className="text-xs text-[#71717a] block mb-1.5">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
    </div>
  );
}
