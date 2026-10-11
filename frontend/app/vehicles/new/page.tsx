'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function NewVehiclePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    vin: '', brand: '', model: '', year: new Date().getFullYear(),
    mileage: 0, color: '', fuel_type: 'PETROL', transmission: 'AUTO',
    engine_cc: '', description: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white">←</button>
        <h1 className="text-2xl font-bold text-white">Машин нэмэх</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="VIN код *" required>
            <input value={form.vin} onChange={e => set('vin', e.target.value)}
              placeholder="JT2BF22K1W0123456" className={input} required />
          </Field>
          <Field label="Марк *" required>
            <input value={form.brand} onChange={e => set('brand', e.target.value)}
              placeholder="Toyota" className={input} required />
          </Field>
          <Field label="Загвар *" required>
            <input value={form.model} onChange={e => set('model', e.target.value)}
              placeholder="Camry" className={input} required />
          </Field>
          <Field label="Он *" required>
            <input type="number" value={form.year} onChange={e => set('year', Number(e.target.value))}
              min={1990} max={2030} className={input} required />
          </Field>
          <Field label="Гүйлт (км)">
            <input type="number" value={form.mileage} onChange={e => set('mileage', Number(e.target.value))}
              min={0} className={input} />
          </Field>
          <Field label="Өнгө">
            <input value={form.color} onChange={e => set('color', e.target.value)}
              placeholder="Цагаан" className={input} />
          </Field>
          <Field label="Түлш">
            <select value={form.fuel_type} onChange={e => set('fuel_type', e.target.value)} className={input}>
              <option value="PETROL">Бензин</option>
              <option value="DIESEL">Дизель</option>
              <option value="HYBRID">Хибрид</option>
              <option value="ELECTRIC">Цахилгаан</option>
            </select>
          </Field>
          <Field label="Хурдны хайрцаг">
            <select value={form.transmission} onChange={e => set('transmission', e.target.value)} className={input}>
              <option value="AUTO">Автомат</option>
              <option value="MANUAL">Механик</option>
            </select>
          </Field>
          <Field label="Хөдөлгүүр (cc)">
            <input type="number" value={form.engine_cc} onChange={e => set('engine_cc', e.target.value)}
              placeholder="2000" className={input} />
          </Field>
        </div>

        <Field label="Тайлбар">
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            rows={3} placeholder="Машины талаарх нэмэлт мэдээлэл..." className={input} />
        </Field>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-lg transition-colors">
            Болих
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors">
            {loading ? 'Хадгалж байна...' : 'Хадгалах'}
          </button>
        </div>
      </form>
    </div>
  );
}

const input = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500";

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="text-gray-400 text-xs block mb-1">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}
