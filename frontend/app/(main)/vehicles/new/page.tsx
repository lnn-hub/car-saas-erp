'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { IconArrowLeft } from '@/components/icons';

const inp = "w-full bg-white border border-[#e4e4e7] rounded-md px-3 py-2 text-sm text-[#09090b] placeholder-[#a1a1aa] focus:outline-none focus:border-[#09090b] transition-colors";

export default function NewVehiclePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    vin: '', brand: '', model: '', year: 0,
    mileage: 0, color: '', fuel_type: 'PETROL', transmission: 'AUTO',
    engine_cc: '', description: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm(prev => ({ ...prev, year: new Date().getFullYear() }));
  }, []);

  function set(field: string, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.createVehicle(form);
      router.push('/vehicles');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-8 py-7 max-w-2xl">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-[#a1a1aa] hover:text-[#09090b] text-sm transition-colors mb-6">
        <IconArrowLeft className="w-4 h-4" />
        Буцах
      </button>
      <h1 className="text-lg font-semibold text-[#09090b] mb-6">Машин нэмэх</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title="Үндсэн мэдээлэл">
          <div className="grid grid-cols-2 gap-3">
            <Field label="VIN код" required>
              <input value={form.vin} onChange={e => set('vin', e.target.value)} placeholder="JT2BF22K1W0123456" className={inp} required />
            </Field>
            <Field label="Он" required>
              <input type="number" value={form.year || ''} onChange={e => set('year', Number(e.target.value))} min={1990} max={2030} className={inp} required />
            </Field>
            <Field label="Марк" required>
              <input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Toyota" className={inp} required />
            </Field>
            <Field label="Загвар" required>
              <input value={form.model} onChange={e => set('model', e.target.value)} placeholder="Camry" className={inp} required />
            </Field>
          </div>
        </Section>

        <Section title="Техникийн үзүүлэлт">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Гүйлт (км)">
              <input type="number" value={form.mileage} onChange={e => set('mileage', Number(e.target.value))} min={0} className={inp} />
            </Field>
            <Field label="Өнгө">
              <input value={form.color} onChange={e => set('color', e.target.value)} placeholder="Цагаан" className={inp} />
            </Field>
            <Field label="Түлшний төрөл">
              <select value={form.fuel_type} onChange={e => set('fuel_type', e.target.value)} className={inp}>
                <option value="PETROL">Бензин</option>
                <option value="DIESEL">Дизель</option>
                <option value="HYBRID">Хибрид</option>
                <option value="ELECTRIC">Цахилгаан</option>
              </select>
            </Field>
            <Field label="Хурдны хайрцаг">
              <select value={form.transmission} onChange={e => set('transmission', e.target.value)} className={inp}>
                <option value="AUTO">Автомат</option>
                <option value="MANUAL">Механик</option>
              </select>
            </Field>
            <Field label="Хөдөлгүүр (cc)">
              <input type="number" value={form.engine_cc} onChange={e => set('engine_cc', e.target.value)} placeholder="2000" className={inp} />
            </Field>
          </div>
        </Section>

        <Section title="Нэмэлт">
          <Field label="Тайлбар">
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Машины талаарх нэмэлт мэдээлэл..." className={inp} />
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
      <label className="text-xs text-[#71717a] block mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
