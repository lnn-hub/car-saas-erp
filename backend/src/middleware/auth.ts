import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import pool from '../db/pool';
import { forbidden, unauthorized } from '../lib/http';

export const ROLES = ['ADMIN', 'SALES', 'FINANCE'] as const;
export type Role = (typeof ROLES)[number];
export interface AuthUser {
  id: string;
  role: Role;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

// Хэрэглэгчийн одоогийн эрх, идэвхтэй эсэх. Эрх солигдвол / идэвхгүй болговол 30с дотор хүчинтэй.
const TTL = 30_000;
const userCache = new Map<string, { ts: number; active: boolean; role: Role | null }>();

async function userState(id: string) {
  const hit = userCache.get(id);
  if (hit && Date.now() - hit.ts < TTL) return hit;
  const { rows } = await pool.query<{ role: Role; is_active: boolean }>(
    'SELECT role, is_active FROM users WHERE id = $1',
    [id],
  );
  const state = { ts: Date.now(), active: !!rows[0] && rows[0].is_active !== false, role: rows[0]?.role ?? null };
  userCache.set(id, state);
  return state;
}
export const invalidateUser = (id: string) => userCache.delete(id);

export const signToken = (user: AuthUser) => jwt.sign(user, config.JWT_SECRET, { expiresIn: '8h' });

// Authorization: Bearer <token>. Амжилттай бол req.user-д эрхийг (сангаас шинээр уншсан) тавина.
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) throw unauthorized('Token байхгүй');

  let decoded: { id?: string };
  try {
    decoded = jwt.verify(token, config.JWT_SECRET) as { id?: string };
  } catch {
    throw unauthorized('Token буруу эсвэл хугацаа дууссан');
  }
  const state = decoded.id ? await userState(decoded.id) : null;
  if (!decoded.id || !state?.active || !state.role) throw unauthorized('Таны бүртгэл идэвхгүй байна');
  req.user = { id: decoded.id, role: state.role };
  next();
};

// requireAuth-ийн дараах handler-уудад нэвтэрсэн хэрэглэгч
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw unauthorized('Нэвтрээгүй байна');
  return req.user;
}

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (req.user?.role !== 'ADMIN') throw forbidden('Энэ үйлдэлд админ эрх шаардлагатай');
  next();
};

// Өртөг, ашиг, тайлан харах эрх: Админ, Нягтлан (FINANCE). Борлуулагч (SALES) харахгүй.
export const canSeeMoney = (user?: AuthUser) => user?.role === 'ADMIN' || user?.role === 'FINANCE';
export const requireMoney: RequestHandler = (req, _res, next) => {
  if (!canSeeMoney(req.user)) throw forbidden('Энэ мэдээллийг харах эрх танд байхгүй');
  next();
};
