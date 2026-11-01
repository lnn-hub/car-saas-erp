import { z } from 'zod';
import { optionalMoney } from '../../lib/validate';

export const VEHICLE_STATUSES = ['ARRIVED', 'PUBLISHED', 'RESERVED', 'SOLD'] as const;
export const FUEL_TYPES = ['PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC'] as const;
export const TRANSMISSIONS = ['AUTO', 'MANUAL'] as const;
export const COST_TYPES = ['PURCHASE', 'SHIPPING', 'CUSTOMS', 'REPAIR', 'CLEANING', 'OTHER'] as const;

const REQUIRED_MSG = 'VIN, марк, загвар,он заавал шаардлагатай';
const PRICE_MSG = 'Зарын үнэ буруу байна';

// '' эсвэл null → null, ирээгүй → undefined
const blank = (v: unknown) => (v === '' || v === null ? null : v);
const nullableInt = (message: string) =>
  z
    .unknown()
    .optional()
    .transform((v, ctx) => {
      const b = blank(v);
      if (b === undefined || b === null) return b;
      const n = Number(b);
      if (!Number.isInteger(n)) {
        ctx.addIssue({ code: 'custom', message });
        return z.NEVER;
      }
      return n;
    });
const nullableText = z
  .unknown()
  .optional()
  .transform((v) => {
    const b = blank(v);
    return b === undefined || b === null ? b : String(b);
  });
const nullableDate = z
  .union([z.iso.date({ error: 'Огноо буруу байна' }), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v === '' ? null : v));
const nullableEnum = <T extends readonly [string, ...string[]]>(values: T, message: string) =>
  z.preprocess(blank, z.enum(values, { error: message }).nullable().optional());

// Он/сар "YYYY-MM" (month input) → тухайн сарын 1-ний өдөр
const monthDate = z
  .unknown()
  .optional()
  .transform((v, ctx) => {
    if (v === undefined || v === null || v === '') return null;
    const s = String(v);
    if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    ctx.addIssue({ code: 'custom', message: 'Үйлдвэрлэсэн огноо буруу байна' });
    return z.NEVER;
  });

export const createVehicleSchema = z.object({
  vin: z.string({ error: REQUIRED_MSG }).trim().min(1, REQUIRED_MSG),
  brand: z.string({ error: REQUIRED_MSG }).trim().min(1, REQUIRED_MSG),
  model: z.string({ error: REQUIRED_MSG }).trim().min(1, REQUIRED_MSG),
  year: z.coerce.number({ error: REQUIRED_MSG }).int(REQUIRED_MSG).positive(REQUIRED_MSG),
  mileage: nullableInt('Гүйлт буруу байна').transform((v) => v || 0),
  color: nullableText.transform((v) => v ?? null),
  fuel_type: nullableEnum(FUEL_TYPES, 'Түлшний төрөл буруу байна').transform((v) => v || 'PETROL'),
  transmission: nullableEnum(TRANSMISSIONS, 'Хурдны хайрцаг буруу байна').transform((v) => v || 'AUTO'),
  engine_cc: nullableInt('Хөдөлгүүрийн багтаамж буруу байна').transform((v) => v ?? null),
  description: nullableText.transform((v) => v ?? null),
  arrived_at: nullableDate.transform((v) => v ?? null),
  manufactured_date: monthDate,
  has_plates: z
    .unknown()
    .optional()
    .transform((v) => v === true || v === 'true'),
  price: optionalMoney(PRICE_MSG).transform((v) => v ?? null),
});
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

// Засах: ирээгүй талбар хөндөгдөхгүй, '' нь null болно. Марк, загвар, он хоосон байж болохгүй.
const notBlank = (msg: string) => nullableText.refine((v) => v !== null && (v === undefined || v.trim() !== ''), msg);
export const updateVehicleSchema = z.object({
  brand: notBlank('Марк, загвар, он хоосон байж болохгүй'),
  model: notBlank('Марк, загвар, он хоосон байж болохгүй'),
  year: nullableInt('Он буруу байна').refine((v) => v !== null, 'Марк, загвар, он хоосон байж болохгүй'),
  mileage: nullableInt('Гүйлт буруу байна'),
  color: nullableText,
  fuel_type: nullableEnum(FUEL_TYPES, 'Түлшний төрөл буруу байна'),
  transmission: nullableEnum(TRANSMISSIONS, 'Хурдны хайрцаг буруу байна'),
  engine_cc: nullableInt('Хөдөлгүүрийн багтаамж буруу байна'),
  description: nullableText,
  has_plates: z.boolean().nullable().optional(),
  manufactured_date: nullableDate,
  arrived_at: nullableDate,
  price: optionalMoney(PRICE_MSG),
});
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;

export const statusSchema = z.object({ status: z.enum(VEHICLE_STATUSES, { error: 'Буруу статус' }) });

const COST_MSG = 'Зардлын төрөл, дүн заавал шаардлагатай';
export const costSchema = z.object({
  cost_type: z.enum(COST_TYPES, { error: (iss) => (iss.input ? 'Зардлын төрөл буруу байна' : COST_MSG) }),
  amount: z.coerce.number({ error: COST_MSG }).refine((n) => Number.isFinite(n) && n !== 0, COST_MSG),
  currency: z
    .string()
    .trim()
    .max(3)
    .nullish()
    .transform((v) => v || 'MNT'),
  note: z.string().nullish(),
});
