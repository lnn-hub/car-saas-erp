import type { Company } from './site';

const digits = (s: string) => s.replace(/\D/g, '');
// Монгол дугаар бол 976 угтвар нэмнэ (8 оронтой)
const intl = (s: string) => {
  const d = digits(s);
  return d.length === 8 ? `976${d}` : d;
};

export function messengerHref(v?: string | null) {
  if (!v) return null;
  const t = v.trim();
  if (/^https?:\/\//i.test(t)) return t;
  return `https://m.me/${t.replace(/^@/, '').replace(/^(www\.)?(m\.me|facebook\.com|fb\.com)\//i, '')}`;
}
export const viberHref = (v?: string | null) =>
  v && digits(v).length >= 8 ? `viber://chat?number=%2B${intl(v)}` : null;
export const whatsappHref = (v?: string | null, text?: string) =>
  v && digits(v).length >= 8 ? `https://wa.me/${intl(v)}${text ? `?text=${encodeURIComponent(text)}` : ''}` : null;

export type ChatChannel = { key: 'messenger' | 'viber' | 'whatsapp'; label: string; href: string };

// Тохиргоонд оруулсан чат сувгууд (Messenger → Viber → WhatsApp дарааллаар)
export function chatChannels(c: Company | null | undefined, text?: string): ChatChannel[] {
  if (!c) return [];
  const list: (ChatChannel | null)[] = [
    (() => {
      const h = messengerHref(c.messenger_url);
      return h ? { key: 'messenger' as const, label: 'Messenger', href: h } : null;
    })(),
    (() => {
      const h = viberHref(c.viber_phone);
      return h ? { key: 'viber' as const, label: 'Viber', href: h } : null;
    })(),
    (() => {
      const h = whatsappHref(c.whatsapp_phone, text);
      return h ? { key: 'whatsapp' as const, label: 'WhatsApp', href: h } : null;
    })(),
  ];
  return list.filter(Boolean) as ChatChannel[];
}
