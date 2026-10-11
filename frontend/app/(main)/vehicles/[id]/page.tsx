'use client';
import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { IconArrowLeft } from '@/components/icons';

interface Cost { id: string; cost_type: string; amount: string; currency: string; note: string; }
interface Vehicle {
  id: string; vin: string; brand: string; model: string; year: number;
  mileage: number; color: string; fuel_type: string; transmission: string;
  status: string; description: string; costs: Cost[];
}

const COST_LABELS: Record<string, string> = {
  PURCHASE: 'Авсан үнэ', SHIPPING: 'Тээвэр', CUSTOMS: 'Гааль',
  REPAIR: 'Засвар', CLEANING: 'Угаалга', OTHER: 'Бусад',
};
const STATUS: Record<string, { label: string; dot: string }> = {
  ARRIVED:   { label: 'Ирсэн',        dot: 'bg-amber-400' },
  PUBLISHED: { label: 'Нийтлэгдсэн',  dot: 'bg-blue-400' },
  RESERVED:  { label: 'Захиалгатай',  dot: 'bg-violet-400' },
  SOLD:      { label: 'Зарагдсан',    dot: 'bg-emerald-400' },
};
const STATUS_NEXT = ['ARRIVED', 'PUBLISHED', 'RESERVED'];

const inp = "w-full bg-[#0d0d0d] border border-[#222] rounded-md px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#444] transition-colors";

function VehicleDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [costForm, setCostForm] = useState({ cost_type: 'PURCHASE', amount: '', currency: 'MNT', note: '' });
  const [saleForm, setSaleForm] = useState({ customer_name: '', customer_phone: '', sale_price: '', payment_type: 'CASH' });
  const [showSale, setShowSale] = useState(false);
  const [msg, setMsg] = useState('');

  function load() { api.getVehicle(id).then(setVehicle).catch(console.error); }
  useEffect(() => { load(); }, [id]);

  async function addCost(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.addCost(id, costForm);
      setCostForm({ cost_type: 'PURCHASE', amount: '', currency: 'MNT', note: '' });
      setMsg('Зардал нэмэгдлээ');
      load();
    } catch (err: unknown) { setMsg(err instanceof Error ? err.message : 'Алдаа'); }
  }

  async function changeStatus(status: string) {
    try { await api.updateStatus(id, status); setMsg('Статус шинэчлэгдлээ'); load(); }
    catch (err: unknown) { setMsg(err instanceof Error ? err.message : 'Алдаа'); }
  }

  async function doSale(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:4000/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ name: saleForm.customer_name, phone: saleForm.customer_phone }),
      });
      const customer = await res.json();
      await api.createSale({ vehicle_id: id, customer_id: customer.id, sale_price: Number(saleForm.sale_price), payment_type: saleForm.payment_type });
      setMsg('Амжилттай зарагдлаа'); setShowSale(false); load();
    } catch (err: unknown) { setMsg(err instanceof Error ? err.message : 'Алдаа'); }
  }

  if (!vehicle) return <div className="px-8 py-7 text-[#555] text-sm">Ачааллаж байна...</div>;

  const totalCost = vehicle.costs.reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div className="px-8 py-7 max-w-2xl space-y-5">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-[#555] hover:text-white text-sm transition-colors">
        <IconArrowLeft className="w-4 h-4" />
        Буцах
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">{vehicle.brand} {vehicle.model} <span className="text-[#555] font-normal">{vehicle.year}</span></h1>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${STATUS[vehicle.status]?.dot}`} />
            <span className="text-xs text-[#666]">{STATUS[vehicle.status]?.label}</span>
          </div>
        </div>
        {vehicle.status !== 'SOLD' && (
          <button onClick={() => setShowSale(true)}
            className="bg-white hover:bg-[#e8e8e8] text-black text-sm font-medium px-3.5 py-2 rounded-md transition-colors">
            Зарах
          </button>
        )}
      </div>

      {msg && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-md px-4 py-2.5 text-sm text-[#888]">{msg}</div>
      )}

      {/* Info */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1e1e1e]">
          <span className="text-xs font-medium text-[#555] uppercase tracking-wider">Мэдээлэл</span>
        </div>
        <div className="p-4 grid grid-cols-2 gap-x-8 gap-y-3">
          {[
            ['VIN код', vehicle.vin],
            ['Гүйлт', vehicle.mileage.toLocaleString() + ' км'],
            ['Өнгө', vehicle.color || '—'],
            ['Түлш', vehicle.fuel_type],
            ['Хурдны хайрцаг', vehicle.transmission],
            ['Нийт өртөг', totalCost.toLocaleString('mn-MN') + '₮'],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="text-[11px] text-[#555] mb-0.5 uppercase tracking-wider">{k}</div>
              <div className="text-sm text-white">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Status change */}
      {vehicle.status !== 'SOLD' && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4">
          <div className="text-xs font-medium text-[#555] uppercase tracking-wider mb-3">Статус өөрчлөх</div>
          <div className="flex gap-2">
            {STATUS_NEXT.map(s => (
              <button key={s} onClick={() => changeStatus(s)} disabled={vehicle.status === s}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors border ${
                  vehicle.status === s
                    ? 'border-[#2a2a2a] text-[#444] cursor-default'
                    : 'border-[#222] text-[#888] hover:border-[#333] hover:text-white'
                }`}>
                {STATUS[s]?.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Costs */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
          <span className="text-xs font-medium text-[#555] uppercase tracking-wider">Зардлууд</span>
          <span className="text-xs text-[#666]">Нийт <span className="text-white tabular-nums">{totalCost.toLocaleString('mn-MN')}₮</span></span>
        </div>

        {vehicle.costs.length > 0 && (
          <table className="w-full text-sm">
            <tbody>
              {vehicle.costs.map((c, i) => (
                <tr key={c.id} className={i < vehicle.costs.length - 1 ? 'border-b border-[#1a1a1a]' : ''}>
                  <td className="px-4 py-3 text-[#888]">{COST_LABELS[c.cost_type] || c.cost_type}</td>
                  <td className="px-4 py-3 text-[#555] text-xs">{c.note || '—'}</td>
                  <td className="px-4 py-3 text-right text-white tabular-nums">{Number(c.amount).toLocaleString('mn-MN')}{c.currency === 'MNT' ? '₮' : ` ${c.currency}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {vehicle.costs.length === 0 && (
          <div className="text-center text-[#444] text-sm py-8">Зардал оруулаагүй байна</div>
        )}

        {vehicle.status !== 'SOLD' && (
          <form onSubmit={addCost} className="p-4 border-t border-[#1e1e1e] space-y-3">
            <div className="text-xs font-medium text-[#555] uppercase tracking-wider">Зардал нэмэх</div>
            <div className="grid grid-cols-2 gap-2">
              <select value={costForm.cost_type} onChange={e => setCostForm(p => ({ ...p, cost_type: e.target.value }))} className={inp}>
                {Object.entries(COST_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input type="number" placeholder="Дүн" value={costForm.amount}
                onChange={e => setCostForm(p => ({ ...p, amount: e.target.value }))} className={inp} required />
              <select value={costForm.currency} onChange={e => setCostForm(p => ({ ...p, currency: e.target.value }))} className={inp}>
                <option value="MNT">MNT ₮</option>
                <option value="USD">USD $</option>
                <option value="JPY">JPY ¥</option>
              </select>
              <input placeholder="Тайлбар" value={costForm.note}
                onChange={e => setCostForm(p => ({ ...p, note: e.target.value }))} className={inp} />
            </div>
            <button type="submit"
              className="px-3.5 py-1.5 text-sm bg-white hover:bg-[#e8e8e8] text-black rounded-md font-medium transition-colors">
              Нэмэх
            </button>
          </form>
        )}
      </div>

      {/* Sale modal */}
      {showSale && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-[#111] border border-[#222] rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-base font-semibold text-white mb-4">Машин зарах</h2>
            <form onSubmit={doSale} className="space-y-3">
              <div>
                <label className="text-xs text-[#666] block mb-1.5">Үйлчлүүлэгчийн нэр</label>
                <input placeholder="Болд Мэнд" value={saleForm.customer_name}
                  onChange={e => setSaleForm(p => ({ ...p, customer_name: e.target.value }))} className={inp} required />
              </div>
              <div>
                <label className="text-xs text-[#666] block mb-1.5">Утасны дугаар</label>
                <input placeholder="99001122" value={saleForm.customer_phone}
                  onChange={e => setSaleForm(p => ({ ...p, customer_phone: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="text-xs text-[#666] block mb-1.5">Зарагдсан үнэ (₮)</label>
                <input type="number" placeholder="30000000" value={saleForm.sale_price}
                  onChange={e => setSaleForm(p => ({ ...p, sale_price: e.target.value }))} className={inp} required />
              </div>
              <div>
                <label className="text-xs text-[#666] block mb-1.5">Төлбөрийн хэлбэр</label>
                <select value={saleForm.payment_type} onChange={e => setSaleForm(p => ({ ...p, payment_type: e.target.value }))} className={inp}>
                  <option value="CASH">Бэлэн мөнгө</option>
                  <option value="LOAN">Зээл</option>
                  <option value="LEASING">Лизинг</option>
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowSale(false)}
                  className="flex-1 py-2 text-sm text-[#666] border border-[#222] rounded-md hover:border-[#333] hover:text-white transition-colors">
                  Болих
                </button>
                <button type="submit"
                  className="flex-1 py-2 text-sm font-medium bg-white hover:bg-[#e8e8e8] text-black rounded-md transition-colors">
                  Зарах
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VehicleDetailPage() {
  return (
    <Suspense fallback={<div className="px-8 py-7 text-[#555] text-sm">Ачааллаж байна...</div>}>
      <VehicleDetailContent />
    </Suspense>
  );
}
