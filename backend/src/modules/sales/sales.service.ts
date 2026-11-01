import { z } from 'zod';
import { withTransaction } from '../../db/pool';
import { conflict, isUniqueViolation, notFound } from '../../lib/http';
import { isUuid } from '../../lib/validate';
import { customerExists } from '../customers/customers.repo';
import { insertSale, lockVehicle, markVehicleSold, PAYMENT_TYPES } from './sales.repo';

const REQUIRED_MSG = 'Машин, үйлчлүүлэгч, зөв үнэ заавал шаардлагатай';

export const saleSchema = z.object({
  vehicle_id: z.string({ error: REQUIRED_MSG }).min(1, REQUIRED_MSG),
  customer_id: z.string({ error: REQUIRED_MSG }).min(1, REQUIRED_MSG),
  sale_price: z.coerce.number({ error: REQUIRED_MSG }).refine((n) => Number.isFinite(n) && n > 0, REQUIRED_MSG),
  payment_type: z.preprocess(
    (v) => v || undefined,
    z.enum(PAYMENT_TYPES, { error: 'Төлбөрийн хэлбэр буруу байна' }).default('CASH'),
  ),
  note: z.string().nullish(),
  // Зарсан өдөр (YYYY-MM-DD). Өгөөгүй эсвэл өнөөдөр бол яг одоогийн цагаар бүртгэнэ.
  sold_at: z.iso.date({ error: 'Зарсан огноо буруу байна' }).nullish(),
});
export type SaleInput = z.infer<typeof saleSchema>;

const ALREADY_SOLD = 'Энэ машин аль хэдийн зарагдсан байна';

export async function createSale(input: SaleInput, userId: string) {
  if (!isUuid(input.vehicle_id)) throw notFound('Машин олдсонгүй');
  if (!isUuid(input.customer_id)) throw notFound('Үйлчлүүлэгч олдсонгүй');
  const today = new Date().toISOString().slice(0, 10);
  const soldAt = input.sold_at && input.sold_at !== today ? input.sold_at : null;

  try {
    return await withTransaction(async (db) => {
      const vehicle = await lockVehicle(input.vehicle_id, db);
      if (!vehicle) throw notFound('Машин олдсонгүй');
      if (vehicle.status === 'SOLD') throw conflict(ALREADY_SOLD);
      if (!(await customerExists(input.customer_id, db))) throw notFound('Үйлчлүүлэгч олдсонгүй');

      const sale = await insertSale(
        {
          vehicle_id: input.vehicle_id,
          customer_id: input.customer_id,
          sold_by: userId,
          sale_price: input.sale_price,
          payment_type: input.payment_type,
          note: input.note ?? null,
          sold_at: soldAt,
        },
        db,
      );
      await markVehicleSold(input.vehicle_id, db);
      return sale;
    });
  } catch (err) {
    // Нэг машинд нэг борлуулалт (unique index) зэрэг хүсэлтээс хамгаална
    if (isUniqueViolation(err)) throw conflict(ALREADY_SOLD);
    throw err;
  }
}
