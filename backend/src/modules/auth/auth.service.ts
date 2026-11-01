import bcrypt from 'bcryptjs';
import { notFound, unauthorized } from '../../lib/http';
import { signToken } from '../../middleware/auth';
import { getCompany } from '../company/company.repo';
import { findActiveUserByEmail, findFirstActiveAdmin, type UserRow } from '../users/users.repo';

// Хэрэглэгч байхгүй үед ч хугацаа адил байлгаж, и-мэйл бүртгэлтэй эсэхийг таахаас сэргийлнэ
const DUMMY_HASH = '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali';
const BAD_CREDENTIALS = 'И-мэйл эсвэл нууц үг буруу байна';

async function session(user: UserRow) {
  const company = await getCompany(['name']);
  return {
    token: signToken({ id: user.id, role: user.role }),
    user: { id: user.id, name: user.name, role: user.role, company_name: company?.name || '' },
  };
}

export async function login(email: string, password: string) {
  const user = await findActiveUserByEmail(email);
  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw unauthorized(BAD_CREDENTIALS);
  }
  if (!(await bcrypt.compare(password, user.password))) throw unauthorized(BAD_CREDENTIALS);
  return session(user);
}

export async function demoLogin() {
  const user = await findFirstActiveAdmin();
  if (!user) throw notFound('Админ хэрэглэгч алга');
  return session(user);
}
