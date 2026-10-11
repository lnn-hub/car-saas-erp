'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
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

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-8">
          <div className="w-9 h-9 bg-[#c00] rounded flex items-center justify-center mb-6">
            <span className="text-white font-black text-lg leading-none">A</span>
          </div>
          <h1 className="text-xl font-bold text-[#09090b] tracking-tight">Админ нэвтрэх</h1>
          <p className="text-sm text-[#71717a] mt-1">Машин удирдлагын самбар</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[#3f3f46] block mb-1.5">И-мэйл</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-white border border-[#e4e4e7] rounded-md px-3 py-2 text-sm text-[#09090b] placeholder-[#a1a1aa] focus:outline-none focus:border-[#c00] transition-colors"
              required />
          </div>
          <div>
            <label className="text-xs font-medium text-[#3f3f46] block mb-1.5">Нууц үг</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-white border border-[#e4e4e7] rounded-md px-3 py-2 text-sm text-[#09090b] focus:outline-none focus:border-[#c00] transition-colors"
              required />
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-xs text-red-600">{error}</div>}
          <button type="submit" disabled={loading}
            className="w-full bg-[#c00] hover:bg-[#a00] disabled:opacity-40 text-white font-medium py-2 rounded-md text-sm transition-colors mt-1">
            {loading ? 'Нэвтэрж байна...' : 'Нэвтрэх'}
          </button>
        </form>

        <p className="text-center text-xs text-[#a1a1aa] mt-6">
          <Link href="/" className="hover:text-[#c00] transition-colors">← Вэбсайт руу буцах</Link>
        </p>
      </div>
    </div>
  );
}
