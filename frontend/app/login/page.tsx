'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useCompany } from '@/lib/useSiteData';
import { BrandMark } from '@/components/site/BrandMark';

export default function LoginPage() {
  const router = useRouter();
  const company = useCompany();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.login(email, password);
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally { setLoading(false); }
  }

  const field = "w-full bg-white border border-zinc-200 rounded-2xl px-4 h-12 text-[15px] text-ink placeholder:text-zinc-400 focus:outline-none focus:border-ink/40 focus:ring-4 focus:ring-ink/5 transition";

  return (
    <div className="min-h-screen bg-canvas grid lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-5 sm:px-10 py-6">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 h-10 pl-3 pr-4 rounded-full text-sm text-zinc-600 hover:text-ink hover:bg-white transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Вэбсайт руу буцах
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-[380px]">
            <BrandMark logoUrl={company?.logo_url} name={company?.name || ""} size={44} nameClassName="font-display text-lg font-semibold text-ink" />
            <h1 className="font-display text-[34px] font-semibold tracking-[-0.03em] text-ink mt-10 leading-tight">Тавтай морил</h1>
            <p className="text-zinc-500 mt-2">Удирдлагын самбарт нэвтэрнэ үү</p>
            <form onSubmit={handleSubmit} className="space-y-4 mt-8">
              <div>
                <label className="text-sm font-medium text-zinc-700 block mb-2">И-мэйл</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="name@company.mn" className={field} required />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700 block mb-2">Нууц үг</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••" className={field} required />
              </div>
              {error && <div className="bg-danger-soft border border-danger-line rounded-2xl px-4 py-3 text-sm text-danger">{error}</div>}
              <button type="submit" disabled={loading}
                className="w-full h-12 bg-ink hover:bg-brand disabled:opacity-40 text-white font-medium rounded-full transition-colors !mt-6">
                {loading ? 'Нэвтэрж байна...' : 'Нэвтрэх'}
              </button>
            </form>
          </div>
        </div>
        <p className="text-xs text-zinc-400 text-center">{company?.name}</p>
      </div>

      <div className="hidden lg:block p-3">
        <div className="relative h-full rounded-[32px] overflow-hidden bg-ink text-white flex flex-col justify-end p-12">
          <div className="pointer-events-none absolute -top-32 -right-32 w-[560px] h-[560px]" style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--color-brand) 75%, transparent), transparent)" }} />
          <div className="pointer-events-none absolute bottom-0 -left-20 w-[400px] h-[400px]" style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--color-brand-light) 22%, transparent), transparent)" }} />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(rgb(255 255 255 / 0.6) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
          <div className="relative max-w-md">
            <div className="flex flex-wrap gap-2 mb-8">
              {["Агуулах", "Борлуулалт", "Тайлан", "Вэбсайт"].map((t) => (
                <span key={t} className="glass-dark rounded-full px-4 py-2 text-sm text-white/85">{t}</span>
              ))}
            </div>
            <h2 className="font-display text-5xl font-semibold tracking-[-0.035em] leading-[1.05]">
              Машин борлуулалтаа нэг дороос удирдаарай.
            </h2>
            <p className="text-white/60 text-lg mt-5 leading-relaxed">Машин нэмэх, зарах, тайлан гаргах, вэбсайтаа шинэчлэх бүх зүйл энд.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
