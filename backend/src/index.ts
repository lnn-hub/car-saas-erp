import app from './app';
import { config } from './config';
import migrate from './db/migrate';

if (config.JWT_SECRET.length < 32)
  console.warn('АНХААРУУЛГА: JWT_SECRET сул байна. 32+ тэмдэгтийн санамсаргүй утга тавина уу.');

// Эхлээд өгөгдлийн сангийн migration-ыг ажиллуулна. Амжилтгүй бол сервер асахгүй (хуучин бүтэцтэй
// сан дээр шинэ код ажиллаж өгөгдөл эвдэхээс сэргийлнэ). Render дахин оролдоно.
migrate()
  .then(() => {
    app.listen(config.PORT, () => console.log(`Server ажиллаж байна: http://localhost:${config.PORT}`));
  })
  .catch((err: Error) => {
    console.error(err.message);
    process.exit(1);
  });
