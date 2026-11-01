import { Router } from 'express';
import { notFound } from '../../lib/http';
import { idParam, parse } from '../../lib/validate';
import { canSeeMoney, currentUser, requireAdmin, requireAuth, requireMoney } from '../../middleware/auth';
import { listVehicleImages } from '../images/images.repo';
import { findVehicle, listCosts, listVehicles } from './vehicles.repo';
import { costSchema, createVehicleSchema, statusSchema, updateVehicleSchema } from './vehicles.schema';
import * as service from './vehicles.service';

const router = Router();
router.use(requireAuth);

const NOT_FOUND = 'Машин олдсонгүй';

// GET /api/vehicles — бүх машин. Өртгийг зөвхөн админ, нягтлан харна.
router.get('/', async (req, res) => {
  const rows = await listVehicles();
  res.json(canSeeMoney(req.user) ? rows : rows.map(({ total_cost: _cost, ...rest }) => rest));
});

// GET /api/vehicles/:id — нэг машин, зардал, зураг
router.get('/:id', async (req, res) => {
  const id = idParam(req.params.id, NOT_FOUND);
  const vehicle = await findVehicle(id);
  if (!vehicle) throw notFound(NOT_FOUND);
  const [costs, images] = await Promise.all([canSeeMoney(req.user) ? listCosts(id) : [], listVehicleImages(id)]);
  res.json({ ...vehicle, costs, images });
});

// POST /api/vehicles — машин нэмэх (сайтад шууд нийтлэгдэнэ)
router.post('/', async (req, res) => {
  const input = parse(createVehicleSchema, req.body);
  res.status(201).json(await service.createVehicle(input, currentUser(req).id));
});

// PATCH /api/vehicles/:id — мэдээлэл засах
router.patch('/:id', async (req, res) => {
  const id = idParam(req.params.id, NOT_FOUND);
  res.json(await service.updateVehicle(id, parse(updateVehicleSchema, req.body)));
});

// DELETE /api/vehicles/:id — борлуулалтгүй машиныг устгах (админ)
router.delete('/:id', requireAdmin, async (req, res) => {
  await service.deleteVehicle(idParam(req.params.id, NOT_FOUND));
  res.json({ ok: true });
});

// PATCH /api/vehicles/:id/status
router.patch('/:id/status', async (req, res) => {
  const { status } = parse(statusSchema, req.body);
  res.json(await service.setStatus(idParam(req.params.id, NOT_FOUND), status));
});

// POST /api/vehicles/:id/costs — зардал нэмэх (админ, нягтлан)
router.post('/:id/costs', requireMoney, async (req, res) => {
  const id = idParam(req.params.id, NOT_FOUND);
  res.status(201).json(await service.addCost(id, parse(costSchema, req.body), currentUser(req).id));
});

// POST /api/vehicles/:id/facebook — пэйж рүү нийтлэх
router.post('/:id/facebook', async (req, res) => {
  res.json(await service.publishToFacebook(idParam(req.params.id, NOT_FOUND)));
});

// GET /api/vehicles/:id/facebook/preview — постын бичвэрийг урьдчилан харах
router.get('/:id/facebook/preview', async (req, res) => {
  res.json(await service.facebookPreview(idParam(req.params.id, NOT_FOUND)));
});

export default router;
