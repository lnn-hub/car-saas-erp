require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 4000;
// Эхлээд өгөгдлийн сангийн migration-ыг ажиллуулна. Амжилтгүй бол сервер асахгүй (хуучин бүтэцтэй
// сан дээр шинэ код ажиллаж өгөгдөл эвдэхээс сэргийлнэ). Render дахин оролдоно.
require('./db/migrate')()
  .then(() => {
    app.listen(PORT, () => console.log(`Server ажиллаж байна: http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
