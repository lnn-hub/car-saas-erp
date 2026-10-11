'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@mongolauto.mn');
  const [password, setPassword] = useState('password123');
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
          <div className="w-8 h-8 bg-[#09090b] rounded-sm mb-6" />
          <h1 className="text-xl font-semibold text-[#09090b] tracking-tight">AutoERP</h1>
          <p className="text-sm text-[#71717a] mt-1">Машин борлуулалтын удирдлагын систем</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[#3f3f46] block mb-1.5">И-мэйл</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-white border border-[#e4e4e7] rounded-md px-3 py-2 text-sm text-[#09090b] placeholder-[#a1a1aa] focus:outline-none focus:border-[#09090b] transition-colors"
              required />
          </div>
          <div>
            <label className="text-xs font-medium text-[#3f3f46] block mb-1.5">Нууц үг</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-white border border-[#e4e4e7] rounded-md px-3 py-2 text-sm text-[#09090b] focus:outline-none focus:border-[#09090b] transition-colors"
              required />
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-xs text-red-600">{error}</div>}
          <button type="submit" disabled={loading}
            className="w-full bg-[#09090b] hover:bg-[#27272a] disabled:opacity-40 text-white font-medium py-2 rounded-md text-sm transition-colors mt-1">
            {loading ? 'Нэвтэрж байна...' : 'Нэвтрэх'}
          </button>
        </form>
      </div>
    </div>
  );
}
