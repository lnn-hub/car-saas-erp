import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';

// Хэрэглэгчид харуулах алдаа. Service, route аль ч давхаргаас шидэхэд errorHandler зөв статустай JSON болгоно.
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const unauthorized = (message: string) => new HttpError(401, message);
export const forbidden = (message: string) => new HttpError(403, message);
export const notFound = (message: string) => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);

export const apiNotFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Хаяг олдсонгүй' });
};

// Бүх алдааг нэг газар JSON болгоно. 500 алдааны дэлгэрэнгүйг хэрэглэгчид задруулахгүй, зөвхөн лог руу бичнэ.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Зургийн хэмжээ хэт том байна (20MB хүртэл)' : 'Файл буруу байна';
    res.status(400).json({ error: message });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Хүсэлтийн өгөгдөл буруу байна' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Серверийн алдаа гарлаа. Дахин оролдоно уу' });
};

// PostgreSQL-ийн давхардлын алдаа (unique constraint)
export const isUniqueViolation = (err: unknown) => (err as { code?: string })?.code === '23505';
