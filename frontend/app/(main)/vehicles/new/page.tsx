'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { IconArrowLeft } from '@/components/icons';
import { BRANDS_MODELS, COLORS, getWeekday } from '@/lib/vehicle-data';
import { Combobox } from '@/components/Combobox';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const inp = "w-full bg-white border border-[#e4e4e7] rounded-md px-3 py-2 text-sm text-[#09090b] placeholder-[#a1a1aa] focus:outline-none focus:border-[#c00] transition-colors pr-8";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1989 }, (_, i) => String(CURRENT_YEAR - i));
const BRANDS = Object.keys(BRANDS_MODELS).sort();
const ENGINE_OPTIONS = ['1000','1200','1300','1400','1500','1600','1800','2000','2200','2400','2500','2700','3000','3500','4000','4500','5000']
  .map(cc => `${(Number(cc)/1000).toFixed(1)}L`);

interface ImageItem { file: File; preview: string; uploading: boolean; url: string | null; id: string | null; }

export default function NewVehiclePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    vin: '', brand: '', model: '', year: String(CURRENT_YEAR),
    mileage: '', color: '', fuel_type: 'PETROL', transmission: 'AUTO',
    engine_cc: '', description: '', arrived_at: '',
    manufactured_date: '', has_plates: false,
  });
  const [models, setModels]   = useState<string[]>([]);
  const [images, setImages]     = useState<ImageItem[]>([]);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [uploadDone, setUpDone] = useState(0);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [step, setStep]       = useState<'form' | 'images'>('form');
  const [dragOver, setDrag]   = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setForm(prev => ({ ...prev, arrived_at: today }));
  }, []);

  function set(field: string, value: string | boolean) {
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
      const payload = {
        ...form,
        year: Number(form.year),
        mileage: Number(form.mileage) || 0,
        engine_cc: form.engine_cc ? String(Number(form.engine_cc.replace(/[^\d.]/g, '')) * 1000) : '',
      };
      const created = await api.createVehicle(payload);
      setVehicleId(created.id);
      setStep('images');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally { setLoading(false); }
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    const newImgs: ImageItem[] = Array.from(files).map(file => ({
      file, preview: URL.createObjectURL(file),
      uploading: false, url: null, id: null,
    }));
    setImages(prev => [...prev, ...newImgs]);
  }

  async function uploadAll() {
    if (!vehicleId || images.length === 0) { router.push('/vehicles'); return; }
    const token = localStorage.getItem('token') || '';
    const toUpload = images.filter(img => !img.url);
    if (toUpload.length === 0) { router.push(`/vehicles/${vehicleId}`); return; }

    setUpDone(0);
    setImages(prev => prev.map(img => img.url ? img : { ...img, uploading: true }));

    // Нэг нэгээр upload хийж progress харуулна
    let done = 0;
    const results: Array<{url: string; id: string} | null> = [];
    for (const img of toUpload) {
      try {
        const formData = new FormData();
        formData.append('images', img.file);
        const res = await fetch(`${BACKEND}/api/upload/vehicle/${vehicleId}`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
        });
        const saved = await res.json();
        if (!res.ok) throw new Error(saved.error || 'Upload алдаа');
        results.push(saved[0] || null);
      } catch {
        results.push(null);
      }
      done++;
      setUpDone(done);
    }

    setImages(prev => {
      let si = 0;
      return prev.map(img => {
        if (img.url) return img;
        const s = results[si++];
        return s ? { ...img, uploading: false, url: s.url, id: s.id } : { ...img, uploading: false };
      });
    });

    const failed = results.filter(r => !r).length;
    if (failed > 0) setError(`${failed} зураг upload хийгдсэнгүй`);
    else router.push(`/vehicles/${vehicleId}`);
  }

  function removeImage(idx: number) {
    setImages(prev => {
      const img = prev[idx];
      URL.revokeObjectURL(img.preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  const weekday = getWeekday(form.arrived_at);

  // ── Step 2: Зураг оруулах ──
  if (step === 'images') {
    return (
      <div className="px-4 sm:px-8 py-5 sm:py-7 max-w-2xl">
        <h1 className="text-lg font-semibold text-[#09090b] mb-1">Зураг оруулах</h1>
        <p className="text-sm text-[#a1a1aa] mb-6">Машины зурагнуудыг оруулна уу. Эхний зураг үндсэн зураг болно.</p>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all mb-5 ${
            dragOver ? 'border-[#c00] bg-[#fafafa]' : 'border-[#e4e4e7] hover:border-[#d4d4d8] hover:bg-[#fafafa]'
          }`}>
          <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden"
            onChange={e => addFiles(e.target.files)} />
          <svg className="w-10 h-10 text-[#d4d4d8] mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <p className="text-sm font-medium text-[#09090b]">Зураг сонгох эсвэл чирж оруулах</p>
          <p className="text-xs text-[#a1a1aa] mt-1">JPG, PNG, WebP • Дээд тал нь 20MB</p>
        </div>

        {/* Preview grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            {images.map((img, idx) => (
              <div key={idx} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-[#e4e4e7] group">
                <img src={img.preview} alt="" className="w-full h-full object-cover" />
                {idx === 0 && (
                  <div className="absolute top-2 left-2 bg-[#c00] text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    Үндсэн
                  </div>
                )}
                {img.uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {!img.uploading && (
                  <button type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
            ))}
            {/* Add more */}
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="aspect-[4/3] rounded-xl border-2 border-dashed border-[#e4e4e7] flex items-center justify-center hover:border-[#d4d4d8] hover:bg-[#fafafa] transition-all">
              <svg className="w-6 h-6 text-[#d4d4d8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600 mb-4">{error}</div>}

        <div className="flex gap-2">
          <button type="button" onClick={() => router.push('/vehicles')}
            className="px-4 py-2.5 text-sm text-[#71717a] border border-[#e4e4e7] rounded-lg hover:border-[#d4d4d8] transition-colors">
            Зургийг алгасах
          </button>
          <button type="button" onClick={uploadAll}
            disabled={images.some(i => i.uploading)}
            className="flex-1 py-2.5 text-sm font-medium bg-[#c00] hover:bg-[#a00] disabled:opacity-60 text-white rounded-lg transition-colors">
            {images.some(i => i.uploading)
              ? `${uploadDone}/${images.filter(i => !i.url).length} upload хийгдэж байна...`
              : images.length > 0 ? `${images.length} зураг хадгалах` : 'Дуусгах'}
          </button>
        </div>
      </div>
    );
  }

  // ── Step 1: Машины мэдээлэл ──
  return (
    <div className="px-4 sm:px-8 py-5 sm:py-7 max-w-2xl">
      <button onClick={() => router.back()}
        className="flex items-center gap-1.5 text-[#a1a1aa] hover:text-[#09090b] text-sm transition-colors mb-6">
        <IconArrowLeft className="w-4 h-4" /> Буцах
      </button>
      <h1 className="text-lg font-semibold text-[#09090b] mb-6">Машин нэмэх</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Үндсэн мэдээлэл */}
        <Section title="Үндсэн мэдээлэл">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Марк" required>
              <Combobox value={form.brand} onChange={v => set('brand', v)}
                options={BRANDS} placeholder="Toyota, Hyundai..." className={inp} />
            </Field>

            <Field label="Загвар" required>
              <Combobox value={form.model} onChange={v => set('model', v)}
                options={models.length ? models : []}
                placeholder="Camry, Tucson..." className={inp} />
            </Field>

            <Field label="Он" required>
              <Combobox value={form.year} onChange={v => set('year', v)}
                options={YEARS} placeholder={String(CURRENT_YEAR)} className={inp} />
            </Field>

            <Field label="VIN код" required>
              <input value={form.vin} onChange={e => set('vin', e.target.value.toUpperCase())}
                placeholder="JT2BF22K1W0123456" maxLength={17}
                className={inp.replace('pr-8','') + ' uppercase tracking-widest'} required />
            </Field>

            <Field label="Орж ирсэн огноо">
              <div className="relative">
                <input type="date" value={form.arrived_at} onChange={e => set('arrived_at', e.target.value)}
                  className={inp.replace('pr-8','')} />
                {weekday && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#a1a1aa] pointer-events-none">
                    {weekday}
                  </span>
                )}
              </div>
            </Field>

            <Field label="Үйлдвэрлэсэн огноо">
              <input type="month" value={form.manufactured_date}
                onChange={e => set('manufactured_date', e.target.value)}
                className={inp.replace('pr-8','')} />
            </Field>

            <Field label="Улсын дугаар" className="col-span-2">
              <div className="grid grid-cols-2 gap-1.5">
                {[['false','Дугааргүй'],['true','Дугаартай']].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => set('has_plates', v === 'true')}
                    className={`py-2 text-xs rounded-md border transition-colors ${String(form.has_plates) === v ? 'bg-[#c00] text-white border-[#c00]' : 'border-[#e4e4e7] text-[#71717a] hover:border-[#d4d4d8]'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </Section>

        {/* Техникийн үзүүлэлт */}
        <Section title="Техникийн үзүүлэлт">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Гүйлт (км)">
              <input type="number" value={form.mileage} onChange={e => set('mileage', e.target.value)}
                min={0} placeholder="50000" className={inp.replace('pr-8','')} />
            </Field>

            <Field label="Өнгө">
              <div className="space-y-2">
                <Combobox value={form.color} onChange={v => set('color', v)}
                  options={COLORS.map(c => c.value)}
                  placeholder="Цагаан, Хар..." className={inp} />
                {form.color && (
                  <div className="flex gap-1.5 flex-wrap">
                    {COLORS.map(c => (
                      <button key={c.value} type="button" title={c.value}
                        onClick={() => set('color', c.value)}
                        className={`w-5 h-5 rounded-full border-2 transition-all ${form.color === c.value ? 'border-[#c00] scale-110' : 'border-transparent hover:border-[#d4d4d8]'}`}
                        style={{ backgroundColor: c.hex, boxShadow: c.hex === '#ffffff' ? 'inset 0 0 0 1px #e4e4e7' : undefined }} />
                    ))}
                  </div>
                )}
              </div>
            </Field>

            <Field label="Түлшний төрөл">
              <div className="grid grid-cols-2 gap-1.5">
                {[['PETROL','Бензин'],['DIESEL','Дизель'],['HYBRID','Хибрид'],['ELECTRIC','Цахилгаан']].map(([v,l]) => (
                  <button key={v} type="button" onClick={() => set('fuel_type', v)}
                    className={`py-1.5 text-xs rounded-md border transition-colors ${form.fuel_type === v ? 'bg-[#c00] text-white border-[#c00]' : 'border-[#e4e4e7] text-[#71717a] hover:border-[#d4d4d8]'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Хурдны хайрцаг">
              <div className="grid grid-cols-2 gap-1.5">
                {[['AUTO','Автомат'],['MANUAL','Механик']].map(([v,l]) => (
                  <button key={v} type="button" onClick={() => set('transmission', v)}
                    className={`py-1.5 text-xs rounded-md border transition-colors ${form.transmission === v ? 'bg-[#c00] text-white border-[#c00]' : 'border-[#e4e4e7] text-[#71717a] hover:border-[#d4d4d8]'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Хөдөлгүүр">
              <Combobox value={form.engine_cc} onChange={v => set('engine_cc', v)}
                options={ENGINE_OPTIONS} placeholder="2.0L" className={inp} />
            </Field>
          </div>
        </Section>

        {/* Нэмэлт */}
        <Section title="Нэмэлт тайлбар">
          <Field label="">
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="Машины онцлог, нэмэлт мэдээлэл..." className={inp.replace('pr-8','')} />
          </Field>
        </Section>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-xs text-red-600">{error}</div>
        )}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2 text-sm text-[#71717a] border border-[#e4e4e7] rounded-md hover:border-[#d4d4d8] transition-colors">
            Болих
          </button>
          <button type="submit" disabled={loading}
            className="px-6 py-2 text-sm font-medium bg-[#c00] hover:bg-[#a00] disabled:opacity-40 text-white rounded-md transition-colors">
            {loading ? 'Хадгалж байна...' : 'Үргэлжлэх — зураг нэмэх →'}
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
function Field({ label, children, required, className }: { label: string; children: React.ReactNode; required?: boolean; className?: string }) {
  return (
    <div className={className}>
      {label && (
        <label className="text-xs text-[#71717a] block mb-1.5">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
    </div>
  );
}
