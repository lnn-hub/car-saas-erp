# Car SaaS — автосалоны вэбсайт ба удирдлагын систем

Нэг автосалонд зориулсан систем. Хоёр хэсэгтэй:

- **Нийтийн вэбсайт**: машинуудын жагсаалт, машины дэлгэрэнгүй, лизингийн тооцоолуур, үзэх цаг товлох, харьцуулах.
- **Удирдлагын самбар (админ)**: машин, зураг, өртөг, борлуулалт, үйлчлүүлэгч, сайтаас ирсэн хүсэлт, сарын тайлан, ажилтан ба эрх, Facebook-т нийтлэх.

## Бүтэц

```
frontend/   Next.js 16 (App Router, Tailwind v4) — нийтийн сайт + админ. Vercel дээр.
backend/    Express + PostgreSQL (pg) — REST API. Render дээр.
docs/       нэмэлт заавар (нөөцлөлт)
.github/    CI (формат, lint, build) ба долоо хоног тутмын шифрлэгдсэн нөөцлөлт
```

Өгөгдлийн сан: Neon (PostgreSQL). Зураг: Cloudinary.

### Эрхийн түвшин

| Эрх                  | Харах, хийх зүйл                                     |
| -------------------- | ---------------------------------------------------- |
| Админ (`ADMIN`)      | Бүгд, үүнд тохиргоо, ажилтан удирдах орно            |
| Нягтлан (`FINANCE`)  | Өртөг, ашиг, тайлан харна. Тохиргоо харахгүй         |
| Борлуулагч (`SALES`) | Машин, борлуулалт, үйлчлүүлэгч. Өртөг, ашиг харахгүй |

Эрхийг backend шалгадаг. Frontend зөвхөн харагдах эсэхийг шийднэ.

## Локал дээр ажиллуулах

Шаардлага: Node.js 20+, PostgreSQL 16.

```bash
# 1. Хамаарлууд
npm install                     # root: Prettier
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 2. Тохиргоо
cp backend/.env.example backend/.env           # DATABASE_URL, JWT_SECRET-ээ бөглөнө
cp frontend/.env.example frontend/.env.local

# 3. Өгөгдлийн сан (анх удаа)
createdb car_saas_db
cd backend && npm run migrate && cd ..       # бүх хүснэгтийг үүсгэнэ
cd backend && npm run create-admin -- admin@example.mn 'нууц-үг-8+' 'Админ' && cd ..

# 4. Асаах (тус тусдаа терминалд)
cd backend && npm run dev       # http://localhost:4001
cd frontend && npm run dev      # http://localhost:3000
```

`./start.sh` нь дээрх 4-р алхмыг нэг дор хийнэ.

Жишээ машин (зурагтай) оруулах: `cd backend && npm run seed-demo`.

Утаснаас шалгах: Mac болон утас нэг сүлжээнд байх ёстой. Mac-ийн IP-гаар frontend-ийг асаана:
`DEV_ORIGIN=<IP> NEXT_PUBLIC_API_URL=http://<IP>:4001 npx next dev -H 0.0.0.0`.
Мөн backend-ийн `FRONTEND_URL`-д `http://<IP>:3000`-г нэмнэ.

## Шалгалт ба формат

```bash
npm run format          # бүх кодыг Prettier-ээр форматлана
npm run format:check
cd frontend && npm run lint && npm run typecheck && npm run build
cd backend && npm run check
```

GitHub дээр push болон pull request бүрт CI (`.github/workflows/ci.yml`) эдгээрийг автоматаар ажиллуулна.

## Өгөгдлийн сангийн өөрчлөлт (migration)

Бүтэц нь `backend/src/db/migrations/` доторх дугаарласан SQL файлуудаар тодорхойлогдоно (`001_baseline.sql`, `002_...`).
Ажилласан migration-ууд сан дахь `schema_migrations` хүснэгтэд тэмдэглэгддэг тул нэг файл дахин ажиллахгүй.

- Шинэ өөрчлөлт хийхдээ **дараагийн дугаартай шинэ файл** нэмнэ, жишээ нь `003_add_vehicle_vin_photo.sql`. Ажилласан хуучин файлыг хэзээ ч засахгүй.
- `npm run migrate` хүлээгдэж буй migration-уудыг ажиллуулна. Backend асахдаа мөн автоматаар ажиллуулдаг. Migration амжилтгүй бол сервер асахгүй.
- Файл бүр нэг транзакцаар ажиллана: алдаа гарвал тэр файлын өөрчлөлт бүхэлдээ буцна.

## Байршуулалт (deploy)

| Хэсэг    | Хаана                                        | Тохиргоо                          |
| -------- | -------------------------------------------- | --------------------------------- |
| Frontend | Vercel (root: `frontend`)                    | `frontend/.env.example`-ийг харна |
| Backend  | Render (root: `backend`, start: `npm start`) | `backend/.env.example`-ийг харна  |
| Нөөцлөлт | GitHub Actions                               | [docs/backup.md](docs/backup.md)  |

`main` салбар руу push хийхэд Vercel, Render хоёр автоматаар шинэчлэгдэнэ.

Танилцуулгын горим: backend дээр `DEMO_LOGIN=true`, frontend дээр `NEXT_PUBLIC_DEMO_LOGIN=true` тавибал админ руу нууц үггүй орно. **Бодит ашиглалтад заавал унтраана.**
