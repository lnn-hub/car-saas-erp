'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

// Тохиргоо → Facebook пэйж холбох. Токеныг серверт хадгална, буцааж харуулахгүй.
export function FacebookConnect({ connected, pageName, onChange }: {
  connected: boolean; pageName: string | null; onChange: (c: { connected: boolean; pageName: string | null }) => void;
}) {
  const [token, setToken] = useState('');
  const [pages, setPages] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [help, setHelp] = useState(!connected);

  async function connect(pageId?: string) {
    setBusy(true); setError('');
    try {
      const r = await api.fbConnect(token, pageId);
      setPages(r.pages?.length > 1 ? r.pages : []);
      onChange({ connected: true, pageName: r.fb_page_name });
      if (!(r.pages?.length > 1)) setToken('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Алдаа'); }
    finally { setBusy(false); }
  }
  async function disconnect() {
    if (!confirm('Facebook пэйжийг салгах уу?')) return;
    try { await api.fbDisconnect(); onChange({ connected: false, pageName: null }); setHelp(true); }
    catch (e) { setError(e instanceof Error ? e.message : 'Алдаа'); }
  }

  return (
    <section className="bg-white ring-1 ring-ink/[0.06] rounded-[22px] overflow-hidden shadow-card">
      <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between gap-3">
        <span className="font-display text-base font-semibold text-ink flex items-center gap-2">
          <svg className="w-5 h-5 text-[#1877f2]" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12a12 12 0 10-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0024 12z" /></svg>
          Facebook пэйж
        </span>
        {connected && <span className="text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1">Холбогдсон</span>}
      </div>

      <div className="p-5 space-y-4">
        {connected ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-ink">{pageName}</div>
              <div className="text-xs text-zinc-500 mt-0.5">Машины хуудсанд «Facebook-т нийтлэх» товч гарна.</div>
            </div>
            <button type="button" onClick={disconnect} className="h-9 px-4 rounded-full text-sm text-zinc-600 hover:text-danger hover:bg-danger-soft">Салгах</button>
          </div>
        ) : null}

        {pages.length > 1 && (
          <div>
            <div className="text-xs text-zinc-500 mb-2">Та хэд хэдэн пэйж удирддаг байна. Аль рүү нь нийтлэх вэ?</div>
            <div className="flex flex-wrap gap-2">
              {pages.map((p) => (
                <button key={p.id} type="button" disabled={busy} onClick={() => connect(p.id)}
                  className={`h-9 px-4 rounded-full text-sm border ${p.name === pageName ? 'bg-ink border-ink text-white' : 'border-zinc-200 text-zinc-700 hover:border-zinc-400'}`}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <button type="button" onClick={() => setHelp((v) => !v)} className="text-sm font-medium text-brand">
          {help ? 'Зааврыг нуух' : connected ? 'Өөр пэйж холбох / токен шинэчлэх' : 'Хэрхэн холбох вэ?'}
        </button>

        {help && (
          <>
            <ol className="text-sm text-zinc-600 space-y-2 list-decimal pl-5">
              <li><a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="text-brand underline">developers.facebook.com/apps</a> → <b>Create App</b> → «Other» → <b>Business</b> төрөлтэй апп үүсгэнэ.</li>
              <li><a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noreferrer" className="text-brand underline">Graph API Explorer</a> дээр аппаа сонгоод, <b>Permissions</b>-д <code className="bg-zinc-100 rounded px-1">pages_show_list</code>, <code className="bg-zinc-100 rounded px-1">pages_read_engagement</code>, <code className="bg-zinc-100 rounded px-1">pages_manage_posts</code> нэмж <b>Generate Access Token</b> дарна. Пэйжээ сонгож зөвшөөрнө.</li>
              <li>Гарсан токеныг <a href="https://developers.facebook.com/tools/debug/accesstoken" target="_blank" rel="noreferrer" className="text-brand underline">Access Token Debugger</a> дээр шалгаад доод талын <b>Extend Access Token</b> дарна. Урт хугацааны токен гарна.</li>
              <li>Тэр урт токеныг доор буулгаад <b>Холбох</b> дарна. Систем пэйжийн хугацаагүй токеныг өөрөө авна.</li>
            </ol>
            <div className="flex flex-col sm:flex-row gap-2">
              <input value={token} onChange={(e) => setToken(e.target.value)} type="password" autoComplete="off" placeholder="EAAG... токен"
                className="flex-1 bg-white border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder-zinc-400 focus:outline-none focus:border-ink/40" />
              <button type="button" onClick={() => connect()} disabled={busy || token.trim().length < 20}
                className="h-11 px-6 rounded-full bg-[#1877f2] hover:bg-[#166fe0] disabled:opacity-40 text-white text-sm font-medium transition-colors">
                {busy ? 'Шалгаж байна...' : 'Холбох'}
              </button>
            </div>
          </>
        )}
        {error && <div className="bg-danger-soft border border-danger-line rounded-xl px-3 py-2 text-xs text-danger">{error}</div>}
      </div>
    </section>
  );
}
