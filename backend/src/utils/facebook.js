// Facebook пэйж рүү машины пост оруулах (Graph API). Meta-д төлбөргүй.
// Хувилбаргүй хаяг нь аппын үндсэн Graph API хувилбарыг ашиглана; хүсвэл FB_GRAPH_VERSION=v23.0 гэж тогтооно.
const GRAPH = `https://graph.facebook.com${process.env.FB_GRAPH_VERSION ? `/${process.env.FB_GRAPH_VERSION}` : ''}`;

class FbError extends Error {
  constructor(message, code) { super(message); this.code = code; }
}

async function graph(path, { method = 'GET', params = {}, token }) {
  const qs = new URLSearchParams({ ...params, access_token: token });
  const url = `${GRAPH}${path}`;
  const res = await fetch(method === 'GET' ? `${url}?${qs}` : url, {
    method,
    ...(method === 'GET' ? {} : { body: qs, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }),
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const e = data.error || {};
    if (e.code === 190) throw new FbError('Facebook токен буруу эсвэл хугацаа нь дууссан байна. Тохиргооноос дахин холбоно уу', 190);
    if (e.code === 200 || e.code === 10) throw new FbError('Пэйж рүү нийтлэх зөвшөөрөл (pages_manage_posts) алга байна', e.code);
    throw new FbError(`Facebook: ${e.message || 'тодорхойгүй алдаа'}`, e.code);
  }
  return data;
}

// Токеноос пэйжийг олно. Пэйжийн токен бол шууд; хэрэглэгчийн токен бол удирддаг пэйжүүдээс сонгоно
// (урт хугацааны хэрэглэгчийн токеноос авсан пэйжийн токен хугацаа дуусдаггүй).
async function resolvePage(token, pageId) {
  const me = await graph('/me', { params: { fields: 'id,name' }, token });
  let accounts = null;
  try {
    accounts = await graph('/me/accounts', { params: { fields: 'id,name,access_token', limit: '100' }, token });
  } catch { /* пэйжийн токен бол /me/accounts алдаа өгнө */ }
  if (accounts?.data?.length) {
    const page = pageId ? accounts.data.find((p) => p.id === pageId) : accounts.data[0];
    if (!page) throw new FbError('Сонгосон пэйж олдсонгүй');
    return { id: page.id, name: page.name, token: page.access_token, pages: accounts.data.map(({ id, name }) => ({ id, name })) };
  }
  if (accounts && !accounts.data?.length) throw new FbError('Энэ хэрэглэгч удирддаг пэйж алга байна');
  return { id: me.id, name: me.name, token, pages: [{ id: me.id, name: me.name }] };
}

// Пост: зургуудыг эхлээд нийтлэхгүйгээр оруулж, дараа нь нэг пост болгон хавсаргана.
async function publishPost({ pageId, token, message, imageUrls, link }) {
  const media = [];
  for (const url of imageUrls.slice(0, 10)) {
    try {
      const p = await graph(`/${pageId}/photos`, { method: 'POST', params: { url, published: 'false' }, token });
      media.push(p.id);
    } catch (err) {
      if (err.code === 190 || err.code === 200 || err.code === 10) throw err;
      // Нэг зураг алдаа өгвөл бусдыг нь үргэлжлүүлнэ
    }
  }
  const params = { message };
  media.forEach((id, i) => { params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id }); });
  if (!media.length && link) params.link = link;
  const post = await graph(`/${pageId}/feed`, { method: 'POST', params, token });
  return { id: post.id, url: `https://www.facebook.com/${post.id}`, photos: media.length };
}

module.exports = { resolvePage, publishPost, FbError };
