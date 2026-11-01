import { z } from 'zod';
import { badRequest, notFound } from './http';

// Оролтыг zod схемээр шалгана. Алдаатай бол эхний алдааны (монгол) мессежтэй 400 шиднэ.
export function parse<S extends z.ZodType>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) throw badRequest(result.error.issues[0]?.message || 'Өгөгдөл буруу байна');
  return result.data;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID_RE.test(value);

// URL-ийн :id. Буруу хэлбэртэй бол (байхгүй мөртэй адил) 404.
export function idParam(value: string | string[] | undefined, notFoundMessage: string): string {
  if (!isUuid(value)) throw notFound(notFoundMessage);
  return value;
}

// Нийтлэг талбарууд
export const optionalText = (max: number) =>
  z
    .unknown()
    .transform((v) => (v == null ? null : String(v).trim().slice(0, max) || null))
    .optional();

// '', null → null; бусад нь тоо (сөрөг биш)
export const optionalMoney = (message: string) =>
  z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .transform((v, ctx) => {
      if (v === undefined) return undefined;
      if (v === null || v === '') return null;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) {
        ctx.addIssue({ code: 'custom', message });
        return z.NEVER;
      }
      return n;
    });
