import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

// Орчны хувьсагчдыг нэг газар шалгана. Буруу эсвэл дутуу бол сервер тодорхой алдаатай зогсоно.
const schema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL тохируулаагүй байна'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET тохируулаагүй байна'),
  // Таслалаар тусгаарласан олон домэйн байж болно (жишээ нь vercel.app болон өөрийн домэйн)
  FRONTEND_URL: z.string().default(''),
  PUBLIC_SITE_URL: z.string().default(''),
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  FB_GRAPH_VERSION: z.string().default(''),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Тохиргооны алдаа: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
}

export const config = {
  ...parsed.data,
  isTest: parsed.data.NODE_ENV === 'test',
  frontendOrigins: parsed.data.FRONTEND_URL.split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  useCloudinary: !!(
    parsed.data.CLOUDINARY_CLOUD_NAME &&
    parsed.data.CLOUDINARY_API_KEY &&
    parsed.data.CLOUDINARY_API_SECRET
  ),
};

// Сайтын нийтийн хаяг (Facebook постын холбоос): PUBLIC_SITE_URL, эсвэл localhost биш анхны FRONTEND_URL
export const publicSiteUrl = () =>
  (config.PUBLIC_SITE_URL || config.frontendOrigins.find((u) => !u.includes('localhost')) || '').replace(/\/$/, '');

// Танилцуулгын горим (нууц үггүй админ). Ажиллаж байх үед асааж/унтрааж болох тул тухай бүрд уншина.
export const demoLoginEnabled = () => process.env.DEMO_LOGIN === 'true';
