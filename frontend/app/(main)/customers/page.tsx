'use client';
import { useEffect, useState } from 'react';

interface Customer {
  id: string; name: string; phone: string; email: string; register: string; address: string; created_at: string;
}

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,'0')}.${String(dt.getDate()).padStart(2,'0')}`;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('http://localhost:4000/api/customers', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setCustomers(d); setLoading(false); })
      .catch(console.error);
  }, []);

  return (
    <div className="px-8 py-7">
      <div className="mb-6">
        <h1 className="text-base font-semibold text-[#09090b]">Үйлчлүүлэгчид</h1>
        <p className="text-xs text-[#a1a1aa] mt-0.5">{customers.length} үйлчлүүлэгч нийт</p>
      </div>

      {loading ? (
        <div className="text-[#a1a1aa] text-sm py-16 text-center">Ачааллаж байна...</div>
      ) : (
        <div className="bg-white border border-[#e4e4e7] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e4e4e7]">
                {['Нэр', 'Утас', 'Регистр', 'Хаяг', 'Огноо'].map((h, i) => (
                  <th key={i} className="text-left py-2.5 px-5 text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c, i) => (
                <tr key={c.id} className={`hover:bg-[#fafafa] transition-colors ${i < customers.length - 1 ? 'border-b border-[#f4f4f5]' : ''}`}>
                  <td className="px-5 py-3 text-[#09090b] font-medium">{c.name}</td>
                  <td className="px-5 py-3 text-[#71717a]">{c.phone || '—'}</td>
                  <td className="px-5 py-3 text-[#71717a] tabular-nums">{c.register || '—'}</td>
                  <td className="px-5 py-3 text-[#71717a]">{c.address || '—'}</td>
                  <td className="px-5 py-3 text-[#a1a1aa] text-xs tabular-nums">{fmtDate(c.created_at)}</td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr><td colSpan={5} className="text-center text-[#a1a1aa] text-sm py-16">Үйлчлүүлэгч байхгүй байна</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
