'use client';
import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const SLUG     = process.env.NEXT_PUBLIC_COMPANY_SLUG || 'mongol-auto';

interface Vehicle {
  id: string; brand: string; model: string; year: number;
  color: string; fuel_type: string; transmission: string;
  engine_cc: string; mileage: number; description: string;
  has_plates: boolean; manufactured_date: string | null;
  total_cost: string | null; images: string[];
  company: { name: string; phone: string; };
}

const FUEL: Record<string, string> = { PETROL: 'Бензин', DIESEL: 'Дизель', HYBRID: 'Хибрид', ELECTRIC: 'Цахилгаан' };
const TRANS: Record<string, string> = { AUTO: 'Автомат', MANUAL: 'Механик' };

function fmt(n: string | number | null) {
  if (!n) return null;
  const num = Number(n);
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + ' сая₮';
  return num.toLocaleString('mn-MN') + '₮';
}

function VehicleContent() {
  const params  = useParams();
  const router  = useRouter();
  const id      = params.id as string;
  const [v, setV]         = useState<Vehicle | null>(null);
  const [imgIdx, setImg]  = useState(0);
  const [loading, setLoad] = useState(true);

  useEffect(() => {
    fetch(`${BACKEND}/api/public/${SLUG}/vehicles/${id}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setV(d); })
      .finally(() => setLoad(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-sm text-[#a1a1aa]">Ачааллаж байна...</div>
  );
  if (!v) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl font-bold text-[#e4e4e7] mb-2">404</div>
        <Link href="/" className="text-sm text-[#71717a] hover:text-[#09090b]">Буцах</Link>
      </div>
    </div>
  );

  const imgs = v.images?.length ? v.images : [];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-[#e4e4e7] sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()}
            className="text-[#71717a] hover:text-[#09090b] transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <Link href="/" className="font-semibold text-sm text-[#09090b]">
            {v.company?.name || 'Буцах'}
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Left */}
          <div className="space-y-4">
            {/* Images */}
            <div className="bg-[#f4f4f5] rounded-2xl overflow-hidden aspect-[16/10] flex items-center justify-center">
              {imgs.length > 0 ? (
                <img src={imgs[imgIdx]} alt={`${v.brand} ${v.model}`} className="w-full h-full object-cover" />
              ) : (
                <svg className="w-16 h-16 text-[#d4d4d8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M5 17H3a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><rect x="7" y="17" width="10" height="4" rx="2"/><path d="M5 11L7.5 5h9L19 11"/></svg>
              )}
            </div>
            {imgs.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {imgs.map((url, i) => (
                  <button key={i} onClick={() => setImg(i)}
                    className={`shrink-0 w-20 h-14 rounded-xl overflow-hidden border-2 transition-all ${i === imgIdx ? 'border-[#09090b]' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Specs */}
            <div className="bg-[#fafafa] rounded-2xl p-5 border border-[#f4f4f5]">
              <div className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-4">Техникийн үзүүлэлт</div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Түлшний төрөл', value: FUEL[v.fuel_type] },
                  { label: 'Хурдны хайрцаг', value: TRANS[v.transmission] },
                  { label: 'Хөдөлгүүр', value: v.engine_cc ? `${(Number(v.engine_cc)/1000).toFixed(1)}L` : null },
                  { label: 'Гүйлт', value: v.mileage > 0 ? `${Number(v.mileage).toLocaleString()} км` : null },
                  { label: 'Өнгө', value: v.color || null },
                  { label: 'Улсын дугаар', value: v.has_plates ? 'Дугаартай' : 'Дугааргүй' },
                  { label: 'Үйлдвэрлэсэн', value: v.manufactured_date ? v.manufactured_date.slice(0,7) : null },
                ].filter(r => r.value).map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-xs text-[#a1a1aa] mb-0.5">{label}</div>
                    <div className="text-sm font-semibold text-[#09090b]">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {v.description && (
              <div className="rounded-2xl p-5 border border-[#f4f4f5]">
                <div className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-3">Нэмэлт мэдээлэл</div>
                <p className="text-sm text-[#52525b] leading-relaxed">{v.description}</p>
              </div>
            )}
          </div>

          {/* Right — sticky */}
          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-2xl border border-[#e4e4e7] p-5">
              <h1 className="text-xl font-bold text-[#09090b]">
                {v.brand} {v.model}
                <span className="text-[#a1a1aa] font-normal ml-1.5">{v.year}</span>
              </h1>
              {v.total_cost ? (
                <div className="text-2xl font-bold text-[#09090b] mt-2">{fmt(v.total_cost)}</div>
              ) : (
                <div className="text-sm text-[#a1a1aa] mt-2">Үнэ тохиролцоно</div>
              )}
            </div>

            {v.company?.phone && (
              <div className="rounded-2xl bg-[#09090b] p-5 text-white space-y-3">
                <div className="text-sm font-semibold">{v.company.name}</div>
                <a href={`tel:${v.company.phone}`}
                  className="flex items-center justify-center gap-2 bg-white text-[#09090b] font-semibold text-sm py-3 rounded-xl hover:bg-[#f4f4f5] transition-colors w-full">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012.05 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                  {v.company.phone} Залгах
                </a>
                <a href={`https://wa.me/976${v.company.phone}`} target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-2 bg-[#25d366] font-semibold text-sm py-3 rounded-xl hover:bg-[#1ebe5d] transition-colors w-full">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VehiclePage() {
  return <Suspense><VehicleContent /></Suspense>;
}
