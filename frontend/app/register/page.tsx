'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ company_name: '', name: '', email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.register(form);
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8">
          <div className="w-8 h-8 bg-[#09090b] rounded-sm mb-6" />
          <h1 className="text-xl font-semibold text-[#09090b] tracking-tight">Бүртгүүлэх</h1>
          <p className="text-sm text-[#71717a] mt-1">14 хоногийн үнэгүй trial — карт шаардлагагүй</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[#3f3f46] block mb-1.5">Компанийн нэр</label>
            <input value={form.company_name} onChange={set('company_name')}
              placeholder="МонголАвто ХХК"
              className="w-full bg-white border border-[#e4e4e7] rounded-md px-3 py-2 text-sm text-[#09090b] placeholder-[#a1a1aa] focus:outline-none focus:border-[#09090b] transition-colors"
              required />
          </div>
          <div>
            <label className="text-xs font-medium text-[#3f3f46] block mb-1.5">Таны нэр</label>
            <input value={form.name} onChange={set('name')}
              placeholder="Болд Батаа"
              className="w-full bg-white border border-[#e4e4e7] rounded-md px-3 py-2 text-sm text-[#09090b] placeholder-[#a1a1aa] focus:outline-none focus:border-[#09090b] transition-colors"
              required />
          </div>
          <div>
            <label className="text-xs font-medium text-[#3f3f46] block mb-1.5">И-мэйл</label>
            <input type="email" value={form.email} onChange={set('email')}
              placeholder="bold@company.mn"
              className="w-full bg-white border border-[#e4e4e7] rounded-md px-3 py-2 text-sm text-[#09090b] placeholder-[#a1a1aa] focus:outline-none focus:border-[#09090b] transition-colors"
              required />
          </div>
          <div>
            <label className="text-xs font-medium text-[#3f3f46] block mb-1.5">Нууц үг</label>
            <input type="password" value={form.password} onChange={set('password')}
              placeholder="Хамгийн багадаа 6 тэмдэгт"
              className="w-full bg-white border border-[#e4e4e7] rounded-md px-3 py-2 text-sm text-[#09090b] placeholder-[#a1a1aa] focus:outline-none focus:border-[#09090b] transition-colors"
              required minLength={6} />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-xs text-red-600">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-[#09090b] hover:bg-[#27272a] disabled:opacity-40 text-white font-medium py-2 rounded-md text-sm transition-colors mt-1">
            {loading ? 'Бүртгэж байна...' : 'Бүртгүүлэх — үнэгүй эхлэх'}
          </button>
        </form>

        <p className="text-center text-xs text-[#a1a1aa] mt-6">
          Аль хэдийн бүртгэлтэй юу?{' '}
          <Link href="/login" className="text-[#09090b] font-medium hover:underline">Нэвтрэх</Link>
        </p>
      </div>
    </div>
  );
}
