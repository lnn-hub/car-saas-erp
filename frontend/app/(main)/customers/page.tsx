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
        <h1 className="text-lg font-semibold text-white">Үйлчлүүлэгчид</h1>
        <p className="text-sm text-[#555] mt-0.5">{customers.length} үйлчлүүлэгч нийт</p>
      </div>

      {loading ? (
        <div className="text-[#555] text-sm py-16 text-center">Ачааллаж байна...</div>
      ) : (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {['Нэр', 'Утас', 'Регистр', 'Хаяг', 'Огноо'].map((h, i) => (
                  <th key={i} className="text-left py-2.5 px-5 text-[11px] font-medium text-[#555] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c, i) => (
                <tr key={c.id} className={`hover:bg-[#161616] transition-colors ${i < customers.length - 1 ? 'border-b border-[#1a1a1a]' : ''}`}>
                  <td className="px-5 py-3 text-white font-medium">{c.name}</td>
                  <td className="px-5 py-3 text-[#888]">{c.phone || '—'}</td>
                  <td className="px-5 py-3 text-[#888] tabular-nums">{c.register || '—'}</td>
                  <td className="px-5 py-3 text-[#888]">{c.address || '—'}</td>
                  <td className="px-5 py-3 text-[#555] text-xs tabular-nums">{fmtDate(c.created_at)}</td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr><td colSpan={5} className="text-center text-[#444] text-sm py-16">Үйлчлүүлэгч байхгүй байна</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
