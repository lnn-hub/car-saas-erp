import { publicSiteUrl } from '../../config';
import { badRequest, isUniqueViolation, notFound } from '../../lib/http';
import { getCompany } from '../company/company.repo';
import { publishPost } from '../facebook/facebook.client';
import { listVehicleImages } from '../images/images.repo';
import { deleteImage } from '../images/storage';
import * as repo from './vehicles.repo';
import type { Vehicle } from './vehicles.repo';
import type { CreateVehicleInput, UpdateVehicleInput } from './vehicles.schema';

const NOT_FOUND = 'Машин олдсонгүй';

export async function createVehicle(input: CreateVehicleInput, userId: string) {
  try {
    return await repo.insertVehicle(input, userId);
  } catch (err) {
    if (isUniqueViolation(err)) throw badRequest('VIN давхардсан байна');
    throw err;
  }
}

// Үнэ буурвал өмнөх өндөр үнийг хадгална (сайтад "Үнэ буурсан" гэж харагдана). Өсвөл арилгана.
function nextPrevPrice(next: number | null, old: number | null, prev: number | null) {
  if (next != null && old != null && next < old) return Math.max(prev || 0, old);
  if (next != null && prev != null && next < prev) return prev;
  return null;
}

export async function updateVehicle(id: string, input: UpdateVehicleInput) {
  const values: Record<string, unknown> = { ...input };
  if (Object.values(values).every((v) => v === undefined)) throw badRequest('Өөрчлөх мэдээлэл алга');

  let touchPrice = false;
  if (input.price !== undefined) {
    const current = await repo.findVehicle(id);
    if (current) {
      const old = current.price != null ? Number(current.price) : null;
      const prev = current.prev_price != null ? Number(current.prev_price) : null;
      if (input.price !== old) {
        values.prev_price = nextPrevPrice(input.price, old, prev);
        touchPrice = true;
      }
    }
  }
  const vehicle = await repo.updateVehicle(id, values, { touchPrice });
  if (!vehicle) throw notFound(NOT_FOUND);
  return vehicle;
}

export async function setStatus(id: string, status: string) {
  const vehicle = await repo.updateVehicle(id, { status });
  if (!vehicle) throw notFound(NOT_FOUND);
  return vehicle;
}

// Борлуулалтын түүхтэй машиныг устгахгүй. Зургуудыг хадгалах сангаас нь мөн устгана.
export async function deleteVehicle(id: string) {
  if (!(await repo.vehicleExists(id))) throw notFound(NOT_FOUND);
  if (await repo.hasSale(id)) throw badRequest('Борлуулалтын түүхтэй машиныг устгах боломжгүй');
  for (const img of await listVehicleImages(id)) await deleteImage(img.url);
  await repo.deleteVehicle(id);
}

export async function addCost(
  vehicleId: string,
  cost: { cost_type: string; amount: number; currency: string; note?: string | null },
  userId: string,
) {
  if (!(await repo.vehicleExists(vehicleId))) throw notFound(NOT_FOUND);
  return repo.insertCost(vehicleId, cost, userId);
}

// ─── Facebook пэйж рүү нийтлэх ──────────────────────────────────────────────
const FUEL: Record<string, string> = { PETROL: 'Бензин', DIESEL: 'Дизель', HYBRID: 'Хибрид', ELECTRIC: 'Цахилгаан' };
const fmtMoney = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')} сая ₮` : `${Math.round(n).toLocaleString('en-US')} ₮`;

// Facebook зөвхөн нийтэд нээлттэй https зургийг татна. Cloudinary бол JPG, 1600px болгоно.
function fbImage(url: string) {
  if (!/^https:\/\//.test(url)) return null;
  return url.includes('res.cloudinary.com') && url.includes('/upload/')
    ? url.replace('/upload/', '/upload/f_jpg,q_auto,w_1600/')
    : url;
}

const vehicleUrl = (id: string) => {
  const site = publicSiteUrl();
  return site ? `${site}/vehicle/${id}` : null;
};

export function buildMessage(v: Vehicle, company: { phone: string | null; show_prices: boolean }) {
  const specs = [
    v.mileage && v.mileage > 0 ? `${v.mileage.toLocaleString('en-US')} км` : null,
    v.fuel_type ? FUEL[v.fuel_type] : null,
    v.transmission === 'AUTO' ? 'Автомат' : v.transmission === 'MANUAL' ? 'Механик' : null,
    v.engine_cc ? `${(v.engine_cc / 1000).toFixed(1)}L` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const lines = (v.description || '').split('\n').map((l) => l.trim());
  const about = lines.filter((l) => l && !l.startsWith('Зургийн эх сурвалж')).join('\n');
  const url = vehicleUrl(v.id);
  const price = Number(v.price);
  return [
    `${v.year} ${v.brand} ${v.model}`,
    company.show_prices && price > 0 ? `Үнэ: ${fmtMoney(price)}` : 'Үнэ: тохиролцоно',
    specs,
    [v.color, v.has_plates ? 'Дугаартай' : null].filter(Boolean).join(' · '),
    about ? `\n${about}` : '',
    url ? `\nДэлгэрэнгүй: ${url}` : '',
    company.phone ? `Утас: ${company.phone}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function facebookPreview(id: string) {
  const vehicle = await repo.findVehicle(id);
  if (!vehicle) throw notFound(NOT_FOUND);
  const company = await getCompany(['phone', 'show_prices']);
  return { message: buildMessage(vehicle, company ?? { phone: null, show_prices: true }) };
}

export async function publishToFacebook(id: string) {
  const [vehicle, company, images] = await Promise.all([
    repo.findVehicle(id),
    getCompany(['phone', 'show_prices', 'fb_page_id', 'fb_page_token']),
    listVehicleImages(id),
  ]);
  if (!vehicle) throw notFound(NOT_FOUND);
  if (!company?.fb_page_token || !company.fb_page_id)
    throw badRequest('Facebook пэйж холбоогүй байна. Тохиргоо хэсгээс холбоно уу');

  const imageUrls = images.map((i) => fbImage(i.url)).filter((u): u is string => !!u);
  const post = await publishPost({
    pageId: company.fb_page_id,
    token: company.fb_page_token,
    message: buildMessage(vehicle, company),
    imageUrls,
    link: vehicleUrl(vehicle.id),
  });
  await repo.setFacebookPost(vehicle.id, post.url);
  // Facebook нэг постонд 10 хүртэл зураг авдаг; оруулж чадаагүй зургийн тоо
  const skipped = images.length - Math.min(imageUrls.length, 10) > 0 ? images.length - post.photos : 0;
  return { ...post, skipped_images: skipped };
}
