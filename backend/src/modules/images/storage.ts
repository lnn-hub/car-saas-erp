import fs from 'node:fs';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import sharp from 'sharp';
import { config } from '../../config';
import { badRequest } from '../../lib/http';

// Зураг хадгалах: production-д Cloudinary, тохируулаагүй бол (хөгжүүлэлтэд) backend/uploads хавтас.
export const UPLOAD_DIR = path.join(__dirname, '../../../uploads');

if (config.useCloudinary) {
  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
  });
} else {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Санах ойд хүлээн авна (20MB хүртэл, зөвхөн зураг)
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(badRequest('Зөвхөн зураг оруулна уу'));
  },
});

// WebP болгож, 1600x1200-аас томгүй болгоод хадгална. Нийтэд нээлттэй URL буцаана.
export async function saveImage(buffer: Buffer, folder: string): Promise<string> {
  const image = sharp(buffer).resize(1600, 1200, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 });
  if (config.useCloudinary) {
    const webp = await image.toBuffer();
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: `car-saas/${folder}`, resource_type: 'image', format: 'webp' }, (err, result) => {
          if (err || !result) reject(err ?? new Error('Cloudinary хариу өгсөнгүй'));
          else resolve(result.secure_url);
        })
        .end(webp);
    });
  }
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
  await image.toFile(path.join(UPLOAD_DIR, filename));
  return `/uploads/${filename}`;
}

// Устгахад алдаа гарвал (файл аль хэдийн байхгүй г.м.) үл тооно
export async function deleteImage(url: string) {
  if (config.useCloudinary && url.includes('cloudinary.com')) {
    // public_id: "car-saas/vehicles/<id>/<filename>" — өргөтгөлгүй
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
    if (match) await cloudinary.uploader.destroy(match[1]).catch(() => {});
  } else if (!config.useCloudinary) {
    fs.rmSync(path.join(UPLOAD_DIR, path.basename(url)), { force: true });
  }
}
