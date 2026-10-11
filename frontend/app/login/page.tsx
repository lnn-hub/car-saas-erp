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
    setLoading(true);
    setError('');
    try {
      const res = await api.login(email, password);
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center px-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-10">
          <div className="w-8 h-8 bg-white rounded-sm mb-6" />
          <h1 className="text-[22px] font-semibold text-white tracking-tight">AutoERP нэвтрэх</h1>
          <p className="text-sm text-[#666] mt-1">Машин борлуулалтын удирдлагын систем</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-[#888] block mb-1.5">И-мэйл хаяг</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2.5 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#444] transition-colors"
              required
            />
          </div>
          <div>
            <label className="text-xs text-[#888] block mb-1.5">Нууц үг</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2.5 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#444] transition-colors"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-[#e8e8e8] disabled:opacity-40 text-black font-medium py-2.5 rounded-md text-sm transition-colors mt-1"
          >
            {loading ? 'Нэвтэрж байна...' : 'Нэвтрэх'}
          </button>
        </form>
      </div>
    </div>
  );
}
