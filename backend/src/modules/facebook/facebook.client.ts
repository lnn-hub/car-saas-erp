// Facebook пэйж рүү машины пост оруулах (Graph API). Meta-д төлбөргүй.
// Хувилбаргүй хаяг нь аппын үндсэн Graph API хувилбарыг ашиглана; хүсвэл FB_GRAPH_VERSION=v23.0 гэж тогтооно.
import { config } from '../../config';
import { HttpError } from '../../lib/http';

const GRAPH = `https://graph.facebook.com${config.FB_GRAPH_VERSION ? `/${config.FB_GRAPH_VERSION}` : ''}`;

// Facebook-ийн алдаа хэрэглэгчид 400 болж харагдана
export class FbError extends HttpError {
  constructor(
    message: string,
    public readonly fbCode?: number,
  ) {
    super(400, message);
  }
}

const isPermissionError = (code?: number) => code === 190 || code === 200 || code === 10;

async function graph<T>(
  path: string,
  { method = 'GET', params = {}, token }: { method?: 'GET' | 'POST'; params?: Record<string, string>; token: string },
): Promise<T> {
  const qs = new URLSearchParams({ ...params, access_token: token });
  const url = `${GRAPH}${path}`;
  const res = await fetch(method === 'GET' ? `${url}?${qs}` : url, {
    method,
    ...(method === 'GET' ? {} : { body: qs, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }),
    signal: AbortSignal.timeout(30000),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: { code?: number; message?: string } };
  if (!res.ok || data.error) {
    const e = data.error || {};
    if (e.code === 190)
      throw new FbError('Facebook токен буруу эсвэл хугацаа нь дууссан байна. Тохиргооноос дахин холбоно уу', 190);
    if (e.code === 200 || e.code === 10)
      throw new FbError('Пэйж рүү нийтлэх зөвшөөрөл (pages_manage_posts) алга байна', e.code);
    throw new FbError(`Facebook: ${e.message || 'тодорхойгүй алдаа'}`, e.code);
  }
  return data as T;
}

interface Page {
  id: string;
  name: string;
  access_token: string;
}

// Токеноос пэйжийг олно. Пэйжийн токен бол шууд; хэрэглэгчийн токен бол удирддаг пэйжүүдээс сонгоно
// (урт хугацааны хэрэглэгчийн токеноос авсан пэйжийн токен хугацаа дуусдаггүй).
export async function resolvePage(token: string, pageId?: string) {
  const me = await graph<{ id: string; name: string }>('/me', { params: { fields: 'id,name' }, token });
  let accounts: { data?: Page[] } | null = null;
  try {
    accounts = await graph('/me/accounts', { params: { fields: 'id,name,access_token', limit: '100' }, token });
  } catch {
    /* пэйжийн токен бол /me/accounts алдаа өгнө */
  }
  if (accounts?.data?.length) {
    const page = pageId ? accounts.data.find((p) => p.id === pageId) : accounts.data[0];
    if (!page) throw new FbError('Сонгосон пэйж олдсонгүй');
    return {
      id: page.id,
      name: page.name,
      token: page.access_token,
      pages: accounts.data.map(({ id, name }) => ({ id, name })),
    };
  }
  if (accounts && !accounts.data?.length) throw new FbError('Энэ хэрэглэгч удирддаг пэйж алга байна');
  return { id: me.id, name: me.name, token, pages: [{ id: me.id, name: me.name }] };
}

// Пост: зургуудыг эхлээд нийтлэхгүйгээр оруулж, дараа нь нэг пост болгон хавсаргана.
export async function publishPost({
  pageId,
  token,
  message,
  imageUrls,
  link,
}: {
  pageId: string;
  token: string;
  message: string;
  imageUrls: string[];
  link: string | null;
}) {
  const media: string[] = [];
  for (const url of imageUrls.slice(0, 10)) {
    try {
      const p = await graph<{ id: string }>(`/${pageId}/photos`, {
        method: 'POST',
        params: { url, published: 'false' },
        token,
      });
      media.push(p.id);
    } catch (err) {
      if (err instanceof FbError && isPermissionError(err.fbCode)) throw err;
      // Нэг зураг алдаа өгвөл бусдыг нь үргэлжлүүлнэ
    }
  }
  const params: Record<string, string> = { message };
  media.forEach((id, i) => {
    params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id });
  });
  if (!media.length && link) params.link = link;
  const post = await graph<{ id: string }>(`/${pageId}/feed`, { method: 'POST', params, token });
  return { id: post.id, url: `https://www.facebook.com/${post.id}`, photos: media.length };
}
