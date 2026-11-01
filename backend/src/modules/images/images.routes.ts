import { Router } from 'express';
import { z } from 'zod';
import { badRequest, notFound } from '../../lib/http';
import { idParam, parse } from '../../lib/validate';
import { requireAdmin, requireAuth } from '../../middleware/auth';
import { getCompany, updateCompany } from '../company/company.repo';
import { findMemberPhoto, setMemberPhoto } from '../team/team.repo';
import { vehicleExists } from '../vehicles/vehicles.repo';
import { deleteImageRow, findImage, imageStats, insertImage, listVehicleImages, reorderImages } from './images.repo';
import { deleteImage, imageUpload, saveImage } from './storage';

// Зураг оруулах, устгах, дараалал (машин, багийн гишүүн, лого)
const router = Router();
router.use(requireAuth);

const VEHICLE_NOT_FOUND = 'Машин олдсонгүй';

async function ensureVehicle(id: string | string[] | undefined) {
  const vehicleId = idParam(id, VEHICLE_NOT_FOUND);
  if (!(await vehicleExists(vehicleId))) throw notFound(VEHICLE_NOT_FOUND);
  return vehicleId;
}

// POST /api/upload/vehicle/:id — олон зураг. Машинд анх оруулсан зураг үндсэн болно.
router.post('/vehicle/:id', imageUpload.array('images', 20), async (req, res) => {
  const vehicleId = await ensureVehicle(req.params.id);
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const stats = await imageStats(vehicleId);
  const saved = [];
  for (const [i, file] of files.entries()) {
    const url = await saveImage(file.buffer, `vehicles/${vehicleId}`);
    saved.push(
      await insertImage({
        vehicle_id: vehicleId,
        url,
        is_main: stats.cnt === 0 && i === 0,
        sort_order: stats.max + 1 + i,
      }),
    );
  }
  res.json(saved);
});

// PATCH /api/upload/vehicle/:id/order { ids: [...] } — зургийн дараалал. Эхний зураг нь үндсэн болно.
const orderSchema = z.object({
  ids: z
    .array(z.unknown())
    .catch([])
    .transform((ids) => ids.filter((x): x is string => typeof x === 'string'))
    .refine((ids) => ids.length > 0, 'Зургийн дараалал хоосон байна'),
});
router.patch('/vehicle/:id/order', async (req, res) => {
  const { ids } = parse(orderSchema, req.body ?? {});
  const vehicleId = await ensureVehicle(req.params.id);
  const own = new Set((await listVehicleImages(vehicleId)).map((img) => img.id));
  if (ids.length !== own.size || !ids.every((id) => own.has(id)))
    throw badRequest('Зургийн жагсаалт таарахгүй байна. Хуудсаа шинэчилнэ үү');
  await reorderImages(ids);
  res.json({ ok: true });
});

// DELETE /api/upload/image/:imageId
router.delete('/image/:imageId', async (req, res) => {
  const img = await findImage(idParam(req.params.imageId, 'Зураг олдсонгүй'));
  if (!img) throw notFound('Зураг олдсонгүй');
  await deleteImage(img.url);
  await deleteImageRow(img);
  res.json({ ok: true });
});

// POST /api/upload/team/:id — багийн гишүүний зураг
router.post('/team/:id', requireAdmin, imageUpload.single('photo'), async (req, res) => {
  if (!req.file) throw badRequest('Зураг сонгоно уу');
  const id = idParam(req.params.id, 'Олдсонгүй');
  const member = await findMemberPhoto(id);
  if (!member) throw notFound('Олдсонгүй');
  const url = await saveImage(req.file.buffer, 'team');
  if (member.photo_url) await deleteImage(member.photo_url);
  res.json(await setMemberPhoto(id, url));
});

// POST /api/upload/logo — компанийн лого
router.post('/logo', requireAdmin, imageUpload.single('logo'), async (req, res) => {
  if (!req.file) throw badRequest('Зураг сонгоно уу');
  const company = await getCompany(['logo_url']);
  const url = await saveImage(req.file.buffer, 'logo');
  if (company?.logo_url) await deleteImage(company.logo_url);
  await updateCompany({ logo_url: url });
  res.json({ logo_url: url });
});

// DELETE /api/upload/logo
router.delete('/logo', requireAdmin, async (_req, res) => {
  const company = await getCompany(['logo_url']);
  if (company?.logo_url) await deleteImage(company.logo_url);
  await updateCompany({ logo_url: null });
  res.json({ ok: true });
});

export default router;
