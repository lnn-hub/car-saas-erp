'use client';
import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Vehicle {
  id: string; brand: string; model: string; year: number;
  color: string; fuel_type: string; transmission: string;
  engine_cc: string; mileage: number; description: string;
  has_plates: boolean; total_cost: string | null; images: string[];
  manufactured_date: string | null;
  company: { name: string; phone: string; };
}

const FUEL: Record<string, string> = {
  PETROL: 'Бензин', DIESEL: 'Дизель', HYBRID: 'Хибрид', ELECTRIC: 'Цахилгаан',
};
const TRANS: Record<string, string> = { AUTO: 'Автомат', MANUAL: 'Механик' };

function fmt(n: string | number | null) {
  if (!n) return null;
  const num = Number(n);
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + ' сая₮';
  return num.toLocaleString('mn-MN') + '₮';
}

export default function VehicleDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f6f6f7] flex items-center justify-center">
        <div className="text-sm text-[#a1a1aa]">Ачааллаж байна...</div>
      </div>
    }>
      <VehicleDetailContent />
    </Suspense>
  );
}

function VehicleDetailContent() {
  const params = useParams();
  const slug = params.slug as string;
  const id = params.id as string;
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [imgIdx, setImgIdx]   = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BACKEND}/api/public/${slug}/vehicles/${id}`)
      .then(r => r.json())
      .then(data => { if (!data.error) setVehicle(data); })
      .finally(() => setLoading(false));
  }, [slug, id]);

  if (loading) return (
    <div className="min-h-screen bg-[#f6f6f7] flex items-center justify-center">
      <div className="text-sm text-[#a1a1aa]">Ачааллаж байна...</div>
    </div>
  );

  if (!vehicle) return (
    <div className="min-h-screen bg-[#f6f6f7] flex items-center justify-center">
      <div className="text-[#71717a] text-sm">Машин олдсонгүй</div>
    </div>
  );

  const imgs = vehicle.images?.length ? vehicle.images : [];

  return (
    <div className="min-h-screen bg-[#f6f6f7]">
      {/* Header */}
      <header className="bg-white border-b border-[#e4e4e7] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()}
            className="text-[#71717a] hover:text-[#09090b] transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <span className="font-semibold text-sm text-[#09090b]">
            {vehicle.brand} {vehicle.model} {vehicle.year}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Images */}
        <div className="bg-white rounded-xl border border-[#e4e4e7] overflow-hidden mb-4">
          <div className="aspect-[16/9] bg-[#f4f4f5] flex items-center justify-center">
            {imgs.length > 0 ? (
              <img src={imgs[imgIdx]} alt={`${vehicle.brand} ${vehicle.model}`}
                className="w-full h-full object-cover" />
            ) : (
              <svg className="w-16 h-16 text-[#d4d4d8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M5 17H3a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><rect x="7" y="17" width="10" height="4" rx="2"/><path d="M5 11L7.5 5h9L19 11"/></svg>
            )}
          </div>
          {imgs.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto">
              {imgs.map((url, i) => (
                <button key={i} onClick={() => setImgIdx(i)}
                  className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === imgIdx ? 'border-[#09090b]' : 'border-transparent'}`}>
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Title + price */}
        <div className="bg-white rounded-xl border border-[#e4e4e7] p-5 mb-4">
          <h1 className="text-xl font-bold text-[#09090b]">
            {vehicle.brand} {vehicle.model}
            <span className="text-[#a1a1aa] font-normal ml-2">{vehicle.year}</span>
          </h1>
          {vehicle.total_cost && (
            <div className="text-2xl font-bold text-[#09090b] mt-1">{fmt(vehicle.total_cost)}</div>
          )}
        </div>

        {/* Specs */}
        <div className="bg-white rounded-xl border border-[#e4e4e7] p-5 mb-4">
          <div className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-4">
            Техникийн үзүүлэлт
          </div>
          <div className="grid grid-cols-2 gap-y-3 gap-x-6">
            {[
              { label: 'Түлшний төрөл', value: FUEL[vehicle.fuel_type] || vehicle.fuel_type },
              { label: 'Хурдны хайрцаг', value: TRANS[vehicle.transmission] || vehicle.transmission },
              { label: 'Хөдөлгүүр', value: vehicle.engine_cc ? `${(Number(vehicle.engine_cc)/1000).toFixed(1)}L (${vehicle.engine_cc}cc)` : null },
              { label: 'Гүйлт', value: vehicle.mileage > 0 ? `${Number(vehicle.mileage).toLocaleString()} км` : null },
              { label: 'Өнгө', value: vehicle.color || null },
              { label: 'Улсын дугаар', value: vehicle.has_plates ? 'Дугаартай' : 'Дугааргүй' },
              { label: 'Үйлдвэрлэсэн', value: vehicle.manufactured_date ? vehicle.manufactured_date.slice(0, 7) : null },
            ].filter(r => r.value).map(({ label, value }) => (
              <div key={label}>
                <div className="text-xs text-[#a1a1aa] mb-0.5">{label}</div>
                <div className="text-sm font-medium text-[#09090b]">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        {vehicle.description && (
          <div className="bg-white rounded-xl border border-[#e4e4e7] p-5 mb-4">
            <div className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-3">
              Нэмэлт мэдээлэл
            </div>
            <p className="text-sm text-[#52525b] leading-relaxed">{vehicle.description}</p>
          </div>
        )}

        {/* Contact */}
        {vehicle.company?.phone && (
          <div className="bg-[#09090b] rounded-xl p-5 text-white">
            <div className="text-sm font-semibold mb-1">{vehicle.company.name}</div>
            <div className="text-[#a1a1aa] text-xs mb-4">Машины талаар дэлгэрэнгүй мэдээлэл авах</div>
            <div className="flex gap-3">
              <a href={`tel:${vehicle.company.phone}`}
                className="flex-1 flex items-center justify-center gap-2 bg-white text-[#09090b] font-semibold text-sm py-2.5 rounded-lg hover:bg-[#f4f4f5] transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012.05 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                Залгах
              </a>
              <a href={`https://wa.me/976${vehicle.company.phone}`} target="_blank" rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-[#25d366] text-white font-semibold text-sm py-2.5 rounded-lg hover:bg-[#1ebe5d] transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
