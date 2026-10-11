'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

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
const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  ARRIVED:   { label: 'Ирсэн',       color: 'bg-yellow-500/20 text-yellow-400' },
  PUBLISHED: { label: 'Нийтлэгдсэн', color: 'bg-blue-500/20 text-blue-400' },
  RESERVED:  { label: 'Захиалгатай', color: 'bg-purple-500/20 text-purple-400' },
  SOLD:      { label: 'Зарагдсан',   color: 'bg-green-500/20 text-green-400' },
};

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [costForm, setCostForm] = useState({ cost_type: 'PURCHASE', amount: '', currency: 'MNT', note: '' });
  const [saleForm, setSaleForm] = useState({ customer_name: '', customer_phone: '', sale_price: '', payment_type: 'CASH' });
  const [showSale, setShowSale] = useState(false);
  const [msg, setMsg] = useState('');

  function load() {
    api.getVehicle(id).then(setVehicle).catch(console.error);
  }
  useEffect(() => { load(); }, [id]);

  async function addCost(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.addCost(id, costForm);
      setCostForm({ cost_type: 'PURCHASE', amount: '', currency: 'MNT', note: '' });
      setMsg('Зардал нэмэгдлээ'); load();
    } catch (err: unknown) { setMsg(err instanceof Error ? err.message : 'Алдаа'); }
  }

  async function changeStatus(status: string) {
    try { await api.updateStatus(id, status); setMsg('Статус өөрчлөгдлөө'); load(); }
    catch (err: unknown) { setMsg(err instanceof Error ? err.message : 'Алдаа'); }
  }

  async function doSale(e: React.FormEvent) {
    e.preventDefault();
    try {
      // First create customer inline via a simple approach
      const res = await fetch('http://localhost:4000/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ name: saleForm.customer_name, phone: saleForm.customer_phone }),
      });
      const customer = await res.json();
      await api.createSale({ vehicle_id: id, customer_id: customer.id, sale_price: Number(saleForm.sale_price), payment_type: saleForm.payment_type });
      setMsg('Амжилттай зарагдлаа!'); setShowSale(false); load();
    } catch (err: unknown) { setMsg(err instanceof Error ? err.message : 'Алдаа'); }
  }

  if (!vehicle) return <div className="p-6 text-gray-400">Ачааллаж байна...</div>;

  const totalCost = vehicle.costs.reduce((s, c) => s + Number(c.amount), 0);
  const inp = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500";

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white">←</button>
        <h1 className="text-2xl font-bold text-white">{vehicle.brand} {vehicle.model} {vehicle.year}</h1>
        <span className={`px-2 py-1 rounded-md text-xs font-medium ${STATUS_LABEL[vehicle.status]?.color}`}>
          {STATUS_LABEL[vehicle.status]?.label}
        </span>
      </div>

      {msg && <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-4 py-2 rounded-lg text-sm">{msg}</div>}

      {/* Info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 grid grid-cols-2 gap-3 text-sm">
        {[
          ['VIN', vehicle.vin], ['Гүйлт', vehicle.mileage.toLocaleString() + ' км'],
          ['Өнгө', vehicle.color || '—'], ['Түлш', vehicle.fuel_type],
          ['Хурдны хайрцаг', vehicle.transmission], ['Нийт өртөг', totalCost.toLocaleString('mn-MN') + '₮'],
        ].map(([k, v]) => (
          <div key={k}><span className="text-gray-400">{k}: </span><span className="text-white">{v}</span></div>
        ))}
      </div>

      {/* Status buttons */}
      {vehicle.status !== 'SOLD' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-3">Статус өөрчлөх:</p>
          <div className="flex gap-2 flex-wrap">
            {['ARRIVED','PUBLISHED','RESERVED'].map(s => (
              <button key={s} onClick={() => changeStatus(s)} disabled={vehicle.status === s}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${vehicle.status === s ? 'opacity-30 cursor-default bg-gray-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                {STATUS_LABEL[s].label}
              </button>
            ))}
            <button onClick={() => setShowSale(true)}
              className="px-3 py-1.5 rounded-lg text-sm bg-green-600 hover:bg-green-700 text-white transition-colors">
              💰 Зарах
            </button>
          </div>
        </div>
      )}

      {/* Costs */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-white font-semibold">Зардлууд</h2>
          <span className="text-gray-400 text-sm">Нийт: <span className="text-white font-medium">{totalCost.toLocaleString('mn-MN')}₮</span></span>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {vehicle.costs.map(c => (
              <tr key={c.id} className="border-b border-gray-800/50">
                <td className="px-5 py-3 text-gray-300">{COST_LABELS[c.cost_type] || c.cost_type}</td>
                <td className="px-5 py-3 text-gray-400 text-xs">{c.note || '—'}</td>
                <td className="px-5 py-3 text-right text-white font-medium">{Number(c.amount).toLocaleString('mn-MN')}{c.currency === 'MNT' ? '₮' : ` ${c.currency}`}</td>
              </tr>
            ))}
            {vehicle.costs.length === 0 && (
              <tr><td colSpan={3} className="text-center text-gray-500 py-8">Зардал оруулаагүй байна</td></tr>
            )}
          </tbody>
        </table>

        {vehicle.status !== 'SOLD' && (
          <form onSubmit={addCost} className="px-5 py-4 border-t border-gray-800 bg-gray-800/30">
            <p className="text-gray-400 text-xs mb-3">Зардал нэмэх</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <select value={costForm.cost_type} onChange={e => setCostForm(p => ({ ...p, cost_type: e.target.value }))} className={inp}>
                {Object.entries(COST_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
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
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">Нэмэх</button>
          </form>
        )}
      </div>

      {/* Sale modal */}
      {showSale && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-white font-semibold text-lg mb-4">Машин зарах</h2>
            <form onSubmit={doSale} className="space-y-3">
              <input placeholder="Үйлчлүүлэгчийн нэр *" value={saleForm.customer_name}
                onChange={e => setSaleForm(p => ({ ...p, customer_name: e.target.value }))} className={inp} required />
              <input placeholder="Утасны дугаар" value={saleForm.customer_phone}
                onChange={e => setSaleForm(p => ({ ...p, customer_phone: e.target.value }))} className={inp} />
              <input type="number" placeholder="Зарагдсан үнэ (₮) *" value={saleForm.sale_price}
                onChange={e => setSaleForm(p => ({ ...p, sale_price: e.target.value }))} className={inp} required />
              <select value={saleForm.payment_type} onChange={e => setSaleForm(p => ({ ...p, payment_type: e.target.value }))} className={inp}>
                <option value="CASH">Бэлэн мөнгө</option>
                <option value="LOAN">Зээл</option>
                <option value="LEASING">Лизинг</option>
              </select>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowSale(false)} className="flex-1 bg-gray-800 text-gray-300 py-2 rounded-lg text-sm">Болих</button>
                <button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium">Зарах</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
